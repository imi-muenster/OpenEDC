import ODMPath from "./odmwrapper/odmpath.js";
import * as metadataWrapper from "./odmwrapper/metadatawrapper.js";
import * as clinicaldataWrapper from "./odmwrapper/clinicaldatawrapper.js";
import * as admindataWrapper from "./odmwrapper/admindatawrapper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as expressionHelper from "./helper/expressionhelper.js";
import * as validationHelper from "./helper/validationhelper.js";
import * as htmlElements from "./helper/htmlelements.js";
import * as languageHelper from "./helper/languagehelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export let currentPath = new ODMPath();
export let currentSubjectKey = null;

let skipMandatoryCheck = false;
let skipDataHasChangedCheck = false;
let cachedFormData = null;
let cachedFormDataIsAuditRecord = false;
let deferredFunction = null;
let surveyCode = null;

const exampleStrings = ["kurzer String", "Dies ist eine längere Antwort. Deshalb steht hier etwas mehr. Er beinhaltet außerdem Umlaute.", "ein weiterer Beispielstring", "Liste: Medikament 1, Medikament 2, Medikament 3"]

export async function init() {
    createSiteFilterSelect();
    createSortTypeSelect();
    createDateFilterSelect();
    
    await clinicaldataWrapper.loadSubjects();
    setIOListeners();
}

export function show() {
    loadSubjectKeys();
    reloadTree();

    languageHelper.createLanguageSelect();
    ioHelper.setTreeMaxHeight();
}

export function createSiteFilterSelect() {
    let sites = [languageHelper.getTranslation("all-sites")];
    admindataWrapper.getSites().forEach(site => sites.push(site.getName()));

    $("#filter-site-select-outer")?.remove();
    $("#filter-site-control").appendChild(htmlElements.getSelect("filter-site-select", true, true, sites));
    $("#filter-site-select-inner option").setAttribute("i18n", "all-sites");
    $("#filter-site-select-inner").onmouseup = clickEvent => {
        if (safeCloseClinicaldata(() => loadTree(currentPath.studyEventOID, null))) clickEvent.target.blur();
    };
    $("#filter-site-select-inner").oninput = inputEvent => {
        currentSubjectKey = null;
        loadSubjectKeys();
        loadSubjectData();
        inputEvent.target.blur();
    };
}

function createSortTypeSelect() {
    const translatedSortTypes = Object.values(clinicaldataWrapper.sortOrderTypes).map(sortType => languageHelper.getTranslation(sortType));
    $("#sort-subject-select-outer")?.remove();
    $("#sort-subject-control").appendChild(htmlElements.getSelect("sort-subject-select", true, true, Object.values(clinicaldataWrapper.sortOrderTypes), null, translatedSortTypes, true));
    $("#sort-subject-select-inner").oninput = inputEvent => {
        loadSubjectKeys();
        inputEvent.target.blur();
    };
}

function createDateFilterSelect() {
    const translatedDateFilterTypes = Object.values(clinicaldataWrapper.dateFilterTypes).map(filterType => languageHelper.getTranslation(filterType));
    $("#date-filter-subject-select-outer")?.remove();
    $("#date-filter-subject-control").appendChild(htmlElements.getSelect("date-filter-subject-select", true, true, Object.values(clinicaldataWrapper.dateFilterTypes), null, translatedDateFilterTypes, true));
    $("#date-filter-subject-select-inner").oninput = inputEvent => {
        loadSubjectKeys();
        inputEvent.target.blur();
    };
    $("#date-filter-subject-select-inner").value = clinicaldataWrapper.dateFilterTypes.LAST_7_DAYS;
}

window.addSubjectManual = function() {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (safeCloseClinicaldata(addSubjectManual)) return;

    const siteOID = admindataWrapper.getSiteOIDByName($("#filter-site-select-inner").value);
    const subjectKey = $("#add-subject-input").value;
    $("#add-subject-input").value = "";

    addSubject(subjectKey, siteOID);
}

window.addSubjectAuto = function() {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (safeCloseClinicaldata(addSubjectAuto)) return;

    const siteOID = admindataWrapper.getSiteOIDByName($("#filter-site-select-inner").value);
    const subjectKey = clinicaldataWrapper.getAutoNumberedSubjectKey();

    addSubject(subjectKey, siteOID);
}

window.addSubjectBarcode = async function() {
    await import("./components/barcodemodal.js");

    // Check if the data has changed / new data has been entered and show a prompt first
    if (safeCloseClinicaldata(addSubjectBarcode)) return;

    // Deselect the currently selected subject
    if (currentSubjectKey) loadSubjectData();
    
    // Open the barcode scan modal
    const barcodeModal = document.createElement("barcode-modal");
    barcodeModal.setHeading(languageHelper.getTranslation("barcode"));
    barcodeModal.setHelpText(languageHelper.getTranslation("barcode-help-text"));
    barcodeModal.setInputPlaceholder(languageHelper.getTranslation("new-subject"));
    barcodeModal.setButtonText(languageHelper.getTranslation("add"));
    document.body.appendChild(barcodeModal);
}

