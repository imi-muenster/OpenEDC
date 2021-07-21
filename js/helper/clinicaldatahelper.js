import * as clinicaldataTemplates from "../odmtemplates/clinicaldatatemplates.js";
import * as metadataHelper from "./metadatahelper.js";
import * as admindataHelper from "./admindatahelper.js";
import * as languageHelper from "./languagehelper.js";
import * as ioHelper from "./iohelper.js";

class Subject {
    constructor(key, siteOID, createdDate, modifiedDate, status) {
        this.key = key;
        this.siteOID = siteOID;
        this.createdDate = createdDate;
        this.modifiedDate = modifiedDate || createdDate;
        this.status = status;

        // Used since a subject's key can be ambigous when data conflicts are present (i.e., multiple users edited the same subject at the same)
        this.uniqueKey = key.toLowerCase();
    }

    get fileName() {
        return this.key + fileNameSeparator + (this.siteOID || "") + fileNameSeparator + this.createdDate.getTime() + fileNameSeparator + this.modifiedDate.getTime() + fileNameSeparator + this.status;
    }

    get keyInt() {
        return parseInt(this.key);
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
    constructor(type, studyEventOID, formOID, userOID, locationOID, date, dataStatus) {
        this.type = type;
        this.studyEventOID = studyEventOID;
        this.formOID = formOID;
        this.userOID = userOID;
        this.locationOID = locationOID;
        this.date = date;
        this.dataStatus = dataStatus;
    }
}

const auditRecordTypes = {
    SUBJECTCREATED: "subject-created",
    FORMEDITED: "form-edited"
};

const $ = query => subjectData.querySelector(query);
const $$ = query => subjectData.querySelectorAll(query);

export const sortOrderTypes = {
    CREATEDDATE: "creation-date",
    ALPHANUMERICALLY: "alphanumerical"
};

export const dataStatusTypes = {
    EMPTY: 1,
    INCOMPLETE: 2,
    COMPLETE: 3,
    VALIDATED: 4,
    CONFLICT: 5
};

// TODO: Implement anaologously in other helpers?
// TODO: Could implement other enums with ints as well if there is no string representation needed
export const errors = {
    SUBJECTKEYEMPTY: 1,
    SUBJECTKEYEXISTENT: 2,
    SUBJECTKEYEXISTENTOTHERSITE: 3
}

const fileNameSeparator = "__";

let subjects = [];
let subject = null;
let subjectData = null;

export async function importClinicaldata(odmXMLString) {
    // For performance reasons of IndexedDB, store serialized clinical data in bulk
    const xmlSerializer = new XMLSerializer();
    const subjectFileNameList = [];
    const subjectDataList = [];

    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    for (subjectData of odm.querySelectorAll("ClinicalData SubjectData")) {
        const siteOID = $("SiteRef") ? $("SiteRef").getAttribute("LocationOID") : null;
        const creationDate = $("AuditRecord DateTimeStamp") ? new Date($("AuditRecord DateTimeStamp").textContent) : new Date();
        const subject = new Subject(subjectData.getAttribute("SubjectKey"), siteOID, creationDate, null, getDataStatus());
        subjectFileNameList.push(subject.fileName);
        subjectDataList.push(xmlSerializer.serializeToString(subjectData));
    }

    await ioHelper.storeSubjectDataBulk(subjectFileNameList, subjectDataList);
}

export function getSubject() {
    return subject;
}

export async function getClinicalData(studyOID, metadataVersionOID) {
    let clinicalData = clinicaldataTemplates.getClinicalData(studyOID, metadataVersionOID);

    subjects = sortSubjects(subjects, sortOrderTypes.CREATEDDATE);
    for (let subject of subjects) {
        clinicalData.appendChild(await ioHelper.getSubjectData(subject.fileName));
    }

    return clinicalData;
}

export async function loadSubjects() {
    subjects = [];

    const subjectFileNames = await ioHelper.getSubjectFileNames();
    for (let fileName of subjectFileNames) {
        subjects.push(fileNameToSubject(fileName));
    }

    // Evaluate whether data conflicts are present (i.e., multiple users edited the same subject at the same time)
    subjects = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY);
    for (let i = 0; i < subjects.length-1; i++) {
        if (subjects[i].key == subjects[i+1].key) {
            subjects[i].status = dataStatusTypes.CONFLICT;
            subjects[i+1].status = dataStatusTypes.CONFLICT;
            subjects[i+1].uniqueKey = subjects[i+1].key + fileNameSeparator + i;
            
            // Show a warning that data conflicts exist when the user has manage subjects right and the warning has not shown before
            if (ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.MANAGESUBJECTS) && !document.querySelector(".panel-icon.has-text-danger")) {
                ioHelper.showMessage(languageHelper.getTranslation("data-conflicts-present"), languageHelper.getTranslation("data-conflicts-present-error"));
            }
        }
    }
}

