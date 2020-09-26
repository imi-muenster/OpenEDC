import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as conditionHelper from "./helper/conditionhelper.js";
import * as validationHelper from "./helper/validationhelper.js";
import * as htmlElements from "./helper/htmlelements.js";
import * as languageHelper from "./helper/languagehelper.js";

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
let skipMandatory = false;
let cachedFormData = null;

export function init() {
    currentElementID.subject = null;

    createSortTypeSelect();
    setIOListeners();

    clinicaldataHelper.loadSubjects();
}

export function show() {
    loadSubjectKeys();
    loadStudyEvents();

    $("#clinicaldata-section").classList.remove("is-hidden");
    $("#clinicaldata-toggle-button").classList.add("is-hidden");
    $("#survey-view-button").classList.remove("is-hidden");
}

export function hide() {
    $("#clinicaldata-section").classList.add("is-hidden");
    $("#clinicaldata-toggle-button").classList.remove("is-hidden");
    $("#survey-view-button").classList.add("is-hidden");
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
    let subjectKey = $("#add-subject-input").value;
    $("#add-subject-input").value = "";
    
    clinicaldataHelper.addSubject(subjectKey);
    loadSubjectKeys();
    if (subjectKey) loadSubjectData(subjectKey);
}

export function loadSubjectKeys() {
    ioHelper.removeElements($$("#subject-panel-blocks a"));

    if (clinicaldataHelper.getSubjectKeys().length > 0) $("#no-subjects-hint").classList.add("is-hidden");
    for (let subjectKey of clinicaldataHelper.getSubjectKeys($("#sort-subject-select-inner").value)) {
        let panelBlock = htmlElements.getPanelBlock(false, subjectKey, "", subjectKey);
        panelBlock.onclick = () => loadSubjectData(subjectKey);
        $("#subject-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.subject) $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).classList.add("is-active");
}

async function loadSubjectData(subjectKey) {
    currentElementID.subject = subjectKey;
    cachedFormData = null;

    ioHelper.removeIsActiveFromElements($$("#subject-panel-blocks a"));
    $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).classList.add("is-active");
    $("#subject-info-button").disabled = false;

    clinicaldataHelper.loadSubject(currentElementID.subject);
    await loadFormMetadata();
    loadFormClinicaldata();
}

// TODO: loadStudyEvents loads entire tree if according elements are selected, implement this analogously for metadatamodule
export function loadStudyEvents() {
    ioHelper.removeElements($$("#clinicaldata-study-event-panel-blocks a"));
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = () => {
            currentElementID.form = null;
            loadFormsByStudyEvent(studyEventDef.getAttribute("OID"));
        }
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.studyEvent) loadFormsByStudyEvent(currentElementID.studyEvent);
}

function loadFormsByStudyEvent(studyEventOID) {
    currentElementID.studyEvent = studyEventOID;
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-study-event-panel-blocks a"));
    $(`#clinicaldata-study-event-panel-blocks [oid="${currentElementID.studyEvent}"]`).classList.add("is-active");

    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-form-data").classList.add("is-hidden");
    $("#survey-view-button").disabled = true;

    for (let formDef of metadataHelper.getFormsByStudyEvent(studyEventOID)) {
        let translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, formDef.getAttribute("OID"), metadataHelper.elementTypes.FORM, translatedText, formDef.getAttribute("Name"));
        panelBlock.onclick = () => loadFormData(formDef.getAttribute("OID"));
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.form) loadFormData(currentElementID.form);
}

async function loadFormData(formOID) {
    currentElementID.form = formOID;
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-form-panel-blocks a"));
    $(`#clinicaldata-form-panel-blocks [oid="${currentElementID.form}"]`).classList.add("is-active");

    await loadFormMetadata();
    loadFormClinicaldata();
    $("#clinicaldata-form-data").classList.remove("is-hidden");
    $("#survey-view-button").disabled = false;
    skipMandatory = false;
}

async function loadFormMetadata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;

    let translatedText = metadataHelper.getElementDefByOID(currentElementID.form).querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        $("#clinicaldata-form-title").textContent = translatedText.textContent;
    } else {
        $("#clinicaldata-form-title").textContent = metadataHelper.getStudyName();
    }

    let form = await metadataHelper.getFormAsHTML(currentElementID.form, locale);
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-content").appendChild(form);

    conditionHelper.process(metadataHelper.getItemOIDSWithConditionByForm(currentElementID.form));
    validationHelper.process(metadataHelper.getItemOIDSWithRangeChecksByForm(currentElementID.form));

    !getPreviousFormOID(currentElementID.form) ? $("#clinicaldata-previous-button").disabled = true : $("#clinicaldata-previous-button").disabled = false;
    if (!getNextFormOID(currentElementID.form)) {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("Finish");
    } else {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("Continue");
    }
}

function loadFormClinicaldata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;
    currentElementID.subject ? $("#no-subject-selected-hint").classList.add("is-hidden") : $("#no-subject-selected-hint").classList.remove("is-hidden");

    let formItemDataList = cachedFormData ? cachedFormData : clinicaldataHelper.getSubjectFormData(currentElementID.studyEvent, currentElementID.form);
    for (let formItemData of formItemDataList) {
        let inputElement = $(`#clinicaldata-content [preview-oid="${formItemData.itemOID}"][preview-group-oid="${formItemData.itemGroupOID}"]`);
        switch (inputElement.getAttribute("type")) {
            case "text":
            case "date":
            case "select":
                inputElement.value = formItemData.value;
                inputElement.dispatchEvent(new Event("input"));
                break;
            case "radio":
                inputElement = $(`#clinicaldata-content [preview-oid="${formItemData.itemOID}"][preview-group-oid="${formItemData.itemGroupOID}"][value="${formItemData.value}"]`);
                inputElement.checked = true;
                inputElement.dispatchEvent(new Event("input"));
        }
    }

    cachedFormData = null;
}

