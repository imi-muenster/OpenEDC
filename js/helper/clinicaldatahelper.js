import * as clinicaldataTemplates from "./clinicaldatatemplates.js";
import * as ioHelper from "./iohelper.js";

class Subject {
    constructor(key, site, createdDate) {
        this.key = key;
        this.site = site;
        this.createdDate = createdDate;
    }
}

export class FormItemData {
    constructor(itemGroupOID, itemOID, value) {
        this.itemGroupOID = itemGroupOID;
        this.itemOID = itemOID;
        this.value = value;
    }
}

export class AuditRecord {
    constructor(studyEventOID, formOID, user, location, date) {
        this.studyEventOID = studyEventOID;
        this.formOID = formOID;
        this.user = user;
        this.location = location;
        this.date = date;
    }
}

const $ = query => subjectData.querySelector(query);
const $$ = query => subjectData.querySelectorAll(query);

const fileNameSeparator = "__";

export const sortOrderTypes = {
    CREATEDDATE: "Creation Date",
    ALPHANUMERICALLY: "Alphanumerical"
};

export const auditRecordTypes = {
    CREATED: "Subject Created",
    FORMEDITED: "Form Edited"
};

export const dataStatusTypes = {
    EMPTY: "Empty",
    EXISTING: "Existing",
    VERIFIED: "Verified"
};

// TODO: Implement anaologously in other helpers?
// TODO: Could implement other enums with ints as well if there is no string representation needed
export const errors = {
    SUBJECTKEYEMPTY: 0,
    SUBJECTKEYEXISTENT: 1
}

let subjects = [];
let subject = null;
let subjectData = null;

function parseSubjectData(subjectXMLString) {
    return new DOMParser().parseFromString(subjectXMLString, "text/xml").documentElement;
}

export function importClinicaldata(odmXMLString) {
    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    for (let subjectData of odm.querySelectorAll("ClinicalData SubjectData")) {
        const site = subjectData.querySelector("SiteRef") ? subjectData.querySelector("SiteRef").getAttribute("LocationOID") : null;
        // TODO: Take the created date from the audit trail
        const subject = new Subject(subjectData.getAttribute("SubjectKey"), site, new Date());
        const fileName = subjectToFilename(subject);
        localStorage.setItem(fileName, new XMLSerializer().serializeToString(subjectData));
    }
}

function getSerializedSubjectData() {
    return new XMLSerializer().serializeToString(subjectData);
}

export function getSubject() {
    return subject;
}

export function getClinicalData(studyOID, metadataVersionOID) {
    let clinicalData = clinicaldataTemplates.getClinicalData(studyOID, metadataVersionOID);

    subjects = sortSubjects(subjects, sortOrderTypes.CREATEDDATE);
    for (let subject of subjects) {
        clinicalData.appendChild(parseSubjectData(localStorage.getItem(subjectToFilename(subject))));
    }

    return clinicalData;
}

export function loadSubjects() {
    console.log("Load subjects ...");
    subjects = [];

    for (let fileName of Object.keys(localStorage)) {
        if (fileName.split(fileNameSeparator).length > 1) subjects.push(fileNameToSubject(fileName));
    }
}

export function addSubject(subjectKey, site) {
    if (subjectKey.length == 0) return Promise.reject(errors.SUBJECTKEYEMPTY);
    if (subjects.map(subject => subject.key).includes(subjectKey)) return Promise.reject(errors.SUBJECTKEYEXISTENT);

    subjectData = clinicaldataTemplates.getSubjectData(subjectKey);
    if (site) subjectData.insertAdjacentElement("afterbegin", clinicaldataTemplates.getSiteRef(site));

    subject = new Subject(subjectKey, site, new Date());
    subjects.push(subject);

    storeSubject();

    // TODO: Good practice?
    return Promise.resolve();
}

export function getSubjectKeys(site, sortOrder) {
    let filteredSubjects = site ? subjects.filter(subject => subject.site == site) : subjects;
    filteredSubjects = sortOrder ? sortSubjects(filteredSubjects, sortOrder) : filteredSubjects;

    return filteredSubjects.map(subject => subject.key);
}

function sortSubjects(subjects, sortOrder) {
    switch(sortOrder) {
        case sortOrderTypes.ALPHANUMERICALLY:
            subjects.sort((a, b) => a.key > b.key ? 1 : (a.key < b.key ? -1 : 0));
            break;
        case sortOrderTypes.CREATEDDATE:
            subjects.sort((a, b) => a.createdDate > b.createdDate ? 1 : (a.createdDate < b.createdDate ? -1 : 0));
    }

    return subjects;
}

export function loadSubject(subjectKey) {
    subject = subjects.find(subject => subject.key == subjectKey);
    subjectData = subjectKey ? parseSubjectData(localStorage.getItem(subjectToFilename(subject))) : null;
    console.log(subjectData);
}

export function storeSubject() {
    if (!subject) return;
    
    console.log("Store subject ...");
    localStorage.setItem(subjectToFilename(subject), getSerializedSubjectData());
}

export function clearSubject() {
    subject = null;
    subjectData = null;
}

export function removeSubject() {
    localStorage.removeItem(subjectToFilename(subject));
    clearSubject();

    loadSubjects();
}

function fileNameToSubject(fileName) {
    const fileNameParts = fileName.split(fileNameSeparator);
    const key = fileNameParts[0];
    const site = fileNameParts[1] || null;
    const createdDate = fileNameParts[2];

    return new Subject(key, site, new Date(parseInt(createdDate)));
}