export async function addSubject(subjectKey, siteOID) {
    // If no key was provided, return an error
    if (subjectKey.length == 0) return Promise.reject(errors.SUBJECTKEYEMPTY);

    // Test whether a subject with the key already exists and if the current user is eligible to see the existing subject data
    // TODO: When connected to a server, the server should be consulted to verify that a subject key is available
    const existingSubject = subjects.find(subject => subject.uniqueKey == subjectKey.toLowerCase());
    if (existingSubject) {
        if (admindataHelper.getCurrentUserSiteOID() == existingSubject.siteOID || !admindataHelper.getCurrentUserSiteOID()) return Promise.reject(errors.SUBJECTKEYEXISTENT);
        else return Promise.reject(errors.SUBJECTKEYEXISTENTOTHERSITE);
    }
    
    subjectData = clinicaldataTemplates.getSubjectData(subjectKey);
    if (siteOID) subjectData.insertAdjacentElement("afterbegin", clinicaldataTemplates.getSiteRef(siteOID));

    const creationDate = new Date();
    subjectData.appendChild(clinicaldataTemplates.getAuditRecord(admindataHelper.getCurrentUserOID(), siteOID, creationDate.toISOString()));

    subject = new Subject(subjectKey, siteOID, creationDate, null, dataStatusTypes.EMPTY);
    subjects.push(subject);

    await storeSubject();
    return Promise.resolve();
}

export function getSubjects(siteOID, sortOrder) {
    let filteredSubjects = siteOID ? subjects.filter(subject => subject.siteOID == siteOID) : subjects;
    filteredSubjects = sortOrder ? sortSubjects(filteredSubjects, sortOrder) : filteredSubjects;

    return filteredSubjects;
}

function sortSubjects(subjects, sortOrder) {
    switch (sortOrder) {
        case sortOrderTypes.CREATEDDATE:
            subjects.sort((a, b) => a.createdDate > b.createdDate ? 1 : (a.createdDate < b.createdDate ? -1 : 0));
            break;
        case sortOrderTypes.ALPHANUMERICALLY:
            if (ioHelper.getSubjectKeyMode() == ioHelper.subjectKeyModes.AUTO) subjects.sort((a, b) => a.keyInt > b.keyInt ? 1 : (a.keyInt < b.keyInt ? -1 : 0));
            else subjects.sort((a, b) => a.key > b.key ? 1 : (a.key < b.key ? -1 : 0));
    }

    return subjects;
}

export async function loadSubject(subjectKey) {
    if (!subjectKey) {
        subject = null;
        subjectData = null;
        return;
    }

    subject = subjects.find(subject => subject.uniqueKey == subjectKey.toLowerCase());
    if (subject) subjectData = await ioHelper.getSubjectData(subject.fileName);
    else subjectData = null;
    
    return subject;
}

export async function storeSubject() {
    if (!subject) return;
    console.log("Store subject ...");

    const previousFileName = subject.fileName;

    subject.status = getDataStatus();
    subject.modifiedDate = new Date();
    await ioHelper.storeSubjectData(subject.fileName, subjectData);

    // This mechanism helps to prevent possible data loss when multiple users edit the same subject data at the same time (especially important for the offline mode)
    // If the previousFileName cannot be removed, the system keeps multiple current versions of the subject data and the user is notified that conflicting data exists
    if (previousFileName != subject.fileName) ioHelper.removeSubjectData(previousFileName);
}

export function clearSubject() {
    subject = null;
    subjectData = null;
}

export async function removeSubject() {
    await ioHelper.removeSubjectData(subject.fileName);
    clearSubject();
    await loadSubjects();
}

