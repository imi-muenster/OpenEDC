import * as clinicaldataTemplates from "./clinicaldatatemplates.js";
import * as ioHelper from "./iohelper.js";

class Subject {
    constructor(key, createdDate) {
        this.key = key;
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

const $ = query => subjectData.querySelector(query);
const $$ = query => subjectData.querySelectorAll(query);

const fileNameSeparator = "__";

export const sortTypes = {
    ALPHANUMERICALLY: "Alphanumerical",
    CREATEDDATE: "Creation date"
}

let subjects = [];
let subject = null;
let subjectData = null;

function parseSubjectData(subjectXMLString) {
    return new DOMParser().parseFromString(subjectXMLString, "text/xml").documentElement;
}

function getSerializedSubjectData() {
    return new XMLSerializer().serializeToString(subjectData);
}

export function importClinicalData(odmXMLString) {
    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    for (let subjectData of odm.querySelectorAll("ClinicalData SubjectData")) {
        // TODO: Take the created date from the audit trail
        const subject = new Subject(subjectData.getAttribute("SubjectKey"), new Date());
        const fileName = subjectToFilename(subject);
        localStorage.setItem(fileName, new XMLSerializer().serializeToString(subjectData));
    }
}

export function getClinicalData(studyOID, metadataVersionOID) {
    let clinicalData = clinicaldataTemplates.getClinicalData(studyOID, metadataVersionOID);
    for (let fileName of Object.keys(localStorage)) {
        if (fileName.split(fileNameSeparator).length > 1) {
            clinicalData.appendChild(parseSubjectData(localStorage.getItem(fileName)));
        }
    }

    return clinicalData;
}

export function loadSubjects() {
    for (let fileName of Object.keys(localStorage)) {
        if (fileName.split(fileNameSeparator).length > 1) subjects.push(fileNameToSubject(fileName));
    }
}

export function addSubject(subjectKey) {
    if (subjectKey.length == 0) {
        ioHelper.showWarning("Enter Subject Key", "Please enter a key for the subject first.");
        return;
    }

    if (subjects.map(subject => subject.key).includes(subjectKey)) {
        ioHelper.showWarning("Subject Key Existent", "The entered subject key already exists. Please enter another one.");
        return;
    }

    // Store the current subject
    storeSubject();

    subjectData = clinicaldataTemplates.getSubjectData(subjectKey);
    subject = new Subject(subjectKey, new Date());
    subjects.push(subject);

    // Store the newly created subject
    storeSubject();
}

export function getSubjectKeys(sortOrder) {
    if (sortOrder) sortSubjects(sortOrder);
    return subjects.map(subject => subject.key);
}

function sortSubjects(sortType) {
    switch(sortType) {
        case sortTypes.ALPHANUMERICALLY:
            subjects.sort((a, b) => a.key > b.key ? 1 : (a.key < b.key ? -1 : 0));
            break;
        case sortTypes.CREATEDDATE:
            subjects.sort((a, b) => a.createdDate > b.createdDate ? 1 : (a.createdDate < b.createdDate ? -1 : 0));
    }
}

export function loadSubject(subjectKey) {
    // Store the current subject
    storeSubject();

    subject = subjects.find(subject => subject.key == subjectKey);
    subjectData = subjectKey ? parseSubjectData(localStorage.getItem(subjectToFilename(subject))) : null;
    console.log(subjectData);
}

export function storeSubject() {
    if (!subject) return;
    
    const fileName = subjectToFilename(subject);
    localStorage.setItem(fileName, getSerializedSubjectData());
}

export function clearSubject() {
    subject = null;
}

function fileNameToSubject(fileName) {
    return new Subject(fileName.split(fileNameSeparator)[0], new Date(parseInt(fileName.split(fileNameSeparator)[1])));
}

function subjectToFilename(subject) {
    return subject.key + fileNameSeparator + subject.createdDate.getTime();
}

export function storeSubjectFormData(studyEventOID, formOID, formItemDataList) {
    // Do not store any data if no subject has been loaded or the formdata to be stored did not change compared to the previous one
    if (!subject || !dataHasChanged(formItemDataList, studyEventOID, formOID)) return;

    let studyEventData = clinicaldataTemplates.getStudyEventData(studyEventOID);
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
    studyEventData.appendChild(formData);
    subjectData.appendChild(studyEventData);

    // TODO: Really neccessary?
    storeSubject();
}

export function getSubjectFormData(studyEventOID, formOID) {
    if (!subject) return [];

    let formData = getLastElement($$(`StudyEventData[StudyEventOID="${studyEventOID}"] FormData[FormOID="${formOID}"]`));
    if (!formData) return [];

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
    return JSON.stringify(formItemDataList) != JSON.stringify(getSubjectFormData(studyEventOID, formOID));
}

// TODO: Move to ioHelper? Also present in metadatahelper
function getLastElement(elements) {
    if (elements.length >= 1) {
        return elements[elements.length - 1];
    } else {
        return null;
    }
}
