import ODMPath from "./odmwrapper/odmpath.js";
import * as clinicaldataWrapper from "./odmwrapper/clinicaldatawrapper.js";
import * as metadataWrapper from "./odmwrapper/metadatawrapper.js";
import * as admindataWrapper from "./odmwrapper/admindatawrapper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as expressionHelper from "./helper/expressionhelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as htmlElements from "./helper/htmlelements.js";
import * as autocompleteHelper from "./helper/autocompletehelper.js";

const detailsPanelViewIdentifiers = {
    FOUNDATIONAL: {button: 'foundational-option', panel: 'foundational-options'},
    EXTENDED: {button: 'extended-option', panel: 'extended-options'},
    DUPLICATE: {button: 'duplicate-option', panel: 'duplicate-options'}
};

const detailsPanelViews = {
    FOUNDATIONAL: 1,
    EXTENDED: 2,
    DUPLICATE: 3
};

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export let currentPath = new ODMPath();

let viewOnlyMode = false;
let asyncEditMode = false;
let elementTypeOnDrag = null;

export async function init() {
    await import("./components/codelistmodal.js");

    createDatatypeMandatorySelect();
    setIOListeners();
}

export function show() {
    setEditMode();
    reloadTree();
    reloadDetailsPanel();

    languageHelper.createLanguageSelect(true);
    ioHelper.setTreeMaxHeight();
}

function setEditMode() {
    // If connected to a server with more than one user or several subjects, enable the view-only and async-edit mode and ask to disable it
    if (ioHelper.hasServerURL() && !asyncEditMode && (admindataWrapper.getUsers().length > 1 || clinicaldataWrapper.getSubjects().length > 1)) {
        viewOnlyMode = true;
        asyncEditMode = true;
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("metadata-edit-mode-question"),
            {
                [languageHelper.getTranslation("view-only-mode")]: () => asyncEditMode = false
            },
            ioHelper.interactionTypes.DEFAULT,
            languageHelper.getTranslation("edit-mode"),
            () => enableAsyncEditMode()
        );
    } else {
        viewOnlyMode = false;
    }
}

function createPanelBlock(elementOID, elementType, displayText, fallbackText, subtitleText, hasCondition, conditionIsFalse) {
    const draggable = viewOnlyMode ? false : true;
    let panelBlock = htmlElements.getMetadataPanelBlock(elementOID, elementType, displayText, fallbackText, subtitleText, draggable, hasCondition, conditionIsFalse);

    panelBlock.ondragstart = dragStart;
    panelBlock.ondragenter = dragEnter;

    return panelBlock;
}

function createDatatypeMandatorySelect() {
    const translatedDataTypes = Object.values(metadataWrapper.dataTypes).map(type => languageHelper.getTranslation(type));
    const dataTypeSelect = htmlElements.getSelect("datatype-select", true, true, Object.values(metadataWrapper.dataTypes), null, translatedDataTypes, true);
    if (!$("#datatype-select-outer")) $("#datatype-label").insertAdjacentElement("afterend", dataTypeSelect);
    
    const translatedMandatoryTypes = Object.values(metadataWrapper.mandatoryTypes).map(option => languageHelper.getTranslation(option.toLowerCase()));
    const mandatoryTypeSelect = htmlElements.getSelect("mandatory-select", true, true, Object.values(metadataWrapper.mandatoryTypes), null, translatedMandatoryTypes, true);
    if (!$("#mandatory-select-outer")) $("#mandatory-label").insertAdjacentElement("afterend", mandatoryTypeSelect);
}

function hideStudyEvents(hideTree) {
    $$("#study-event-panel-blocks a").removeElements();
    if (hideTree) {
        currentPath.studyEventOID = null;
        hideForms(true);
    }
}

function hideForms(hideTree) {
    $$("#form-panel-blocks a").removeElements();
    $("#forms-add-button").disabled = true;
    if (hideTree) {
        currentPath.formOID = null;
        hideItemGroups(true);
    }
}

function hideItemGroups(hideTree) {
    $$("#item-group-panel-blocks a").removeElements();
    $("#item-groups-add-button").disabled = true;
    if (hideTree) {
        currentPath.itemGroupOID = null;
        hideItems(true);
    }
}

function hideItems(hideTree) {
    $$("#item-panel-blocks a").removeElements();
    $("#items-add-button").disabled = true;
    if (hideTree) {
        currentPath.itemOID = null;
        hideCodeListItems(true);
    }
}

function hideCodeListItems(hideTree) {
    $$("#code-list-item-panel-blocks a").removeElements();
    $("#code-list-items-add-button").disabled = true;
    $("#code-list-items-opt-button").disabled = true;
    if (hideTree) currentPath.codeListItem = null;
}

