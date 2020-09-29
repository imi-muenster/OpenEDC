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
let skipMandatoryCheck = false;
let skipDataHasChangedCheck = false;
let cachedFormData = null;
let cachedFormDataIsAuditRecord = false;
let deferredFunction = null;

export function init() {
    currentElementID.subject = null;

    createSortTypeSelect();
    setIOListeners();

    clinicaldataHelper.loadSubjects();
}

export function show() {
    loadSubjectKeys();
    // TODO: Improve the show and hide logic. Should be handled by the clinicaldatamodule instead of app.js to stop the mode-toggling if new data has just been entered.
    skipDataHasChangedCheck = true;
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
    $("#subject-modal input").oninput = inputEvent => $("#subject-modal button").disabled = inputEvent.target.value.length > 0 ? false : true;
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
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => addSubject();
        $("#close-clinicaldata-modal").classList.add("is-active");
        return;
    }

    let subjectKey = $("#add-subject-input").value;
    $("#add-subject-input").value = "";
    
    clinicaldataHelper.addSubject(subjectKey);
    loadSubjectKeys();
    skipDataHasChangedCheck = true;
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
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = async () => await loadSubjectData(subjectKey);
        $("#close-clinicaldata-modal").classList.add("is-active");
        return;
    }

    // Option to deselect a subject by clicking on the same subject again
    if (subjectKey == currentElementID.subject) subjectKey = null;

    currentElementID.subject = subjectKey;
    cachedFormData = null;

    ioHelper.removeIsActiveFromElement($("#subject-panel-blocks a.is-active"));
    if (currentElementID.subject) $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).classList.add("is-active");
    $("#subject-info-button").disabled = currentElementID.subject ? false : true;

    clinicaldataHelper.loadSubject(currentElementID.subject);
    await loadFormMetadata();
    loadFormClinicaldata();

    skipMandatoryCheck = false;
    skipDataHasChangedCheck = false;

    // If the subject was deselected, scroll to the form start to show the no-subject-selected-hint
    if (!currentElementID.subject && currentElementID.studyEvent && currentElementID.form) scrollToFormStart();
}

// TODO: loadStudyEvents loads entire tree if according elements are selected, implement this analogously for metadatamodule
export async function loadStudyEvents() {
    ioHelper.removeElements($$("#clinicaldata-study-event-panel-blocks a"));
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = () => loadFormsByStudyEvent(studyEventDef.getAttribute("OID"), true);
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.studyEvent) await loadFormsByStudyEvent(currentElementID.studyEvent, false);
}

async function loadFormsByStudyEvent(studyEventOID, closeForm) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => loadFormsByStudyEvent(studyEventOID, closeForm);
        $("#close-clinicaldata-modal").classList.add("is-active");
        return;
    }

    currentElementID.studyEvent = studyEventOID;
    ioHelper.removeIsActiveFromElement($("#clinicaldata-study-event-panel-blocks a.is-active"));
    $(`#clinicaldata-study-event-panel-blocks [oid="${currentElementID.studyEvent}"]`).classList.add("is-active");

    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-form-data").classList.add("is-hidden");
    if (closeForm) currentElementID.form = null;

    for (let formDef of metadataHelper.getFormsByStudyEvent(studyEventOID)) {
        let translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, formDef.getAttribute("OID"), metadataHelper.elementTypes.FORM, translatedText, formDef.getAttribute("Name"));
        panelBlock.onclick = () => loadFormData(formDef.getAttribute("OID"));
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.form) await loadFormData(currentElementID.form);
}

