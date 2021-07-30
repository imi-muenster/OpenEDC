import * as metadataModule from "./metadatamodule.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as expressionHelper from "./helper/expressionhelper.js";
import * as validationHelper from "./helper/validationhelper.js";
import * as htmlElements from "./helper/htmlelements.js";
import * as languageHelper from "./helper/languagehelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

// Holds the OID of the currently selected subject, event, and form
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
    createSortTypeSelect();
    
    await clinicaldataHelper.loadSubjects();
    setIOListeners();

    // Currently, the subjects are reloaded every 10 seconds -- this should be improved in the future by means of server-sent events or a websocket
    setLoadSubjectsTimer();
}

export function show() {
    loadSubjectKeys();
    reloadTree();

    $("#clinicaldata-section").show();
    $("#clinicaldata-toggle-button").hide();
    $("#metadata-toggle-button").show();

    languageHelper.createLanguageSelect();
    ioHelper.setTreeMaxHeight();
}

function hide() {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => hide();
        showCloseClinicaldataPrompt();
        return;
    }

    $("#clinicaldata-section").hide();

    metadataModule.show();
    ioHelper.hideMenu();

    adjustMobileUI(true);
}

export function setLanguage(newLocale) {
    locale = newLocale;

    // Reload the site filter select (special case since the first entry -- All Sites -- should be i18n while the others should not)
    createSiteFilterSelect();
}

export function createSiteFilterSelect() {
    let sites = [languageHelper.getTranslation("all-sites")];
    admindataHelper.getSites().forEach(site => sites.push(site.getName()));

    let currentSelection = null;
    if ($("#filter-site-select-inner")) currentSelection = $("#filter-site-select-inner").value;

    ioHelper.safeRemoveElement($("#filter-site-select-outer"));
    $("#filter-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("filter-site-select", true, true, sites, currentSelection));
    $("#filter-site-select-inner").onmouseup = clickEvent => {
        if (dataHasChanged()) {
            skipDataHasChangedCheck = true;
            deferredFunction = () => loadTree(currentElementID.studyEvent, null);
            showCloseClinicaldataPrompt();
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
    const translatedSortTypes = Object.values(clinicaldataHelper.sortOrderTypes).map(sortType => languageHelper.getTranslation(sortType));
    ioHelper.safeRemoveElement($("#sort-subject-select-outer"));
    $("#sort-subject-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("sort-subject-select", true, true, Object.values(clinicaldataHelper.sortOrderTypes), null, translatedSortTypes, true));
    $("#sort-subject-select-inner").oninput = inputEvent => {
        loadSubjectKeys();
        inputEvent.target.blur();
    };
}

window.addSubjectManual = function() {
    // Check if the data has changed / new data has been entered and show a prompt first
    // TODO: This pattern is used frequently and should be made more concise by means of a function
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => addSubjectManual();
        showCloseClinicaldataPrompt();
        return;
    }

    const siteOID = admindataHelper.getSiteOIDByName($("#filter-site-select-inner").value);
    const subjectKey = $("#add-subject-input").value;
    $("#add-subject-input").value = "";

    addSubject(subjectKey, siteOID);
}

window.addSubjectAuto = function() {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => addSubjectAuto();
        showCloseClinicaldataPrompt();
        return;
    }

    const siteOID = admindataHelper.getSiteOIDByName($("#filter-site-select-inner").value);
    const subjectKey = clinicaldataHelper.getAutoNumberedSubjectKey();

    addSubject(subjectKey, siteOID);
}

window.addSubjectBarcode = async function() {
    await import("./tags/barcodemodal.js");

    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => addSubjectBarcode();
        showCloseClinicaldataPrompt();
        return;
    }

    // Deselect the currently selected subject
    if (currentElementID.subject) loadSubjectData();
    
    // Open the barcode scan modal
    const barcodeModal = document.createElement("barcode-modal");
    barcodeModal.setHeading(languageHelper.getTranslation("barcode"));
    barcodeModal.setHelpText(languageHelper.getTranslation("barcode-help-text"));
    barcodeModal.setInputPlaceholder(languageHelper.getTranslation("new-subject"));
    barcodeModal.setButtonText(languageHelper.getTranslation("add"));
    document.body.appendChild(barcodeModal);
}

function addSubject(subjectKey, siteOID) {
    clinicaldataHelper.addSubject(subjectKey, siteOID)
        .then(() => {
            loadSubjectKeys();
            skipDataHasChangedCheck = true;
            loadSubjectData(subjectKey);
        })
        .catch(error => {
            switch (error) {
                case clinicaldataHelper.errors.SUBJECTKEYEMPTY:
                    ioHelper.showMessage(languageHelper.getTranslation("enter-subject-key"), languageHelper.getTranslation("enter-subject-key-text"));
                    break;
                case clinicaldataHelper.errors.SUBJECTKEYEXISTENT:
                    ioHelper.showMessage(languageHelper.getTranslation("subject-key-existent"), languageHelper.getTranslation("subject-key-existent-open-text"),
                        {
                            [languageHelper.getTranslation("open")]: () => loadSubjectData(subjectKey)
                        }
                    );
                    break;
                case clinicaldataHelper.errors.SUBJECTKEYEXISTENTOTHERSITE:
                    ioHelper.showMessage(languageHelper.getTranslation("subject-key-existent"), languageHelper.getTranslation("subject-key-existent-other-site-text"));
            }
        });
}

export function loadSubjectKeys() {
    $$("#subject-panel-blocks a").removeElements();

    const selectedSite = admindataHelper.getSiteOIDByName($("#filter-site-select-inner").value);
    const sortOrder = $("#sort-subject-select-inner").value;
    const subjects = clinicaldataHelper.getSubjects(selectedSite, sortOrder);
    subjects.length ? $("#no-subjects-hint").hide() : $("#no-subjects-hint").show();

    for (let subject of subjects) {
        const siteSubtitle = subject.siteOID && !selectedSite ? admindataHelper.getSiteNameByOID(subject.siteOID) : null;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(subject.uniqueKey, subject.key, null, siteSubtitle, subject.status);
        panelBlock.onclick = () => subjectClicked(subject.uniqueKey);
        $("#subject-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.subject) $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).activate();
}

function subjectClicked(subjectKey) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => subjectClicked(subjectKey);
        showCloseClinicaldataPrompt();
        return;
    }

    // Option to deselect a subject by clicking on the same subject again
    // If the currently logged in user has no metadata edit rights, then disable the form preview as well
    if (subjectKey == currentElementID.subject) {
        subjectKey = null;
        if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.EDITMETADATA)) currentElementID.form = null;
    }

    loadSubjectData(subjectKey);
}