export function loadStudyEvents(hideTree) {
    hideStudyEvents(hideTree);

    let studyEventDefs = metadataWrapper.getStudyEvents();
    for (let studyEventDef of studyEventDefs) {
        let translatedDescription = studyEventDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(studyEventDef.getOID(), ODMPath.elements.STUDYEVENT, translatedDescription, studyEventDef.getName());
        panelBlock.onclick = studyEventClicked;
        $("#study-event-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.studyEventOID) $(`#study-event-panel-blocks [oid="${currentPath.studyEventOID}"]`).activate();

    if (viewOnlyMode) $("#study-events-add-button").disabled = true;
    else $("#study-events-add-button").disabled = false;
}

function studyEventClicked(event) {
    $("#study-event-panel-blocks a.is-active")?.deactivate();
    event.target.activate();
    
    currentPath.studyEventOID = event.target.getOID();
    loadFormsByStudyEvent(true);
    reloadDetailsPanel();
}

function loadFormsByStudyEvent(hideTree) {
    hideForms(hideTree);

    let formDefs = metadataWrapper.getFormsByStudyEvent(currentPath.studyEventOID);
    for (let formDef of formDefs) {
        let translatedDescription = formDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(formDef.getOID(), ODMPath.elements.FORM, translatedDescription, formDef.getName());
        panelBlock.onclick = formClicked;
        $("#form-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.formOID) $(`#form-panel-blocks [oid="${currentPath.formOID}"]`).activate();

    if (viewOnlyMode) $("#forms-add-button").disabled = true;
    else $("#forms-add-button").disabled = false;
}

function formClicked(event) {
    $("#form-panel-blocks a.is-active")?.deactivate();
    event.target.activate();

    currentPath.formOID = event.target.getOID();
    loadItemGroupsByForm(true);
    reloadDetailsPanel();
}

function loadItemGroupsByForm(hideTree) {
    hideItemGroups(hideTree);

    let itemGroupDefs = metadataWrapper.getItemGroupsByForm(currentPath.formOID);
    for (let itemGroupDef of itemGroupDefs) {
        let translatedDescription = itemGroupDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(itemGroupDef.getOID(), ODMPath.elements.ITEMGROUP, translatedDescription, itemGroupDef.getName());
        panelBlock.onclick = itemGroupClicked;
        $("#item-group-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.itemGroupOID) $(`#item-group-panel-blocks [oid="${currentPath.itemGroupOID}"]`).activate();

    if (viewOnlyMode) $("#item-groups-add-button").disabled = true;
    else $("#item-groups-add-button").disabled = false;
}

function itemGroupClicked(event) {
    $("#item-group-panel-blocks a.is-active")?.deactivate();
    event.target.activate();

    currentPath.itemGroupOID = event.target.getOID();
    loadItemsByItemGroup(true);
    reloadDetailsPanel();
}

function loadItemsByItemGroup(hideTree) {
    hideItems(hideTree);

    let itemDefs = metadataWrapper.getItemsByItemGroup(currentPath.itemGroupOID);
    for (let itemDef of itemDefs) {
        let path = currentPath.clone().set(ODMPath.elements.ITEM, itemDef.getOID());
        let condition = metadataWrapper.getElementCondition(ODMPath.elements.ITEM, path);
        let conditionIsFalse = condition ? condition.getFormalExpression() == "false" : false;
        let translatedQuestion = itemDef.getTranslatedQuestion(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(itemDef.getOID(), ODMPath.elements.ITEM, translatedQuestion, itemDef.getName(), languageHelper.getTranslation(itemDef.getDataType()), condition, conditionIsFalse);
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.itemOID) $(`#item-panel-blocks [oid="${currentPath.itemOID}"]`).activate();

    if (viewOnlyMode) $("#items-add-button").disabled = true;
    else $("#items-add-button").disabled = false;
}

function itemClicked(event) {
    $("#item-panel-blocks a.is-active")?.deactivate();
    event.target.activate();

    currentPath.itemOID = event.target.getOID();
    loadCodeListItemsByItem(true);
    reloadDetailsPanel();
}

function loadCodeListItemsByItem(hideTree) {
    hideCodeListItems(hideTree);

    let codeListItems = metadataWrapper.getCodeListItemsByItem(currentPath.itemOID);
    for (let codeListItem of codeListItems) {
        let translatedDecode = codeListItem.getTranslatedDecode(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(codeListItem.getCodedValue(), ODMPath.elements.CODELISTITEM, translatedDecode, codeListItem.getCodedValue(), codeListItem.getCodedValue());
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.codeListItem) $(`#code-list-item-panel-blocks [oid="${currentPath.codeListItem}"]`).activate();

    if (viewOnlyMode) {
        $("#code-list-items-add-button").disabled = true;
        $("#code-list-items-opt-button").disabled = true;
    } else {
        if (metadataWrapper.getCodeListOIDByItem(currentPath.itemOID)) $("#code-list-items-add-button").disabled = false;
        $("#code-list-items-opt-button").disabled = false;
    }
}

function codeListItemClicked(event) {
    $("#code-list-item-panel-blocks a.is-active")?.deactivate();
    event.target.activate();

    currentPath.codeListItem = event.target.getOID();
    reloadDetailsPanel();
}

export function reloadTree() {
    loadStudyEvents();
    if (currentPath.studyEventOID) loadFormsByStudyEvent();
    if (currentPath.formOID) loadItemGroupsByForm();
    if (currentPath.itemGroupOID) loadItemsByItemGroup();
    if (currentPath.itemOID) loadCodeListItemsByItem();
}

function resetDetailsPanel() {
    // Sidebar
    $("#remove-button").unhighlight();
    $("#save-button").unhighlight();

    // Foundational
    [$("#id-input"), $("#name-input"), $("#translation-textarea"), $("#datatype-select-inner"), $("#mandatory-select-inner")].disableElements();
    [$("#id-input"), $("#name-input"), $("#translation-textarea"), $("#datatype-select-inner"), $("#mandatory-select-inner")].emptyInputs();
    $("#element-oid-label").textContent = languageHelper.getTranslation("unique-id");
    $("#element-long-label").textContent = languageHelper.getTranslation("translated-description");
    ioHelper.getSetting("showElementName") ? $("#name-input").parentNode.show() : $("#name-input").parentNode.hide();

    // Extended
    [$("#measurement-unit"), $("#collection-condition"), $("#item-method"), $("#add-range-check-button"), $("#add-alias-button")].disableElements();
    [$("#measurement-unit"), $("#collection-condition"), $("#item-method")].emptyInputs();
    $$("#range-check-inputs .range-check-input").removeElements();
    $$("#alias-inputs .alias-input").removeElements();
    addEmptyRangeCheckInput(true);
    addEmptyAliasInput(true);

    // Duplicate
    [$("#reference-button"), $("#shallow-copy-button"), $("#deep-copy-button")].disableElements();
    $("#element-references-hint").textContent = "";
}

function adjustDetailsPanelSidebar() {
    highlightRemoveButton();

    let references = [];
    if (currentPath.last.element != ODMPath.elements.CODELISTITEM) references = metadataWrapper.getElementRefs(currentPath.last.value, currentPath.last.element);
    else references = metadataWrapper.getElementRefs(metadataWrapper.getCodeListOIDByItem(currentPath.itemOID), currentPath.last.element);

    if (references.length > 1) $("#duplicate-option").classList.add("has-text-danger");
    else $("#duplicate-option").classList.remove("has-text-danger");
}

function highlightSaveButton() {
    if (viewOnlyMode) $("#save-button").unhighlight();
    else $("#save-button").highlight();
}

function highlightRemoveButton() {
    if (viewOnlyMode) $("#remove-button").unhighlight();
    else $("#remove-button").highlight();
}

function fillDetailsPanelFoundational() {
    [$("#id-input"), $("#name-input"), $("#translation-textarea")].enableElements();

    let element = metadataWrapper.getElementDefByOID(currentPath.last.value);
    const elementRef = metadataWrapper.getElementRefByOID(currentPath.last.element, currentPath);
    switch (currentPath.last.element) {
        case ODMPath.elements.STUDYEVENT:
        case ODMPath.elements.FORM:
        case ODMPath.elements.ITEMGROUP:
            $("#id-input").value = currentPath.last.value;
            $("#name-input").value = element.getName();
            $("#translation-textarea").value = element.getTranslatedDescription(languageHelper.getCurrentLocale());
            break;
        case ODMPath.elements.ITEM:
            [$("#datatype-select-inner"), $("#mandatory-select-inner")].enableElements();
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-question");
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            $("#id-input").value = currentPath.last.value;
            $("#name-input").value = element.getName();
            $("#translation-textarea").value = element.getTranslatedQuestion(languageHelper.getCurrentLocale());
            $("#datatype-select-inner").value = element.getDataType();
            break;
        case ODMPath.elements.CODELISTITEM:
            [$("#name-input"), $("#mandatory-select-inner")].disableElements();
            $("#element-oid-label").textContent = languageHelper.getTranslation("coded-value");
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-choice");
            element = metadataWrapper.getCodeListItem(metadataWrapper.getCodeListOIDByItem(currentPath.itemOID), currentPath.codeListItem);
            $("#id-input").value = element.getCodedValue();
            $("#translation-textarea").value = element.getTranslatedDecode(languageHelper.getCurrentLocale());
    }
}

function fillDetailsPanelExtended() {
    fillElementAliases();
    [$("#alias-inputs .alias-context"), $("#alias-inputs .alias-name"), $("#add-alias-button")].enableElements();

    const condition = metadataWrapper.getElementCondition(currentPath.last.element, currentPath);
    switch (currentPath.last.element) {
        case ODMPath.elements.ITEMGROUP:
            $("#collection-condition").value = condition ? condition.getFormalExpression() : "";
            $("#collection-condition").disabled = false;
            break;
        case ODMPath.elements.ITEM:
            fillItemRangeChecks();
            [$("#range-check-inputs .range-check-comparator-inner"), $("#range-check-inputs .range-check-value"), $("#add-range-check-button")].enableElements();
            $("#collection-condition").value = condition ? condition.getFormalExpression() : "";
            $("#collection-condition").disabled = false;
            const measurementUnit = metadataWrapper.getItemMeasurementUnit(currentPath.last.value);
            $("#measurement-unit").value = measurementUnit ? measurementUnit.getTranslatedSymbol(languageHelper.getCurrentLocale()) : "";
            $("#measurement-unit").disabled = false;
            const method = metadataWrapper.getItemMethod(currentPath);
            $("#item-method").value = method ? method.getFormalExpression() : "";
            $("#item-method").disabled = false;
    }
}

function fillDetailsPanelDuplicate() {
    let references = [];
    let translatedTexts = [];
    switch (currentPath.last.element) {
        case ODMPath.elements.STUDYEVENT:
            if (!viewOnlyMode) [$("#shallow-copy-button"), $("#deep-copy-button")].enableElements();
            break;
        case ODMPath.elements.FORM:
        case ODMPath.elements.ITEMGROUP:
        case ODMPath.elements.ITEM:
            references = metadataWrapper.getElementRefs(currentPath.last.value, currentPath.last.element);
            translatedTexts = references.map(reference => reference.parentNode.getTranslatedDescription(languageHelper.getCurrentLocale(), true));
            if (!viewOnlyMode) [$("#reference-button"), $("#shallow-copy-button"), $("#deep-copy-button")].enableElements();
            break;
        case ODMPath.elements.CODELISTITEM:
            references = metadataWrapper.getElementRefs(metadataWrapper.getCodeListOIDByItem(currentPath.itemOID), currentPath.last.element);
            translatedTexts = references.map(reference => reference.parentNode.getTranslatedQuestion(languageHelper.getCurrentLocale(), true));
    }

    if (translatedTexts.length > 1) {
        $("#element-references-hint").textContent = languageHelper.getTranslation("element-multiple-references-hint");
        $("#element-references-list").innerHTML = translatedTexts.join("<br>");
        $("#element-references-list").classList.remove("is-hidden");
    } else {
        $("#element-references-hint").textContent = languageHelper.getTranslation("element-no-references-hint");
        $("#element-references-list").classList.add("is-hidden");
    }
}

export function reloadDetailsPanel() {
    resetDetailsPanel();
    if (currentPath.last.element) {
        adjustDetailsPanelSidebar();
        if (getCurrentDetailsView() == detailsPanelViews.FOUNDATIONAL) fillDetailsPanelFoundational();
        else if (getCurrentDetailsView() == detailsPanelViews.EXTENDED) fillDetailsPanelExtended();
        else if (getCurrentDetailsView() == detailsPanelViews.DUPLICATE) fillDetailsPanelDuplicate();
    }

    ioHelper.dispatchGlobalEvent("MetadataPanelLoaded");
}

function fillItemRangeChecks() {
    const rangeChecks = metadataWrapper.getRangeChecksByItem(currentPath.itemOID);
    if (rangeChecks.length) $$("#range-check-inputs .range-check-input").removeElements();

    for (const rangeCheck of rangeChecks) {
        const input = htmlElements.getRangeCheckInputElement(rangeCheck.getAttribute("Comparator"), rangeCheck.querySelector("CheckValue").textContent);
        input.querySelector(".range-check-comparator-inner").oninput = () => highlightSaveButton();
        input.querySelector(".range-check-value").oninput = () => highlightSaveButton();
        $("#range-check-inputs").appendChild(input);
    }
}

function fillElementAliases() {
    const aliases = metadataWrapper.getElementAliases(currentPath);
    if (aliases.length) $$("#alias-inputs .alias-input").removeElements();

    for (const alias of aliases) {
        const input = htmlElements.getAliasInputElement(alias.getAttribute("Context"), alias.getName());
        input.querySelector(".alias-context").oninput = () => highlightSaveButton();
        input.querySelector(".alias-name").oninput = () => highlightSaveButton();
        $("#alias-inputs").appendChild(input);
    }
}

window.addEmptyRangeCheckInput = function(disabled) {
    const input = htmlElements.getRangeCheckInputElement(null, null);
    input.querySelector(".range-check-comparator-inner").oninput = () => highlightSaveButton();
    input.querySelector(".range-check-value").oninput = () => highlightSaveButton();

    if (disabled) {
        input.querySelector(".range-check-comparator-inner").disabled = true;
        input.querySelector(".range-check-value").disabled = true;
    }

    $("#range-check-inputs").appendChild(input);
    if (!disabled && !ioHelper.isMobile()) input.scrollIntoView();
}

window.addEmptyAliasInput = function(disabled) {
    const input = htmlElements.getAliasInputElement(null, null);
    input.querySelector(".alias-context").oninput = () => highlightSaveButton();
    input.querySelector(".alias-name").oninput = () => highlightSaveButton();

    if (disabled) {
        input.querySelector(".alias-context").disabled = true;
        input.querySelector(".alias-name").disabled = true;
    }

    $("#alias-inputs").appendChild(input);
    if (!disabled && !ioHelper.isMobile()) input.scrollIntoView();
}

window.showSettingsEditor = function() {
    const currentElementType = currentPath.last.element;
    let settingsModal = document.createElement('settings-modal');
    settingsModal.setHeading(languageHelper.getTranslation('edit-settings'));
    settingsModal.setMessage(languageHelper.getTranslation('edit-settings-text'));
    settingsModal.setPossibleSettings(metadataWrapper.loadedSettings);
    settingsModal.setCurrentElementType(currentElementType);
    settingsModal.setCurrentElementOID(currentPath.last.value)
    settingsModal.setCurrentSettings(metadataWrapper.getCurrentElementSettings(currentPath));
    settingsModal.setCloseText(languageHelper.getTranslation("save-and-close"));
    settingsModal.setCloseCallback(async (settings) => { 
        metadataWrapper.setCurrentElementSettings(currentPath, settings); 
        if(!asyncEditMode) await metadataWrapper.storeMetadata();
        reloadDetailsPanel();
    });
    settingsModal.setSize("is-wide");

    document.body.appendChild(settingsModal);
    languageHelper.localize();
}

window.saveElement = async function() {
    if (getCurrentDetailsView() == detailsPanelViews.FOUNDATIONAL) await saveDetailsFoundational();
    else if (getCurrentDetailsView() == detailsPanelViews.EXTENDED) saveDetailsExtended();
    document.dispatchEvent(new CustomEvent("SaveElementPressed", {detail: { activeView: getCurrentDetailsView()}}));
    if (ioHelper.hasServerURL() && asyncEditMode && (admindataWrapper.getUsers().length > 1 || clinicaldataWrapper.getSubjects().length > 1) && $("#store-metadata-async-button")) 
        $("#store-metadata-async-button").disabled = false;
}

async function saveDetailsFoundational() {
    switch (currentPath.last.element) {
        case ODMPath.elements.STUDYEVENT:
            showFirstEventEditedHelp();
        case ODMPath.elements.FORM:
        case ODMPath.elements.ITEMGROUP:
            await setElementOID($("#id-input").value).then(() => {
                metadataWrapper.setElementName(currentPath.last.value, ioHelper.getSetting("showElementName") ? $("#name-input").value : $("#id-input").value);
                metadataWrapper.setElementDescription(currentPath.last.value, $("#translation-textarea").value);
            });
            break;
        case ODMPath.elements.ITEM:
            await setElementOID($("#id-input").value).then(() => {
                metadataWrapper.setElementName(currentPath.last.value, ioHelper.getSetting("showElementName") ? $("#name-input").value : $("#id-input").value);
                metadataWrapper.setItemQuestion(currentPath.last.value, $("#translation-textarea").value);
            });
            metadataWrapper.setElementMandatory(currentPath.last.element, currentPath, $("#mandatory-select-inner").value);
            handleItemDataType(currentPath.last.value, $("#datatype-select-inner").value);
            break;
        case ODMPath.elements.CODELISTITEM:
            await setCodeListItemCodedValue($("#id-input").value);
            metadataWrapper.setCodeListItemDecodedText(metadataWrapper.getCodeListOIDByItem(currentPath.itemOID), currentPath.codeListItem, $("#translation-textarea").value);
    }

    if (!languageHelper.getPresentLanguages().includes(languageHelper.getCurrentLocale())) {
        languageHelper.populatePresentLanguages(metadataWrapper.getMetadata());
        languageHelper.createLanguageSelect(true);
    }

    reloadAndStoreMetadata();
}

async function setElementOID(oid) {
    if (currentPath.last.value == oid) return Promise.resolve();

    const subjectKeys = await clinicaldataWrapper.getSubjectsHavingDataForElement(currentPath.last.value, currentPath.last.element);
    if (subjectKeys.length == 0) {
        return await metadataWrapper.setElementOID(currentPath.last.value, currentPath.last.element, oid)
            .then(() => {
                currentPath.set(currentPath.last.element, oid);
                return Promise.resolve();
            })
            .catch(() => {
                ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("id-not-changed-error-used"));
                return Promise.reject();
            });
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("id-not-changed-error-data"));
        return Promise.reject();
    }
}

async function setCodeListItemCodedValue(codedValue) {
    if (currentPath.codeListItem == codedValue) return;

    const subjectKeys = await clinicaldataWrapper.getSubjectsHavingDataForElement(currentPath.last.value, currentPath.last.element, currentPath.itemOID, currentPath.codeListItem);
    if (subjectKeys.length == 0) {
        await metadataWrapper.setCodeListItemCodedValue(metadataWrapper.getCodeListOIDByItem(currentPath.itemOID), currentPath.codeListItem, codedValue)
            .then(() => currentPath.codeListItem = codedValue)
            .catch(() => ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("coded-value-not-changed-error-used")))
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("coded-value-not-changed-error-data"));
    }
}

function saveDetailsExtended() {
    switch (currentPath.last.element) {
        case ODMPath.elements.ITEMGROUP:
            if (saveConditionPreCheck()) return;
            break;
        case ODMPath.elements.ITEM:
            if (saveConditionPreCheck()) return;
            if (saveMethodPreCheck()) return;
            if (saveMeasurementUnitPreCheck()) return;
            saveRangeChecks();
    }
    
    saveAliases();
    reloadAndStoreMetadata();
}

function saveConditionPreCheck() {
    const formalExpression = $("#collection-condition").value.trim();
    const currentCondition = metadataWrapper.getElementCondition(currentPath.last.element, currentPath);
    if (formalExpression && currentCondition && formalExpression == currentCondition.getFormalExpression()) return;
    if (formalExpressionContainsError(formalExpression)) return true;

    const currentElementRef = metadataWrapper.getElementRefByOID(currentPath.last.element, currentPath);
    if (currentCondition) {
        const elementsHavingCondition = metadataWrapper.getElementRefsHavingCondition(currentCondition.getOID());
        if (elementsHavingCondition.length > 1) {
            ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("condition-multiple-references-hint"),
                {
                    [languageHelper.getTranslation("update-all")]: () => saveConditionForElements(formalExpression, currentCondition, elementsHavingCondition, true, true),
                    [languageHelper.getTranslation("update-current-only")]: () => saveConditionForElements(formalExpression, currentCondition, [currentElementRef], false, true)
                }
            );
            return true;
        } else {
            saveConditionForElements(formalExpression, currentCondition, [currentElementRef], true, false);
        }
    } else {
        saveConditionForElements(formalExpression, null, [currentElementRef], true, false);
    }
}

function saveConditionForElements(formalExpression, currentCondition, elementRefs, changeAll, promptInitiated) {
    const identicalCondition = metadataWrapper.getConditions().find(condition => condition.getFormalExpression() == formalExpression);

    let conditionOID;
    if (formalExpression && currentCondition && changeAll && !identicalCondition) {
        metadataWrapper.setConditionFormalExpression(currentCondition.getOID(), formalExpression);
    } else {
        if (identicalCondition) conditionOID = identicalCondition.getOID();
        else if (formalExpression) conditionOID = metadataWrapper.createCondition(formalExpression);
        elementRefs.forEach(elementRef => metadataWrapper.setElementRefCondition(elementRef, conditionOID));
    }

    if (currentCondition && (!formalExpression || currentCondition.getOID() != conditionOID)) metadataWrapper.safeDeleteCondition(currentCondition.getOID());
    if (promptInitiated) saveDetailsExtended();
}

function saveMethodPreCheck() {
    const formalExpression = $("#item-method").value.trim();
    const currentMethod = metadataWrapper.getItemMethod(currentPath);
    if (formalExpression && currentMethod && formalExpression == currentMethod.getFormalExpression()) return;
    if (formalExpressionContainsError(formalExpression)) return true;

    const currentElementRef = metadataWrapper.getElementRefByOID(currentPath.last.element, currentPath);
    if (currentMethod) {
        const elementsHavingMethod = metadataWrapper.getElementRefsHavingMethod(currentMethod.getOID());
        if (elementsHavingMethod.length > 1) {
            ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("condition-multiple-references-hint"),
                {
                    [languageHelper.getTranslation("update-all")]: () => saveMethodForElements(formalExpression, currentMethod, elementsHavingMethod, true, true),
                    [languageHelper.getTranslation("update-current-only")]: () => saveMethodForElements(formalExpression, currentMethod, [currentElementRef], false, true)
                }
            );
            return true;
        } else {
            saveMethodForElements(formalExpression, currentMethod, [currentElementRef], true, false);
        }
    } else {
        saveMethodForElements(formalExpression, null, [currentElementRef], true, false);
    }
}

function saveMethodForElements(formalExpression, currentMethod, elementRefs, changeAll, promptInitiated) {
    const identicalMethod = metadataWrapper.getMethods().find(method => method.getFormalExpression() == formalExpression);

    let methodOID;
    if (formalExpression && currentMethod && changeAll && !identicalMethod) {
        metadataWrapper.setMethodFormalExpression(currentMethod.getOID(), formalExpression);
    } else {
        if (identicalMethod) methodOID = identicalMethod.getOID();
        else if (formalExpression) methodOID = metadataWrapper.createMethod(formalExpression);
        elementRefs.forEach(elementRef => metadataWrapper.setElementRefMethod(elementRef, methodOID));
    }

    if (currentMethod && (!formalExpression || currentMethod.getOID() != methodOID)) metadataWrapper.safeDeleteMethod(currentMethod.getOID());
    if (promptInitiated) saveDetailsExtended();
}

function saveMeasurementUnitPreCheck() {
    const symbol = $("#measurement-unit").value;
    const currentMeasurementUnit = metadataWrapper.getItemMeasurementUnit(currentPath.last.value);
    if (symbol && currentMeasurementUnit && symbol == currentMeasurementUnit.getTranslatedSymbol(languageHelper.getCurrentLocale())) return;

    const currentItemDef = metadataWrapper.getElementDefByOID(currentPath.last.value);
    if (currentMeasurementUnit) {
        const elementsHavingMeasurementUnit = metadataWrapper.getItemDefsHavingMeasurementUnit(currentMeasurementUnit.getOID());
        if (elementsHavingMeasurementUnit.length > 1) {
            ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("measurement-unit-multiple-references-hint"),
                {
                    [languageHelper.getTranslation("update-all")]: () => saveMeasurementUnitForElements(symbol, currentMeasurementUnit, elementsHavingMeasurementUnit, true, true),
                    [languageHelper.getTranslation("update-current-only")]: () => saveMeasurementUnitForElements(symbol, currentMeasurementUnit, [currentItemDef], false, true)
                }
            );
            return true;
        } else {
            saveMeasurementUnitForElements(symbol, currentMeasurementUnit, [currentItemDef], true, false);
        }
    } else {
        saveMeasurementUnitForElements(symbol, null, [currentItemDef], true, false);
    }
}

function saveMeasurementUnitForElements(symbol, currentMeasurementUnit, itemDefs, changeAll, promptInitiated) {
    const identicalMeasurementUnit = metadataWrapper.getMeasurementUnits().find(measurementUnit => measurementUnit.getTranslatedSymbol(languageHelper.getCurrentLocale()) == symbol);

    let measurementUnitOID;
    if (symbol && currentMeasurementUnit && changeAll && !identicalMeasurementUnit) {
        metadataWrapper.setMeasurementUnitSymbol(currentMeasurementUnit.getOID(), symbol);
    } else {
        if (identicalMeasurementUnit) measurementUnitOID = identicalMeasurementUnit.getOID();
        else if (symbol) measurementUnitOID = metadataWrapper.createMeasurementUnit(symbol);
        itemDefs.forEach(itemDef => metadataWrapper.setItemDefMeasurementUnit(itemDef, measurementUnitOID));
    }

    if (currentMeasurementUnit && (!symbol || currentMeasurementUnit.getOID() != measurementUnitOID)) metadataWrapper.safeDeleteMeasurementUnit(currentMeasurementUnit.getOID());
    if (promptInitiated) saveDetailsExtended();
}

function saveRangeChecks() {
    metadataWrapper.deleteRangeChecksOfItem(currentPath.itemOID);
    for (let rangeCheckInput of $$(".range-check-input")) {
        let comparator = rangeCheckInput.querySelector(".range-check-comparator-inner").value;
        let checkValue = rangeCheckInput.querySelector(".range-check-value").value.replace(",", ".");
        if (comparator && checkValue == parseFloat(checkValue)) {
            metadataWrapper.setItemRangeCheck(currentPath.itemOID, comparator, checkValue);
        }
    }
}

function saveAliases() {
    metadataWrapper.deleteElementAliases(currentPath);
    for (let aliasInput of $$(".alias-input")) {
        let context = aliasInput.querySelector(".alias-context").value;
        let name = aliasInput.querySelector(".alias-name").value;
        if (context && name) {
            metadataWrapper.setElementAlias(currentPath, context, name);
        }
    }
}

function formalExpressionContainsError(formalExpression) {
    if (formalExpression && !expressionHelper.parse(formalExpression)) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("formal-expression-error"));
        return true;
    }
}