function addSubject(subjectKey, siteOID) {
    clinicaldataWrapper.addSubject(subjectKey, siteOID)
        .then(() => {
            loadSubjectKeys();
            skipDataHasChangedCheck = true;
            loadSubjectData(subjectKey);
        })
        .catch(error => {
            switch (error) {
                case clinicaldataWrapper.errors.SUBJECTKEYEMPTY:
                    ioHelper.showMessage(languageHelper.getTranslation("enter-subject-key"), languageHelper.getTranslation("enter-subject-key-text"));
                    break;
                case clinicaldataWrapper.errors.SUBJECTKEYEXISTENT:
                    ioHelper.showMessage(languageHelper.getTranslation("subject-key-existent"), languageHelper.getTranslation("subject-key-existent-open-text"),
                        {
                            [languageHelper.getTranslation("open")]: () => loadSubjectData(subjectKey)
                        }
                    );
                    break;
                case clinicaldataWrapper.errors.SUBJECTKEYEXISTENTOTHERSITE:
                    ioHelper.showMessage(languageHelper.getTranslation("subject-key-existent"), languageHelper.getTranslation("subject-key-existent-other-site-text"));
            }
        });
}

export function loadSubjectKeys() {
    console.log("load keys");
    $$("#subject-panel-blocks a").removeElements();

    const selectedSite = admindataWrapper.getSiteOIDByName($("#filter-site-select-inner").value);
    const sortOrder = $("#sort-subject-select-inner").value;
    const dateFilter = $("#date-filter-subject-select-inner").value;
    const subjects = clinicaldataWrapper.getSubjects(selectedSite, sortOrder, dateFilter);
    subjects.length ? $("#no-subjects-hint").hide() : $("#no-subjects-hint").show();

    for (let subject of subjects) {
        const siteSubtitle = subject.siteOID && !selectedSite ? admindataWrapper.getSiteNameByOID(subject.siteOID) : null;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(subject.uniqueKey, subject.key, null, siteSubtitle, subject.status, subject.hasConflict);
        panelBlock.onclick = () => subjectClicked(subject.uniqueKey);
        $("#subject-panel-blocks").appendChild(panelBlock);
    }

    if (currentSubjectKey) $(`#subject-panel-blocks [oid="${currentSubjectKey}"]`).activate();
    ioHelper.dispatchGlobalEvent("SubjectKeysLoaded");
}

window.reloadSubjectKeys = () => {
    loadSubjectKeys();
}

function subjectClicked(subjectKey) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (safeCloseClinicaldata(() => subjectClicked(subjectKey))) return;

    // Option to deselect a subject by clicking on the same subject again
    // If the currently logged in user has no metadata edit rights, then disable the form preview as well
    if (subjectKey == currentSubjectKey) {
        subjectKey = null;
        if (!ioHelper.userHasRight(ioHelper.userRights.EDITMETADATA)) currentPath.formOID = null;
    }

    loadSubjectData(subjectKey);
}

async function loadSubjectData(subjectKey) {
    // Automatically select the first study event if there is only one (present here as well mainly because of mobile auto survey view function)
    if (!currentPath.studyEventOID && eventsAreHidden()) currentPath.studyEventOID = metadataWrapper.getStudyEvents()[0].getOID();

    await clinicaldataWrapper.loadSubject(subjectKey)
        .then(subject => {
            currentSubjectKey = subject?.uniqueKey;
            cachedFormData = null;
        })
        .catch(() => {
            currentSubjectKey = null;
            clinicaldataWrapper.clearSubject();
            ioHelper.showMessage(languageHelper.getTranslation("subject-not-loaded-title"), languageHelper.getTranslation("subject-not-loaded-error"));
        });

    $("#subject-panel-blocks a.is-active")?.deactivate();
    if (currentSubjectKey) $(`#subject-panel-blocks [oid="${currentSubjectKey}"]`).activate();
    if (currentSubjectKey) ioHelper.scrollParentToChild($(`#subject-panel-blocks [oid="${currentSubjectKey}"]`));
    $("#subject-info-button").disabled = currentSubjectKey ? false : true;
    if (!ioHelper.userHasRight(ioHelper.userRights.MANAGESUBJECTS)) $("#subject-info-button").disabled = true;

    await reloadTree();
}

window.createRandomSubjects = async function() {
    let amount = $('#example-data-input').value;
    if(!amount || amount == 0) {
        ioHelper.showToast(languageHelper.getTranslation('incorrect-amount'), 4000, ioHelper.interactionTypes.WARNING);
        return;
    }
    for(let i = 0; i < amount; ++i) {
        try{
            const subjectKey = `Random User ${i + 1}`;
            await clinicaldataWrapper.addSubject(subjectKey);
            loadSubjectKeys();
            skipDataHasChangedCheck = true;
            await loadSubjectData(subjectKey)
            await createExampleData(subjectKey);
            loadSubjectKeys();
        }
        catch(error) {
            if(error == clinicaldataWrapper.errors.SUBJECTKEYEXISTENT || error == clinicaldataWrapper.errors.SUBJECTKEYEXISTENTOTHERSITE) amount++;
            else console.log(error);
        }
    }
}