async function loadFormData(formOID) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = async () => await loadFormData(formOID);
        $("#close-clinicaldata-modal").classList.add("is-active");
        return;
    }

    currentElementID.form = formOID;
    ioHelper.removeIsActiveFromElement($("#clinicaldata-form-panel-blocks a.is-active"));
    $(`#clinicaldata-form-panel-blocks [oid="${currentElementID.form}"]`).classList.add("is-active");

    await loadFormMetadata();
    loadFormClinicaldata();
    $("#clinicaldata-form-data").classList.remove("is-hidden");

    skipMandatoryCheck = false;
    skipDataHasChangedCheck = false;

    // Handle cachedData, that is usually cached when the language is changed
    cachedFormDataIsAuditRecord ? showAuditRecordDataView() : hideAuditRecordDataView();
    cachedFormDataIsAuditRecord = false;
    cachedFormData = null;
}

async function loadFormMetadata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;

    let translatedText = metadataHelper.getElementDefByOID(currentElementID.form).querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        $("#clinicaldata-form-title .subtitle").textContent = ioHelper.shortenText(translatedText.textContent, 15);
    } else {
        $("#clinicaldata-form-title .subtitle").textContent = ioHelper.shortenText(metadataHelper.getStudyName(), 15);
    }

    let form = await metadataHelper.getFormAsHTML(currentElementID.form, locale);
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-content").appendChild(form);

    conditionHelper.process(metadataHelper.getItemOIDSWithConditionByForm(currentElementID.form));
    validationHelper.process(metadataHelper.getItemOIDSWithRangeChecksByForm(currentElementID.form));

    !getPreviousFormOID(currentElementID.form) ? $("#clinicaldata-previous-button").disabled = true : $("#clinicaldata-previous-button").disabled = false;
    if (!getNextFormOID(currentElementID.form)) {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("finish");
    } else {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("continue");
    }
}

function loadFormClinicaldata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;
    currentElementID.subject ? $("#no-subject-selected-hint").classList.add("is-hidden") : $("#no-subject-selected-hint").classList.remove("is-hidden");

    // Two types of errors than can occur during the data loading process
    let metadataNotFoundErrors = [];
    let hiddenFieldWithValueError = false;

    let formItemDataList = cachedFormData ? cachedFormData : clinicaldataHelper.getSubjectFormData(currentElementID.studyEvent, currentElementID.form);
    for (let formItemData of formItemDataList) {
        let fieldElement = $(`#clinicaldata-content [preview-field-oid="${formItemData.itemOID}"][preview-field-group-oid="${formItemData.itemGroupOID}"]`);
        let inputElement = $(`#clinicaldata-content [preview-oid="${formItemData.itemOID}"][preview-group-oid="${formItemData.itemGroupOID}"]`);
        if (!inputElement) {
            metadataNotFoundErrors.push({type: metadataHelper.elementTypes.ITEM, oid: formItemData.itemOID});
            continue;
        }
        switch (inputElement.getAttribute("type")) {
            case "text":
            case "date":
            case "select":
                inputElement.value = formItemData.value;
                if (!fieldElement.classList.contains("is-hidden")) inputElement.dispatchEvent(new Event("input"));
                break;
            case "radio":
                inputElement = $(`#clinicaldata-content [preview-oid="${formItemData.itemOID}"][preview-group-oid="${formItemData.itemGroupOID}"][value="${formItemData.value}"]`);
                if (!inputElement) {
                    metadataNotFoundErrors.push({type: metadataHelper.elementTypes.CODELISTITEM, oid: formItemData.itemOID, value: formItemData.value});
                    continue;
                }
                inputElement.checked = true;
                if (!fieldElement.classList.contains("is-hidden")) inputElement.dispatchEvent(new Event("input"));
        }
        if (fieldElement.classList.contains("is-hidden") && formItemData.value) {
            fieldElement.classList.remove("is-hidden");
            fieldElement.classList.add("is-highlighted");
            hiddenFieldWithValueError = true;
        }
    }

    showErrors(metadataNotFoundErrors, hiddenFieldWithValueError);
}