window.sidebarOptionClicked = async function(event) {
    // Save the element if it has been updated and another sidebar option is selected
    if ($("#save-button").isHighlighted() && event.target.id != $(".sidebar-option.is-active").id) await saveElement();

    switchToPanelView(Object.values(detailsPanelViewIdentifiers).find(v => v.button == event.target.id));
}

function switchToPanelView({button, ...view}) {
    $("#details-panel .sidebar-option.is-active")?.deactivate();
    $(`#${button}`).activate();
    showDetailsPanelView(view)
    reloadDetailsPanel();
}

function showDetailsPanelView({panel}) {

    $(`#${panel}`).show();
    Object.values(detailsPanelViewIdentifiers).filter(v => v.panel != panel).forEach(v => $(`#${v.panel}`).hide());
}

function handleItemDataType(itemOID, dataType) {
    let dataTypeIsCodeList = dataType.startsWith("codelist");
    let codeListType = dataTypeIsCodeList ? dataType.split("-")[1] : null;

    let codeListRef = metadataWrapper.getElementDefByOID(itemOID).querySelector("CodeListRef");
    if (codeListRef && !dataTypeIsCodeList) {
        metadataWrapper.removeCodeListRef(itemOID, codeListRef.getAttribute("CodeListOID"));
        loadCodeListItemsByItem();
    } else if (!codeListRef && dataTypeIsCodeList) {
        metadataWrapper.createCodeList(itemOID);
        loadCodeListItemsByItem();
    }

    if (dataTypeIsCodeList) {
        metadataWrapper.setItemDataType(itemOID, codeListType);
        metadataWrapper.setCodeListDataType(metadataWrapper.getCodeListOIDByItem(itemOID), codeListType);
    } else {
        metadataWrapper.setItemDataType(itemOID, dataType);
    }
}

