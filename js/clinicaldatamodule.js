import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
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
    loadMetaAndClinicalData();

    $("#clinicaldata-section").classList.remove("is-hidden");
    $("#clinicaldata-toggle-button").classList.add("is-hidden");
}

export function hide() {
    $("#clinicaldata-section").classList.add("is-hidden");
    $("#clinicaldata-toggle-button").classList.remove("is-hidden");
}

export function loadMetaAndClinicalData() {
    loadStudyEvents();
    if (currentElementID.studyEvent) loadFormsByStudyEvent(currentElementID.studyEvent);
    if (currentElementID.form) loadFormData(currentElementID.form);
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

    ioHelper.removeIsActiveFromElements($$("#subject-panel-blocks a"));
    $(`#subject-panel-blocks [oid="${currentElementID.subject}"]`).classList.add("is-active");

    clinicaldataHelper.loadSubject(currentElementID.subject);
    await loadFormMetadata();
    loadFormClinicaldata();
}

function loadStudyEvents() {
    ioHelper.removeElements($$("#clinicaldata-study-event-panel-blocks a"));
    ioHelper.removeElements($$("#clinicaldata-form-panel-blocks a"));

    for (let studyEventDef of metadataHelper.getStudyEvents()) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = htmlElements.getPanelBlock(false, studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = () => loadFormsByStudyEvent(studyEventDef.getAttribute("OID"), true);
        $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
    }
}

function loadFormsByStudyEvent(studyEventOID, deselectForm) {
    currentElementID.studyEvent = studyEventOID;
    if (deselectForm) currentElementID.form = null;
    ioHelper.removeIsActiveFromElements($$("#clinicaldata-study-event-panel-blocks a"));
    $(`#clinicaldata-study-event-panel-blocks [oid="${currentElementID.studyEvent}"]`).classList.add("is-active");

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
    $(`#clinicaldata-form-panel-blocks [oid="${currentElementID.form}"]`).classList.add("is-active");

    await loadFormMetadata();
    loadFormClinicaldata();
    $("#clinicaldata-form-data").classList.remove("is-hidden");
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

    !getPreviousFormOID(currentElementID.form) ? $("#clinicaldata-previous-button").disabled = true : $("#clinicaldata-previous-button").disabled = false;
    if (!getNextFormOID(currentElementID.form)) {
        // TODO: i18n
        $("#clinicaldata-next-button").textContent = "Finish";
    } else {
        // TODO: i18n
        $("#clinicaldata-next-button").textContent = "Continue";
    }

    $("#clinicaldata-form-title").scrollIntoView({block: "end", behavior: "smooth"});
}

function loadFormClinicaldata() {
    if (!currentElementID.subject) $("#no-subject-selected-hint").classList.remove("is-hidden");
    if (!currentElementID.studyEvent || !currentElementID.form || !currentElementID.subject) return;

    $("#no-subject-selected-hint").classList.add("is-hidden");
    for (let formItemData of clinicaldataHelper.getSubjectFormData(currentElementID.studyEvent, currentElementID.form)) {
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
}

window.loadNextFormData = async function() {
    saveFormData();

    let nextFormOID = getNextFormOID(currentElementID.form);
    //TODO: Everywhere !nextFormOID
    if (nextFormOID != null) {
        currentElementID.form = nextFormOID
        await loadFormData(currentElementID.form);
    } else {
        closeFormData();
    }
}

window.loadPreviousFormData = async function() {
    saveFormData();

    let previousFormOID = getPreviousFormOID(currentElementID.form);
    if (previousFormOID != null) {
        currentElementID.form = previousFormOID
        await loadFormData(currentElementID.form);
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
    loadFormsByStudyEvent(currentElementID.studyEvent, true);
}

function saveFormData() {
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

    clinicaldataHelper.storeSubjectFormData(currentElementID.studyEvent, currentElementID.form, formItemDataList);
}