async function createExampleData(subjectKey) {

    expressionHelper.setVariables({});

    let minInt = 0;
    let maxInt = 100;

    for(let seOID of metadataWrapper.getStudyEventOIDs()) {
        for(let f of metadataWrapper.getFormsByStudyEvent(seOID)) {
            const formOID = f.getAttribute('OID');
            let formItemDataList = [];

            for(let ig of metadataWrapper.getItemGroupsByForm(formOID)) {
                const itemGroupOID = ig.getAttribute('OID');
                for (let i of metadataWrapper.getItemsByItemGroup(itemGroupOID)) {
                    const itemOID = i.getAttribute('OID');
                    const path = new ODMPath(seOID, formOID, itemGroupOID, itemOID);

                    //handles conditions
                    let condition = metadataWrapper.getElementCondition(ODMPath.elements.ITEM, path);
                    if(condition) {
                        let formalExpression = condition.getFormalExpression();
                        let expression = expressionHelper.parse(formalExpression, path);
                        const included = expressionHelper.evaluate(expression, "condition");
                        if(!included) continue;
                    }
                   
                    const dataType = i.getAttribute('DataType');
                    const codelistItems = metadataWrapper.getCodeListItemsByItem(itemOID);

                    //considers range checks when assigning values
                    const rangechecks = [...metadataWrapper.getRangeChecksByItem(itemOID)].map(rc => { 
                        return {comparator: rc.getAttribute('Comparator'), value: rc.querySelector('CheckValue').textContent}
                    }).map(rc => {
                        if (rc.comparator == "GT") return {comparator: "GE", value: dataType == 'integer' ? (parseInt(rc.value) + 1) : (parseFloat(rc.value) + 0.0001)}
                        if (rc.comparator == "LT") return {comparator: "LE", value: dataType == 'integer' ? (parseInt(rc.value) - 1) : (parseFloat(rc.value) - 0.0001)}
                        return rc;
                    });
                    if(rangechecks.length > 0) {
                        minInt = Math.max([...rangechecks.filter(rc => rc.comparator == 'GE').map(rc => rc.value)]);
                        maxInt = Math.min([...rangechecks.filter(rc => rc.comparator == 'LE').map(rc => rc.value)]);
                    }
                    let value;
                    switch (dataType) {
                        case "integer": 
                            if(codelistItems.length > 0) value = `${codelistItems[getRandomNumber(0, codelistItems.length - 1, 'integer')].getAttribute('CodedValue')}`;
                            else value = `${getRandomNumber(minInt, maxInt, 'integer')}`;
                            break;
                        case "boolean":
                            value = `${getRandomNumber(0,1,'integer')}`;
                            break;
                        case "string":
                        case "text": 
                            if(codelistItems.length > 0) value = `${codelistItems[getRandomNumber(0, codelistItems.length - 1, 'integer')].getAttribute('CodedValue')}`;
                            else value = `${exampleStrings[getRandomNumber(0, exampleStrings.length - 1, 'integer')]}`
                            break;
                        case "datetime": 
                            value = new Calendar().today.localDateTimeISOString;
                            break;
                        case "date":
                            value = new Calendar().today.localDateISOString;
                            break;
                        case "time": 
                            value = new Calendar().today.localTimeISOString;
                            break;
                        case "double":
                        case "float":
                            if(codelistItems.length > 0) value = `${codelistItems[getRandomNumber(0, codelistItems.length - 1, 'integer')].getAttribute('CodedValue')}`;
                            else value = `${Math.floor(getRandomNumber(minInt, maxInt, 'float')*100)/100}`;
                            break;
                        default:
                            break;
                    }
                    if(value) {
                        formItemDataList.push(new clinicaldataWrapper.FormItemData(itemGroupOID, itemOID, value));
                        expressionHelper.setVariable(path.toString(), value);
                    }
                }
            }
            await clinicaldataWrapper.storeSubjectFormData(seOID, formOID, formItemDataList, clinicaldataWrapper.dataStatusTypes.COMPLETE );
            skipDataHasChangedCheck = true;
            await loadTree(seOID, formOID);
        }
    }

}

function getRandomNumber(min, max, type){
    if(type == 'integer') return Math.floor(Math.random() * (max - min + 1)) + min;
    if(type == 'float') return Math.random() * (max - min) + min;
}

function eventsAreHidden() {
    return metadataWrapper.getStudyEvents().length === 1
        && metadataWrapper.getStudyEventRepeating(metadataWrapper.getStudyEvents()[0].getOID()) != metadataWrapper.repeatingTypes.YES;
}

export async function reloadTree() {
    // Hide the study event column if there is only one event
    if (eventsAreHidden()) {
        $("#clinicaldata-study-events-column").hide();
        currentPath.studyEventOID = metadataWrapper.getStudyEvents()[0].getOID();
    } else $("#clinicaldata-study-events-column").show();

    // Ad hoc implementation, improve for OpenEDC 2.0 – react to changes in metadata repeatable settings
    if (metadataWrapper.getStudyEventRepeating(currentPath.studyEventOID) === metadataWrapper.repeatingTypes.YES
        && !currentPath.studyEventRepeatKey) {
            currentPath.studyEventRepeatKey = 1;
    } else if (metadataWrapper.getStudyEventRepeating(currentPath.studyEventOID) === metadataWrapper.repeatingTypes.NO
        && currentPath.studyEventRepeatKey) {
            currentPath.studyEventRepeatKey = null;
    }

    skipDataHasChangedCheck = true;
    await loadTree(currentPath.studyEventOID, currentPath.formOID, currentPath.studyEventRepeatKey);
}

