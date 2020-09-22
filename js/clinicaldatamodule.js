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
}

export function show() {
    loadSubjectKeys();
    loadStudyEvents();

    $("#clinicaldata-section").classList.remove("is-hidden");
    $("#clinicaldata-toggle-button").classList.add("is-hidden");

    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-form-data").classList.add("is-hidden");
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
        inputEvent.target.blur();
        loadSubjectKeys;
    };
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
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = studyEventClicked;
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }
}

function studyEventClicked(event) {
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-study-event-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.studyEvent = event.target.getAttribute("oid");
    loadFormsByStudyEvent(currentElementID.studyEvent);

    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-form-data").classList.add("is-hidden");
}

function loadFormsByStudyEvent(studyEventOID) {
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let formDef of metadataHelper.getFormsByStudyEvent(studyEventOID)) {
        let translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, formDef.getAttribute("OID"), metadataHelper.elementTypes.FORM, translatedText, formDef.getAttribute("Name"));
        panelBlock.onclick = formClicked;
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }
}

async function formClicked(event) {
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-form-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.form = event.target.getAttribute("oid");
    await loadClinicaldataMetadata(currentElementID.form);
    $("#clinicaldata-form-data").classList.remove("is-hidden");
}

async function loadClinicaldataMetadata(formOID) {
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

window.loadNextClinicaldataMetadata = async function() {
    let nextFormOID = getNextFormOID($("#preview-modal").getAttribute("preview-form-oid"));

    if (nextFormOID != null) {
        $("#preview-next-button").classList.add("is-loading");
        await loadFormPreview(nextFormOID);
        $("#preview-next-button").classList.remove("is-loading");
    }
}

window.loadPreviousClinicaldataMetadata = async function() {
    let previousFormOID = getPreviousFormOID($("#preview-modal").getAttribute("preview-form-oid"));

    if (previousFormOID != null) {
        $("#preview-previous-button").classList.add("is-loading");
        await loadFormPreview(previousFormOID);
        $("#preview-previous-button").classList.remove("is-loading");
    }
}

function getNextFormOID(previousFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);

    let nextFormOID = null;
    for (let i = 0; i < formDefs.length-1; i++) {
        if (formDefs[i].getAttribute("OID") == previousFormOID) nextFormOID = formDefs[i+1].getAttribute("OID");
    }

    return nextFormOID;
}

function getPreviousFormOID(nextFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);

    let previousFormOID = null;
    for (let i = 1; i < formDefs.length; i++) {
        if (formDefs[i].getAttribute("OID") == nextFormOID) previousFormOID = formDefs[i-1].getAttribute("OID");
    }

    return previousFormOID;
}