window.loadNextFormData = async function() {
    // This checks whether the saving process could found unanswered mandatory fields. The form data is stored either way
    if (!saveFormData()) return;

    let nextFormOID = getNextFormOID(currentElementID.form);
    //TODO: Everywhere !nextFormOID
    if (nextFormOID != null) {
        currentElementID.form = nextFormOID
        await loadFormData(currentElementID.form);
        scrollToFormStart();
    } else {
        closeFormData();
    }
}

window.loadPreviousFormData = async function() {
    skipMandatory = true;
    saveFormData();

    let previousFormOID = getPreviousFormOID(currentElementID.form);
    if (previousFormOID != null) {
        currentElementID.form = previousFormOID
        await loadFormData(currentElementID.form);
        scrollToFormStart();
    }
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

window.closeFormData = function() {
    currentElementID.form = null;
    loadFormsByStudyEvent(currentElementID.studyEvent);
    if ($(".navbar").classList.contains("is-hidden")) {
        hideSurveyView();
        ioHelper.showWarning("Survey Finished", "Thank you for taking the survey. Please return the device now.");
    }
}

function scrollToFormStart() {
    // Scroll to the beginning of the form on desktop and mobile
    document.querySelector("#clinicaldata-form-data").scrollIntoView();
    document.querySelector("#clinicaldata-column").scrollIntoView();
}

function saveFormData() {
    let formItemDataList = getFormData();
    clinicaldataHelper.storeSubjectFormData(currentElementID.studyEvent, currentElementID.form, formItemDataList);

    // When mandatory fields were not answered show a warning only once
    if (!skipMandatory && !checkMandatoryFields(formItemDataList)) {
        skipMandatory = true;
        return false;
    } else {
        return true;
    }
}

function getFormData() {
    // TODO: Rename preview to metadata or something and also preview-group-id to something else
    let formItemDataList = [];
    for (let inputElement of $$("#clinicaldata-content [preview-oid]")) {
        let value = inputElement.value;
        let itemOID = inputElement.getAttribute("preview-oid");
        let itemGroupOID = inputElement.getAttribute("preview-group-oid");
        switch (inputElement.getAttribute("type")) {
            case "text":
            case "date":
            case "select":
                if (value) formItemDataList.push(new clinicaldataHelper.FormItemData(itemGroupOID, itemOID, value));
                break;
            case "radio":
                if (inputElement.checked) formItemDataList.push(new clinicaldataHelper.FormItemData(itemGroupOID, itemOID, value));
        }
    }

    return formItemDataList;
}

function checkMandatoryFields(formItemDataList) {
    let mandatoryFieldsAnswered = true;
    for (let mandatoryField of $$(".preview-field[mandatory='Yes']:not(.is-hidden)")) {
        if (!formItemDataList.find(formItemData => formItemData.itemGroupOID == mandatoryField.getAttribute("preview-field-group-oid") && formItemData.itemOID == mandatoryField.getAttribute("preview-field-oid"))) {
            if (mandatoryFieldsAnswered) ioHelper.showWarning(languageHelper.getTranslation("Problem"), languageHelper.getTranslation("unanswered-mandatory-questions-warning"));
            mandatoryField.classList.add("is-unanswered");
            mandatoryFieldsAnswered = false;
        }
    }

    return mandatoryFieldsAnswered;
}

export function cacheFormData() {
    cachedFormData = getFormData();
}

window.showSurveyView = function() {
    $(".navbar").classList.add("is-hidden");
    $("html").classList.remove("has-navbar-fixed-top");
    $("#subjects-column").classList.add("is-hidden");
    $("#clinicaldata-study-events-column").classList.add("is-hidden");
    $("#clinicaldata-forms-column").classList.add("is-hidden");
    $("#clinicaldata-column .panel").classList.add("is-shadowless");
    $("#clinicaldata-column .panel-heading").classList.add("is-hidden");
    $("#clinicaldata-column .panel").classList.add("is-shadowless");
    $("#clinicaldata-column").classList.remove("is-two-fifths");
    $("#clinicaldata-column").classList.add("is-full");
    $("#clinicaldata-column .tree-panel-blocks").classList.add("is-survey-view");
    $("#clinicaldata-section").classList.add("p-3");
    scrollToFormStart();
}

function hideSurveyView() {
    $(".navbar").classList.remove("is-hidden");
    $("html").classList.add("has-navbar-fixed-top");
    $("#subjects-column").classList.remove("is-hidden");
    $("#clinicaldata-study-events-column").classList.remove("is-hidden");
    $("#clinicaldata-forms-column").classList.remove("is-hidden");
    $("#clinicaldata-column .panel").classList.remove("is-shadowless");
    $("#clinicaldata-column .panel-heading").classList.remove("is-hidden");
    $("#clinicaldata-column .panel").classList.remove("is-shadowless");
    $("#clinicaldata-column").classList.add("is-two-fifths");
    $("#clinicaldata-column").classList.remove("is-full");
    $("#clinicaldata-column .tree-panel-blocks").classList.remove("is-survey-view");
    $("#clinicaldata-section").classList.remove("p-3");
}