function setIOListeners() {
    let inputElements = $$("#details-panel input, #details-panel textarea, #details-panel select");
    for (const inputElement of inputElements) {
        inputElement.oninput = () => highlightSaveButton();
        inputElement.onkeydown = event => {
            if (event.code == "Escape") {
                event.preventDefault();
                document.activeElement.blur();
            } else if (event.code == "Enter" && !event.shiftKey) {
                if ($(".autocomplete-list")) return;
                event.preventDefault();
                document.activeElement.blur();
                saveElement();
            }
        };
    }
    $("#id-input").addEventListener("keydown", event => {
        // Replace the following characters with an underscore required for evaluating formal expressions
        if (["-", "_", "(", ")", "/", "#", " "].includes(event.key)) {
            event.preventDefault();
            if (event.target.selectionStart > 0 && event.target.value[event.target.selectionStart - 1] == "_") return;
            event.target.setRangeText("_", event.target.selectionStart, event.target.selectionEnd, "end");
        };
        // Do not allow an OID to start with a number which is required for evaluating formal expressions
        if (!isNaN(event.key) && !event.target.selectionStart && currentPath.last.element != ODMPath.elements.CODELISTITEM) event.preventDefault();
    });

    autocompleteHelper.enableAutocomplete($("#collection-condition"), autocompleteHelper.modes.CONDITION);
    autocompleteHelper.enableAutocomplete($("#measurement-unit"), autocompleteHelper.modes.MEASUREMENTUNIT);
    autocompleteHelper.enableAutocomplete($("#item-method"), autocompleteHelper.modes.METHOD);

    ioHelper.addGlobalEventListener("CodelistEdited", () => reloadAndStoreMetadata());

    $("#collection-condition").addEventListener("focus", () => $("#collection-condition").setAttribute("context-path", currentPath.toString()));
    $("#item-method").addEventListener("focus", () => $("#item-method").setAttribute("context-path", currentPath.toString()));
}

