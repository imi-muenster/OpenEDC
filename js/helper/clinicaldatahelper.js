import * as clinicaldataTemplates from "./clinicaldatatemplates.js";
import * as ioHelper from "./iohelper.js";

class Subject {
    constructor(key, createdDate) {
        this.key = key;
        this.createdDate = createdDate;
    }
}

const $ = query => odm.querySelector(query);
const $$ = query => odm.querySelectorAll(query);

export const sortTypes = {
    ALPHANUMERICALLY: "Alphanumerical",
    CREATEDDATE: "Created"
}

let subjects = [];
let subjectData = null;

export function addSubject(subjectKey) {
    subjectData = clinicaldataTemplates.getSubjectData(subjectKey);
    subjects.push(new Subject(subjectKey, new Date()));
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
