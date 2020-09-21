import * as clinicaldataTemplates from "./clinicaldatatemplates.js";
import * as ioHelper from "./iohelper.js";

const $ = query => odm.querySelector(query);
const $$ = query => odm.querySelectorAll(query);

let subjectKeys = [];
let subject = null;

export function addSubject(subjectKey) {
    subject = clinicaldataTemplates.getSubjectData(subjectKey);
    subjectKeys.push(subjectKey);
    subjectKeys.sort();
}

export function getSubjectKeys() {
    return subjectKeys;
}