// TODO: Loads entire tree if according elements are passed, implement this analogously for metadatamodule
async function loadTree(studyEventOID, formOID, studyEventRepeatKey) {
    // Check if the data has changed / new data has been entered and show a prompt first
    if (safeCloseClinicaldata(() => loadTree(studyEventOID, formOID))) return;

    currentPath.studyEventOID = studyEventOID;
    currentPath.formOID = formOID;

    // Ad hoc implementation, improve for OpenEDC 2.0
    currentPath.studyEventRepeatKey = studyEventRepeatKey;

    $$("#clinicaldata-study-event-panel-blocks a").removeElements();
    $$("#clinicaldata-form-panel-blocks a").removeElements();

    for (let studyEventDef of metadataWrapper.getStudyEvents()) {
        const studyEventOID = studyEventDef.getOID();
        const translatedDescription = studyEventDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        const name = studyEventDef.getName();

        // Ad hoc implementation, improve for OpenEDC 2.0
        const repeating = metadataWrapper.getStudyEventRepeating(studyEventOID) === metadataWrapper.repeatingTypes.YES;
        if (repeating) {
            let repeatKeys = await clinicaldataWrapper.getStudyEventRepeatKeys(studyEventOID, currentSubjectKey);
            repeatKeys = repeatKeys.sort((a, b) => a - b);
            for (const repeatKey of repeatKeys) {
                const dataStatus = currentSubjectKey ? clinicaldataWrapper.getDataStatusForStudyEvent({studyEventOID, repeatKey}) : clinicaldataWrapper.dataStatusTypes.EMPTY;
                renderStudyEvent(studyEventOID, translatedDescription, name, dataStatus, repeatKey);
            }

            // Always render one empty, additional study event
            const nextRepeatKey = parseInt(repeatKeys.length ? repeatKeys.at(-1) : 0) + 1;
            const dataStatus = clinicaldataWrapper.dataStatusTypes.EMPTY;
            renderStudyEvent(studyEventOID, translatedDescription, name, dataStatus, nextRepeatKey);
        } else {
            const dataStatus = currentSubjectKey ? clinicaldataWrapper.getDataStatusForStudyEvent({studyEventOID}) : clinicaldataWrapper.dataStatusTypes.EMPTY;
            renderStudyEvent(studyEventOID, translatedDescription, name, dataStatus);
        }
    }

    adjustMobileUI();
    if (!currentPath.studyEventOID && !currentPath.formOID && eventsAreHidden()) backOnMobile();
    if (currentPath.studyEventOID) await loadFormsByStudyEvent();
}

function renderStudyEvent(studyEventOID, translatedDescription, name, dataStatus, repeatKey) {
    const repetitionText = repeatKey ? `${repeatKey}. ${languageHelper.getTranslation("repetition")}`: null;
    const panelBlock = htmlElements.getClinicaldataPanelBlock(studyEventOID, translatedDescription, name, repetitionText, dataStatus, false, repeatKey);
    panelBlock.onclick = () => loadTree(studyEventOID, null, repeatKey);
    $("#clinicaldata-study-event-panel-blocks").appendChild(panelBlock);
}

async function loadFormsByStudyEvent() {
    $("#clinicaldata-study-event-panel-blocks a.is-active")?.deactivate();

    // Ad hoc implementation, improve for OpenEDC 2.0
    if (currentPath.studyEventRepeatKey) {
        const studyEvent = $(`#clinicaldata-study-event-panel-blocks [oid="${currentPath.studyEventOID}"][study-event-repeat-key="${currentPath.studyEventRepeatKey}"]`)
        //this means there is no repetition x for the chosen subject
        if(!studyEvent) return;
        studyEvent.activate();
    } else {
        $(`#clinicaldata-study-event-panel-blocks [oid="${currentPath.studyEventOID}"]`).activate();
    }

    const formDefs = metadataWrapper.getFormsByStudyEvent(currentPath.studyEventOID);
    for (let formDef of formDefs) {
        const formOID = formDef.getOID();
        const translatedDescription = formDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        const dataStatus = currentSubjectKey ? clinicaldataWrapper.getDataStatusForForm({studyEventOID: currentPath.studyEventOID, formOID, studyEventRepeatKey: currentPath.studyEventRepeatKey}) : clinicaldataWrapper.dataStatusTypes.EMPTY;
        let panelBlock = htmlElements.getClinicaldataPanelBlock(formOID, translatedDescription, formDef.getName(), null, dataStatus);
        panelBlock.onclick = () => loadTree(currentPath.studyEventOID, formOID, currentPath.studyEventRepeatKey);
        $("#clinicaldata-form-panel-blocks").appendChild(panelBlock);
    }

    // Automatically start the survey view when activated in project options and the current device is a smartphone or tablet
    if (ioHelper.getSetting("autoSurveyView") && ioHelper.isMobile() && currentSubjectKey && formDefs.length && !currentPath.formOID) {
        currentPath.formOID = getNextFormOID();//  formDefs[0].getOID();
        showSurveyView();
        adjustMobileUI();
    }

    if (currentPath.formOID) {
        await loadFormData();
    } else {
        $("#odm-html-content")?.remove();
        $("#clinicaldata-form-data").hide();
    }
}

async function loadFormData() {
    // If connected to the server and the user has no metadata edit rights then disable the form preview functionality
    if (!ioHelper.userHasRight(ioHelper.userRights.EDITMETADATA) && !currentSubjectKey) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("no-subject-selected-warning"));
        return;
    }

    $("#clinicaldata-form-panel-blocks a.is-active")?.deactivate();
    $(`#clinicaldata-form-panel-blocks [oid="${currentPath.formOID}"]`).activate();

    resetFormUIElements();

    // Render the form, add dynamic form logic such as conditions, and add clinical data
    await loadFormMetadata();
    addDynamicFormLogicPre();
    loadFormClinicaldata();
    $("#clinicaldata-form-data").show();
    addDynamicFormLogicPost();

    // Show a hint if no subject is selected
    if (!currentSubjectKey) showNoSubjectHint();

    skipMandatoryCheck = false;
    skipDataHasChangedCheck = false;

    // Handle cachedData, that is usually cached when the language is changed
    if (cachedFormDataIsAuditRecord) showAuditRecordHint();
    cachedFormDataIsAuditRecord = false;
    cachedFormData = null;

    scrollToFormStart();
    ioHelper.dispatchGlobalEvent("FormDataLoaded");
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
    if (surveyViewIsActive() || !ioHelper.userHasRight(ioHelper.userRights.VALIDATEFORMS)) $("#form-validate-level").hide();
}