// TODO: The next five functions should use reloadAndStoreMetadata()
window.addStudyEvent = function(event) {
    currentPath.studyEventOID = metadataWrapper.createStudyEvent();
    loadStudyEvents();
    loadFormsByStudyEvent(true);
    switchToPanelView(detailsPanelViewIdentifiers.FOUNDATIONAL);
    ioHelper.scrollParentToChild($(`#study-event-panel-blocks [oid="${currentPath.studyEventOID}"]`));
    if (!asyncEditMode) metadataWrapper.storeMetadata();
    enableSaveFormsButton();
    event.target.blur();

    // Show the first study event help message
    if (metadataWrapper.getStudyEvents().length == 1 && !ioHelper.isMobile()) ioHelper.showToast(languageHelper.getTranslation("first-event-hint"));
}

window.addForm = function(event) {
    currentPath.formOID = metadataWrapper.createForm(currentPath.studyEventOID);
    loadFormsByStudyEvent();
    loadItemGroupsByForm(true);
    switchToPanelView(detailsPanelViewIdentifiers.FOUNDATIONAL);
    ioHelper.scrollParentToChild($(`#form-panel-blocks [oid="${currentPath.formOID}"]`));
    if (!asyncEditMode) metadataWrapper.storeMetadata();
    enableSaveFormsButton();
    event.target.blur();
}