export async function removeClinicaldata() {
    for (let subject of subjects) {
        await ioHelper.removeSubjectData(subject.fileName);
    }
}

function fileNameToSubject(fileName) {
    const fileNameParts = fileName.split(fileNameSeparator);
    const key = fileNameParts[0];
    const siteOID = fileNameParts[1] || null;
    const createdDate = fileNameParts[2];
    const modifiedDate = fileNameParts[3];
    const status = parseInt(fileNameParts[4]) || null;

    return new Subject(key, siteOID, new Date(parseInt(createdDate)), new Date(parseInt(modifiedDate)), status);
}

export async function storeSubjectFormData(studyEventOID, formOID, formItemDataList, dataStatus) {
    if (!subject) return;

    const currentDataStatus = getDataStatusForForm(studyEventOID, formOID);

    // Do not store data if neither the formdata nor the data status changed
    const formDataDifference = getFormDataDifference(formItemDataList, studyEventOID, formOID);
    if (currentDataStatus == dataStatus && formDataDifference.length == 0) return;

    // Do not store data if connected to server and user has no rights to store data
    if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.ADDSUBJECTDATA)) return;

    // Do not store data if the current data status is set to validated and the user has no permission for invalidation
    if (currentDataStatus == dataStatusTypes.VALIDATED && ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.VALIDATEFORMS)) return;

    // Do not store data if the form status is set to (in-)validated without permission
    if (currentDataStatus != dataStatus && (currentDataStatus == dataStatusTypes.VALIDATED || dataStatus == dataStatusTypes.VALIDATED)) {
        if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.VALIDATEFORMS)) return;
    }

    // Create a new FormData element and store the data
    let formData = clinicaldataTemplates.getFormData(formOID);
    formData.appendChild(clinicaldataTemplates.getAuditRecord(admindataHelper.getCurrentUserOID(), subject.siteOID, new Date().toISOString()));
    formData.appendChild(clinicaldataTemplates.getFlag(dataStatus, metadataHelper.dataStatusCodeListOID));

    let itemGroupData = null;
    for (let formItemData of formDataDifference) {
        if (itemGroupData == null || itemGroupData.getAttribute("ItemGroupOID") != formItemData.itemGroupOID) {
            if (itemGroupData) formData.appendChild(itemGroupData);
            itemGroupData = clinicaldataTemplates.getItemGroupData(formItemData.itemGroupOID);
        };
        itemGroupData.appendChild(clinicaldataTemplates.getItemData(formItemData.itemOID, formItemData.value.escapeXML()));
    }
    if (itemGroupData) formData.appendChild(itemGroupData);

    let studyEventData = $(`StudyEventData[StudyEventOID="${studyEventOID}"]`) || clinicaldataTemplates.getStudyEventData(studyEventOID);
    formData.setAttribute("TransactionType", studyEventData.querySelector(`FormData[FormOID="${formOID}"]`) ? "Update" : "Insert");
    studyEventData.appendChild(formData);
    subjectData.appendChild(studyEventData);

    await storeSubject();
}