async function loadSubjectData(subjectKey) {
    // Automatically select the first study event if there is only one (present here as well mainly because of mobile auto survey view function)
    if (!currentElementID.studyEvent && metadataHelper.getStudyEvents().length == 1) currentElementID.studyEvent = metadataHelper.getStudyEvents()[0].getOID();

    await clinicaldataHelper.loadSubject(subjectKey)
        .then(subject => {
            currentElementID.subject = subject ? subject.uniqueKey : null;
            cachedFormData = null;
        })
        .catch(() => {
            currentElementID.subject = null;
            clinicaldataHelper.clearSubject();
            ioHelper.showMessage(languageHelper.getTranslation("subject-not-loaded-title"), languageHelper.getTranslation("subject-not-loaded-error"));
        });

    ioHelper.removeIsActiveFromElement($("#subject-panel-blocks a.is-active"));
    if (currentElementID.subject) $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).activate();
    $("#subject-info-button").disabled = currentElementID.subject ? false : true;
    if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.MANAGESUBJECTS)) $("#subject-info-button").disabled = true;

    await reloadTree();
}

export async function reloadTree() {
    // Hide the study event column if there is only one event
    if (metadataHelper.getStudyEvents().length == 1) {
        $("#clinicaldata-study-events-column").hide();
        currentElementID.studyEvent = metadataHelper.getStudyEvents()[0].getOID();
    } else $("#clinicaldata-study-events-column").show();

    skipDataHasChangedCheck = true;
    await loadTree(currentElementID.studyEvent, currentElementID.form);
}

// TODO: Loads entire tree if according elements are passed, implement this analogously for metadatamodule
async function loadTree(studyEventOID, formOID) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => loadTree(studyEventOID, formOID);
        showCloseClinicaldataPrompt();
        return;
    }

    currentElementID.studyEvent = studyEventOID;
    currentElementID.form = formOID;

    $$("#clinicaldata-study-event-panel-blocks a").removeElements();
    $$("#clinicaldata-form-panel-blocks a").removeElements();

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        const studyEventOID = studyEventDef.getOID();
        const translatedDescription = studyEventDef.getTranslatedDescription(locale);
        const dataStatus = currentElementID.subject ? clinicaldataHelper.getDataStatusForStudyEvent(studyEventOID) : clinicaldataHelper.dataStatusTypes.EMPTY;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(studyEventOID, translatedDescription, studyEventDef.getName(), null, dataStatus);
        panelBlock.onclick = () => loadTree(studyEventOID, null);
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }

    adjustMobileUI();
    if (!currentElementID.studyEvent && !currentElementID.form && metadataHelper.getStudyEvents().length == 1) backOnMobile();
    if (currentElementID.studyEvent) await loadFormsByStudyEvent();
}

