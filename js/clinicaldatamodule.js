import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as conditionHelper from "./helper/conditionhelper.js";
import * as htmlElements from "./helper/htmlelements.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

// Holds the OID of the currently selected SE, F, IG, I, and CL, as well as the CodedValue of the CLI
let currentElementID = {
    subject: null,
    studyEvent: null,
    form: null
}

// Further auxiliary variables
let currentElementType = null;
let locale = null;

export function init() {
    currentElementID.subject = null;
    currentElementType = null;

    setIOListeners();
}

export function show() {
    $("#clinicaldata-section").classList.remove("is-hidden");
    $("#clinicaldata-toggle-button").classList.add("is-hidden");
}

export function hide() {
    $("#clinicaldata-section").classList.add("is-hidden");
    $("#clinicaldata-toggle-button").classList.remove("is-hidden");
}

export function setLanguage(newLocale) {
    locale = newLocale;
}

function setIOListeners() {
    
}

window.addSubject = function() {
    if ($("#add-subject-input").value.length == 0) {
        ioHelper.showWarning("Enter Subject Key", "Please enter a key for the subject first.");
        return;
    }

    clinicaldataHelper.addSubject($("#add-subject-input").value);
    $("#add-subject-input").value = "";
    loadSubjectKeys();
}

export function loadSubjectKeys() {
    ioHelper.removeElements($$("#subject-panel-blocks a"));
    if (clinicaldataHelper.getSubjectKeys().length > 0) $("#no-subjects-hint").classList.add("is-hidden");
    for (let subjectKey of clinicaldataHelper.getSubjectKeys()) {
        let panelBlock = htmlElements.getPanelBlock(subjectKey, "", subjectKey);
        // panelBlock.onclick = subjectClicked;
        $("#subject-panel-blocks").appendChild(panelBlock);
    }
}