function getFormDataElements(studyEventOID, formOID) {
    return $$(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`);
}

// TODO: Can this be performance improved? (e.g., caching formItemDataList for getFormDataDifference())
export function getSubjectFormData(studyEventOID, formOID) {
    if (!subject) return [];

    const formItemDataList = [];
    for (const formData of getFormDataElements(studyEventOID, formOID)) {
        for (const itemGroupData of formData.querySelectorAll("ItemGroupData")) {
            const itemGroupOID = itemGroupData.getAttribute("ItemGroupOID");
            for (const itemData of itemGroupData.querySelectorAll("ItemData")) {
                const itemOID = itemData.getAttribute("ItemOID");
                const value = itemData.getAttribute("Value");
                const existingItemData = formItemDataList.find(entry => entry.itemGroupOID == itemGroupOID && entry.itemOID == itemOID);
                if (existingItemData) existingItemData.value = value;
                else formItemDataList.push(new FormItemData(itemGroupOID, itemOID, value));
            }
        }
    }

    return formItemDataList;
}

export function getDataForItems(itemOIDs) {
    let data = {};
    for (const itemOID of itemOIDs) {
        const itemData = subject ? $$(`ItemData[ItemOID="${itemOID}"]`).getLastElement() : null;
        data[itemOID] = itemData ? itemData.getAttribute("Value") : "";
    }

    return data;
}

// TODO: Can this be performance improved?
export function getFormDataDifference(formItemDataList, studyEventOID, formOID) {
    console.log("Check which data items have changed ...");

    // First, add or edit item data that was entered
    const formDataDifference = [];
    const currentItemDataList = getSubjectFormData(studyEventOID, formOID);
    for (const formItemData of formItemDataList) {
        const currentItemData = currentItemDataList.find(entry => entry.itemGroupOID == formItemData.itemGroupOID && entry.itemOID == formItemData.itemOID);
        if (!currentItemData || currentItemData.value != formItemData.value) formDataDifference.push(formItemData);
    }

    // Second, remove item data that was removed
    for (const currentItemData of currentItemDataList) {
        if (!currentItemData.value) continue;
        const formItemData = formItemDataList.find(entry => entry.itemGroupOID == currentItemData.itemGroupOID && entry.itemOID == currentItemData.itemOID);
        if (!formItemData) formDataDifference.push(new FormItemData(currentItemData.itemGroupOID, currentItemData.itemOID, ""));
    }
    
    return formDataDifference;
}

export function getAuditRecords() {
    const auditRecords = [];

    for (let studyEventData of $$("StudyEventData")) {
        const studyEventOID = studyEventData.getAttribute("StudyEventOID");
        for (let formData of studyEventData.querySelectorAll("FormData")) {
            const formOID = formData.getAttribute("FormOID");
            const auditRecord = formData.querySelector("AuditRecord");
            const flag = formData.querySelector("Flag");
            const flagValue = flag ? flag.querySelector("FlagValue") : null;
            const dataStatus = flagValue ? parseInt(flagValue.textContent) : null;
            const dataStatusName = Object.keys(dataStatusTypes).find(key => dataStatusTypes[key] == dataStatus);
            if (!auditRecord) continue;
            auditRecords.push(new AuditRecord(
                auditRecordTypes.FORMEDITED,
                studyEventOID,
                formOID,
                auditRecord.querySelector("UserRef").getAttribute("UserOID"),
                auditRecord.querySelector("LocationRef").getAttribute("LocationOID"),
                new Date(auditRecord.querySelector("DateTimeStamp").textContent),
                dataStatusName.toLowerCase()
            ));
        }
    }

    if ($("AuditRecord")) {
        auditRecords.push(new AuditRecord(
            auditRecordTypes.SUBJECTCREATED,
            null,
            null,
            $("AuditRecord UserRef").getAttribute("UserOID"),
            $("AuditRecord LocationRef").getAttribute("LocationOID"),
            new Date($("AuditRecord DateTimeStamp").textContent)
        ));
    }

    return auditRecords.sort((a, b) => a.date < b.date ? 1 : (a.date > b.date ? -1 : 0));
}

export function getAuditRecordFormData(studyEventOID, formOID, date) {
    let dateTimeStamp = Array.from($$(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"] AuditRecord DateTimeStamp`)).find(dateTimeStamp => dateTimeStamp.textContent == date.toISOString());
    let formData = dateTimeStamp ? dateTimeStamp.parentNode.parentNode : null;

    return formData ? getFormItemDataList(formData) : null;
}

export async function setSubjectInfo(subjectKey, siteOID) {
    // Check if if key is set or if there is another subject with the same key
    if (subjectKey.length == 0) return Promise.reject(errors.SUBJECTKEYEMPTY);
    const subjectWithKey = subjects.find(subject => subject.key == subjectKey);
    if (subjectWithKey && subjectWithKey.key != subject.key) return Promise.reject(errors.SUBJECTKEYEXISTENT);

    // Store the current file name to remove the old subject after the new one has been stored
    const previousFileName = subject.fileName;

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
    
    await storeSubject();
    await ioHelper.removeSubjectData(previousFileName);
    await loadSubjects();

    return Promise.resolve();
}

export function getAutoNumberedSubjectKey() {
    // TODO: Performance should be improved in the future. Sorting is expensive and needs to be reduced
    // TODO: Moreover, when connected to a server, the server should be consulted to generate the next auto-numbered key
    // TODO: Alternatively, load the subject list from the server before the auto-numbered key is generated (for the manual mode as well)
    const subjectsWithIntKeys = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY).filter(subject => subject.keyInt);
    const highestNumber = subjectsWithIntKeys.length > 0 ? subjectsWithIntKeys[subjectsWithIntKeys.length - 1].key : 0;
    const subjectKey = parseInt(highestNumber) + 1;

    return subjectKey.toString();
}

