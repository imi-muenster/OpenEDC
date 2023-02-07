import ODMPath from "./odmpath.js";
import * as clinicaldataTemplates from "../odmtemplates/clinicaldatatemplates.js";
import * as metadataWrapper from "./metadatawrapper.js";
import * as admindataWrapper from "./admindatawrapper.js";
import * as languageHelper from "../helper/languagehelper.js";
import * as ioHelper from "../helper/iohelper.js";
import { currentSubjectKey } from "../clinicaldatamodule.js";
import { promisifyRequest } from "../helper/indexeddbhelper.js";

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
    CREATEDDATE_ASC: "creation-date-asc",
    CREATEDDATE_DESC: "creation-date-desc",
    ALPHANUMERICALLY_AZ: "alphanumerical-asc",
    ALPHANUMERICALLY_ZA: "alphanumerical-desc"
};

export const dateFilterTypes = {
    TODAY: "today",
    LAST_7_DAYS: "last-7-days",
    LAST_30_DAYS: "last-30-days",
    ALL: "all"
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
let pendingStudyEventsOIDsRepeating = [];

export async function importClinicaldata(odmXMLString) {
    // For performance reasons of IndexedDB, store serialized clinical data in bulk
    const xmlSerializer = new XMLSerializer();
    const subjectFileNameList = [];
    const subjectDataList = [];

    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    for (subjectData of odm.querySelectorAll("ClinicalData SubjectData")) {
        const siteOID = $("SiteRef")?.getAttribute("LocationOID");
        const creationDate = $("AuditRecord DateTimeStamp") ? new Date($("AuditRecord DateTimeStamp").textContent) : new Date();
        const subject = new Subject(subjectData.getAttribute("SubjectKey"), siteOID, creationDate, null, await getDataStatus(subjectData.getAttribute("SubjectKey"), subjectData));
        subjectFileNameList.push(subject.fileName);
        subjectDataList.push(xmlSerializer.serializeToString(subjectData));
    }
    if (subjectDataList.length) await ioHelper.setODMBulk(subjectFileNameList, subjectDataList);
}

export async function loadExample() {
    const exampleResponse = await fetch(ioHelper.getBaseURL() + "/example/clinicaldata.xml");
    const odmXMLString = await exampleResponse.text();
    
    await importClinicaldata(odmXMLString);
    await loadSubjects();
}

async function loadStoredSubjectData(fileName) {
    const xmlData = await ioHelper.getODM(fileName);
    return xmlData.documentElement;
}

export function getSubject(uniqueKey) {
    return uniqueKey ? subjects.find(subject => subject.uniqueKey == uniqueKey) : subject;
}

export function getLastUpdate() {
    return clinicaldataFile.modifiedDate.getTime();
}

export async function getClinicalData(studyOID, metadataVersionOID) {
    let clinicalData = clinicaldataTemplates.getClinicalData(studyOID, metadataVersionOID);

    for (let subject of getSubjects(admindataWrapper.getCurrentUserSiteOID(), sortOrderTypes.CREATEDDATE_ASC)) {
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
                ioHelper.dispatchGlobalEvent("CurrentSubjectEdited");
            }
        });
    }

    // Evaluate whether data conflicts are present (i.e., multiple users edited the same subject at the same time)
    //const dateFilter = $("#date-filter-subject-select-inner")?.value;
    subjects = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY_AZ, dateFilterTypes.ALL);
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

export function getSubjects(siteOID, sortOrder, dateFilter = null) {
    let filteredSubjects = siteOID ? subjects.filter(subject => subject.siteOID == siteOID) : subjects;
    filteredSubjects = (sortOrder || dateFilter ? sortSubjects(filteredSubjects, sortOrder, dateFilter) : filteredSubjects);

    return filteredSubjects;
}

