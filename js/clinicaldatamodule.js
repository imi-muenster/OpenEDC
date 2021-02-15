import * as metadataModule from "./metadatamodule.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as admindataHelper from "./helper/admindatahelper.js";
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
let surveyCode = null;

export async function init() {
    currentElementID.subject = null;

    createSiteFilterSelect();
    createSortTypeSelect();
    setIOListeners();

    await clinicaldataHelper.loadSubjects();

    // Currently, the subjects are reloaded every 10 seconds -- this should be improved in the future by means of server-sent events or a websocket
    setLoadSubjectsTimer();
}

export function show() {
    // Hide the study event column if there is only one event
    if (metadataHelper.getStudyEvents().length == 1) {
        $("#clinicaldata-study-events-column").classList.add("is-hidden");
        currentElementID.studyEvent = metadataHelper.getStudyEvents()[0].getAttribute("OID");
    } else {
        $("#clinicaldata-study-events-column").classList.remove("is-hidden");
    }

    loadSubjectKeys();
    reloadTree();

    $("#clinicaldata-section").classList.remove("is-hidden");
    $("#clinicaldata-toggle-button").classList.add("is-hidden");

    languageHelper.createLanguageSelect();
    ioHelper.setTreeMaxHeight();
}

export function hide() {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => hide();
        showCloseClinicaldataModal();
        return;
    }

    $("#clinicaldata-section").classList.add("is-hidden");
    $("#clinicaldata-toggle-button").classList.remove("is-hidden");

    metadataModule.show();
    ioHelper.hideMenu();
}

export function setLanguage(newLocale) {
    locale = newLocale;
}

export function createSiteFilterSelect() {
    let sites = ["All Sites"];
    admindataHelper.getSites().forEach(site => sites.push(site.getAttribute("Name")));

    let currentSelection = null;
    if ($("#filter-site-select-inner")) currentSelection = $("#filter-site-select-inner").value;

    ioHelper.safeRemoveElement($("#filter-site-select-outer"));
    $("#filter-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("filter-site-select", true, true, sites, currentSelection));
    $("#filter-site-select-inner").onmouseup = clickEvent => {
        if (dataHasChanged()) {
            skipDataHasChangedCheck = true;
            deferredFunction = () => loadTree(currentElementID.studyEvent, null);
            showCloseClinicaldataModal();
            clickEvent.target.blur();
        }
    };
    $("#filter-site-select-inner").oninput = inputEvent => {
        currentElementID.subject = null;
        loadSubjectKeys();
        loadSubjectData();
        inputEvent.target.blur();
    };
}

function createSortTypeSelect() {
    $("#sort-subject-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("sort-subject-select", true, true, Object.values(clinicaldataHelper.sortOrderTypes)));
    $("#sort-subject-select-inner").oninput = inputEvent => {
        loadSubjectKeys();
        inputEvent.target.blur();
    };
}

window.addSubject = function() {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => addSubject();
        showCloseClinicaldataModal();
        return;
    }

    const site = admindataHelper.getSiteOIDByName($("#filter-site-select-inner").value);
    const subjectKey = $("#add-subject-input").value;
    $("#add-subject-input").value = "";
    
    // TODO: Good practice? Problem: .then() and .catch() are executed async, which must be considered
    clinicaldataHelper.addSubject(subjectKey, site)
        .then(() => {
            loadSubjectKeys();
            skipDataHasChangedCheck = true;
            loadSubjectData(subjectKey);
        })
        .catch(error => {
            switch (error) {
                case clinicaldataHelper.errors.SUBJECTKEYEMPTY:
                    ioHelper.showMessage("Enter subject key", "Please enter a key for the subject first.");
                    break;
                case clinicaldataHelper.errors.SUBJECTKEYEXISTENT:
                    ioHelper.showMessage("Subject key existent", "The entered subject key already exists. Please enter another one.");
            }
        });
}

export function loadSubjectKeys() {
    ioHelper.removeElements($$("#subject-panel-blocks a"));

    const site = admindataHelper.getSiteOIDByName($("#filter-site-select-inner").value);
    const sortOrder = $("#sort-subject-select-inner").value;
    const subjects = clinicaldataHelper.getSubjects(site, sortOrder)
    subjects.length > 0 ? $("#no-subjects-hint").classList.add("is-hidden") : $("#no-subjects-hint").classList.remove("is-hidden");

    for (let subject of subjects) {
        let panelBlock = htmlElements.getClinicaldataPanelBlock(subject.uniqueKey, subject.key, null, subject.status);
        panelBlock.onclick = () => loadSubjectData(subject.uniqueKey);
        $("#subject-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.subject) $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).classList.add("is-active");
}

async function loadSubjectData(subjectKey) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = async () => await loadSubjectData(subjectKey);
        showCloseClinicaldataModal();
        return;
    }

    // Option to deselect a subject by clicking on the same subject again
    // If the currently logged in user has no metadata edit rights, then disable the form preview as well
    if (subjectKey == currentElementID.subject) {
        subjectKey = null;
        if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes("Edit metadata")) currentElementID.form = null;
    }

    // Automatically select the first study event if there is only one (present here as well mainly because of mobile auto survey view function)
    if (!currentElementID.studyEvent && metadataHelper.getStudyEvents().length == 1) currentElementID.studyEvent = metadataHelper.getStudyEvents()[0].getAttribute("OID");

    currentElementID.subject = subjectKey;
    cachedFormData = null;

    await clinicaldataHelper.loadSubject(currentElementID.subject).catch(() => {
        currentElementID.subject = null;
        clinicaldataHelper.clearSubject();
        ioHelper.showMessage("Subject could not be loaded", "The selected subject could not be loaded. Your are either offline and open the subject for the first time or someone just recently edited the subject.<br><br>Please wait a few seconds and try again.");
    });

    ioHelper.removeIsActiveFromElement($("#subject-panel-blocks a.is-active"));
    if (currentElementID.subject) $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).classList.add("is-active");
    $("#subject-info-button").disabled = currentElementID.subject ? false : true;
    if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes("Manage subjects")) $("#subject-info-button").disabled = true;

    await reloadTree();
}

