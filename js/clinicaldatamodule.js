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
let locale = null;

export function init() {
    currentElementID.subject = null;

    createSortTypeSelect();
    setIOListeners();

    clinicaldataHelper.loadSubjects();
}

export function show() {
    loadSubjectKeys();
    loadStudyEvents();
    if (currentElementID.studyEvent) loadFormsByStudyEvent(currentElementID.studyEvent);
    if (currentElementID.form) loadFormData(currentElementID.form);

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
    $("#sort-subject-select-inner").oninput = inputEvent => {
        loadSubjectKeys();
        inputEvent.target.blur();
    };
    $("#add-subject-input").onkeydown = keyEvent => {
        if (keyEvent.code == "Enter" && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            addSubject();
        }
    };
    $("#search-subject-input").oninput = inputEvent => filterSubjects(inputEvent.target.value);
    // TODO: Maybe improve or do it analogously in the metadatamodule. Maybe a "wrapper" function in app.js to do it more coordinated
    window.addEventListener("unload", () => clinicaldataHelper.storeSubject());
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
        panelBlock.onclick = () => loadSubjectData(subjectKey);
        $("#subject-panel-blocks").appendChild(panelBlock);
    }
}

function loadSubjectData(subjectKey) {
    clinicaldataHelper.loadSubject(subjectKey);
}

function loadStudyEvents() {
    ioHelper.removeElements($$("#clinicaldata-study-event-panel-blocks a"));
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = () => loadFormsByStudyEvent(studyEventDef.getAttribute("OID"));
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }
}

function loadFormsByStudyEvent(studyEventOID) {
    currentElementID.studyEvent = studyEventOID;
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-study-event-panel-blocks a"));
    $(`#clinicaldata-section [oid="${currentElementID.studyEvent}"]`).classList.add("is-active");

    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-form-data").classList.add("is-hidden");

    for (let formDef of metadataHelper.getFormsByStudyEvent(studyEventOID)) {
        let translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, formDef.getAttribute("OID"), metadataHelper.elementTypes.FORM, translatedText, formDef.getAttribute("Name"));
        panelBlock.onclick = () => loadFormData(formDef.getAttribute("OID"));
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }
}

async function loadFormData(formOID) {
    currentElementID.form = formOID;
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-form-panel-blocks a"));
    $(`#clinicaldata-section [oid="${currentElementID.form}"]`).classList.add("is-active");

    loadFormMetadata(currentElementID.form);
    loadFormClinicaldata(currentElementID.subject, currentElementID.studyEvent, currentElementID.form);
    $("#clinicaldata-form-data").classList.remove("is-hidden");
}

async function loadFormMetadata(formOID) {
    let translatedText = metadataHelper.getElementDefByOID(formOID).querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        $("#clinicaldata-form-title").textContent = translatedText.textContent;
    } else {
        $("#clinicaldata-form-title").textContent = metadataHelper.getStudyName();
    }

    let form = await metadataHelper.getFormAsHTML(formOID, locale);
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-content").appendChild(form);

    conditionHelper.process(metadataHelper.getItemOIDSWithConditionByForm(formOID));

    getNextFormOID(formOID) == null ? $("#clinicaldata-next-button").disabled = true : $("#clinicaldata-next-button").disabled = false;
    getPreviousFormOID(formOID) == null ? $("#clinicaldata-previous-button").disabled = true : $("#clinicaldata-previous-button").disabled = false;

    $("#clinicaldata-form-title").scrollIntoView({block: "end", behavior: "smooth"});
}

async function loadFormClinicaldata(subject, studyEvent, form) {
    if (!subject) {
        $("#no-subject-selected-hint").classList.remove("is-hidden");
        return;
    }

    $("#no-subject-selected-hint").classList.add("is-hidden");
}

window.loadNextFormData = async function() {
    let nextFormOID = getNextFormOID(currentElementID.form);
    if (nextFormOID != null) {
        currentElementID.form = nextFormOID
        await loadFormData(currentElementID.form);
    }
}

window.loadPreviousFormData = async function() {
    let previousFormOID = getPreviousFormOID(currentElementID.form);
    if (previousFormOID != null) {
        currentElementID.form = previousFormOID
        await loadFormData(currentElementID.form);
    }
}

window.closeClinicalData = function() {
    loadFormsByStudyEvent(currentElementID.studyEvent);
}

function getNextFormOID(previousFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);
    for (let i = 0; i < formDefs.length-1; i++) {
        if (formDefs[i].getAttribute("OID") == previousFormOID) return formDefs[i+1].getAttribute("OID");
    }
}

function getPreviousFormOID(nextFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);
    for (let i = 1; i < formDefs.length; i++) {
        if (formDefs[i].getAttribute("OID") == nextFormOID) return formDefs[i-1].getAttribute("OID");
    }
}