function sortSubjects(subjects, sortOrder, dateFilter = null) {
    if(dateFilter) {
        const today = new Date();
        switch (dateFilter) {
            case dateFilterTypes.TODAY:
                subjects = subjects.filter(subject => today.toDateString() === new Date(subject.createdDate).toDateString());
                break;
            case dateFilterTypes.LAST_7_DAYS:
                subjects = subjects.filter(subject => today.getTime() - new Date(subject.createdDate).getTime() < 24*3600*1000);
                break;
            case dateFilterTypes.LAST_30_DAYS:
                subjects = subjects.filter(subject => today.getTime() - new Date(subject.createdDate).getTime() < 30*24*3600*1000);
                break
            case dateFilterTypes.ALL:
                break
        }
    }
    if(sortOrder) {
        switch (sortOrder) {
            case sortOrderTypes.CREATEDDATE_ASC:
                subjects.sort((a, b) => a.createdDate > b.createdDate ? 1 : (a.createdDate < b.createdDate ? -1 : 0));
                break;
            case sortOrderTypes.CREATEDDATE_DESC:
                subjects.sort((a, b) => a.createdDate < b.createdDate ? 1 : (a.createdDate > b.createdDate ? -1 : 0));
                break;
            case sortOrderTypes.ALPHANUMERICALLY_AZ:
                if (ioHelper.getSetting("subjectKeyMode") == ioHelper.subjectKeyModes.AUTO) subjects.sort((a, b) => a.keyInt > b.keyInt ? 1 : (a.keyInt < b.keyInt ? -1 : 0));
                else subjects.sort((a, b) => a.key > b.key ? 1 : (a.key < b.key ? -1 : 0));
                break
            case sortOrderTypes.ALPHANUMERICALLY_ZA:
                if (ioHelper.getSetting("subjectKeyMode") == ioHelper.subjectKeyModes.AUTO) subjects.sort((a, b) => a.keyInt < b.keyInt ? 1 : (a.keyInt > b.keyInt ? -1 : 0));
                else subjects.sort((a, b) => a.key < b.key ? 1 : (a.key > b.key ? -1 : 0));
                break
        }
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

async function loadSubjectData(subjectKey) {
    subject = subjects.find(subject => subject.uniqueKey == subjectKey.toLowerCase());
    if (subject) return await loadStoredSubjectData(subject.fileName);
}

export async function storeSubject(subjectToStore, subjectDataToStore, disabledEncryption = false) {
    if(!subjectToStore || !subjectDataToStore) {
        subjectToStore = subject;
        subjectDataToStore = subjectData;
    }
    if (!subjectToStore) return;
    console.log("Store subject ...");

    const previousFileName = subjectToStore.fileName;
    const modifiedDate = new Date();

    subjectToStore.status = await getDataStatus(subjectToStore.uniqueKey, subjectDataToStore);
    subjectToStore.modifiedDate = modifiedDate;
    clinicaldataFile = new ClinicaldataFile(modifiedDate);
    await ioHelper.setODM(subjectToStore.fileName, subjectDataToStore, disabledEncryption);

    // This mechanism helps to prevent possible data loss when multiple users edit the same subject data at the same time (especially important for the offline mode)
    // If the previousFileName cannot be removed, the system keeps multiple current versions of the subject data and the user is notified that conflicting data exists
    if (previousFileName != subjectToStore.fileName) await ioHelper.removeODM(previousFileName);
    ioHelper.dispatchGlobalEvent('SubjectStored', {uniqueKey: subjectToStore.uniqueKey});
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

export async function deactivateEncryptionForSubjects() {
    let subjectsToLoad = subjects.map(async subject => {
        return new Promise(async resolve => {
            resolve({
                subject,
                subjectData: await loadSubjectData(subject.key)
            });
        });
    });
    return await Promise.all(subjectsToLoad).then(async loadedSubjects => {
        for await (let loadedSubject of loadedSubjects) {
            await storeSubject(loadedSubject.subject, loadedSubject.subjectData, true);
        };
        return true;
    });
}

export async function storeSubjectFormData(studyEventOID, formOID, formItemDataList, dataStatus, studyEventRepeatKey) {
    if (!subject) return;

    const currentDataStatus = getDataStatusForForm({studyEventOID, formOID, studyEventRepeatKey});

    // Do not store data if neither the formdata nor the data status changed
    const formDataDifference = getFormDataDifference(formItemDataList, studyEventOID, formOID, studyEventRepeatKey);
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

    let studyEventData = null;
    if (studyEventRepeatKey) {
        studyEventData = $(`StudyEventData[StudyEventOID="${studyEventOID}"][StudyEventRepeatKey="${studyEventRepeatKey}"]`) || clinicaldataTemplates.getStudyEventData(studyEventOID, studyEventRepeatKey);
    } else {
        studyEventData = $(`StudyEventData[StudyEventOID="${studyEventOID}"]`) || clinicaldataTemplates.getStudyEventData(studyEventOID);
    }

    formData.setAttribute("TransactionType", studyEventData.querySelector(`FormData[FormOID="${formOID}"]`) ? "Update" : "Insert");
    studyEventData.appendChild(formData);
    subjectData.appendChild(studyEventData);

    await storeSubject();
}

function getFormDataElements({studyEventOID, formOID, studyEventRepeatKey, subjectDataToCheck}) {
    if(!subjectDataToCheck) subjectDataToCheck = subjectData;
    if (studyEventRepeatKey) {
        return subjectDataToCheck.querySelectorAll(`StudyEventData[StudyEventOID="${studyEventOID}"][StudyEventRepeatKey="${studyEventRepeatKey}"] FormData[FormOID="${formOID}"]`);
    } else {
        return  subjectDataToCheck.querySelectorAll(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`);
    }
}

// TODO: Can this be performance improved? (e.g., caching formItemDataList for getFormDataDifference())
export function getSubjectFormData(studyEventOID, formOID, studyEventRepeatKey) {
    return !subject ? [] : getFormItemDataList(getFormDataElements({studyEventOID, formOID, studyEventRepeatKey}));
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

// TODO: Can this be performance improved?
export function getFormDataDifference(formItemDataList, studyEventOID, formOID, studyEventRepeatKey) {

    // First, add or edit item data that was entered
    const formDataDifference = [];
    const currentItemDataList = getSubjectFormData(studyEventOID, formOID, studyEventRepeatKey);
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
    const subjectsWithIntKeys = sortSubjects(subjects, sortOrderTypes.ALPHANUMERICALLY_AZ).filter(subject => subject.keyInt);
    const highestNumber = subjectsWithIntKeys.length ? subjectsWithIntKeys[subjectsWithIntKeys.length - 1].key : 0;
    const subjectKey = parseInt(highestNumber) + 1;

    return subjectKey.toString();
}

export async function getDataStatus(subjectKey, subjectDataToCheck) {
    const studyEventOIDs = metadataWrapper.getStudyEventOIDs();
    if(!subjectDataToCheck) subjectDataToCheck = subjectData;
    let dataStates = [];
    for await (const studyEventOID of studyEventOIDs) {
        if(metadataWrapper.isStudyEventRepeating(studyEventOID)) {
            let keys = await getStudyEventRepeatKeys(studyEventOID, subjectKey ? subjectKey : subject.uniqueKey, subjectDataToCheck);
            let states = keys.map(studyEventRepeatKey => getDataStatusForStudyEvent({studyEventOID, studyEventRepeatKey, subjectDataToCheck}));
            dataStates = dataStates.concat(states);
        }   
        else
            dataStates.push(getDataStatusForStudyEvent({studyEventOID, subjectDataToCheck}));
    }
    if(dataStates.length == 0) return dataStatusTypes.EMPTY;
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED)) return dataStatusTypes.VALIDATED;
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE)) return dataStatusTypes.COMPLETE;
    if (dataStates.some(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE || item == dataStatusTypes.INCOMPLETE)) return dataStatusTypes.INCOMPLETE;
    
    return dataStatusTypes.EMPTY;
}

export async function getStudyEventRepeatKeys(studyEventOID, subjectKey, subjectDataToCheck) {
    if(!subjectKey) return [];
    let data = subjectDataToCheck;
    if(!data) data = subjectData;
    if(!data && subjectKey) {
        data = await loadStoredSubjectData(getSubject(subjectKey).fileName);
        subjectData = data;
    }
    if(subject && !subjectDataToCheck && subjectKey !== subject.uniqueKey)  data = await loadStoredSubjectData(getSubject(subjectKey).fileName);
    return Array.from(data?.querySelectorAll(`StudyEventData[StudyEventOID="${studyEventOID}"]`) ?? []).map(event => parseInt(event.getAttribute("StudyEventRepeatKey"))).sort((a,b) => a-b);
}

export function getDataStatusForStudyEvent({studyEventOID, studyEventRepeatKey, subjectDataToCheck}) {
    const dataStates = metadataWrapper.getFormOIDsByStudyEvent(studyEventOID).map(formOID => getDataStatusForForm({studyEventOID, formOID, studyEventRepeatKey, subjectDataToCheck}));
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED)) return dataStatusTypes.VALIDATED;
    if (dataStates.every(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE)) return dataStatusTypes.COMPLETE;
    if (dataStates.some(item => item == dataStatusTypes.VALIDATED || item == dataStatusTypes.COMPLETE || item == dataStatusTypes.INCOMPLETE)) return dataStatusTypes.INCOMPLETE;
    
    return dataStatusTypes.EMPTY;
}

export function getDataStatusForForm({studyEventOID, formOID, studyEventRepeatKey, subjectDataToCheck}) {
    if(!subjectDataToCheck) subjectDataToCheck = subjectData;
    const formDataElement = getFormDataElements({studyEventOID, formOID, studyEventRepeatKey, subjectDataToCheck}).getLastElement();
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

// TODO: The following functions are performance critical -- identify ways to improve the performance (e.g., batch loading of subject data using Promise.all())
export async function getAllData(options) {
    const data = {};
    for (const subject of getSubjects(admindataWrapper.getCurrentUserSiteOID())) {
        const subjectODMData = await ioHelper.getODM(subject.fileName);
        if (!subjectODMData) continue;

        data[subject.key] = formatSubjectData(subjectODMData, options);
    }

    return data;
}

export function getCurrentData(options) {
    return subjectData ? formatSubjectData(subjectData, options) : {};
}

function formatSubjectData(subjectODMData, options) {
    const subjectData = {};
    let subjectItemData = subjectODMData.querySelectorAll("ItemData");

    //filter for the correct studyEventRepeatKey
    if(options.studyEventRepeatKey){
        subjectItemData = [...subjectItemData].filter(itemData => {
            return !itemData.closest('StudyEventData').getAttribute("StudyEventRepeatKey") ||
            itemData.closest('StudyEventData').getAttribute("StudyEventRepeatKey") == options.studyEventRepeatKey;
        });
    }
        
    for (const itemData of subjectItemData) {   
        const studyEventOID = itemData.closest('StudyEventData').getAttribute("StudyEventOID");
        const formOID = itemData.closest('FormData').getAttribute("FormOID");
        const itemGroupOID = itemData.closest('ItemGroupData').getAttribute("ItemGroupOID");
        const itemOID = itemData.getAttribute("ItemOID");
        const path = new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID);
        const repeatKey = itemData.closest('StudyEventData').getAttribute('StudyEventRepeatKey');

        const value = itemData.getAttribute("Value");
        if (value && value != "") subjectData[path.toString() + (!options.studyEventRepeatKey && repeatKey ? `-${repeatKey}` : '')] = value;
        else delete subjectData[path.toString()];
    }
    if (options && options.includeInfo) {
        const createdDate = subjectODMData.querySelector("AuditRecord DateTimeStamp") ? new Date(subjectODMData.querySelector("AuditRecord DateTimeStamp").textContent) : null;
        subjectData["createdDate"] = createdDate ? createdDate.toLocaleDateString() : null;
        subjectData["createdTime"] = createdDate ? createdDate.toLocaleTimeString() : null;
        subjectData["createdYear"] = createdDate ? createdDate.getFullYear() : null;
        subjectData["createdMonth"] = createdDate ? createdDate.getMonth() + 1 : null;
        subjectData["siteOID"] = subjectODMData.querySelector("SiteRef") ? subjectODMData.querySelector("SiteRef").getAttribute("LocationOID") : "no-site";
    }

    return subjectData;
}

export async function checkStudyEventDataRepeating({studyEventOID, boolRepeating}){
    if(boolRepeating === metadataWrapper.isStudyEventRepeating(studyEventOID)) return false;
    let subjectsToLoad = subjects.map(async subject => {
        return new Promise(async resolve => {
            resolve({
                subject,
                subjectData: await loadSubjectData(subject.key)
            });
        });
    });
    return await Promise.all(subjectsToLoad).then(async loadedSubjects => {
        if(!boolRepeating && checkSubjectsHaveRepeatKey(studyEventOID, loadedSubjects.map(loadedSubject => loadedSubject.subjectData))) return false;
        return true;
    });
}

export async function setStudyEventDataRepeating({studyEventOID, boolRepeating}, skipAlreadyChangedCheck) {
    const alreadyChanged = boolRepeating === metadataWrapper.isStudyEventRepeating(studyEventOID);
    if(alreadyChanged && !skipAlreadyChangedCheck) return false;
    
    let subjectsToLoad = subjects.map(async subject => {
        return new Promise(async resolve => {
            resolve({
                subject,
                subjectData: await loadSubjectData(subject.key)
            });
        });
    });
    return await Promise.all(subjectsToLoad).then(async loadedSubjects => {
        if(!boolRepeating && checkSubjectsHaveRepeatKey(studyEventOID, loadedSubjects.map(loadedSubject => loadedSubject.subjectData))) return false;
        if(!boolRepeating) return true;
        
        //at this point we know, we want to set repeating to "yes"
        for await (let loadedSubject of loadedSubjects) {
            //we only need to update subjects, that already have an entry for the given studyevent
            //there can only be one studyEventData entry at this point
            loadedSubject.subjectData.querySelector(`StudyEventData[StudyEventOID="${studyEventOID}"]`)?.setAttribute("StudyEventRepeatKey", "1");
            await storeSubject(loadedSubject.subject, loadedSubject.subjectData);
        };
        return true;
    });
}

export function checkSubjectsHaveRepeatKey(studyEventOID, subjectsData) {
    for(let subjectData of subjectsData){
        if(subjectData.querySelector(`StudyEventData[StudyEventOID="${studyEventOID}"`)?.getAttribute("StudyEventRepeatKey")) return true;
    }
    return false;
}

export function addPendingStudyEventRepeatChange(pendingChange) {
    pendingStudyEventsOIDsRepeating.push(pendingChange);
}

export function clearPendingStudyEventRepeatChanges() {
    pendingStudyEventsOIDsRepeating = [];
}

export async function resolvePendingChanges() {
    for await (let change of pendingStudyEventsOIDsRepeating) {
        if(!await setStudyEventDataRepeating(change, true)) return false;
    }
    return true;
}