function showErrors(metadataNotFoundErrors, hiddenFieldWithValueError) {
    let errorMessage = "";

    if (metadataNotFoundErrors.length > 0) {
        errorMessage += "One or multiple items in the clinical data could not be found in the meta data. This means that your clinical data and meta data might be out of sync or an imported ODM file is (partially) broken.<br>You find a list of all clinical cata items that could not be found in the meta data below.<br><br>";
        for (let error of metadataNotFoundErrors) {
            errorMessage += error.type == metadataHelper.elementTypes.ITEM ? "<p class='is-size-7'>ItemOID <strong>" + error.oid + "</strong></p><br>" : "<p class='is-size-7'>CodeListItemOID <strong>" + error.oid + "</strong>, CodedValue<strong>" + error.value + "</strong></p><br>";
        }
        if (hiddenFieldWithValueError) errorMessage += "<hr>";
    }

    if (hiddenFieldWithValueError) {
        errorMessage += "Based on the conditions, one or multiple items in the clinical data should be hidden but have values assigned to them. These fields were highlighted and can be reviewed and removed by you.";
    }

    if (errorMessage.length > 0) ioHelper.showWarning("Error", errorMessage);
}

window.loadNextFormData = async function() {
    // This checks whether the saving process could found unanswered mandatory fields. The form data is stored either way
    if (!saveFormData()) return;

    let nextFormOID = getNextFormOID(currentElementID.form);
    if (nextFormOID) {
        skipDataHasChangedCheck = true;
        currentElementID.form = nextFormOID
        await loadFormData(currentElementID.form);
        scrollToFormStart();
    } else {
        skipDataHasChangedCheck = true;
        closeFormData(false);
    }
}