window.addItemGroup = function(event) {
    currentPath.itemGroupOID = metadataWrapper.createItemGroup(currentPath.formOID);
    loadItemGroupsByForm();
    loadItemsByItemGroup(true);
    switchToPanelView(detailsPanelViewIdentifiers.FOUNDATIONAL);
    ioHelper.scrollParentToChild($(`#item-group-panel-blocks [oid="${currentPath.itemGroupOID}"]`));
    if (!asyncEditMode) metadataWrapper.storeMetadata();
    enableSaveFormsButton();
    event.target.blur();
}

window.addItem = function(event) {
    currentPath.itemOID = metadataWrapper.createItem(currentPath.itemGroupOID);
    loadItemsByItemGroup();
    loadCodeListItemsByItem(true);
    switchToPanelView(detailsPanelViewIdentifiers.FOUNDATIONAL);
    ioHelper.scrollParentToChild($(`#item-panel-blocks [oid="${currentPath.itemOID}"]`));
    if (!asyncEditMode) metadataWrapper.storeMetadata();
    enableSaveFormsButton();
    event.target.blur();
}

window.addCodeListItem = function(event) {
    let codeListOID = metadataWrapper.getCodeListOIDByItem(currentPath.itemOID);
    if (codeListOID) {
        currentPath.codeListItem = metadataWrapper.addCodeListItem(codeListOID);
        loadCodeListItemsByItem();
        switchToPanelView(detailsPanelViewIdentifiers.FOUNDATIONAL);
        ioHelper.scrollParentToChild($(`#code-list-item-panel-blocks [oid="${currentPath.codeListItem}"]`));
    }
    if (!asyncEditMode) metadataWrapper.storeMetadata();
    enableSaveFormsButton();
    event.target.blur();
}