export async function reloadTree() {
    skipDataHasChangedCheck = true;
    await loadTree(currentElementID.studyEvent, currentElementID.form);
}

// TODO: Loads entire tree if according elements are passed, implement this analogously for metadatamodule
async function loadTree(studyEventOID, formOID) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => loadTree(studyEventOID, formOID);
        showCloseClinicaldataModal();
        return;
    }

    currentElementID.studyEvent = studyEventOID;
    currentElementID.form = formOID;

    ioHelper.removeElements($$("#clinicaldata-study-event-panel-blocks a"));
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        const studyEventOID = studyEventDef.getAttribute("OID");
        const translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        const dataStatus = currentElementID.subject ? clinicaldataHelper.getDataStatusForStudyEvent(studyEventOID) : clinicaldataHelper.dataStatusTypes.EMPTY;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(studyEventOID, translatedText, studyEventDef.getAttribute("Name"), dataStatus);
        panelBlock.onclick = () => loadTree(studyEventOID, null);
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }

    showColumnOnMobile();
    if (!currentElementID.studyEvent && !currentElementID.form && metadataHelper.getStudyEvents().length == 1) backOnMobile();
    if (currentElementID.studyEvent) await loadFormsByStudyEvent();
}

async function loadFormsByStudyEvent() {
    ioHelper.removeIsActiveFromElement($("#clinicaldata-study-event-panel-blocks a.is-active"));
    $(`#clinicaldata-study-event-panel-blocks [oid="${currentElementID.studyEvent}"]`).classList.add("is-active");

    const formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);
    for (let formDef of formDefs) {
        const formOID = formDef.getAttribute("OID");
        const translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        const dataStatus = currentElementID.subject ? clinicaldataHelper.getDataStatusForForm(currentElementID.studyEvent, formOID) : clinicaldataHelper.dataStatusTypes.EMPTY;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(formOID, translatedText, formDef.getAttribute("Name"), dataStatus);
        panelBlock.onclick = () => loadTree(currentElementID.studyEvent, formOID);
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }

    // Automatically start the survey view when activated in project options and the current device is a smartphone or tablet
    if (ioHelper.isAutoSurveyView() && ioHelper.isMobile() && currentElementID.subject && formDefs.length > 0 && !currentElementID.form) {
        currentElementID.form = formDefs[0].getAttribute("OID");
        showSurveyView();
        showColumnOnMobile();
    }

    if (currentElementID.form) {
        await loadFormData();
    } else {
        ioHelper.safeRemoveElement($("#odm-html-content"));
        $("#clinicaldata-form-data").classList.add("is-hidden");
    }
}