async function loadFormsByStudyEvent() {
    ioHelper.removeIsActiveFromElement($("#clinicaldata-study-event-panel-blocks a.is-active"));
    $(`#clinicaldata-study-event-panel-blocks [oid="${currentElementID.studyEvent}"]`).activate();

    const formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);
    for (let formDef of formDefs) {
        const formOID = formDef.getOID();
        const translatedDescription = formDef.getTranslatedDescription(locale);
        const dataStatus = currentElementID.subject ? clinicaldataHelper.getDataStatusForForm(currentElementID.studyEvent, formOID) : clinicaldataHelper.dataStatusTypes.EMPTY;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(formOID, translatedDescription, formDef.getName(), null, dataStatus);
        panelBlock.onclick = () => loadTree(currentElementID.studyEvent, formOID);
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }

    // Automatically start the survey view when activated in project options and the current device is a smartphone or tablet
    if (ioHelper.isAutoSurveyView() && ioHelper.isMobile() && currentElementID.subject && formDefs.length && !currentElementID.form) {
        currentElementID.form = formDefs[0].getOID();
        showSurveyView();
        adjustMobileUI();
    }

    if (currentElementID.form) {
        await loadFormData();
    } else {
        ioHelper.safeRemoveElement($("#odm-html-content"));
        $("#clinicaldata-form-data").hide();
    }
}

async function loadFormData() {
    // If connected to the server and the user has no metadata edit rights then disable the form preview functionality
    if (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.EDITMETADATA) && !currentElementID.subject) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("no-subject-selected-warning"));
        return;
    }

    ioHelper.removeIsActiveFromElement($("#clinicaldata-form-panel-blocks a.is-active"));
    $(`#clinicaldata-form-panel-blocks [oid="${currentElementID.form}"]`).activate();

    resetFormUIElements();

    await loadFormMetadata();
    loadFormClinicaldata();
    $("#clinicaldata-form-data").show();

    // Show a hint if no subject is selected
    if (!currentElementID.subject) showNoSubjectHint();

    skipMandatoryCheck = false;
    skipDataHasChangedCheck = false;

    // Handle cachedData, that is usually cached when the language is changed
    if (cachedFormDataIsAuditRecord) showAuditRecordHint();
    cachedFormDataIsAuditRecord = false;
    cachedFormData = null;

    scrollToFormStart();
}

function resetFormUIElements() {
    $("#form-hint").hide();
    $("#form-hint").classList.remove("is-danger");
    $("#form-hint").classList.remove("is-link");
    $("#survey-view-button").show();
    $("#clinicaldata-navigate-buttons").show();
    $("#form-validate-level").show();
    $("#form-validate-button").classList.remove("is-validated");

    if (surveyViewIsActive()) $("#survey-view-button").hide();
    if (surveyViewIsActive() || (ioHelper.hasServerURL() && !ioHelper.getLoggedInUser().rights.includes(admindataHelper.userRights.VALIDATEFORMS))) $("#form-validate-level").hide();
}

async function loadFormMetadata() {
    if (!currentElementID.studyEvent || !currentElementID.form) return;

    // Add the form title and use the name as fallback
    const formDef = metadataHelper.getElementDefByOID(currentElementID.form);
    $("#clinicaldata-form-title .subtitle").textContent = formDef.getTranslatedDescription(locale, true);

    // Add the form skeleton
    let form = await metadataHelper.getFormAsHTML(currentElementID.form, ioHelper.isTextAsTextarea());
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
    // First, add real-time logic to process items with conditions and methods
    const itemOIDs = expressionHelper.getVariables(metadataHelper.getElementsWithExpression(currentElementID.form));
    const itemData = clinicaldataHelper.getDataForItems(itemOIDs);
    if (cachedFormData) cachedFormData.forEach(entry => {
        if (itemOIDs.includes(entry.itemOID)) itemData[entry.itemOID] = entry.value;
    });
    expressionHelper.process(itemData);

    // Second, add real-time logic to validate fields by data type and/or allowed ranges
    validationHelper.process(metadataHelper.getItemsWithRangeChecks(currentElementID.form));
    
    // Third, allow the user to uncheck an already checked group of radio items
    $$("#clinicaldata-content label.radio").forEach(radioItem => {
        radioItem.addEventListener("mouseup", uncheckRadioItem);
    });

    // Fourth, add date focus event listeners
    // TODO: Currently, the custom date picker is not used on mobile devices because of a Safari issue
    if (ioHelper.isMobile()) return;
    $$("input[type='date'], input[type='time'], input[type='datetime-local']").forEach(dateInput => {
        dateInput.addEventListener("click", showDateTimePicker);
    });
}

