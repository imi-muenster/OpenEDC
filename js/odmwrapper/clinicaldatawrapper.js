import ODMPath from "./odmpath.js";
import * as clinicaldataTemplates from "../odmtemplates/clinicaldatatemplates.js";
import * as metadataWrapper from "./metadatawrapper.js";
import * as admindataWrapper from "./admindatawrapper.js";
import * as languageHelper from "../helper/languagehelper.js";
import * as ioHelper from "../helper/iohelper.js";

class ClinicaldataFile {
    constructor(modifiedDate) {
        this.modifiedDate = modifiedDate || new Date();
    }

    static parse(fileName) {
        const modifiedDate = new Date(parseInt(fileName.split(ioHelper.fileNameSeparator)[1]));
        return new ClinicaldataFile(modifiedDate);
    }
}

class Subject {
    constructor(key, siteOID, createdDate, modifiedDate, status) {
        this.key = key;
        this.siteOID = siteOID;
        this.createdDate = createdDate;
        this.modifiedDate = modifiedDate || createdDate;
        this.status = status;

        // Used since a subject's key can be ambigous when data conflicts are present (i.e., multiple users edited the same subject at the same)
        this.uniqueKey = key.toLowerCase();
        this.hasConflict = false;
    }

    static parse(fileName) {
        const fileNameParts = fileName.split(ioHelper.fileNameSeparator);
        const key = fileNameParts[0];
        const siteOID = fileNameParts[1] || null;
        const createdDate = new Date(parseInt(fileNameParts[2]));
        const modifiedDate = new Date(parseInt(fileNameParts[3]));
        const status = parseInt(fileNameParts[4]) || null;
    
        return new Subject(key, siteOID, createdDate, modifiedDate, status);
    }

    get fileName() {
        const separator = ioHelper.fileNameSeparator;
        return this.key + separator + (this.siteOID || "") + separator + this.createdDate.getTime() + separator + this.modifiedDate.getTime() + separator + this.status;
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

    set localizedValue(localizedValue) {
        this._localizedValue = localizedValue ?? this.value;
    }

    get localizedValue() {
        return this._localizedValue ? this._localizedValue : `-${languageHelper.getTranslation("removed")}-`;
    }

    get translatedQuestion() {
        return metadataWrapper.getElementDefByOID(this.itemOID).getTranslatedQuestion(languageHelper.getCurrentLocale(), true);
    }
}

export class AuditRecord {
    constructor(type, studyEventOID, formOID, userOID, locationOID, date, dataStatus, dataChanges) {
        this.type = type;
        this.studyEventOID = studyEventOID;
        this.formOID = formOID;
        this.userOID = userOID;
        this.locationOID = locationOID;
        this.date = date;
        this.dataStatus = dataStatus;
        this.dataChanges = dataChanges;
    }

    get studyEventDescription() {
        return this.studyEventOID ? metadataWrapper.getElementDefByOID(this.studyEventOID).getTranslatedDescription(languageHelper.getCurrentLocale(), true) : null
    }

    get formDescription() {
        return this.formOID ? metadataWrapper.getElementDefByOID(this.formOID).getTranslatedDescription(languageHelper.getCurrentLocale(), true) : null;
    }

    get userName() {
        return admindataWrapper.getUserFullName(this.userOID);
    }

