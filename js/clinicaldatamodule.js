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

    createSortTypeSelect();
    setIOListeners();
}

export function show() {
    loadSubjectKeys();
    loadStudyEvents();

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

function createSortTypeSelect() {
    $("#sort-subject-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("sort-subject-select", true, true, Object.values(clinicaldataHelper.sortTypes), clinicaldataHelper.sortTypes.ALPHABETICALLY));
}

function setIOListeners() {
    $("#sort-subject-select-inner").oninput = loadSubjectKeys;
    $("#add-subject-input").onkeydown = keyEvent => {
        if (keyEvent.code == "Enter" && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            addSubject();
        }
    };
    $("#search-subject-input").oninput = inputEvent => filterSubjects(inputEvent.target.value);
}

function filterSubjects(searchString) {
    searchString = searchString.toUpperCase();
    for (let subject of document.querySelectorAll("#subject-panel-blocks a")) {
        if (subject.textContent.toUpperCase().includes(searchString)) {
            subject.classList.remove("is-hidden");
        } else {
            subject.classList.add("is-hidden");
        }
    }
}

window.addSubject = function() {
    clinicaldataHelper.addSubject($("#add-subject-input").value);
    $("#add-subject-input").value = "";
    loadSubjectKeys();
}

export function loadSubjectKeys() {
    ioHelper.removeElements($$("#subject-panel-blocks a"));
    if (clinicaldataHelper.getSubjectKeys().length > 0) $("#no-subjects-hint").classList.add("is-hidden");
    for (let subjectKey of clinicaldataHelper.getSubjectKeys($("#sort-subject-select-inner").value)) {
        let panelBlock = htmlElements.getPanelBlock(false, subjectKey, "", subjectKey);
        // panelBlock.onclick = subjectClicked;
        $("#subject-panel-blocks").appendChild(panelBlock);
    }
}

export function loadStudyEvents() {
    ioHelper.removeElements($$("#clinicaldata-study-event-panel-blocks a"));
    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        // panelBlock.onclick = studyEventClicked;
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }
}