function uncheckRadioItem(event) {
    const radioItem = event.target.querySelector("input") ? event.target.querySelector("input") : event.target;
    if (radioItem.checked) {
        setTimeout(() => {
            radioItem.checked = false;
            const inputEvent = new Event("input");
            Object.defineProperty(inputEvent, "target", { value: "", enumerable: true });
            radioItem.dispatchEvent(inputEvent);
        }, 100);
    }
}

function showDateTimePicker(event) {
    event.preventDefault();

    const mode = event.target.getAttribute("type").split("-")[0];
    const picker = document.createElement("datetime-picker");
    picker.setInput(event.target);
    picker.setLocale(languageHelper.getCurrentLocale());
    picker.setTranslations({
        heading: languageHelper.getTranslation(mode),
        today: languageHelper.getTranslation(mode == "time" || mode == "datetime" ? "now" : "today"),
        reset: languageHelper.getTranslation("reset"),
        save: languageHelper.getTranslation("save"),
        close: languageHelper.getTranslation("close")
    });
    picker.setOptions({
        enableDate: mode == "date" || mode == "datetime",
        enableTime: mode == "datetime" || mode == "time",
        enablePartialEntry: false
    });

    document.body.appendChild(picker);
}

function loadFormClinicaldata() {
    if (!currentElementID.studyEvent || !currentElementID.form || !currentElementID.subject) return;

    // Two types of errors that can occur during the data loading process
    let metadataNotFoundErrors = [];
    let hiddenFieldWithValueErrors = [];

    let formItemDataList = cachedFormData || clinicaldataHelper.getSubjectFormData(currentElementID.studyEvent, currentElementID.form);
    for (let formItemData of formItemDataList) {
        if (!formItemData.value) continue;

        let inputElement = $(`#clinicaldata-content [item-group-content-oid="${formItemData.itemGroupOID}"] [item-oid="${formItemData.itemOID}"]`);
        if (!inputElement) {
            metadataNotFoundErrors.push({type: metadataHelper.elementTypes.ITEM, oid: formItemData.itemOID});
            continue;
        }

        switch (inputElement.getAttribute("type")) {
            case "text":
            case "date":
            case "time":
            case "datetime-local":
            case "select":
                if (!inputElement.readOnly) inputElement.value = formItemData.value;
                break;
            case "textarea":
                if (!inputElement.readOnly) inputElement.value = formItemData.value.replace(/\\n/g, "\n");
                break;
            case "radio":
                inputElement = $(`#clinicaldata-content [item-group-content-oid="${formItemData.itemGroupOID}"] [item-oid="${formItemData.itemOID}"][value="${formItemData.value}"]`);
                if (!inputElement) {
                    metadataNotFoundErrors.push({type: metadataHelper.elementTypes.CODELISTITEM, oid: formItemData.itemOID, value: formItemData.value});
                    continue;
                }
                inputElement.checked = true;
        }

        let fieldElement = $(`#clinicaldata-content [item-group-content-oid="${formItemData.itemGroupOID}"] [item-field-oid="${formItemData.itemOID}"]`);
        if (!inputElement.readOnly && (!fieldElement.isVisible() || !fieldElement.parentNode.isVisible())) {
            hiddenFieldWithValueErrors.push({ itemOID: formItemData.itemOID, itemGroupOID: formItemData.itemGroupOID });
        }
    }

    showErrors(metadataNotFoundErrors, hiddenFieldWithValueErrors);

    // Adjust the form lock button and hint
    if (clinicaldataHelper.getDataStatusForForm(currentElementID.studyEvent, currentElementID.form) == clinicaldataHelper.dataStatusTypes.VALIDATED) showValidatedFormHint();
}