async function loadFormMetadata() {
    if (!currentPath.studyEventOID || !currentPath.formOID) return;

    // Add the form title and use the name as fallback
    const formDef = metadataWrapper.getElementDefByOID(currentPath.formOID);
    $("#clinicaldata-form-title .subtitle").textContent = formDef.getTranslatedDescription(languageHelper.getCurrentLocale(), true);

    // Add the empty form
    let form = await metadataWrapper.getFormAsHTML(currentPath.formOID, ioHelper.getSetting("textAsTextarea"));
    const hideForm = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', currentPath.formOID);
    if(hideForm) $("#survey-view-button #survey-button").disabled = true;
    else  $("#survey-view-button #survey-button").disabled = false;

    $("#odm-html-content")?.remove();
    $("#clinicaldata-content").appendChild(form);

    // Adjust the form navigation buttons
    $("#clinicaldata-previous-button").disabled = getPreviousFormOID(currentPath.formOID) ? false : true;
    updateFormButtons();
}

// Must be in place before clinical data is added to the form's input elements
function addDynamicFormLogicPre() {
    // Add real-time logic to process items with conditions and methods
    const variables = clinicaldataWrapper.getCurrentData({studyEventRepeatKey: currentPath.studyEventRepeatKey});
    if (cachedFormData) cachedFormData.forEach(entry => {
        const cachedFormDataPath = new ODMPath(currentPath.studyEventOID, currentPath.formOID, entry.itemGroupOID, entry.itemOID);
        variables[cachedFormDataPath.toString()] = entry.value;
    });
    expressionHelper.setVariables(variables);
    const expressions = metadataWrapper.getElementsWithExpressionIncludeForms(currentPath.studyEventOID, currentPath.formOID);
    expressionHelper.process(expressions);
}

