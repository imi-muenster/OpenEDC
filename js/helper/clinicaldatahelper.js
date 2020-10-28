import * as clinicaldataTemplates from "./clinicaldatatemplates.js";

class Subject {
    constructor(key, siteOID, createdDate) {
        this.key = key;
        this.siteOID = siteOID;
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
    constructor(studyEventOID, formOID, userOID, locationOID, date) {
        this.studyEventOID = studyEventOID;
        this.formOID = formOID;
        this.userOID = userOID;
        this.locationOID = locationOID;
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
        const siteOID = subjectData.querySelector("SiteRef") ? subjectData.querySelector("SiteRef").getAttribute("LocationOID") : null;
        // TODO: Take the created date from the audit trail
        const subject = new Subject(subjectData.getAttribute("SubjectKey"), siteOID, new Date());
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

export function addSubject(subjectKey, siteOID) {
    if (subjectKey.length == 0) return Promise.reject(errors.SUBJECTKEYEMPTY);
    if (subjects.map(subject => subject.key).includes(subjectKey)) return Promise.reject(errors.SUBJECTKEYEXISTENT);

    subjectData = clinicaldataTemplates.getSubjectData(subjectKey);
    if (siteOID) subjectData.insertAdjacentElement("afterbegin", clinicaldataTemplates.getSiteRef(siteOID));

    subject = new Subject(subjectKey, siteOID, new Date());
    subjects.push(subject);

    storeSubject();

    // TODO: Good practice?
    return Promise.resolve();
}

export function getSubjectKeys(siteOID, sortOrder) {
    let filteredSubjects = siteOID ? subjects.filter(subject => subject.siteOID == siteOID) : subjects;
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

export function removeClinicaldata() {
    for (let subject of subjects) {
        localStorage.removeItem(subjectToFilename(subject));
    }

    clearSubject();
    loadSubjects();
}

function fileNameToSubject(fileName) {
    const fileNameParts = fileName.split(fileNameSeparator);
    const key = fileNameParts[0];
    const siteOID = fileNameParts[1] || null;
    const createdDate = fileNameParts[2];

    return new Subject(key, siteOID, new Date(parseInt(createdDate)));
}

function subjectToFilename(subject) {
    console.log(subject.key + fileNameSeparator + (subject.siteOID || "") + fileNameSeparator + subject.createdDate.getTime());
    return subject.key + fileNameSeparator + (subject.siteOID || "") + fileNameSeparator + subject.createdDate.getTime();
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
    formData.appendChild(clinicaldataTemplates.getAuditRecord("LocalUser", subject.siteOID ? subject.siteOID : "", new Date().toISOString()));
    studyEventData.appendChild(formData);
    subjectData.appendChild(studyEventData);

    storeSubject();
}

// TODO: Assumes that the data is ordered chronologically -- should be ensured during import
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

export function setSubjectInfo(subjectKey, siteOID) {
    // Check if if key is set or if there is another subject with the same key
    if (subjectKey.length == 0) return Promise.reject(errors.SUBJECTKEYEMPTY);
    const subjectWithKey = subjects.find(subject => subject.key == subjectKey);
    if (subjectWithKey != null && subjectWithKey.key != subject.key) return Promise.reject(errors.SUBJECTKEYEXISTENT);

    // Remove currenlty stored subject
    localStorage.removeItem(subjectToFilename(subject));

    // Adjust subject and its clinicaldata
    subject.key = subjectKey;
    subject.siteOID = siteOID;
    subjectData.setAttribute("SubjectKey", subject.key);
    let siteRef = subjectData.querySelector("SiteRef");
    if (subject.siteOID) {
        if (siteRef) siteRef.setAttribute("LocationOID", subject.siteOID);
        else subjectData.insertAdjacentElement("afterbegin", clinicaldataTemplates.getSiteRef(subject.siteOID));
    } else {
        if (siteRef) siteRef.remove();
    }

    storeSubject();
    loadSubjects();

    return Promise.resolve();
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

export function getCSVData(csvHeaders) {
    let csvData = [];

    subjects = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY);
    for (let subject of subjects) {
        const subjectData = parseSubjectData(localStorage.getItem(subjectToFilename(subject)));

        let subjectCSVData = [subject.key];
        let formData = null;
        let currentStudyEventOID = null;
        let currentFormOID = null;
        for (const csvHeader of csvHeaders) {
            const studyEventOID = csvHeader[0];
            const formOID = csvHeader[1];
            const itemGroupOID = csvHeader[2];
            const itemOID = csvHeader[3];

            // Ensures that the form data is not loaded for every item again
            if (!currentStudyEventOID || !currentFormOID || currentStudyEventOID != studyEventOID || currentFormOID != formOID) {
                formData = getLastElement(subjectData.querySelectorAll(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`));
                currentStudyEventOID = studyEventOID;
                currentFormOID = formOID;
            }

            if (!formData) {
                subjectCSVData.push("");
                continue;
            }

            const itemData = formData.querySelector(`ItemGroupData[ItemGroupOID="${itemGroupOID}"] ItemData[ItemOID="${itemOID}"]`);
            subjectCSVData.push(itemData ? itemData.getAttribute("Value") : "");
        }

        csvData.push(subjectCSVData);
    }

    return csvData;
}

// TODO: Move to ioHelper? Also present in metadatahelper and admindatahelper
function getLastElement(elements) {
    if (elements.length >= 1) {
        return elements[elements.length - 1];
    } else {
        return null;
    }
}