    get siteName() {
        return admindataWrapper.getSiteNameByOID(this.locationOID)
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

let subjects = [];
let subject = null;
let subjectData = null;
let clinicaldataFile = null;

export async function importClinicaldata(odmXMLString) {
    // For performance reasons of IndexedDB, store serialized clinical data in bulk
    const xmlSerializer = new XMLSerializer();
    const subjectFileNameList = [];
    const subjectDataList = [];

    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    for (subjectData of odm.querySelectorAll("ClinicalData SubjectData")) {
        const siteOID = $("SiteRef")?.getAttribute("LocationOID");
        const creationDate = $("AuditRecord DateTimeStamp") ? new Date($("AuditRecord DateTimeStamp").textContent) : new Date();
        const subject = new Subject(subjectData.getAttribute("SubjectKey"), siteOID, creationDate, null, getDataStatus());
        subjectFileNameList.push(subject.fileName);
        subjectDataList.push(xmlSerializer.serializeToString(subjectData));
    }

    if (subjectDataList.length) await ioHelper.setODMBulk(subjectFileNameList, subjectDataList);
}

async function loadStoredSubjectData(fileName) {
    const xmlData = await ioHelper.getODM(fileName);
    return xmlData.documentElement;
}

export function getSubject() {
    return subject;
}

export function getLastUpdate() {
    return clinicaldataFile.modifiedDate.getTime();
}

export async function getClinicalData(studyOID, metadataVersionOID) {
    let clinicalData = clinicaldataTemplates.getClinicalData(studyOID, metadataVersionOID);

    subjects = sortSubjects(subjects, sortOrderTypes.CREATEDDATE);
    for (let subject of subjects) {
        clinicalData.appendChild(await loadStoredSubjectData(subject.fileName));
    }

    return clinicalData;
}

export async function loadSubjects() {
    console.log("Load subjects ...");

    subjects = [];
    const fileNames = await ioHelper.getSubjectFileNames();
    for (const fileName of fileNames) {
        subjects.push(Subject.parse(fileName));
    }

    // The following logic is only valid when connected to a server
    if (!ioHelper.hasServerURL()) return;

    // Store date of subject list last update
    const lastUpdate = await ioHelper.getLastServerUpdate();
    clinicaldataFile = new ClinicaldataFile(new Date(lastUpdate.clinicaldata));

    // Check whether a currently opened subject was edited by another user
    if (subject && !fileNames.includes(subject.fileName)) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("subject-edited-error"), {
            [languageHelper.getTranslation("reload")]: async () => {
                await loadSubject(subject.uniqueKey);
                document.dispatchEvent(new CustomEvent("CurrentSubjectEdited"));
            }
        });
    }