window.loadPreviousFormData = async function() {
    skipMandatoryCheck = true;
    saveFormData();

    let previousFormOID = getPreviousFormOID(currentElementID.form);
    if (previousFormOID) {
        skipDataHasChangedCheck = true;
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

function scrollToFormStart() {
    // Scroll to the beginning of the form on desktop and mobile
    document.querySelector("#clinicaldata-form-data").scrollIntoView();
    document.querySelector("#clinicaldata-column").scrollIntoView();
}

function saveFormData() {
    let formItemDataList = getFormData();
    clinicaldataHelper.storeSubjectFormData(currentElementID.studyEvent, currentElementID.form, formItemDataList);

    // When mandatory fields were not answered show a warning only once
    if (!skipMandatoryCheck && !checkMandatoryFields(formItemDataList)) {
        skipMandatoryCheck = true;
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
            if (mandatoryFieldsAnswered) ioHelper.showWarning(languageHelper.getTranslation("note"), languageHelper.getTranslation("unanswered-mandatory-questions-warning"));
            mandatoryField.classList.add("is-highlighted");
            mandatoryFieldsAnswered = false;
        }
    }

    return mandatoryFieldsAnswered;
}

export function cacheFormData() {
    cachedFormData = getFormData();
    cachedFormDataIsAuditRecord = $("#audit-record-data-hint").classList.contains("is-hidden") ? false : true;
    skipDataHasChangedCheck = true;
}

window.closeFormData = async function(saveData) {
    if (saveData) {
        skipMandatoryCheck = true;
        saveFormData();
    }

    if (deferredFunction) {
        await deferredFunction();
        hideCloseClinicalDataModal();
    } else {
        cancelFormOrSurveyEntry(true);
    }
}

window.cancelFormOrSurveyEntry = function(closeSurvey) {
    if (surveyViewIsActive() && !closeSurvey) {
        $("#close-clinicaldata-modal").classList.add("is-active");
    } else if (surveyViewIsActive()) {
        $("#close-clinicaldata-modal").classList.remove("is-active");
        hideSurveyView();
        ioHelper.showWarning(languageHelper.getTranslation("survey-finished"), languageHelper.getTranslation("survey-finished-text"));
        skipDataHasChangedCheck = true;
        loadFormsByStudyEvent(currentElementID.studyEvent, true);
    } else {
        loadFormsByStudyEvent(currentElementID.studyEvent, true);
    }
}

window.hideCloseClinicalDataModal = function() {
    skipDataHasChangedCheck = false;
    deferredFunction = null;
    $("#close-clinicaldata-modal").classList.remove("is-active");
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
    $("#clinicaldata-form-title").classList.add("is-centered");
    $("#close-form-title").classList.add("is-hidden");
    $("#close-form-text").classList.add("is-hidden");
    $("#close-survey-title").classList.remove("is-hidden");
    $("#close-survey-text").classList.remove("is-hidden");
    $("#survey-view-button").classList.add("is-hidden");
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
    $("#clinicaldata-form-title").classList.remove("is-centered");
    $("#close-form-title").classList.remove("is-hidden");
    $("#close-form-text").classList.remove("is-hidden");
    $("#close-survey-title").classList.add("is-hidden");
    $("#close-survey-text").classList.add("is-hidden");
    $("#survey-view-button").classList.remove("is-hidden");
}

function showAuditRecordDataView() {
    $("#audit-record-data-hint").classList.remove("is-hidden");
    $("#survey-view-button").classList.add("is-hidden");
    $("#clinicaldata-navigate-buttons").classList.add("is-hidden");
    skipDataHasChangedCheck = true;
}

function hideAuditRecordDataView() {
    $("#audit-record-data-hint").classList.add("is-hidden");
    $("#survey-view-button").classList.remove("is-hidden");
    $("#clinicaldata-navigate-buttons").classList.remove("is-hidden");
}

function surveyViewIsActive() {
    return $(".navbar").classList.contains("is-hidden");
}

function dataHasChanged() {
    return !skipDataHasChangedCheck && currentElementID.subject && currentElementID.studyEvent && currentElementID.form && clinicaldataHelper.dataHasChanged(getFormData(), currentElementID.studyEvent, currentElementID.form)
}

window.openSubjectInfo = function() {
    ioHelper.removeElements($$("#audit-records .notification"));

    for (let auditRecord of clinicaldataHelper.getAuditRecords()) {
        let auditRecordElement = htmlElements.getAuditRecord(clinicaldataHelper.auditRecordTypes.FORMEDITED, auditRecord.studyEventOID, auditRecord.formOID, auditRecord.user, auditRecord.location, auditRecord.date);
        auditRecordElement.querySelector("button").onclick = () => showAuditRecordFormData(auditRecord.studyEventOID, auditRecord.formOID, auditRecord.date);
        $("#audit-records").appendChild(auditRecordElement);
    }
    $("#audit-records").appendChild(htmlElements.getAuditRecord(clinicaldataHelper.auditRecordTypes.CREATED, null, null, null, null, clinicaldataHelper.getSubject().createdDate));

    $("#subject-modal strong").textContent = currentElementID.subject;
    $("#subject-modal input").value = currentElementID.subject;

    // Disable change functionality when there are unsaved changes in the form
    $("#subject-modal input").disabled = false;
    $("#subject-modal button").disabled = true;
    if (dataHasChanged()) {
        $("#subject-modal input").disabled = true;
        $$("#subject-modal button:not([onclick])").forEach(button => button.disabled = true);
    }

    $("#subject-modal").classList.add("is-active");
}

window.hideSubjectInfo = function() {
    $("#subject-modal").classList.remove("is-active");
}

async function showAuditRecordFormData(studyEventOID, formOID, date) {
    cachedFormData = clinicaldataHelper.getAuditRecordFormData(studyEventOID, formOID, date);
    if (cachedFormData.length == 0) return;

    currentElementID.studyEvent = studyEventOID;
    currentElementID.form = formOID;

    skipDataHasChangedCheck = true;
    await loadStudyEvents();

    // Show a hint if the current data or data that is equivalent to the current data is shown
    dataHasChanged() ? $("#audit-record-most-current-hint").classList.add("is-hidden") : $("#audit-record-most-current-hint").classList.remove("is-hidden");

    showAuditRecordDataView();
    hideSubjectInfo();
}