// Added after the form has been rendered for performance purposes
function addDynamicFormLogicPost() {
    // Add real-time logic to validate fields by data type and/or allowed ranges
    validationHelper.process(metadataWrapper.getItemsWithRangeChecks(currentPath.formOID));
        
    // Allow the user to uncheck an already checked group of radio items
    $$("#clinicaldata-content label.radio").forEach(radioItem => {
        radioItem.addEventListener("mouseup", uncheckRadioItem);
    });

    // Add a history button to show the audit trail for one specific item
    if (currentSubjectKey) $$("#clinicaldata-content .item-field").forEach(itemField => {
        const historyButton = document.createElement("div");
        historyButton.className = "icon is-history-button is-pulled-right is-hidden-survey-view";
        historyButton.innerHTML = "<i class='far fa-clock'></i>";
        historyButton.addEventListener("click", showItemAuditTrail);
        itemField.insertAdjacentElement("afterbegin", historyButton);
    });

    // Fourth, add date focus event listeners (currently not used on mobile devices because of a Safari issue)
    if (ioHelper.isMobile()) return;
    $$("#clinicaldata-content input[type='date'], #clinicaldata-content input[type='time'], #clinicaldata-content input[type='datetime-local']").forEach(dateInput => {
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

function showItemAuditTrail(event) {
    const itemGroupOID = event.target.closest('.item-group-content').getAttribute("item-group-content-oid");
    const itemOID = event.target.closest('.item-field').getAttribute("item-field-oid");
    const auditRecords = clinicaldataWrapper.getAuditRecords({
        studyEventOID: currentPath.studyEventOID,
        formOID: currentPath.formOID,
        itemGroupOID: itemGroupOID,
        itemOID: itemOID
    });

    const table = htmlElements.getTable({
        [languageHelper.getTranslation("timestamp")]: auditRecords.map(auditRecord => auditRecord.date.toLocaleString()),
        [languageHelper.getTranslation("user")]: auditRecords.map(auditRecord => auditRecord.userName),
        [languageHelper.getTranslation("value")]: auditRecords.map(auditRecord => auditRecord.dataChanges[0].localizedValue)
    });

    ioHelper.showMessage(languageHelper.getTranslation("audit-trail-for-item"), auditRecords.length ? table.outerHTML : languageHelper.getTranslation("no-audit-trail-hint"), null, null, null, null, true);
}

function showDateTimePicker(event) {
    if (event.target.readOnly) return;
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
    if (!currentPath.studyEventOID || !currentPath.formOID || !currentSubjectKey) return;

    // Two types of errors that can occur during the data loading process
    let metadataNotFoundErrors = [];
    let hiddenFieldWithValueErrors = [];

    let formItemDataList = cachedFormData || clinicaldataWrapper.getSubjectFormData(currentPath.studyEventOID, currentPath.formOID, currentPath.studyEventRepeatKey);
    for (let formItemData of formItemDataList) {
        if (!formItemData.value) continue;

        let inputElement = $(`#clinicaldata-content [item-group-content-oid="${formItemData.itemGroupOID}"] [item-oid="${formItemData.itemOID}"]`);
        if (!inputElement) {
            metadataNotFoundErrors.push({type: ODMPath.elements.ITEM, oid: formItemData.itemOID});
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
                    metadataNotFoundErrors.push({type: ODMPath.elements.CODELISTITEM, oid: formItemData.itemOID, value: formItemData.value});
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
    if (clinicaldataWrapper.getDataStatusForForm({studyEventOID: currentPath.studyEventOID, formOID: currentPath.formOID, studyEventRepeatKey:currentPath.studyEventRepeatKey}) == clinicaldataWrapper.dataStatusTypes.VALIDATED) showValidatedFormHint();
}

// TODO: Localize error messages
function showErrors(metadataNotFoundErrors, hiddenFieldWithValueErrors) {
    // Compose and show the error message
    let errorMessage = "";
    if (metadataNotFoundErrors.length) {
        errorMessage += "<p>" + languageHelper.getTranslation("metadata-not-found-error") + "</p><br>";
        for (let error of metadataNotFoundErrors) {
            errorMessage += "<p>";
            if (error.type == ODMPath.elements.ITEM) errorMessage += languageHelper.getTranslation("unique-id") + ": " + error.oid;
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
    // This checks whether the saving process could find unanswered mandatory fields. The form data is stored either way
    if (!await saveFormData()) return;

    let nextFormOID = getNextFormOID(currentPath.formOID);

    skipDataHasChangedCheck = true;
    if (nextFormOID) {
        await loadTree(currentPath.studyEventOID, nextFormOID, currentPath.studyEventRepeatKey);
        const hideForm = surveyViewIsActive() && metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', nextFormOID);
        if(hideForm || fastSkip) {
            loadNextFormData();
            return;
        }
    } else {
        await closeFormData(false, true);
        ioHelper.dispatchGlobalEvent("FormData finished");
    }
    loadSubjectKeys();
}


window.loadPreviousFormData = async function() {
    skipMandatoryCheck = true;
    await saveFormData();

    let previousFormOID = getPreviousFormOID(currentPath.formOID);
    if (previousFormOID) {
        skipDataHasChangedCheck = true;
        await loadTree(currentPath.studyEventOID, previousFormOID, currentPath.studyEventRepeatKey);
        const hideForm = surveyViewIsActive() && metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', previousFormOID);
        if(hideForm) {
            loadPreviousFormData(previousFormOID);
            return;
        }
    }

    loadSubjectKeys();
}

function checkNextFormOIDIsLast(previousFormOID) {
    let formDefs = metadataWrapper.getFormsByStudyEvent(currentPath.studyEventOID);
    if(formDefs.length && !previousFormOID) {
        previousFormOID = formDefs[0].getOID();
        const hideForm = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', previousFormOID);
        if(!hideForm || !surveyViewIsActive()) return previousFormOID;
    }
    let keepSearching = true;
    let nextFormOID;
    while(keepSearching) {
        for (let i = 0; i < formDefs.length-1; i++) {
            if (formDefs[i].getOID() == previousFormOID) nextFormOID = formDefs[i+1].getOID();
        }
        if(!nextFormOID) {
            return nextFormOID;
        }
        const hideForm = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', nextFormOID);
        if(!hideForm || !surveyViewIsActive()) {
           return nextFormOID;
        }
        previousFormOID = nextFormOID;
        nextFormOID = null;
    }
}

function getNextFormOID(previousFormOID) {
    let formDefs = metadataWrapper.getFormsByStudyEvent(currentPath.studyEventOID);
    if(formDefs.length && !previousFormOID) return formDefs[0].getOID();
    for (let i = 0; i < formDefs.length-1; i++) {
        if (formDefs[i].getOID() == previousFormOID) return formDefs[i+1].getOID();
    }
}

function checkPreviousFormOIDIsFirst(nextFormOID) {
    let formDefs = metadataWrapper.getFormsByStudyEvent(currentPath.studyEventOID);

    let keepSearching = true;
    let previousFormOID;
    while(keepSearching) {
        for (let i = 1; i < formDefs.length; i++) {
            if (formDefs[i].getOID() == nextFormOID) previousFormOID = formDefs[i-1].getOID();
        }
        if(!previousFormOID) {
            return previousFormOID;
        }
        const hideForm = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', previousFormOID);
        if(!hideForm || !surveyViewIsActive()) {
           return previousFormOID;
        }
        nextFormOID = previousFormOID;
        previousFormOID = null;
    }
}

function getPreviousFormOID(nextFormOID) {
    let formDefs = metadataWrapper.getFormsByStudyEvent(currentPath.studyEventOID);
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
    let dataStatus = clinicaldataWrapper.dataStatusTypes.COMPLETE;
    if (!mandatoryFieldsAnswered) dataStatus = clinicaldataWrapper.dataStatusTypes.INCOMPLETE;
    if (formItemDataList.length == 0) dataStatus = clinicaldataWrapper.dataStatusTypes.EMPTY;
    if (isFormValidated()) dataStatus = clinicaldataWrapper.dataStatusTypes.VALIDATED;
    
    // Store data
    await clinicaldataWrapper.storeSubjectFormData(currentPath.studyEventOID, currentPath.formOID, formItemDataList, dataStatus, currentPath.studyEventRepeatKey);

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
                    if (value) formItemDataList.push(new clinicaldataWrapper.FormItemData(itemGroupOID, itemOID, value));
                    break;
                case "textarea":
                    if (value) formItemDataList.push(new clinicaldataWrapper.FormItemData(itemGroupOID, itemOID, value.replace(/\n/g, "\\n")));
                    break;
                case "radio":
                    if (inputElement.checked) formItemDataList.push(new clinicaldataWrapper.FormItemData(itemGroupOID, itemOID, value));
            }
        }
    }

    return formItemDataList;
}

function checkMandatoryFields(formItemDataList) {
    if (isFormValidated()) return true;

    let mandatoryFieldsAnswered = true;
    for (let mandatoryField of $$(".item-group-content:not(.is-hidden) .item-field[mandatory='Yes']:not(.is-hidden)")) {
        if (!formItemDataList.find(formItemData => formItemData.itemGroupOID == mandatoryField.closest('.item-group-content').getAttribute("item-group-content-oid") && formItemData.itemOID == mandatoryField.getAttribute("item-field-oid"))) {
            if (!skipMandatoryCheck) mandatoryField.highlight();
            mandatoryFieldsAnswered = false;
        }
    }

    return mandatoryFieldsAnswered;
}

export function cacheFormData() {
    if (!currentPath.studyEventOID || !currentPath.formOID || !currentSubjectKey) return;

    cachedFormData = getFormData();

    // TODO: This could be improved in the future, but currently the form-hint has only is-link for the audit record view and validated forms
    cachedFormDataIsAuditRecord = $("#form-hint").classList.contains("is-link") && !$("#form-validate-button").classList.contains("is-validated") ? true : false;
}

// TODO: closeFormData and cancelFormOrSurveyEntry could be further refactored
window.closeFormData = async function(saveData, recheckAllForms = false) {
    if (saveData) {
        skipMandatoryCheck = true;
        await saveFormData();
        loadSubjectKeys();
    }

    if(recheckAllForms) {
        currentPath.formOID = null;
        await saveOnClose();
    }

    if (deferredFunction) await deferredFunction();
    else cancelFormOrSurveyEntry(true);
}

const saveOnClose = async() => {
        skipMandatoryCheck = true;
        if (!await saveFormData()) return;

        console.log(currentPath.formOID);
        let nextFormOID = getNextFormOID(currentPath.formOID);
        console.log(nextFormOID);
        skipDataHasChangedCheck = true;
        if (nextFormOID) {
            await loadTree(currentPath.studyEventOID, nextFormOID, currentPath.studyEventRepeatKey);
            await saveOnClose();
            return;
        }
        
        //loadSubjectKeys();
}

window.cancelFormOrSurveyEntry = function(closeSurvey) {
    if (surveyViewIsActive() && !closeSurvey) {
        showCloseClinicaldataPrompt();
        return;
    } else if (surveyViewIsActive()) {
        hideSurveyView();
        if (ioHelper.getSetting("surveyCode")) showSurveyCodeModal();
        if (ioHelper.getSetting("autoSurveyView") && ioHelper.isMobile()) currentPath.studyEventOID = null;
        skipDataHasChangedCheck = true;
    }

    loadTree(currentPath.studyEventOID, null, currentPath.studyEventRepeatKey);
}

window.showSurveyView = function() {
    $(".navbar").hide();
    $("html").classList.remove("has-navbar-fixed-top");
    $("#subjects-column").hide();
    $("#clinicaldata-study-events-column").hide();
    $("#clinicaldata-forms-column").hide();
    $("#clinicaldata-column .panel").classList.add("is-shadowless");
    $("#clinicaldata-column .panel-heading").hide();
    $("#clinicaldata-column .tree-panel-blocks").classList.add("is-survey-view");
    $("#clinicaldata-section").classList.add("p-3");
    $("#clinicaldata-form-title").classList.add("is-centered");
    scrollToFormStart();
    updateFormButtons();
}

function hideSurveyView() {
    $(".navbar").show();
    $("html").classList.add("has-navbar-fixed-top");
    $("#subjects-column").show();
    if (!eventsAreHidden()) $("#clinicaldata-study-events-column").show();
    $("#clinicaldata-forms-column").show();
    $("#clinicaldata-column .panel").classList.remove("is-shadowless");
    $("#clinicaldata-column .panel-heading").show();
    $("#clinicaldata-column .tree-panel-blocks").classList.remove("is-survey-view");
    $("#clinicaldata-section").classList.remove("p-3");
    $("#clinicaldata-form-title").classList.remove("is-centered");
    updateFormButtons();
}

function updateFormButtons() {
    if (!checkNextFormOIDIsLast(currentPath.formOID)) {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("finish");
    } else {
        $("#clinicaldata-next-button").textContent = languageHelper.getTranslation("continue");
    }
    $("#clinicaldata-previous-button").disabled = checkPreviousFormOIDIsFirst(currentPath.formOID) ? false : true;
}

export function safeCloseClinicaldata(callback) {
    if (dataHasChanged()) {
        skipDataHasChangedCheck = true;
        deferredFunction = () => callback();
        showCloseClinicaldataPrompt();
        return true;
    }
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
                button.innerHTML = '<span class="icon is-small"><i class="fa-solid fa-arrow-left"></i></span>';
                button.onclick = () => surveyCodeButtonPressed(-1);
            }
            $(".numpad .buttons").appendChild(button);
        }
    }

    // Create or reset status dots that indicates how many digits have been pressed
    $$(".numpad .status span").removeElements();
    for (let i = 0; i < 4; i++) {
        $(".numpad .status").insertAdjacentHTML("beforeend", '<span class="icon empty-dot"><i class="fa-regular fa-circle"></i></span>');
    }

    surveyCode = "";
    $("#survey-code-modal").activate();
}

function surveyCodeButtonPressed(value) {
    if (value >= 0) {
        if (surveyCode.length >= 4) return;
        surveyCode += value;
        $(".numpad .status .empty-dot").remove();
        $(".numpad .status").insertAdjacentHTML("afterbegin", '<span class="icon filled-dot"><i class="fa-solid fa-circle"></i></span>');
    } else {
        if (surveyCode.length <= 0) return;
        surveyCode = surveyCode.slice(0, -1);
        $(".numpad .status .filled-dot").remove();
        $(".numpad .status").insertAdjacentHTML("beforeend", '<span class="icon empty-dot"><i class="fa-regular fa-circle"></i></span>');
    }

    $("#wrong-survey-code-hint").hide();
    if (surveyCode.length == 4) {
        if (surveyCode == ioHelper.getSetting("surveyCode")) {
            $("#survey-code-modal").deactivate();
        } else {
            $("#wrong-survey-code-hint").show();
            surveyCode = "";
            $$(".numpad .status .filled-dot").forEach(dot => {
                dot.remove();
                $(".numpad .status").insertAdjacentHTML("beforeend", '<span class="icon empty-dot"><i class="fa-regular fa-circle"></i></span>');
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

export function surveyViewIsActive() {
    return !$(".navbar").isVisible();
}

function dataHasChanged() {
    return !skipDataHasChangedCheck && currentSubjectKey && currentPath.studyEventOID && currentPath.formOID && clinicaldataWrapper.getFormDataDifference(getFormData(), currentPath.studyEventOID, currentPath.formOID, currentPath.studyEventRepeatKey).length;
}

window.showSubjectInfo = function() {
    // Create audit record entries
    $$("#audit-records .notification").removeElements();
    for (const auditRecord of clinicaldataWrapper.getAuditRecords()) {
        const auditRecordElement = htmlElements.getAuditRecord(auditRecord);
        if (auditRecord.formOID) auditRecordElement.querySelector("button").onclick = () => showAuditRecordFormData(auditRecord.studyEventOID, auditRecord.formOID, auditRecord.date);
        $("#audit-records").appendChild(auditRecordElement);
    }

    // Fill inputs to change subject key and site
    let sites = [languageHelper.getTranslation("no-site")];
    admindataWrapper.getSites().forEach(site => sites.push(site.getName()));
    $("#subject-site-select-outer")?.remove();
    const currentSiteName = admindataWrapper.getSiteNameByOID(clinicaldataWrapper.getSubject().siteOID);
    $("#subject-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("subject-site-select", true, true, sites, currentSiteName));
    $("#subject-modal strong").textContent = clinicaldataWrapper.getSubject().key;
    $("#subject-modal input").value = clinicaldataWrapper.getSubject().key;

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
    cachedFormData = clinicaldataWrapper.getAuditRecordFormData(studyEventOID, formOID, date);
    if (!cachedFormData) return;

    cachedFormDataIsAuditRecord = true;
    await loadTree(studyEventOID, formOID, currentPath.studyEventRepeatKey);

    hideSubjectInfo();
}

window.saveSubjectInfo = function() {
    const key = $("#subject-key-input").value;
    const site = admindataWrapper.getSiteOIDByName($("#subject-site-select-inner").value);
    const currentSite = clinicaldataWrapper.getSubject().siteOID;
    clinicaldataWrapper.setSubjectInfo(key, site)
        .then(() => {
            if (site == currentSite) {
                currentSubjectKey = clinicaldataWrapper.getSubject().key;
            } else {
                currentSubjectKey = null;
                loadSubjectData();
            }
            loadSubjectKeys();
            hideSubjectInfo();
        })
        .catch(error => {
            switch (error) {
                case clinicaldataWrapper.errors.SUBJECTKEYEMPTY:
                    ioHelper.showMessage(languageHelper.getTranslation("enter-subject-key"), languageHelper.getTranslation("enter-subject-key-text"));
                    break;
                case clinicaldataWrapper.errors.SUBJECTKEYEXISTENT:
                    ioHelper.showMessage(languageHelper.getTranslation("subject-key-existent"), languageHelper.getTranslation("subject-key-existent-text"));
            }
            showSubjectInfo();
        });
}

window.showRemoveSubjectModal = async function() {
    ioHelper.showMessage(languageHelper.getTranslation('remove-subject'), languageHelper.getTranslation("remove-subject-hint"), {
        [languageHelper.getTranslation("yes")]: () => removeSubject(),
    })
}

async function removeSubject() {
    await clinicaldataWrapper.removeSubject();
    currentSubjectKey = null;
    
    loadSubjectKeys();
    reloadTree();
    hideSubjectInfo();
}

// The following two functions constitute logic to only show one column at a time on mobile devices including a navbar back button
window.backOnMobile = function() {
    if (!ioHelper.isMobile()) return;

    if (currentSubjectKey && currentPath.studyEventOID && currentPath.formOID) {
        loadTree(currentPath.studyEventOID, null, currentPath.studyEventRepeatKey);
    } else if (currentSubjectKey && currentPath.studyEventOID && !eventsAreHidden()) {
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

export function adjustMobileUI(forceHideBackButton) {
    if (!ioHelper.isMobile()) return;
    
    // Hide or show navbar back button
    if (!forceHideBackButton && (currentSubjectKey || currentPath.formOID || (currentPath.studyEventOID && !eventsAreHidden()))) {
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
    if (currentSubjectKey && currentPath.studyEventOID && currentPath.formOID) {
        $("#clinicaldata-column").classList.remove("is-hidden-touch");
    } else if (currentSubjectKey && currentPath.studyEventOID) {
        $("#clinicaldata-forms-column").classList.remove("is-hidden-touch");
    } else if (currentSubjectKey) {
        $("#clinicaldata-study-events-column").classList.remove("is-hidden-touch");
    } else {
        $("#subjects-column").classList.remove("is-hidden-touch");
    }
}

function setIOListeners() {
    $("#add-subject-input").onkeydown = keyEvent => {
        if (["/", "#", "<", ">", "\\", "{", "}", "&", "?", "ä", "ö", "ü"].includes(keyEvent.key)) keyEvent.preventDefault();
        if (keyEvent.code == "Enter") addSubjectManual();
    };
    $("#search-subject-input").oninput = inputEvent => filterSubjects(inputEvent.target.value);

    ioHelper.addGlobalEventListener("BarcodeFound", barcodeEvent => {
        const siteOID = admindataWrapper.getSiteOIDByName($("#filter-site-select-inner").value);
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