async function loadFormData() {
    // If connected to the server and the user has no metadata edit rights then disable the form preview functionality
    // TODO: Create an enum with all rights in the ioHelper
    if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes("Edit metadata") && !currentElementID.subject) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("no-subject-selected-warning"));
        return;
    }

    ioHelper.removeIsActiveFromElement($("#clinicaldata-form-panel-blocks a.is-active"));
    $(`#clinicaldata-form-panel-blocks [oid="${currentElementID.form}"]`).classList.add("is-active");

    await loadFormMetadata();
    loadFormClinicaldata();
    $("#clinicaldata-form-data").classList.remove("is-hidden");

    skipMandatoryCheck = false;
    skipDataHasChangedCheck = false;

    // Handle cachedData, that is usually cached when the language is changed
    cachedFormDataIsAuditRecord ? showAuditRecordDataView() : (surveyViewIsActive() ? null : hideAuditRecordDataView());
    cachedFormDataIsAuditRecord = false;
    cachedFormData = null;

    scrollToFormStart();
}

async function loadFormMetadata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;

    let translatedText = metadataHelper.getElementDefByOID(currentElementID.form).querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        $("#clinicaldata-form-title .subtitle").textContent = translatedText.textContent;
    } else {
        $("#clinicaldata-form-title .subtitle").textContent = metadataHelper.getStudyName();
    }

    // Add the form skeleton
    let form = await metadataHelper.getFormAsHTML(currentElementID.form, locale, ioHelper.isTextAsTextarea());
    ioHelper.safeRemoveElement($("#odm-html-content"));
    $("#clinicaldata-content").appendChild(form);

    // Add dynamic form logic async (conditional items, field validation, uncheck of radio buttons)
    addDynamicFormLogic();

    // Adjust the form navigation buttons
    $("#clinicaldata-previous-button").disabled = getPreviousFormOID(currentElementID.form) ? false : true;
    if (!getNextFormOID(currentElementID.form)) {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("finish");
    } else {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("continue");
    }
}

async function addDynamicFormLogic() {
    // First, add real-time logic to process conditional items
    conditionHelper.process(metadataHelper.getItemOIDSWithConditionByForm(currentElementID.form));

    // Second, add real-time logic to validate fields by data type and/or allowed ranges
    validationHelper.process(metadataHelper.getItemOIDSWithRangeChecksByForm(currentElementID.form));
    
    // Third, allow the user to uncheck an already checked group of radio items
    document.querySelectorAll("input[type='radio']").forEach(radioItem => {
        radioItem.addEventListener("mouseup", mouseEvent => uncheckRadioitem(mouseEvent.target));
    });
}

function uncheckRadioitem(radioItem) {
    if (radioItem.checked) {
        setTimeout(() => {
            radioItem.checked = false;
            const inputEvent = new Event("input");
            Object.defineProperty(inputEvent, "target", { value: "", enumerable: true });
            radioItem.dispatchEvent(inputEvent);
        }, 100);
    }
}