// TODO: Localize error messages
function showErrors(metadataNotFoundErrors, hiddenFieldWithValueErrors) {
    // Compose and show the error message
    let errorMessage = "";
    if (metadataNotFoundErrors.length) {
        errorMessage += "<p>" + languageHelper.getTranslation("metadata-not-found-error") + "</p><br>";
        for (let error of metadataNotFoundErrors) {
            errorMessage += "<p>";
            if (error.type == metadataHelper.elementTypes.ITEM) errorMessage += languageHelper.getTranslation("unique-id") + ": " + error.oid;
            else errorMessage += languageHelper.getTranslation("choices-unique-id") + ": " + error.oid + ", " + languageHelper.getTranslation("coded-value") + ": " + error.value;
            errorMessage += "</p>"
        }
        if (hiddenFieldWithValueErrors.length) errorMessage += "<br><hr>";
    }
    if (hiddenFieldWithValueErrors.length) errorMessage += languageHelper.getTranslation("hidden-field-with-value-error");
    if (errorMessage.length) ioHelper.showMessage(languageHelper.getTranslation("error"), errorMessage);

    // Highlight conditionally hidden fields that contain values
    for (let error of hiddenFieldWithValueErrors) {
        let fieldElement = $(`#clinicaldata-content [item-group-content-oid="${error.itemGroupOID}"] [item-field-oid="${error.itemOID}"]`);
        fieldElement.show();
        fieldElement.parentNode.show();
        fieldElement.highlight();
    }
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
        if (formDefs[i].getOID() == previousFormOID) return formDefs[i+1].getOID();
    }
}

function getPreviousFormOID(nextFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);
    for (let i = 1; i < formDefs.length; i++) {
        if (formDefs[i].getOID() == nextFormOID) return formDefs[i-1].getOID();
    }
}

window.validateForm = function() {
    if (!isFormValidated()) {
        $("#form-validate-button").classList.add("is-validated");
    } else {
        enableInputElements();
        resetFormUIElements();
    }
}

function isFormValidated() {
    return $("#form-validate-button").classList.contains("is-validated");
}

function scrollToFormStart() {
    // Scroll to the beginning of the form on desktop and mobile
    $("#clinicaldata-form-data").scrollIntoView();
    document.documentElement.scrollTop = 0;
}

async function saveFormData() {
    const formItemDataList = getFormData();
    const mandatoryFieldsAnswered = checkMandatoryFields(formItemDataList);

    // Determine data status
    let dataStatus = clinicaldataHelper.dataStatusTypes.COMPLETE;
    if (!mandatoryFieldsAnswered) dataStatus = clinicaldataHelper.dataStatusTypes.INCOMPLETE;
    if (formItemDataList.length == 0) dataStatus = clinicaldataHelper.dataStatusTypes.EMPTY;
    if (isFormValidated()) dataStatus = clinicaldataHelper.dataStatusTypes.VALIDATED;
    
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
    let formItemDataList = [];
    for (const itemGroupContent of $$("#clinicaldata-content .item-group-content")) {
        const itemGroupOID = itemGroupContent.getAttribute("item-group-content-oid");
        for (const inputElement of itemGroupContent.querySelectorAll("[item-oid]")) {
            const value = inputElement.value;
            const itemOID = inputElement.getAttribute("item-oid");
            switch (inputElement.getAttribute("type")) {
                case "text":
                case "date":
                case "time":
                case "datetime-local":
                case "select":
                    if (value) formItemDataList.push(new clinicaldataHelper.FormItemData(itemGroupOID, itemOID, value));
                    break;
                case "textarea":
                    if (value) formItemDataList.push(new clinicaldataHelper.FormItemData(itemGroupOID, itemOID, value.replace(/\n/g, "\\n")));
                    break;
                case "radio":
                    if (inputElement.checked) formItemDataList.push(new clinicaldataHelper.FormItemData(itemGroupOID, itemOID, value));
            }
        }
    }

    return formItemDataList;
}

function checkMandatoryFields(formItemDataList) {
    if (isFormValidated()) return true;

    let mandatoryFieldsAnswered = true;
    for (let mandatoryField of $$(".item-group-content:not(.is-hidden) .item-field[mandatory='Yes']:not(.is-hidden)")) {
        if (!formItemDataList.find(formItemData => formItemData.itemGroupOID == mandatoryField.parentNode.getAttribute("item-group-content-oid") && formItemData.itemOID == mandatoryField.getAttribute("item-field-oid"))) {
            if (!skipMandatoryCheck) mandatoryField.highlight();
            mandatoryFieldsAnswered = false;
        }
    }

    return mandatoryFieldsAnswered;
}

export function cacheFormData() {
    if (!currentElementID.studyEvent || !currentElementID.form || !currentElementID.subject) return;

    cachedFormData = getFormData();

    // TODO: This could be improved in the future, but currently the form-hint has only is-link for the audit record view and validated forms
    cachedFormDataIsAuditRecord = $("#form-hint").classList.contains("is-link") && !$("#form-validate-button").classList.contains("is-validated") ? true : false;
}