function subjectToFilename(subject) {
    console.log(subject.key + fileNameSeparator + (subject.site || "") + fileNameSeparator + subject.createdDate.getTime());
    return subject.key + fileNameSeparator + (subject.site || "") + fileNameSeparator + subject.createdDate.getTime();
}

export function storeSubjectFormData(studyEventOID, formOID, formItemDataList) {
    // Do not store any data if no subject has been loaded or the formdata to be stored did not change compared to the previous one
    if (!subject || !dataHasChanged(formItemDataList, studyEventOID, formOID)) return;

    let studyEventData = $(`StudyEventData[StudyEventOID="${studyEventOID}"]`) || clinicaldataTemplates.getStudyEventData(studyEventOID);
    let formData = clinicaldataTemplates.getFormData(formOID);

    let itemGroupData = null;
    for (let formItemData of formItemDataList) {
        if (itemGroupData == null || itemGroupData.getAttribute("ItemGroupOID") != formItemData.itemGroupOID) {
            if (itemGroupData != null) formData.appendChild(itemGroupData);
            itemGroupData = clinicaldataTemplates.getItemGroupData(formItemData.itemGroupOID);
        };
        itemGroupData.appendChild(clinicaldataTemplates.getItemData(formItemData.itemOID, formItemData.value));
    }

    if (itemGroupData) formData.appendChild(itemGroupData);
    formData.appendChild(clinicaldataTemplates.getAuditRecord("LocalUser", "LocalSite", new Date().toISOString()));
    studyEventData.appendChild(formData);
    subjectData.appendChild(studyEventData);

    storeSubject();
}

export function getSubjectFormData(studyEventOID, formOID) {
    if (!subject) return [];

    let formData = getLastElement($$(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`));
    if (!formData) return [];

    return getFormItemDataList(formData);
}

function getFormItemDataList(formData) {
    let formItemDataList = [];
    for (let itemGroupData of formData.querySelectorAll("ItemGroupData")) {
        let itemGroupOID = itemGroupData.getAttribute("ItemGroupOID");
        for (let itemData of itemGroupData.querySelectorAll("ItemData")) {
            let itemOID = itemData.getAttribute("ItemOID");
            let value = itemData.getAttribute("Value");
            formItemDataList.push(new FormItemData(itemGroupOID, itemOID, value));
        }
    }

    return formItemDataList;
}

export function dataHasChanged(formItemDataList, studyEventOID, formOID) {
    console.log("Check if data has changed ...");
    return JSON.stringify(formItemDataList) != JSON.stringify(getSubjectFormData(studyEventOID, formOID));
}

export function getAuditRecords() {
    let auditRecords = [];
    for (let studyEventData of $$("StudyEventData")) {
        let studyEventOID = studyEventData.getAttribute("StudyEventOID");
        for (let formData of studyEventData.querySelectorAll("FormData")) {
            let formOID = formData.getAttribute("FormOID");
            let auditRecord = formData.querySelector("AuditRecord")
            if (!auditRecord) continue;
            auditRecords.push(new AuditRecord(
                studyEventOID,
                formOID,
                auditRecord.querySelector("UserRef").getAttribute("UserOID"),
                auditRecord.querySelector("LocationRef").getAttribute("LocationOID"),
                new Date(auditRecord.querySelector("DateTimeStamp").textContent)
            ));
        }
    }
    auditRecords.sort((a, b) => a.date < b.date ? 1 : (a.date > b.date ? -1 : 0));

    return auditRecords;
}

export function getAuditRecordFormData(studyEventOID, formOID, date) {
    let dateTimeStamp = Array.from($$(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"] AuditRecord DateTimeStamp`)).find(dateTimeStamp => dateTimeStamp.textContent == date.toISOString());
    let formData = dateTimeStamp ? dateTimeStamp.parentNode.parentNode : null;

    return formData ? getFormItemDataList(formData) : null;
}

// TODO: Improve error handling
export function renameSubject(subjectKey) {
    // Check if there is another subject with the same key
    const subjectWithKey = subjects.find(subject => subject.key == subjectKey);
    if (subjectWithKey != null && subjectWithKey.key != subject.key) return false;

    localStorage.removeItem(subjectToFilename(subject));

    subject.key = subjectKey;
    subjectData.setAttribute("SubjectKey", subject.key);
    storeSubject();
    loadSubjects();

    return true;
}

export function getDataStatusForStudyEvent(studyEventOID) {
    return $(`StudyEventData[StudyEventOID="${studyEventOID}"]`) ? dataStatusTypes.EXISTING : dataStatusTypes.EMPTY;
}

export function getDataStatusForForm(studyEventOID, formOID) {
    return $(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`) ? dataStatusTypes.EXISTING : dataStatusTypes.EMPTY;
}

export function getSubjectsHavingDataForElement(elementOID) {
    if (subjects.length == 0) loadSubjects();

    let subjectKeys = [];
    for (const subject of subjects) {
        const subjectData = localStorage.getItem(subjectToFilename(subject));
        if (subjectData.includes(elementOID)) subjectKeys.push(subject.key);
    }

    return subjectKeys;
}

// TODO: Move to ioHelper? Also present in metadatahelper and admindatahelper
function getLastElement(elements) {
    if (elements.length >= 1) {
        return elements[elements.length - 1];
    } else {
        return null;
    }
}