function loadFormClinicaldata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;
    // TODO: Should be moved to loadFormData(). Then, the line above should include !currentElementID.subject
    currentElementID.subject ? $("#no-subject-selected-hint").classList.add("is-hidden") : $("#no-subject-selected-hint").classList.remove("is-hidden");

    // Two types of errors that can occur during the data loading process
    let metadataNotFoundErrors = [];
    let hiddenFieldWithValueError = false;

    let formItemDataList = cachedFormData || clinicaldataHelper.getSubjectFormData(currentElementID.studyEvent, currentElementID.form);
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
            case "textarea":
                inputElement.value = formItemData.value.replace(/\\n/g, "\n");
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

    if (errorMessage.length > 0) ioHelper.showMessage("Error", errorMessage);
}

window.loadNextFormData = async function() {
    // This checks whether the saving process could found unanswered mandatory fields. The form data is stored either way
    if (!await saveFormData()) return;

    let nextFormOID = getNextFormOID(currentElementID.form);
    skipDataHasChangedCheck = true;
    if (nextFormOID) {
        loadTree(currentElementID.studyEvent, nextFormOID);
    } else {
        closeFormData();
    }

    loadSubjectKeys();
}

window.loadPreviousFormData = async function() {
    skipMandatoryCheck = true;
    await saveFormData();

    let previousFormOID = getPreviousFormOID(currentElementID.form);
    if (previousFormOID) {
        skipDataHasChangedCheck = true;
        loadTree(currentElementID.studyEvent, previousFormOID);
    }

    loadSubjectKeys();
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
    document.documentElement.scrollTop = 0;
}

async function saveFormData() {
    const formItemDataList = getFormData();
    const mandatoryFieldsAnswered = checkMandatoryFields(formItemDataList);

    // Determine data status
    let dataStatus = clinicaldataHelper.dataStatusTypes.COMPLETE;
    if (!mandatoryFieldsAnswered) dataStatus = clinicaldataHelper.dataStatusTypes.INCOMPLETE;
    if (formItemDataList.length == 0) dataStatus = clinicaldataHelper.dataStatusTypes.EMPTY;
    
    // Store data
    await clinicaldataHelper.storeSubjectFormData(currentElementID.studyEvent, currentElementID.form, formItemDataList, dataStatus);

    // When mandatory fields were not answered show a warning only once
    if (!skipMandatoryCheck && !mandatoryFieldsAnswered) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("unanswered-mandatory-questions-warning"));
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
            case "textarea":
                if (value) formItemDataList.push(new clinicaldataHelper.FormItemData(itemGroupOID, itemOID, value.replace(/\n/g, "\\n")));
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
            mandatoryField.classList.add("is-highlighted");
            mandatoryFieldsAnswered = false;
        }
    }

    return mandatoryFieldsAnswered;
}

export function cacheFormData() {
    if (!currentElementID.studyEvent || !currentElementID.form || !currentElementID.subject) return;

    cachedFormData = getFormData();
    cachedFormDataIsAuditRecord = $("#audit-record-data-hint").classList.contains("is-hidden") ? false : true;
}

// TODO: closeFormData and cancelFormOrSurveyEntry could be further refactored
window.closeFormData = async function(saveData) {
    if (saveData) {
        skipMandatoryCheck = true;
        await saveFormData();
        loadSubjectKeys();
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
        showCloseClinicaldataModal();
        return;
    } else if (surveyViewIsActive()) {
        hideCloseClinicaldataModal();
        hideSurveyView();
        if (ioHelper.getSurveyCode()) showCloseSurveyModal();
        if (ioHelper.isAutoSurveyView() && ioHelper.isMobile()) currentElementID.studyEvent = null;
        skipDataHasChangedCheck = true;
    }

    loadTree(currentElementID.studyEvent, null);
}

window.hideCloseClinicalDataModal = function() {
    skipDataHasChangedCheck = false;
    deferredFunction = null;
    hideCloseClinicaldataModal();
}