export function getDataStatus() {
    const dataStates = metadataHelper.getStudyEventOIDs().map(studyEventOID => getDataStatusForStudyEvent(studyEventOID));

    if (dataStates.every(item => item == dataStatusTypes.VALIDATED)) return dataStatusTypes.VALIDATED;
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE)) return dataStatusTypes.COMPLETE;
    if (dataStates.some(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE || item == dataStatusTypes.INCOMPLETE)) return dataStatusTypes.INCOMPLETE;
    
    return dataStatusTypes.EMPTY;
}

export function getDataStatusForStudyEvent(studyEventOID) {
    const dataStates = metadataHelper.getFormOIDsByStudyEvent(studyEventOID).map(formOID => getDataStatusForForm(studyEventOID, formOID));

    if (dataStates.every(item => item == dataStatusTypes.VALIDATED)) return dataStatusTypes.VALIDATED;
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE)) return dataStatusTypes.COMPLETE;
    if (dataStates.some(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE || item == dataStatusTypes.INCOMPLETE)) return dataStatusTypes.INCOMPLETE;
    
    return dataStatusTypes.EMPTY;
}

export function getDataStatusForForm(studyEventOID, formOID) {
    const formDataElement = getFormDataElements(studyEventOID, formOID).getLastElement();
    if (!formDataElement) return dataStatusTypes.EMPTY;

    // Return complete even if there is no flag to support versions before 0.1.5 and imported data from other systems without a flag
    const flag = formDataElement.querySelector("Flag");
    if (!flag) return dataStatusTypes.COMPLETE;

    const flagValue = flag.querySelector("FlagValue");
    return flagValue ? parseInt(flagValue.textContent) : dataStatusTypes.COMPLETE;
}

export async function getSubjectsHavingDataForElement(elementOID, elementType, itemOID, codedValue) {
    await loadSubjects();

    let subjectKeys = [];
    for (const subject of subjects) {
        const subjectData = await ioHelper.getSubjectData(subject.fileName);
        switch (elementType) {
            case metadataHelper.elementTypes.STUDYEVENT:
                if (subjectData.querySelector(`StudyEventData[StudyEventOID="${elementOID}"]`)) subjectKeys.push(subject.key);
                break;
            case metadataHelper.elementTypes.FORM:
                if (subjectData.querySelector(`FormData[FormOID="${elementOID}"]`)) subjectKeys.push(subject.key);
                break;
            case metadataHelper.elementTypes.ITEMGROUP:
                if (subjectData.querySelector(`ItemGroupData[ItemGroupOID="${elementOID}"]`)) subjectKeys.push(subject.key);
                break;
            case metadataHelper.elementTypes.ITEM:
                if (subjectData.querySelector(`ItemData[ItemOID="${elementOID}"]`)) subjectKeys.push(subject.key);
                break;
            case metadataHelper.elementTypes.CODELISTITEM:
                if (subjectData.querySelector(`ItemData[ItemOID="${itemOID}"][Value="${codedValue}"]`)) subjectKeys.push(subject.key);
        }
    }

    return subjectKeys;
}

export async function getCSVData(csvHeaders) {
    let csvData = [];

    subjects = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY);
    for (let subject of subjects) {
        const subjectData = await ioHelper.getSubjectData(subject.fileName);

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
                formData = subjectData.querySelectorAll(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`).getLastElement();
                currentStudyEventOID = studyEventOID;
                currentFormOID = formOID;
            }

            if (!formData) {
                subjectCSVData.push("");
                continue;
            }

            const itemData = formData.querySelector(`ItemGroupData[ItemGroupOID="${itemGroupOID}"] ItemData[ItemOID="${itemOID}"]`);
            const value = itemData ? itemData.getAttribute("Value").replace(/'/g, '"').replace(/"/g, '""') : "";
            subjectCSVData.push(value.includes(",") || value.includes('"') ? '"' + value + '"' : value);
        }

        csvData.push(subjectCSVData);
    }

    return csvData;
}