    // Evaluate whether data conflicts are present (i.e., multiple users edited the same subject at the same time)
    subjects = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY);
    for (let i = 0; i < subjects.length-1; i++) {
        if (subjects[i].key == subjects[i+1].key) {
            subjects[i].hasConflict = true;
            subjects[i+1].hasConflict = true;
            subjects[i+1].uniqueKey = subjects[i+1].key + ioHelper.fileNameSeparator + i;
            
            // Show a warning that data conflicts exist when the user has manage subjects right and the warning has not shown before
            if (!subject && ioHelper.userHasRight(ioHelper.userRights.MANAGESUBJECTS) && !document.querySelector(".panel-icon.has-text-danger")) {
                ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("data-conflicts-present-error"));
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
        if (admindataWrapper.getCurrentUserSiteOID() == existingSubject.siteOID || !admindataWrapper.getCurrentUserSiteOID()) return Promise.reject(errors.SUBJECTKEYEXISTENT);
        else return Promise.reject(errors.SUBJECTKEYEXISTENTOTHERSITE);
    }
    
    subjectData = clinicaldataTemplates.getSubjectData(subjectKey);
    if (siteOID) subjectData.insertAdjacentElement("afterbegin", clinicaldataTemplates.getSiteRef(siteOID));

    const creationDate = new Date();
    subjectData.appendChild(clinicaldataTemplates.getAuditRecord(admindataWrapper.getCurrentUserOID(), siteOID, creationDate.toISOString()));

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
            if (ioHelper.getSetting("subjectKeyMode") == ioHelper.subjectKeyModes.AUTO) subjects.sort((a, b) => a.keyInt > b.keyInt ? 1 : (a.keyInt < b.keyInt ? -1 : 0));
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
    if (subject) subjectData = await loadStoredSubjectData(subject.fileName);
    else subjectData = null;
    
    return subject;
}

export async function storeSubject() {
    if (!subject) return;
    console.log("Store subject ...");

    const previousFileName = subject.fileName;
    const modifiedDate = new Date();

    subject.status = getDataStatus();
    subject.modifiedDate = modifiedDate;
    clinicaldataFile = new ClinicaldataFile(modifiedDate);
    await ioHelper.setODM(subject.fileName, subjectData);

    // This mechanism helps to prevent possible data loss when multiple users edit the same subject data at the same time (especially important for the offline mode)
    // If the previousFileName cannot be removed, the system keeps multiple current versions of the subject data and the user is notified that conflicting data exists
    if (previousFileName != subject.fileName) ioHelper.removeODM(previousFileName);
}

export function clearSubject() {
    subject = null;
    subjectData = null;
}

export async function removeSubject() {
    await ioHelper.removeODM(subject.fileName);
    clearSubject();
    await loadSubjects();
}

export async function removeClinicaldata() {
    for (let subject of subjects) {
        await ioHelper.removeODM(subject.fileName);
    }
}

export async function storeSubjectFormData(studyEventOID, formOID, formItemDataList, dataStatus) {
    if (!subject) return;

    const currentDataStatus = getDataStatusForForm(studyEventOID, formOID);

    // Do not store data if neither the formdata nor the data status changed
    const formDataDifference = getFormDataDifference(formItemDataList, studyEventOID, formOID);
    if (currentDataStatus == dataStatus && formDataDifference.length == 0) return;

    // Do not store data if connected to server and user has no rights to store data
    if (!ioHelper.userHasRight(ioHelper.userRights.ADDSUBJECTDATA)) return;

    // Do not store data if the current data status is set to validated and the user has no permission for invalidation
    if (currentDataStatus == dataStatusTypes.VALIDATED && !ioHelper.userHasRight(ioHelper.userRights.VALIDATEFORMS)) return;

    // Do not store data if the form status is set to (in-)validated without permission
    if (currentDataStatus != dataStatus && (currentDataStatus == dataStatusTypes.VALIDATED || dataStatus == dataStatusTypes.VALIDATED)) {
        if (!ioHelper.userHasRight(ioHelper.userRights.VALIDATEFORMS)) return;
    }

    // Create a new FormData element and store the data
    let formData = clinicaldataTemplates.getFormData(formOID);
    formData.appendChild(clinicaldataTemplates.getAuditRecord(admindataWrapper.getCurrentUserOID(), subject.siteOID, new Date().toISOString()));
    formData.appendChild(clinicaldataTemplates.getFlag(dataStatus, metadataWrapper.dataStatusCodeListOID));

    let itemGroupData = null;
    for (let formItemData of formDataDifference) {
        if (itemGroupData == null || itemGroupData.getAttribute("ItemGroupOID") != formItemData.itemGroupOID) {
            if (itemGroupData) formData.appendChild(itemGroupData);
            itemGroupData = clinicaldataTemplates.getItemGroupData(formItemData.itemGroupOID);
        };
        itemGroupData.appendChild(clinicaldataTemplates.getItemData(formItemData.itemOID, formItemData.value));
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
    return !subject ? [] : getFormItemDataList(getFormDataElements(studyEventOID, formOID));
}

function getFormItemDataList(formDataElements) {
    const formItemDataList = [];
    for (const formDataElement of formDataElements) {
        for (const itemGroupData of formDataElement.querySelectorAll("ItemGroupData")) {
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

export function getDataForItems(itemPaths) {
    let data = {};
    for (const itemPath of itemPaths) {
        const itemData = subject ? $$(`
            StudyEventData[StudyEventOID="${itemPath.studyEventOID}"]
            FormData[FormOID="${itemPath.formOID}"]
            ItemGroupData[ItemGroupOID="${itemPath.itemGroupOID}"]
            ItemData[ItemOID="${itemPath.itemOID}"]
        `).getLastElement() : null;
        data[itemPath.toString()] = itemData ? itemData.getAttribute("Value") : "";
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

// A filter may contain a studyEventOID, formOID, itemGroupOID, itemOID, userOID, and month
export function getAuditRecords(filter) {
    const auditRecords = [];

    for (let studyEventData of $$("StudyEventData")) {
        // Filter studyEvent
        const studyEventOID = studyEventData.getAttribute("StudyEventOID");
        if (filter && filter.studyEventOID && filter.studyEventOID != studyEventOID) continue;

        for (let formData of studyEventData.querySelectorAll("FormData")) {
            // Filter form
            const formOID = formData.getAttribute("FormOID");
            if (filter && filter.formOID && filter.formOID != formOID) continue;

            const auditRecord = formData.querySelector("AuditRecord");
            if (!auditRecord) continue;

            // Filter itemGroup and item
            let formItemData = getFormItemDataList([formData]);
            if (filter && filter.itemGroupOID && filter.itemOID) {
                formItemData = formItemData.filter(itemData => itemData.itemGroupOID == filter.itemGroupOID && itemData.itemOID == filter.itemOID);
                if (!formItemData.length) continue;
            }

            // Filter user
            const userOID = auditRecord.querySelector("UserRef").getAttribute("UserOID");
            if (filter && filter.userOID && filter.userOID != userOID) continue;

            // Filter date
            const date = new Date(auditRecord.querySelector("DateTimeStamp").textContent);
            // TODO: Implement month filter
            
            // Add form edited audit record
            const locationOID = auditRecord.querySelector("LocationRef").getAttribute("LocationOID");
            const flag = formData.querySelector("Flag");
            const flagValue = flag?.querySelector("FlagValue");
            const dataStatus = flagValue ? parseInt(flagValue.textContent) : null;
            const dataStatusName = Object.keys(dataStatusTypes).find(key => dataStatusTypes[key] == dataStatus);
            auditRecords.push(
                new AuditRecord(auditRecordTypes.FORMEDITED, studyEventOID, formOID, userOID, locationOID, date, dataStatusName.toLowerCase(), formItemData)
            );
        }
    }

    // Add subject created audit record
    if (!filter && $("AuditRecord")) {
        const userOID = $("AuditRecord UserRef").getAttribute("UserOID");
        const locationOID = $("AuditRecord LocationRef").getAttribute("LocationOID");
        const date = new Date($("AuditRecord DateTimeStamp").textContent);
        auditRecords.push(
            new AuditRecord(auditRecordTypes.SUBJECTCREATED, null, null, userOID, locationOID, date)
        );
    }

    // Localize item values
    const dateItemOIDs = metadataWrapper.getItemOIDsWithDataType(metadataWrapper.dataTypes.DATE);
    const dateTimeItemOIDs = metadataWrapper.getItemOIDsWithDataType(metadataWrapper.dataTypes.DATETIME);
    const booleanItemOIDs = metadataWrapper.getItemOIDsWithDataType(metadataWrapper.dataTypes.BOOLEAN);
    for (let auditRecord of auditRecords) {
        if (!auditRecord.dataChanges) continue;
        for (let dataItem of auditRecord.dataChanges) {
            if (!dataItem.value) continue;
            let localizedValue;
            const codeListItem = metadataWrapper.getCodeListItem(metadataWrapper.getCodeListOIDByItem(dataItem.itemOID), dataItem.value);
            if (codeListItem) localizedValue = codeListItem.getTranslatedDecode(languageHelper.getCurrentLocale(), true);
            if (dateItemOIDs.includes(dataItem.itemOID)) localizedValue = new Date(dataItem.value).toLocaleDateString();
            if (dateTimeItemOIDs.includes(dataItem.itemOID)) localizedValue = new Date(dataItem.value).toLocaleString();
            if (booleanItemOIDs.includes(dataItem.itemOID)) localizedValue = dataItem.value == "1" ? languageHelper.getTranslation("yes") : languageHelper.getTranslation("no");
            dataItem.localizedValue = localizedValue;
        }
    }

    return auditRecords.sort((a, b) => a.date < b.date ? 1 : (a.date > b.date ? -1 : 0));
}

export function getAuditRecordFormData(studyEventOID, formOID, date) {
    const formDataElements = [];
    for (const formDataElement of $$(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`)) {
        const timestamp = formDataElement.querySelector("AuditRecord DateTimeStamp");
        if (timestamp && new Date(timestamp.textContent) <= date) formDataElements.push(formDataElement);
    }

    return getFormItemDataList(formDataElements);
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
    await ioHelper.removeODM(previousFileName);
    await loadSubjects();

    return Promise.resolve();
}

export function getAutoNumberedSubjectKey() {
    // TODO: Performance should be improved in the future. Sorting is expensive and needs to be reduced
    // TODO: Moreover, when connected to a server, the server should be consulted to generate the next auto-numbered key
    // TODO: Alternatively, load the subject list from the server before the auto-numbered key is generated (for the manual mode as well)
    const subjectsWithIntKeys = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY).filter(subject => subject.keyInt);
    const highestNumber = subjectsWithIntKeys.length ? subjectsWithIntKeys[subjectsWithIntKeys.length - 1].key : 0;
    const subjectKey = parseInt(highestNumber) + 1;

    return subjectKey.toString();
}

export function getDataStatus() {
    const dataStates = metadataWrapper.getStudyEventOIDs().map(studyEventOID => getDataStatusForStudyEvent(studyEventOID));

    if (dataStates.every(item => item == dataStatusTypes.VALIDATED)) return dataStatusTypes.VALIDATED;
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE)) return dataStatusTypes.COMPLETE;
    if (dataStates.some(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE || item == dataStatusTypes.INCOMPLETE)) return dataStatusTypes.INCOMPLETE;
    
    return dataStatusTypes.EMPTY;
}

export function getDataStatusForStudyEvent(studyEventOID) {
    const dataStates = metadataWrapper.getFormOIDsByStudyEvent(studyEventOID).map(formOID => getDataStatusForForm(studyEventOID, formOID));

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

export async function getSubjectsHavingDataForElement(elementType , odmPath) {
    await loadSubjects();

    let subjectKeys = [];
    for (const subject of subjects) {
        const subjectData = await loadStoredSubjectData(subject.fileName);
        switch (elementType) {
            case ODMPath.elements.STUDYEVENT:
                if (subjectData.querySelector(`StudyEventData[StudyEventOID="${odmPath.studyEventOID}"]`)) subjectKeys.push(subject.key);
                break;
            case ODMPath.elements.FORM:
                if (subjectData.querySelector(`FormData[FormOID="${odmPath.formOID}"]`)) subjectKeys.push(subject.key);
                break;
            case ODMPath.elements.ITEMGROUP:
                if (subjectData.querySelector(`ItemGroupData[ItemGroupOID="${odmPath.itemGroupOID}"]`)) subjectKeys.push(subject.key);
                break;
            case ODMPath.elements.ITEM:
                if (subjectData.querySelector(`ItemData[ItemOID="${odmPath.itemOID}"]`)) subjectKeys.push(subject.key);
                break;
            case ODMPath.elements.CODELISTITEM:
                if (subjectData.querySelector(`ItemData[ItemOID="${odmPath.itemOID}"][Value="${odmPath.codeListItem}"]`)) subjectKeys.push(subject.key);
        }
    }

    return subjectKeys;
}

// TODO: This function is performance critical -- identify ways to improve the performance (e.g., batch loading of subject data using Promise.all())
export async function getAllData(options) {
    const data = {};
    for (const subject of subjects) {
        const subjectODMData = await ioHelper.getODM(subject.fileName);
        if (!subjectODMData) continue;

        const subjectData = {};
        for (const itemData of subjectODMData.querySelectorAll("ItemData")) {
            const studyEventOID = itemData.parentNode.parentNode.parentNode.getAttribute("StudyEventOID");
            const formOID = itemData.parentNode.parentNode.getAttribute("FormOID");
            const itemGroupOID = itemData.parentNode.getAttribute("ItemGroupOID");
            const itemOID = itemData.getAttribute("ItemOID");
            const path = new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID);

            const value = itemData.getAttribute("Value");
            if (value && value != "") subjectData[path.toString()] = value;
            else delete subjectData[path.toString()];
        }
        if (options && options.includeInfo) {
            const createdDate = subjectODMData.querySelector("AuditRecord DateTimeStamp") ? new Date(subjectODMData.querySelector("AuditRecord DateTimeStamp").textContent) : null;
            subjectData["createdYear"] = createdDate ? createdDate.getFullYear() : null;
            subjectData["createdMonth"] = createdDate ? createdDate.getMonth() + 1 : null;
            subjectData["siteOID"] = subjectODMData.querySelector("SiteRef") ? subjectODMData.querySelector("SiteRef").getAttribute("LocationOID") : "no-site";
        }

        data[subject.key] = subjectData;
    }

    return data;
}