function enableSaveFormsButton() {
    if (ioHelper.hasServerURL() && asyncEditMode && (admindataWrapper.getUsers().length > 1 || clinicaldataWrapper.getSubjects().length > 1) && $("#store-metadata-async-button")) 
        $("#store-metadata-async-button").disabled = false;
}

function removeElement() {
    switch (currentPath.last.element) {
        case ODMPath.elements.STUDYEVENT:
            metadataWrapper.removeStudyEventRef(currentPath.studyEventOID);
            currentPath.studyEventOID = null;
            hideForms(true);
            break;
        case ODMPath.elements.FORM:
            metadataWrapper.removeFormRef(currentPath.studyEventOID, currentPath.formOID);
            currentPath.formOID = null;
            hideItemGroups(true);
            break;
        case ODMPath.elements.ITEMGROUP:
            metadataWrapper.removeItemGroupRef(currentPath.formOID, currentPath.itemGroupOID);
            currentPath.itemGroupOID = null;
            hideItems(true);
            break;
        case ODMPath.elements.ITEM:
            metadataWrapper.removeItemRef(currentPath.itemGroupOID, currentPath.itemOID);
            currentPath.itemOID = null;
            hideCodeListItems(true);
            break;
        case ODMPath.elements.CODELISTITEM:
            metadataWrapper.deleteCodeListItem(metadataWrapper.getCodeListOIDByItem(currentPath.itemOID), currentPath.codeListItem);
            currentPath.codeListItem = null;
    }

    reloadAndStoreMetadata();
    ioHelper.showToast(languageHelper.getTranslation("element-removed"), 2500);
}

window.duplicateReference = function() {
    if (currentPath.last.element == ODMPath.elements.CODELISTITEM) return;

    const elementRef = metadataWrapper.getElementRefByOID(currentPath.last.element, currentPath);
    elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);

    reloadAndStoreMetadata();
    ioHelper.showToast(languageHelper.getTranslation("reference-added-hint"), 10000);
}

window.copyElement = function(deepCopy) {
    switch (currentPath.last.element) {
        case ODMPath.elements.STUDYEVENT:
            metadataWrapper.copyStudyEvent(currentPath.studyEventOID, deepCopy);
            break;
        case ODMPath.elements.FORM:
            metadataWrapper.copyForm(currentPath.formOID, deepCopy, currentPath.studyEventOID);
            break;
        case ODMPath.elements.ITEMGROUP:
            metadataWrapper.copyItemGroup(currentPath.itemGroupOID, deepCopy, currentPath.formOID);
            break;
        case ODMPath.elements.ITEM:
            metadataWrapper.copyItem(currentPath.itemOID, deepCopy, currentPath.itemGroupOID);
    }

    reloadAndStoreMetadata();
    ioHelper.showToast(languageHelper.getTranslation("copy-added"), 2500);
}

function dragStart(event) {
    elementTypeOnDrag = event.target.getAttribute("element-type");
    const elementPath = currentPath.clone(elementTypeOnDrag).set(elementTypeOnDrag, event.target.getOID());
    event.dataTransfer.setData("sourcePath", elementPath.toString());
}

window.allowDrop = function(event) {
    if (elementTypeOnDrag == event.target.getAttribute("element-type")) {
        event.preventDefault();
    }
}

function dragEnter(event) {
    if (event.clientX+75 < event.target.getBoundingClientRect().right) {
        if (metadataWrapper.getHierarchyLevelOfElementType(elementTypeOnDrag) > metadataWrapper.getHierarchyLevelOfElementType(event.target.getAttribute("element-type"))) {
            switch (event.target.getAttribute("element-type")) {
                case ODMPath.elements.STUDYEVENT:
                    studyEventClicked(event);
                    break;
                case ODMPath.elements.FORM:
                    formClicked(event);
                    break;
                case ODMPath.elements.ITEMGROUP:
                    itemGroupClicked(event);
                    break;
                case ODMPath.elements.ITEM:
                    itemClicked(event);
            }
        }
    }
}