window.showSurveyView = function() {
    $(".navbar").classList.add("is-hidden");
    $("html").classList.remove("has-navbar-fixed-top");
    $("#subjects-column").classList.add("is-hidden");
    $("#clinicaldata-study-events-column").classList.add("is-hidden");
    $("#clinicaldata-forms-column").classList.add("is-hidden");
    $("#clinicaldata-column .panel").classList.add("is-shadowless");
    $("#clinicaldata-column .panel-heading").classList.add("is-hidden");
    $("#clinicaldata-column").classList.remove("is-two-fifths-desktop");
    $("#clinicaldata-column").classList.add("is-full");
    $("#clinicaldata-column .tree-panel-blocks").classList.add("is-survey-view");
    $("#clinicaldata-section").classList.add("p-3");
    $("#clinicaldata-form-title").classList.add("is-centered");
    $("#survey-view-button").classList.add("is-hidden");
    scrollToFormStart();
}

function hideSurveyView() {
    $(".navbar").classList.remove("is-hidden");
    $("html").classList.add("has-navbar-fixed-top");
    $("#subjects-column").classList.remove("is-hidden");
    if (metadataHelper.getStudyEvents().length > 1) $("#clinicaldata-study-events-column").classList.remove("is-hidden");
    $("#clinicaldata-forms-column").classList.remove("is-hidden");
    $("#clinicaldata-column .panel").classList.remove("is-shadowless");
    $("#clinicaldata-column .panel-heading").classList.remove("is-hidden");
    $("#clinicaldata-column").classList.add("is-two-fifths-desktop");
    $("#clinicaldata-column").classList.remove("is-full");
    $("#clinicaldata-column .tree-panel-blocks").classList.remove("is-survey-view");
    $("#clinicaldata-section").classList.remove("p-3");
    $("#clinicaldata-form-title").classList.remove("is-centered");
    $("#survey-view-button").classList.remove("is-hidden");
}

function showCloseClinicaldataModal() {
    if (surveyViewIsActive()) {
        $("#close-data-title").textContent = languageHelper.getTranslation("close-survey");
        $("#close-data-text").textContent = languageHelper.getTranslation("close-survey-text");
    } else {
        $("#close-data-title").textContent = languageHelper.getTranslation("close-form");
        $("#close-data-text").textContent = languageHelper.getTranslation("close-form-text");
    }

    $("#close-clinicaldata-modal").classList.add("is-active");
}

function hideCloseClinicaldataModal() {
    $("#close-clinicaldata-modal").classList.remove("is-active");
}

function showCloseSurveyModal() {
    // Create buttons for numpad if they dont exist
    if (!$(".numpad .buttons").hasChildNodes()) {
        for (let i = 1; i <= 12; i++) {
            const button = document.createElement("button");
            if (i <= 9) {
                button.className = "button is-large is-rounded";
                button.textContent = i;
                button.onclick = () => surveyCodeButtonPressed(i);
            } else if (i == 10) {
                button.className = "button is-large is-rounded is-invisible";
                button.textContent = "";
            } else if (i == 11) {
                button.className = "button is-large is-rounded";
                button.textContent = "0";
                button.onclick = () => surveyCodeButtonPressed(0);
            } else if (i == 12) {
                button.className = "button is-large is-rounded";
                button.innerHTML = `<span class="icon is-small"><i class="fas fa-arrow-left"></i></span>`;
                button.onclick = () => surveyCodeButtonPressed(-1);
            }
            $(".numpad .buttons").appendChild(button);
        }
    }

    // Create or reset status dots that indicates how many digits have been pressed
    ioHelper.removeElements($$(".numpad .status span"));
    for (let i = 0; i < 4; i++) {
        $(".numpad .status").insertAdjacentHTML("beforeend", `<span class="icon empty-dot"><i class="far fa-circle"></i></span>`);
    }

    surveyCode = "";
    $("#survey-code-modal").classList.add("is-active");
}