// TODO: closeFormData and cancelFormOrSurveyEntry could be further refactored
window.closeFormData = async function(saveData) {
    if (saveData) {
        skipMandatoryCheck = true;
        await saveFormData();
        loadSubjectKeys();
    }

    if (deferredFunction) await deferredFunction();
    else cancelFormOrSurveyEntry(true);
}

window.cancelFormOrSurveyEntry = function(closeSurvey) {
    if (surveyViewIsActive() && !closeSurvey) {
        showCloseClinicaldataPrompt();
        return;
    } else if (surveyViewIsActive()) {
        hideSurveyView();
        if (ioHelper.getSurveyCode()) showSurveyCodeModal();
        if (ioHelper.isAutoSurveyView() && ioHelper.isMobile()) currentElementID.studyEvent = null;
        skipDataHasChangedCheck = true;
    }

    loadTree(currentElementID.studyEvent, null);
}

window.showSurveyView = function() {
    $(".navbar").hide();
    $("html").classList.remove("has-navbar-fixed-top");
    $("#subjects-column").hide();
    $("#clinicaldata-study-events-column").hide();
    $("#clinicaldata-forms-column").hide();
    $("#clinicaldata-column .panel").classList.add("is-shadowless");
    $("#clinicaldata-column .panel-heading").hide();
    $("#clinicaldata-column").classList.remove("is-two-fifths-desktop");
    $("#clinicaldata-column").classList.add("is-full");
    $("#clinicaldata-column .tree-panel-blocks").classList.add("is-survey-view");
    $("#clinicaldata-section").classList.add("p-3");
    $("#clinicaldata-form-title").classList.add("is-centered");
    $("#survey-view-button").hide();
    $("#form-validate-level").hide();
    scrollToFormStart();
}

function hideSurveyView() {
    $(".navbar").show();
    $("html").classList.add("has-navbar-fixed-top");
    $("#subjects-column").show();
    if (metadataHelper.getStudyEvents().length > 1) $("#clinicaldata-study-events-column").show();
    $("#clinicaldata-forms-column").show();
    $("#clinicaldata-column .panel").classList.remove("is-shadowless");
    $("#clinicaldata-column .panel-heading").show();
    $("#clinicaldata-column").classList.add("is-two-fifths-desktop");
    $("#clinicaldata-column").classList.remove("is-full");
    $("#clinicaldata-column .tree-panel-blocks").classList.remove("is-survey-view");
    $("#clinicaldata-section").classList.remove("p-3");
    $("#clinicaldata-form-title").classList.remove("is-centered");
}

function showCloseClinicaldataPrompt() {
    ioHelper.showMessage(
        languageHelper.getTranslation(surveyViewIsActive() ? "close-survey" : "close-form"),
        languageHelper.getTranslation(surveyViewIsActive() ? "close-survey-text" : "close-form-text"),
        {
            [languageHelper.getTranslation("close-with-saving")]: () => closeFormData(true),
            [languageHelper.getTranslation("close-without-saving")]: () => closeFormData()
        },
        ioHelper.interactionTypes.DEFAULT,
        languageHelper.getTranslation("continue"),
        () => {
            skipDataHasChangedCheck = false;
            deferredFunction = null;
        }
    );
}

function showSurveyCodeModal() {
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
                button.innerHTML = '<span class="icon is-small"><i class="fas fa-arrow-left"></i></span>';
                button.onclick = () => surveyCodeButtonPressed(-1);
            }
            $(".numpad .buttons").appendChild(button);
        }
    }

    // Create or reset status dots that indicates how many digits have been pressed
    $$(".numpad .status span").removeElements();
    for (let i = 0; i < 4; i++) {
        $(".numpad .status").insertAdjacentHTML("beforeend", '<span class="icon empty-dot"><i class="far fa-circle"></i></span>');
    }

    surveyCode = "";
    $("#survey-code-modal").activate();
}