window.elementDrop = async function(event) {
    if (viewOnlyMode) return;

    const sourcePath = ODMPath.parseAbsolute(event.dataTransfer.getData("sourcePath"));
    const targetPath = currentPath.clone(elementTypeOnDrag).set(elementTypeOnDrag, event.target.getOID());
    if (sourcePath.previous.value != targetPath.previous.value) {
        // Extra if-statement for performance reasons (do not load all subjects when sourceParentOID and targetParentOID are equal)
        const subjectKeys = await clinicaldataWrapper.getSubjectsHavingDataForElement(elementTypeOnDrag, sourcePath);
        if (subjectKeys.length) {
            ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("element-not-moved-error"));
            return;
        }
    }

    let sourceElementRef = null;
    let targetElementRef = null;
    if (elementTypeOnDrag == ODMPath.elements.CODELISTITEM) {
        const codeListOID = metadataWrapper.getCodeListOIDByItem(sourcePath.itemOID);
        sourceElementRef = metadataWrapper.getCodeListItem(codeListOID, sourcePath.codeListItem);
    } else {
        sourceElementRef = metadataWrapper.getElementRefByOID(elementTypeOnDrag, sourcePath);
    }

    if (targetPath.last.element == elementTypeOnDrag) {
        if (elementTypeOnDrag == ODMPath.elements.CODELISTITEM) {
            const codeListOID = metadataWrapper.getCodeListOIDByItem(targetPath.itemOID);
            targetElementRef = metadataWrapper.getCodeListItem(codeListOID, targetPath.codeListItem);
        } else {
            targetElementRef = metadataWrapper.getElementRefByOID(elementTypeOnDrag, targetPath);
        }

        // Needed because of event.offsetY inconsistencies accross browsers
        const offsetY = event.clientY - event.target.getBoundingClientRect().top;
        if (offsetY/event.target.clientHeight >= 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef.nextSibling);
        } else if (offsetY/event.target.clientHeight < 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef);
        }
    } else {
        // Allows the movement of an element into an empty parent element by dropping it on the add button
        if (elementTypeOnDrag == ODMPath.elements.STUDYEVENT) metadataWrapper.insertStudyEventRef(sourceElementRef);
        else if (elementTypeOnDrag == ODMPath.elements.FORM) metadataWrapper.insertFormRef(sourceElementRef, targetPath.studyEventOID);
        else if (elementTypeOnDrag == ODMPath.elements.ITEMGROUP) metadataWrapper.insertItemGroupRef(sourceElementRef, targetPath.formOID);
        else if (elementTypeOnDrag == ODMPath.elements.ITEM) metadataWrapper.insertFormRef(sourceElementRef, targetPath.itemGroupOID);
        else if (elementTypeOnDrag == ODMPath.elements.CODELISTITEM) metadataWrapper.insertCodeListItem(sourceElementRef, metadataWrapper.getCodeListOIDByItem(targetPath.itemOID));
    }

    elementTypeOnDrag = null;
    reloadAndStoreMetadata();
}

window.showRemoveModal = async function() {
    const subjectKeys = await clinicaldataWrapper.getSubjectsHavingDataForElement(currentPath.last.element, currentPath);
    if (subjectKeys.length) {
        ioHelper.showMessage(languageHelper.getTranslation("cannot-be-removed"), languageHelper.getTranslation("cannot-be-removed-text") + subjectKeys.join(", ") + "</strong>");
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("element-remove-hint"),
            {
                [languageHelper.getTranslation("remove")]: () => removeElement()
            },
            ioHelper.interactionTypes.DANGER
        );
    }
}

// TODO: Rename all codeList and CodeList occurrences to codelist and Codelist
window.showCodeListModal = function() {
    if (!metadataWrapper.getCodeListOIDByItem(currentPath.itemOID)) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("no-codelist-hint"));
        return;
    }

    // Add modal to DOM
    const codelistModal = document.createElement("codelist-modal");
    codelistModal.setPath(currentPath);
    document.body.appendChild(codelistModal);
    languageHelper.localize(codelistModal);
}

function reloadAndStoreMetadata() {
    $("#save-button").unhighlight();
    reloadTree();
    reloadDetailsPanel();

    // If connected to an actively used server, only submit the metadata if according button is pressed
    if (!asyncEditMode) metadataWrapper.storeMetadata();
}

function getCurrentDetailsView() {
    if ($("#foundational-option").isActive()) return detailsPanelViews.FOUNDATIONAL;
    else if ($("#extended-option").isActive()) return detailsPanelViews.EXTENDED;
    else if ($("#duplicate-option").isActive()) return detailsPanelViews.DUPLICATE;
}

function enableAsyncEditMode() {
    // TODO: Cache all subject data

    ioHelper.showToast(languageHelper.getTranslation("edit-mode-enabled-hint"), 5000);
    $("#store-metadata-async-button").show();
    $("#store-metadata-async-button").disabled = true;

    viewOnlyMode = false;
    reloadTree();
    reloadDetailsPanel();
}

window.toggleMoreExtendedOptions = function() {
    $$("#condition-alias-column, #calculation-column").forEach(element => element.classList.toggle("is-hidden-desktop"));
    $$("#extended-options-button .icon, #extended-options-button .button-text").forEach(element => element.classList.toggle("is-hidden"));
    document.activeElement.blur();
}

window.storeMetadataAsync = function() {
    ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("save-forms-question"),
        {
            [languageHelper.getTranslation("save")]: async () => {
                await metadataWrapper.storeMetadata();
                $("#store-metadata-async-button").disabled = true;
                ioHelper.showToast(languageHelper.getTranslation("forms-saved-hint"), 5000);
            }
        }
    );
}

function showFirstEventEditedHelp() {
    const element = metadataWrapper.getElementDefByOID(currentPath.last.value);
    if (!element.getTranslatedDescription(languageHelper.getCurrentLocale()) && $("#translation-textarea").value && metadataWrapper.getStudyEvents().length == 1 && !ioHelper.isMobile()) {
        // Show the first event edited help message
        ioHelper.showToast(languageHelper.getTranslation("first-event-edited-hint"), 20000);
    }
}