function surveyCodeButtonPressed(value) {
    if (value >= 0) {
        if (surveyCode.length >= 4) return;
        surveyCode += value;
        $(".numpad .status .empty-dot").remove();
        $(".numpad .status").insertAdjacentHTML("afterbegin", `<span class="icon filled-dot"><i class="fas fa-circle"></i></span>`);
    } else {
        if (surveyCode.length <= 0) return;
        surveyCode = surveyCode.slice(0, -1);
        $(".numpad .status .filled-dot").remove();
        $(".numpad .status").insertAdjacentHTML("beforeend", `<span class="icon empty-dot"><i class="far fa-circle"></i></span>`);
    }

    $("#wrong-survey-code-hint").classList.add("is-hidden");
    if (surveyCode.length == 4) {
        if (surveyCode == ioHelper.getSurveyCode()) {
            $("#survey-code-modal").classList.remove("is-active");
        } else {
            $("#wrong-survey-code-hint").classList.remove("is-hidden");
            surveyCode = "";
            $$(".numpad .status .filled-dot").forEach(dot => {
                dot.remove();
                $(".numpad .status").insertAdjacentHTML("beforeend", `<span class="icon empty-dot"><i class="far fa-circle"></i></span>`);
            });
        }
    }
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

window.showSubjectInfo = function() {
    // Create audit record entries
    ioHelper.removeElements($$("#audit-records .notification"));
    for (let auditRecord of clinicaldataHelper.getAuditRecords()) {
        const siteName = admindataHelper.getSiteNameByOID(auditRecord.locationOID);
        const userName = admindataHelper.getUserFullName(auditRecord.userOID);
        let auditRecordElement = htmlElements.getAuditRecord(auditRecord.type, auditRecord.studyEventOID, auditRecord.formOID, userName, siteName, auditRecord.date);
        if (auditRecord.formOID) auditRecordElement.querySelector("button").onclick = () => showAuditRecordFormData(auditRecord.studyEventOID, auditRecord.formOID, auditRecord.date);
        $("#audit-records").appendChild(auditRecordElement);
    }

    // Fill inputs to change subject key and site
    let sites = ["No Site"];
    admindataHelper.getSites().forEach(site => sites.push(site.getAttribute("Name")));
    ioHelper.safeRemoveElement($("#subject-site-select-outer"));
    const currentSiteName = admindataHelper.getSiteNameByOID(clinicaldataHelper.getSubject().siteOID);
    $("#subject-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("subject-site-select", true, true, sites, currentSiteName));
    $("#subject-modal strong").textContent = clinicaldataHelper.getSubject().key;
    $("#subject-modal input").value = clinicaldataHelper.getSubject().key;

    // Disable change functionality when there are unsaved changes in the form
    $("#subject-modal input").disabled = false;
    $("#subject-site-select-inner").disabled = false;
    $("#save-subject-info-button").disabled = false;
    if (dataHasChanged()) {
        $("#subject-modal input").disabled = true;
        $("#subject-site-select-inner").disabled = true;
        $("#save-subject-info-button").disabled = true;
        $$("#subject-modal button:not([onclick])").forEach(button => button.disabled = true);
    }

    $("#subject-modal").classList.add("is-active");
}

window.hideSubjectInfo = function() {
    $("#subject-modal").classList.remove("is-active");
}

async function showAuditRecordFormData(studyEventOID, formOID, date) {
    cachedFormData = clinicaldataHelper.getAuditRecordFormData(studyEventOID, formOID, date);
    if (!cachedFormData) return;

    skipDataHasChangedCheck = true;
    await loadTree(studyEventOID, formOID);

    // Show a hint if the current data or data that is equivalent to the current data is shown
    dataHasChanged() ? $("#audit-record-most-current-hint").classList.add("is-hidden") : $("#audit-record-most-current-hint").classList.remove("is-hidden");

    showAuditRecordDataView();
    hideSubjectInfo();
}

window.saveSubjectInfo = function() {
    const key = $("#subject-key-input").value;
    const site = admindataHelper.getSiteOIDByName($("#subject-site-select-inner").value);
    const currentSite = clinicaldataHelper.getSubject().siteOID;
    clinicaldataHelper.setSubjectInfo(key, site)
        .then(() => {
            if (site == currentSite) {
                currentElementID.subject = clinicaldataHelper.getSubject().key;
            } else {
                currentElementID.subject = null;
                loadSubjectData();
            }
            loadSubjectKeys();
            hideSubjectInfo();
        })
        .catch(error => {
            switch (error) {
                case clinicaldataHelper.errors.SUBJECTKEYEMPTY:
                    ioHelper.showMessage("Enter subject key", "Please enter a key for the subject first.");
                    break;
                case clinicaldataHelper.errors.SUBJECTKEYEXISTENT:
                    ioHelper.showMessage("Subject key existent", "The entered subject key already exists. Please enter another one.");
            }
            showSubjectInfo();
        });
}

window.removeSubject = async function() {
    await clinicaldataHelper.removeSubject();
    currentElementID.subject = null;
    
    loadSubjectKeys();
    reloadTree();
    hideSubjectInfo();
}

// The following two functions constitute logic to only show one column at a time on mobile devices including a navbar back button
window.backOnMobile = function() {
    if (!ioHelper.isMobile()) return;

    if (currentElementID.subject && currentElementID.studyEvent && currentElementID.form) {
        loadTree(currentElementID.studyEvent, null);
    } else if (currentElementID.subject && currentElementID.studyEvent && metadataHelper.getStudyEvents().length > 1) {
        loadTree(null, null);
    } else {
        $("#clinicaldata-study-events-column").classList.add("is-hidden-touch");
        $("#clinicaldata-forms-column").classList.add("is-hidden-touch");
        $("#subjects-column").classList.remove("is-hidden-touch");
        $("#study-title").parentNode.classList.remove("is-hidden-touch");
        $("#mobile-back-button").classList.add("is-hidden");
        $("#mobile-back-button").classList.remove("is-hidden-desktop");
    }
}

function showColumnOnMobile() {
    if (!ioHelper.isMobile()) return;
    
    // Hide or show navbar back button
    if (currentElementID.subject || currentElementID.form || (currentElementID.studyEvent && metadataHelper.getStudyEvents().length > 1)) {
        $("#study-title").parentNode.classList.add("is-hidden-touch");
        $("#mobile-back-button").classList.remove("is-hidden");
        $("#mobile-back-button").classList.add("is-hidden-desktop");
    } else {
        $("#study-title").parentNode.classList.remove("is-hidden-touch");
        $("#mobile-back-button").classList.add("is-hidden");
        $("#mobile-back-button").classList.remove("is-hidden-desktop");
    }

    // Show respective column
    $$("#subjects-column, #clinicaldata-study-events-column, #clinicaldata-forms-column, #clinicaldata-column").forEach(column => column.classList.add("is-hidden-touch"));
    if (currentElementID.subject && currentElementID.studyEvent && currentElementID.form) {
        $("#clinicaldata-column").classList.remove("is-hidden-touch");
    } else if (currentElementID.subject && currentElementID.studyEvent) {
        $("#clinicaldata-forms-column").classList.remove("is-hidden-touch");
    } else if (currentElementID.subject) {
        $("#clinicaldata-study-events-column").classList.remove("is-hidden-touch");
    } else {
        $("#subjects-column").classList.remove("is-hidden-touch");
    }
}

function setIOListeners() {
    $("#metadata-toggle-button").onclick = () => hide();
    $("#add-subject-input").onkeydown = keyEvent => {
        if (["/", "#", "<", ">", "\\", "{", "}", "&", "?", "ä", "ö", "ü"].includes(keyEvent.key)) keyEvent.preventDefault();
        if (keyEvent.code == "Enter") addSubject();
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

// Currently, the subjects are reloaded every 5 seconds -- this should be improved in the future by means of server-sent events or a websocket
function setLoadSubjectsTimer() {
    if (!ioHelper.hasServerURL()) return;
     
    setInterval(async () => {
        if ($("#clinicaldata-section").classList.contains("is-hidden")) return;
        
        await ioHelper.emptyMessageQueue();
        if (!clinicaldataHelper.getSubject()) {
            await clinicaldataHelper.loadSubjects();
            loadSubjectKeys();
        }
    }, 5000);
}