function surveyCodeButtonPressed(value) {
    if (value >= 0) {
        if (surveyCode.length >= 4) return;
        surveyCode += value;
        $(".numpad .status .empty-dot").remove();
        $(".numpad .status").insertAdjacentHTML("afterbegin", '<span class="icon filled-dot"><i class="fas fa-circle"></i></span>');
    } else {
        if (surveyCode.length <= 0) return;
        surveyCode = surveyCode.slice(0, -1);
        $(".numpad .status .filled-dot").remove();
        $(".numpad .status").insertAdjacentHTML("beforeend", '<span class="icon empty-dot"><i class="far fa-circle"></i></span>');
    }

    $("#wrong-survey-code-hint").hide();
    if (surveyCode.length == 4) {
        if (surveyCode == ioHelper.getSurveyCode()) {
            $("#survey-code-modal").deactivate();
        } else {
            $("#wrong-survey-code-hint").show();
            surveyCode = "";
            $$(".numpad .status .filled-dot").forEach(dot => {
                dot.remove();
                $(".numpad .status").insertAdjacentHTML("beforeend", '<span class="icon empty-dot"><i class="far fa-circle"></i></span>');
            });
        }
    }
}

function showNoSubjectHint() {
    $("#form-hint .message-body").textContent = languageHelper.getTranslation("no-subject-selected-hint");
    $("#form-hint").classList.add("is-danger");
    $("#form-hint").show();
    $("#form-validate-level").hide();
}

function showValidatedFormHint() {
    if (cachedFormDataIsAuditRecord) return;

    $("#form-hint .message-body").textContent = languageHelper.getTranslation("form-validated-hint");
    $("#form-hint").classList.add("is-link");
    $("#form-hint").show();
    $("#survey-view-button").hide();
    $("#form-validate-button").classList.add("is-validated");
    disableInputElements();
}

function showAuditRecordHint() {
    $("#form-hint .message-body").textContent = languageHelper.getTranslation("audit-record-data-hint");
    $("#form-hint").classList.add("is-link");
    $("#form-hint").show();
    $("#survey-view-button").hide();
    $("#clinicaldata-navigate-buttons").hide();
    $("#form-validate-level").hide();
    disableInputElements();
    skipDataHasChangedCheck = true;
}

function disableInputElements() {
    $$("#clinicaldata-content input").forEach(input => input.disabled = true);
    $$("#clinicaldata-content select").forEach(input => input.disabled = true);
    $$("#clinicaldata-content textarea").forEach(input => input.disabled = true);
}

function enableInputElements() {
    $$("#clinicaldata-content input").forEach(input => input.disabled = false);
    $$("#clinicaldata-content select").forEach(input => input.disabled = false);
    $$("#clinicaldata-content textarea").forEach(input => input.disabled = false);
}

function surveyViewIsActive() {
    return !$(".navbar").isVisible();
}

function dataHasChanged() {
    return !skipDataHasChangedCheck && currentElementID.subject && currentElementID.studyEvent && currentElementID.form && clinicaldataHelper.getFormDataDifference(getFormData(), currentElementID.studyEvent, currentElementID.form).length;
}

window.showSubjectInfo = function() {
    // Create audit record entries
    $$("#audit-records .notification").removeElements();

    const dateItemOIDs = metadataHelper.getItemOIDsWithDataType("date");
    const dateTimeItemOIDs = metadataHelper.getItemOIDsWithDataType("datetime");
    const booleanItemOIDs = metadataHelper.getItemOIDsWithDataType("boolean");
    const localizedYes = languageHelper.getTranslation("yes");
    const localizedNo = languageHelper.getTranslation("no");
    for (let auditRecord of clinicaldataHelper.getAuditRecords()) {
        // Improve readability of audit record data changes
        if (auditRecord.dataChanges) auditRecord.dataChanges.forEach(dataItem =>  {
            const codeListItem = metadataHelper.getCodeListItem(metadataHelper.getCodeListOIDByItem(dataItem.itemOID), dataItem.value);
            if (codeListItem) dataItem.value = codeListItem.getTranslatedDecode(locale, true);
            if (dateItemOIDs.includes(dataItem.itemOID)) dataItem.value = new Date(dataItem.value).toLocaleDateString();
            if (dateTimeItemOIDs.includes(dataItem.itemOID)) dataItem.value = new Date(dataItem.value).toLocaleString();
            if (booleanItemOIDs.includes(dataItem.itemOID)) dataItem.value = dataItem.value.replace("1", localizedYes).replace("0", localizedNo);
            dataItem.translatedQuestion = metadataHelper.getElementDefByOID(dataItem.itemOID).getTranslatedQuestion(locale, true);
        });

        // Render audit record
        const studyEventName = auditRecord.studyEventOID ? metadataHelper.getElementDefByOID(auditRecord.studyEventOID).getTranslatedDescription(locale, true) : null;
        const formName = auditRecord.formOID ? metadataHelper.getElementDefByOID(auditRecord.formOID).getTranslatedDescription(locale, true) : null;
        const userName = admindataHelper.getUserFullName(auditRecord.userOID);
        const siteName = admindataHelper.getSiteNameByOID(auditRecord.locationOID);
        let auditRecordElement = htmlElements.getAuditRecord(auditRecord.type, studyEventName, formName, auditRecord.dataStatus, userName, siteName, auditRecord.date, auditRecord.dataChanges);
        if (auditRecord.formOID) auditRecordElement.querySelector("button").onclick = () => showAuditRecordFormData(auditRecord.studyEventOID, auditRecord.formOID, auditRecord.date);
        $("#audit-records").appendChild(auditRecordElement);
    }

    // Fill inputs to change subject key and site
    let sites = [languageHelper.getTranslation("no-site")];
    admindataHelper.getSites().forEach(site => sites.push(site.getName()));
    ioHelper.safeRemoveElement($("#subject-site-select-outer"));
    const currentSiteName = admindataHelper.getSiteNameByOID(clinicaldataHelper.getSubject().siteOID);
    $("#subject-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("subject-site-select", true, true, sites, currentSiteName));
    $("#subject-modal strong").textContent = clinicaldataHelper.getSubject().key;
    $("#subject-modal input").value = clinicaldataHelper.getSubject().key;

    // Disable change functionality when there are unsaved changes in the form
    if (dataHasChanged()) {
        [$("#subject-modal input"), $("#subject-site-select-inner"), $("#save-subject-info-button")].disableElements();
        $$("#subject-modal button:not([onclick])").forEach(button => button.disabled = true);
    } else {
        [$("#subject-modal input"), $("#subject-site-select-inner"), $("#save-subject-info-button")].enableElements();
    }

    $("#subject-modal").activate();
}

window.hideSubjectInfo = function() {
    $("#subject-modal").deactivate();
}

async function showAuditRecordFormData(studyEventOID, formOID, date) {
    cachedFormData = clinicaldataHelper.getAuditRecordFormData(studyEventOID, formOID, date);
    if (!cachedFormData) return;

    cachedFormDataIsAuditRecord = true;
    await loadTree(studyEventOID, formOID);

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
                    ioHelper.showMessage(languageHelper.getTranslation("enter-subject-key"), languageHelper.getTranslation("enter-subject-key-text"));
                    break;
                case clinicaldataHelper.errors.SUBJECTKEYEXISTENT:
                    ioHelper.showMessage(languageHelper.getTranslation("subject-key-existent"), languageHelper.getTranslation("subject-key-existent-text"));
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
        $("#mobile-back-button").hide();
        $("#mobile-back-button").classList.remove("is-hidden-desktop");
    }
}

function adjustMobileUI(forceHideBackButton) {
    if (!ioHelper.isMobile()) return;
    
    // Hide or show navbar back button
    if (!forceHideBackButton && (currentElementID.subject || currentElementID.form || (currentElementID.studyEvent && metadataHelper.getStudyEvents().length > 1))) {
        $("#study-title").parentNode.classList.add("is-hidden-touch");
        $("#mobile-back-button").show();
        $("#mobile-back-button").classList.add("is-hidden-desktop");
    } else {
        $("#study-title").parentNode.classList.remove("is-hidden-touch");
        $("#mobile-back-button").hide();
        $("#mobile-back-button").classList.remove("is-hidden-desktop");
    }

    // Cancel further execution if function was merely called to hide the navbar back button
    if (forceHideBackButton) return;

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
        if (keyEvent.code == "Enter") addSubjectManual();
    };
    $("#search-subject-input").oninput = inputEvent => filterSubjects(inputEvent.target.value);

    document.addEventListener("BarcodeFound", barcodeEvent => {
        const siteOID = admindataHelper.getSiteOIDByName($("#filter-site-select-inner").value);
        const subjectKey = barcodeEvent.detail;
        addSubject(subjectKey, siteOID);
    });
}

function filterSubjects(searchString) {
    searchString = searchString.toUpperCase();
    for (let subject of $$("#subject-panel-blocks a")) {
        if (subject.textContent.toUpperCase().includes(searchString)) {
            subject.show();
        } else {
            subject.hide();
        }
    }
}

// Currently, the subjects are reloaded every 5 seconds -- this should be improved in the future by means of server-sent events or a websocket
function setLoadSubjectsTimer() {
    if (!ioHelper.hasServerURL()) return;
     
    setInterval(async () => {
        if (!$("#clinicaldata-section").isVisible()) return;
        
        await ioHelper.emptyMessageQueue();
        if (!clinicaldataHelper.getSubject()) {
            await clinicaldataHelper.loadSubjects();
            loadSubjectKeys();
        }
    }, 5000);
}
