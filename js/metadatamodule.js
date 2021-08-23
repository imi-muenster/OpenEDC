import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as expressionHelper from "./helper/expressionhelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as htmlElements from "./helper/htmlelements.js";
import * as autocompleteHelper from "./helper/autocompletehelper.js";

const detailsPanelViews = {
    FOUNDATIONAL: 1,
    EXTENDED: 2,
    DUPLICATE: 3
};

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

let currentPath = new metadataHelper.ODMPath();

let viewOnlyMode = false;
let asyncEditMode = false;
let elementTypeOnDrag = null;

export function init() {
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
    if (ioHelper.hasServerURL() && !asyncEditMode && (admindataHelper.getUsers().length > 1 || clinicaldataHelper.getSubjects().length > 1)) {
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

function createPanelBlock(elementOID, elementType, displayText, fallbackText, subtitleText, codedValue) {
    const draggable = viewOnlyMode ? false : true;
    let panelBlock = htmlElements.getMetadataPanelBlock(elementOID, elementType, displayText, fallbackText, subtitleText, codedValue, draggable);

    panelBlock.ondragstart = dragStart;
    panelBlock.ondragenter = dragEnter;

    return panelBlock;
}

function createDatatypeMandatorySelect() {
    if (!$("#datatype-select-outer")) $("#datatype-label").insertAdjacentElement("afterend", htmlElements.getDataTypeSelect());
    if (!$("#mandatory-select-outer")) $("#mandatory-label").insertAdjacentElement("afterend", htmlElements.getMandatorySelect());
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
    if (hideTree) currentPath.value = null;
}

export function loadStudyEvents(hideTree) {
    hideStudyEvents(hideTree);

    let studyEventDefs = metadataHelper.getStudyEvents();
    for (let studyEventDef of studyEventDefs) {
        let translatedDescription = studyEventDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(studyEventDef.getOID(), metadataHelper.elementTypes.STUDYEVENT, translatedDescription, studyEventDef.getName());
        panelBlock.onclick = studyEventClicked;
        $("#study-event-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.studyEventOID) $(`[oid="${currentPath.studyEventOID}"]`).activate();

    if (viewOnlyMode) $("#study-events-add-button").disabled = true;
    else $("#study-events-add-button").disabled = false;
}

function studyEventClicked(event) {
    ioHelper.removeIsActiveFromElement($("#study-event-panel-blocks a.is-active"));
    event.target.activate();
    
    currentPath.studyEventOID = event.target.getOID();
    loadFormsByStudyEvent(true);
    reloadDetailsPanel();
}

function loadFormsByStudyEvent(hideTree) {
    hideForms(hideTree);

    let formDefs = metadataHelper.getFormsByStudyEvent(currentPath.studyEventOID);
    for (let formDef of formDefs) {
        let translatedDescription = formDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(formDef.getOID(), metadataHelper.elementTypes.FORM, translatedDescription, formDef.getName());
        panelBlock.onclick = formClicked;
        $("#form-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.formOID) $(`[oid="${currentPath.formOID}"]`).activate();

    if (viewOnlyMode) $("#forms-add-button").disabled = true;
    else $("#forms-add-button").disabled = false;
}

function formClicked(event) {
    ioHelper.removeIsActiveFromElement($("#form-panel-blocks a.is-active"));
    event.target.activate();

    currentPath.formOID = event.target.getOID();
    loadItemGroupsByForm(true);
    reloadDetailsPanel();
}

function loadItemGroupsByForm(hideTree) {
    hideItemGroups(hideTree);

    let itemGroupDefs = metadataHelper.getItemGroupsByForm(currentPath.formOID);
    for (let itemGroupDef of itemGroupDefs) {
        let translatedDescription = itemGroupDef.getTranslatedDescription(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(itemGroupDef.getOID(), metadataHelper.elementTypes.ITEMGROUP, translatedDescription, itemGroupDef.getName());
        panelBlock.onclick = itemGroupClicked;
        $("#item-group-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.itemGroupOID) $(`[oid="${currentPath.itemGroupOID}"]`).activate();

    if (viewOnlyMode) $("#item-groups-add-button").disabled = true;
    else $("#item-groups-add-button").disabled = false;
}

function itemGroupClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-group-panel-blocks a.is-active"));
    event.target.activate();

    currentPath.itemGroupOID = event.target.getOID();
    loadItemsByItemGroup(true);
    reloadDetailsPanel();
}

function loadItemsByItemGroup(hideTree) {
    hideItems(hideTree);

    let itemDefs = metadataHelper.getItemsByItemGroup(currentPath.itemGroupOID);
    for (let itemDef of itemDefs) {
        let translatedQuestion = itemDef.getTranslatedQuestion(languageHelper.getCurrentLocale());
        const dataType = itemDef.querySelector("CodeListRef") ? metadataHelper.elementTypes.CODELIST : itemDef.getDataType();
        let panelBlock = createPanelBlock(itemDef.getOID(), metadataHelper.elementTypes.ITEM, translatedQuestion, itemDef.getName(), languageHelper.getTranslation(dataType));
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.itemOID) $(`[oid="${currentPath.itemOID}"]`).activate();

    if (viewOnlyMode) $("#items-add-button").disabled = true;
    else $("#items-add-button").disabled = false;
}

function itemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-panel-blocks a.is-active"));
    event.target.activate();

    currentPath.itemOID = event.target.getOID();
    loadCodeListItemsByItem(true);
    reloadDetailsPanel();
}

function loadCodeListItemsByItem(hideTree) {
    hideCodeListItems(hideTree);

    let codeListItems = metadataHelper.getCodeListItemsByItem(currentPath.itemOID);
    for (let codeListItem of codeListItems) {
        let translatedDecode = codeListItem.getTranslatedDecode(languageHelper.getCurrentLocale());
        let panelBlock = createPanelBlock(codeListItem.parentNode.getOID(), metadataHelper.elementTypes.CODELISTITEM, translatedDecode, codeListItem.getCodedValue(), null, codeListItem.getCodedValue());
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }
    if (currentPath.value) $(`[oid="${metadataHelper.getCodeListOIDByItem(currentPath.itemOID)}"][coded-value="${currentPath.value}"]`).activate();

    if (viewOnlyMode) {
        $("#code-list-items-add-button").disabled = true;
        $("#code-list-items-opt-button").disabled = true;
    } else {
        if (metadataHelper.itemHasCodeList(currentPath.itemOID)) $("#code-list-items-add-button").disabled = false;
        $("#code-list-items-opt-button").disabled = false;
    }
}

function codeListItemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#code-list-item-panel-blocks a.is-active"));
    event.target.activate();

    currentPath.value = event.target.getAttribute("coded-value");
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
    [$("#id-input"), $("#translation-textarea"), $("#datatype-select-inner"), $("#mandatory-select-inner")].disableElements();
    [$("#id-input"), $("#translation-textarea"), $("#datatype-select-inner"), $("#mandatory-select-inner")].emptyInputs();
    $("#element-oid-label").textContent = languageHelper.getTranslation("unique-id");
    $("#element-long-label").textContent = languageHelper.getTranslation("translated-description");

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
    if (getCurrentElementType() != metadataHelper.elementTypes.CODELISTITEM) references = metadataHelper.getElementRefs(getCurrentElementOID(), getCurrentElementType());
    else references = metadataHelper.getElementRefs(metadataHelper.getCodeListOIDByItem(currentPath.itemOID), getCurrentElementType());

    if (references.length > 1) {
        $("#duplicate-option").classList.add("has-text-danger");
        $("#duplicate-option i").className = "fas fa-clone";
    } else {
        $("#duplicate-option").classList.remove("has-text-danger");
        $("#duplicate-option i").className = "far fa-clone";
    }
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
    $("#id-input").disabled = false;
    $("#translation-textarea").disabled = false;

    let element = metadataHelper.getElementDefByOID(getCurrentElementOID());
    const elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), getCurrentElementType(), getCurrentElementParentOID());
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#id-input").value = getCurrentElementOID();
            $("#translation-textarea").value = element.getTranslatedDescription(languageHelper.getCurrentLocale());
            break;
        case metadataHelper.elementTypes.ITEM:
            $("#datatype-select-inner").disabled = false;
            $("#mandatory-select-inner").disabled = false;
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-question");
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            $("#id-input").value = getCurrentElementOID();
            $("#translation-textarea").value = element.getTranslatedQuestion(languageHelper.getCurrentLocale());
            $("#datatype-select-inner").value = metadataHelper.itemHasCodeList(getCurrentElementOID()) ? metadataHelper.elementTypes.CODELIST + "-" + element.getDataType() : element.getDataType();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            $("#mandatory-select-inner").disabled = true;
            $("#element-oid-label").textContent = languageHelper.getTranslation("coded-value");
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-choice");
            element = metadataHelper.getCodeListItem(metadataHelper.getCodeListOIDByItem(currentPath.itemOID), currentPath.value);
            $("#id-input").value = element.getCodedValue();
            $("#translation-textarea").value = element.getTranslatedDecode(languageHelper.getCurrentLocale());
    }
}

function fillDetailsPanelExtended() {
    fillElementAliases();
    [$("#alias-inputs .alias-context"), $("#alias-inputs .alias-name"), $("#add-alias-button")].enableElements();

    const condition = metadataHelper.getElementCondition(getCurrentElementType(), getCurrentElementOID(), getCurrentElementParentOID());
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#collection-condition").value = condition ? condition.getFormalExpression() : null;
            $("#collection-condition").disabled = false;
            break;
        case metadataHelper.elementTypes.ITEM:
            fillItemRangeChecks();
            [$("#range-check-inputs .range-check-comparator-inner"), $("#range-check-inputs .range-check-value"), $("#add-range-check-button")].enableElements();
            $("#collection-condition").value = condition ? condition.getFormalExpression() : null;
            $("#collection-condition").disabled = false;
            const measurementUnit = metadataHelper.getItemMeasurementUnit(getCurrentElementOID());
            $("#measurement-unit").value = measurementUnit ? measurementUnit.getTranslatedSymbol(languageHelper.getCurrentLocale()) : null;
            $("#measurement-unit").disabled = false;
            const method = metadataHelper.getItemMethod(getCurrentElementOID(), getCurrentElementParentOID());
            $("#item-method").value = method ? method.getFormalExpression() : null;
            $("#item-method").disabled = false;
    }
}

function fillDetailsPanelDuplicate() {
    let references = [];
    let translatedTexts = [];
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            if (!viewOnlyMode) [$("#shallow-copy-button"), $("#deep-copy-button")].enableElements();
            break;
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
        case metadataHelper.elementTypes.ITEM:
            references = metadataHelper.getElementRefs(getCurrentElementOID(), getCurrentElementType());
            translatedTexts = references.map(reference => reference.parentNode.getTranslatedDescription(languageHelper.getCurrentLocale(), true));
            if (!viewOnlyMode) [$("#reference-button"), $("#shallow-copy-button"), $("#deep-copy-button")].enableElements();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            references = metadataHelper.getElementRefs(metadataHelper.getCodeListOIDByItem(currentPath.itemOID), getCurrentElementType());
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
    if (getCurrentElementType()) {
        adjustDetailsPanelSidebar();
        if (getCurrentDetailsView() == detailsPanelViews.FOUNDATIONAL) fillDetailsPanelFoundational();
        else if (getCurrentDetailsView() == detailsPanelViews.EXTENDED) fillDetailsPanelExtended();
        else if (getCurrentDetailsView() == detailsPanelViews.DUPLICATE) fillDetailsPanelDuplicate();
    }
}

function fillItemRangeChecks() {
    const rangeChecks = metadataHelper.getRangeChecksByItem(currentPath.itemOID);
    if (rangeChecks.length) $$("#range-check-inputs .range-check-input").removeElements();

    for (const rangeCheck of rangeChecks) {
        const input = htmlElements.getRangeCheckInputElement(rangeCheck.getAttribute("Comparator"), rangeCheck.querySelector("CheckValue").textContent);
        input.querySelector(".range-check-comparator-inner").oninput = () => highlightSaveButton();
        input.querySelector(".range-check-value").oninput = () => highlightSaveButton();
        $("#range-check-inputs").appendChild(input);
    }
}

function fillElementAliases() {
    const aliases = metadataHelper.getAliasesByElement(getCurrentElementOID(), currentPath.value);
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

window.saveElement = async function() {
    if (getCurrentDetailsView() == detailsPanelViews.FOUNDATIONAL) await saveDetailsFoundational();
    else if (getCurrentDetailsView() == detailsPanelViews.EXTENDED) saveDetailsExtended();
}

async function saveDetailsFoundational() {
    const newID = $("#id-input").value;
    const newTranslatedText = $("#translation-textarea").value;
    
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            showFirstEventEditedHelp();
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            await setElementOIDAndName(newID);
            metadataHelper.setElementDescription(getCurrentElementOID(), newTranslatedText);
            break;
        case metadataHelper.elementTypes.ITEM:
            await setElementOIDAndName(newID);
            metadataHelper.setItemQuestion(getCurrentElementOID(), newTranslatedText);
            metadataHelper.setElementMandatory(getCurrentElementOID(), getCurrentElementType(), $("#mandatory-select-inner").value, getCurrentElementParentOID());
            handleItemDataType(getCurrentElementOID(), $("#datatype-select-inner").value);
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            await setCodeListItemCodedValue(newID);
            metadataHelper.setCodeListItemDecodedText(metadataHelper.getCodeListOIDByItem(currentPath.itemOID), currentPath.value, newTranslatedText);
    }

    if (!languageHelper.getPresentLanguages().includes(languageHelper.getCurrentLocale())) {
        languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
        languageHelper.createLanguageSelect(true);
    }

    reloadAndStoreMetadata();
}

async function setElementOIDAndName(oid) {
    if (getCurrentElementOID() == oid) return;

    const subjectKeys = await clinicaldataHelper.getSubjectsHavingDataForElement(getCurrentElementOID(), getCurrentElementType());
    if (subjectKeys.length == 0) {
        await metadataHelper.setElementOID(getCurrentElementOID(), getCurrentElementType(), oid)
            .then(() => {
                setCurrentElementOID(oid);
                metadataHelper.setElementName(getCurrentElementOID(), oid);
            })
            .catch(() => ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("id-not-changed-error-used")))
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("id-not-changed-error-data"));
    }
}

async function setCodeListItemCodedValue(codedValue) {
    if (currentPath.value == codedValue) return;

    const subjectKeys = await clinicaldataHelper.getSubjectsHavingDataForElement(getCurrentElementOID(), getCurrentElementType(), currentPath.itemOID, currentPath.value);
    if (subjectKeys.length == 0) {
        await metadataHelper.setCodeListItemCodedValue(metadataHelper.getCodeListOIDByItem(currentPath.itemOID), currentPath.value, codedValue)
            .then(() => currentPath.value = codedValue)
            .catch(() => ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("coded-value-not-changed-error-used")))
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("coded-value-not-changed-error-data"));
    }
}

function saveDetailsExtended() {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.ITEMGROUP:
            if (saveConditionPreCheck()) return;
            break;
        case metadataHelper.elementTypes.ITEM:
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
    const currentCondition = metadataHelper.getElementCondition(getCurrentElementType(), getCurrentElementOID(), getCurrentElementParentOID());
    if (formalExpression && currentCondition && formalExpression == currentCondition.getFormalExpression()) return;
    if (formalExpressionContainsError(formalExpression)) return true;

    const currentElementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), getCurrentElementType(), getCurrentElementParentOID());
    if (currentCondition) {
        const elementsHavingCondition = metadataHelper.getElementRefsHavingCondition(currentCondition.getOID());
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
    const identicalCondition = metadataHelper.getConditions().find(condition => condition.getFormalExpression() == formalExpression);

    let conditionOID;
    if (formalExpression && currentCondition && changeAll && !identicalCondition) {
        metadataHelper.setConditionFormalExpression(currentCondition.getOID(), formalExpression);
    } else {
        if (identicalCondition) conditionOID = identicalCondition.getOID();
        else if (formalExpression) conditionOID = metadataHelper.createCondition(formalExpression);
        elementRefs.forEach(elementRef => metadataHelper.setElementRefCondition(elementRef, conditionOID));
    }

    if (currentCondition && (!formalExpression || currentCondition.getOID() != conditionOID)) metadataHelper.safeDeleteCondition(currentCondition.getOID());
    if (promptInitiated) saveDetailsExtended();
}

function saveMethodPreCheck() {
    const formalExpression = $("#item-method").value.trim();
    const currentMethod = metadataHelper.getItemMethod(getCurrentElementOID(), getCurrentElementParentOID());
    if (formalExpression && currentMethod && formalExpression == currentMethod.getFormalExpression()) return;
    if (formalExpressionContainsError(formalExpression)) return true;

    const currentElementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), getCurrentElementType(), getCurrentElementParentOID());
    if (currentMethod) {
        const elementsHavingMethod = metadataHelper.getElementRefsHavingMethod(currentMethod.getOID());
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
    const identicalMethod = metadataHelper.getMethods().find(method => method.getFormalExpression() == formalExpression);

    let methodOID;
    if (formalExpression && currentMethod && changeAll && !identicalMethod) {
        metadataHelper.setMethodFormalExpression(currentMethod.getOID(), formalExpression);
    } else {
        if (identicalMethod) methodOID = identicalMethod.getOID();
        else if (formalExpression) methodOID = metadataHelper.createMethod(formalExpression);
        elementRefs.forEach(elementRef => metadataHelper.setElementRefMethod(elementRef, methodOID));
    }

    if (currentMethod && (!formalExpression || currentMethod.getOID() != methodOID)) metadataHelper.safeDeleteMethod(currentMethod.getOID());
    if (promptInitiated) saveDetailsExtended();
}

function saveMeasurementUnitPreCheck() {
    const symbol = $("#measurement-unit").value;
    const currentMeasurementUnit = metadataHelper.getItemMeasurementUnit(getCurrentElementOID());
    if (symbol && currentMeasurementUnit && symbol == currentMeasurementUnit.getTranslatedSymbol(languageHelper.getCurrentLocale())) return;

    const currentItemDef = metadataHelper.getElementDefByOID(getCurrentElementOID());
    if (currentMeasurementUnit) {
        const elementsHavingMeasurementUnit = metadataHelper.getItemDefsHavingMeasurementUnit(currentMeasurementUnit.getOID());
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
    const identicalMeasurementUnit = metadataHelper.getMeasurementUnits().find(measurementUnit => measurementUnit.getTranslatedSymbol(languageHelper.getCurrentLocale()) == symbol);

    let measurementUnitOID;
    if (symbol && currentMeasurementUnit && changeAll && !identicalMeasurementUnit) {
        metadataHelper.setMeasurementUnitSymbol(currentMeasurementUnit.getOID(), symbol);
    } else {
        if (identicalMeasurementUnit) measurementUnitOID = identicalMeasurementUnit.getOID();
        else if (symbol) measurementUnitOID = metadataHelper.createMeasurementUnit(symbol);
        itemDefs.forEach(itemDef => metadataHelper.setItemDefMeasurementUnit(itemDef, measurementUnitOID));
    }

    if (currentMeasurementUnit && (!symbol || currentMeasurementUnit.getOID() != measurementUnitOID)) metadataHelper.safeDeleteMeasurementUnit(currentMeasurementUnit.getOID());
    if (promptInitiated) saveDetailsExtended();
}

function saveRangeChecks() {
    metadataHelper.deleteRangeChecksOfItem(currentPath.itemOID);
    for (let rangeCheckInput of $$(".range-check-input")) {
        let comparator = rangeCheckInput.querySelector(".range-check-comparator-inner").value;
        let checkValue = rangeCheckInput.querySelector(".range-check-value").value.replace(",", ".");
        if (comparator && checkValue == parseFloat(checkValue)) {
            metadataHelper.setItemRangeCheck(currentPath.itemOID, comparator, checkValue);
        }
    }
}

function saveAliases() {
    metadataHelper.deleteAliasesOfElement(getCurrentElementOID(), currentPath.value);
    for (let aliasInput of $$(".alias-input")) {
        let context = aliasInput.querySelector(".alias-context").value;
        let name = aliasInput.querySelector(".alias-name").value;
        if (context && name) {
            metadataHelper.setElementAlias(getCurrentElementOID(), currentPath.value, context, name);
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

    ioHelper.removeIsActiveFromElement($("#details-panel .sidebar-option.is-active"));
    event.target.activate();

    switch (event.target.id) {
        case "foundational-option":
            $("#foundational-options").show();
            $("#extended-options").hide();
            $("#duplicate-options").hide();
            break;
        case "extended-option":
            $("#foundational-options").hide();
            $("#extended-options").show();
            $("#duplicate-options").hide();
            break;
        case "duplicate-option":
            $("#foundational-options").hide();
            $("#extended-options").hide();
            $("#duplicate-options").show();
    }

    reloadDetailsPanel();
}

function handleItemDataType(itemOID, dataType) {
    let dataTypeIsCodeList = dataType.startsWith(metadataHelper.elementTypes.CODELIST);
    let codeListType = dataTypeIsCodeList ? dataType.split("-")[1] : null;

    let codeListRef = metadataHelper.getElementDefByOID(itemOID).querySelector("CodeListRef");
    if (codeListRef && !dataTypeIsCodeList) {
        metadataHelper.removeCodeListRef(itemOID, codeListRef.getAttribute("CodeListOID"));
        loadCodeListItemsByItem();
    } else if (!codeListRef && dataTypeIsCodeList) {
        metadataHelper.createCodeList(itemOID);
        loadCodeListItemsByItem();
    }

    if (dataTypeIsCodeList) {
        metadataHelper.setItemDataType(itemOID, codeListType);
        metadataHelper.setCodeListDataType(metadataHelper.getCodeListOIDByItem(itemOID), codeListType);
    } else {
        metadataHelper.setItemDataType(itemOID, dataType);
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
        if (["-", "_", "(", ")", "/", "#", " "].includes(event.key)) {
            event.preventDefault();
            if (event.target.selectionStart > 0 && event.target.value[event.target.selectionStart - 1] == "_") return;
            event.target.setRangeText("_", event.target.selectionStart, event.target.selectionEnd, "end");
        };
    });

    autocompleteHelper.enableAutocomplete($("#collection-condition"), autocompleteHelper.modes.CONDITION);
    autocompleteHelper.enableAutocomplete($("#measurement-unit"), autocompleteHelper.modes.MEASUREMENTUNIT);
    autocompleteHelper.enableAutocomplete($("#item-method"), autocompleteHelper.modes.METHOD);

    $("#collection-condition").addEventListener("focus", () => $("#collection-condition").setAttribute("context-path", currentPath.toString()));
    $("#item-method").addEventListener("focus", () => $("#item-method").setAttribute("context-path", currentPath.toString()));
}

// TODO: The next five functions should use reloadAndStoreMetadata()
window.addStudyEvent = function(event) {
    currentPath.studyEventOID = metadataHelper.createStudyEvent();
    loadStudyEvents();
    loadFormsByStudyEvent(true);
    reloadDetailsPanel();
    ioHelper.scrollParentToChild($(`[OID="${currentPath.studyEventOID}"]`));
    if (!asyncEditMode) metadataHelper.storeMetadata();
    event.target.blur();

    // Show the first study event help message
    if (metadataHelper.getStudyEvents().length == 1 && !ioHelper.isMobile()) ioHelper.showToast(languageHelper.getTranslation("first-event-hint"));
}

window.addForm = function(event) {
    currentPath.formOID = metadataHelper.createForm(currentPath.studyEventOID);
    loadFormsByStudyEvent();
    loadItemGroupsByForm(true);
    reloadDetailsPanel();
    ioHelper.scrollParentToChild($(`[OID="${currentPath.formOID}"]`));
    if (!asyncEditMode) metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItemGroup = function(event) {
    currentPath.itemGroupOID = metadataHelper.createItemGroup(currentPath.formOID);
    loadItemGroupsByForm();
    loadItemsByItemGroup(true);
    reloadDetailsPanel();
    ioHelper.scrollParentToChild($(`[OID="${currentPath.itemGroupOID}"]`));
    if (!asyncEditMode) metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItem = function(event) {
    currentPath.itemOID = metadataHelper.createItem(currentPath.itemGroupOID);
    loadItemsByItemGroup();
    loadCodeListItemsByItem(true);
    reloadDetailsPanel();
    ioHelper.scrollParentToChild($(`[OID="${currentPath.itemOID}"]`));
    if (!asyncEditMode) metadataHelper.storeMetadata();
    event.target.blur();
}

window.addCodeListItem = function(event) {
    let codeListOID = metadataHelper.getCodeListOIDByItem(currentPath.itemOID);
    if (codeListOID) {
        currentPath.value = metadataHelper.addCodeListItem(codeListOID);
        loadCodeListItemsByItem();
        reloadDetailsPanel();
        ioHelper.scrollParentToChild($(`[coded-value="${currentPath.value}"]`));
    }
    if (!asyncEditMode) metadataHelper.storeMetadata();
    event.target.blur();
}

function removeElement() {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            metadataHelper.removeStudyEventRef(currentPath.studyEventOID);
            currentPath.studyEventOID = null;
            hideForms(true);
            break;
        case metadataHelper.elementTypes.FORM:
            metadataHelper.removeFormRef(currentPath.studyEventOID, currentPath.formOID);
            currentPath.formOID = null;
            hideItemGroups(true);
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.removeItemGroupRef(currentPath.formOID, currentPath.itemGroupOID);
            currentPath.itemGroupOID = null;
            hideItems(true);
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.removeItemRef(currentPath.itemGroupOID, currentPath.itemOID);
            currentPath.itemOID = null;
            hideCodeListItems(true);
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            metadataHelper.deleteCodeListItem(metadataHelper.getCodeListOIDByItem(currentPath.itemOID), currentPath.value);
            currentPath.value = null;
    }

    reloadAndStoreMetadata();
    ioHelper.showToast(languageHelper.getTranslation("element-removed"), 2500);
}

window.duplicateReference = function() {
    if (getCurrentElementType() == metadataHelper.elementTypes.CODELISTITEM) return;

    const elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), getCurrentElementType(), getCurrentElementParentOID());
    elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);

    reloadAndStoreMetadata();
    ioHelper.showToast(languageHelper.getTranslation("reference-added-hint"), 10000);
}

window.copyElement = function(deepCopy) {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            metadataHelper.copyStudyEvent(currentPath.studyEventOID, deepCopy);
            break;
        case metadataHelper.elementTypes.FORM:
            metadataHelper.copyForm(currentPath.formOID, deepCopy, currentPath.studyEventOID);
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.copyItemGroup(currentPath.itemGroupOID, deepCopy, currentPath.formOID);
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.copyItem(currentPath.itemOID, deepCopy, currentPath.itemGroupOID);
    }

    reloadAndStoreMetadata();
    ioHelper.showToast(languageHelper.getTranslation("copy-added"), 2500);
}

function dragStart(event) {
    elementTypeOnDrag = event.target.getAttribute("element-type");
    event.dataTransfer.setData("sourceElementOID", event.target.getOID());
    event.dataTransfer.setData("sourceParentOID", getParentOID(elementTypeOnDrag));
    if (elementTypeOnDrag == metadataHelper.elementTypes.CODELISTITEM) {
        event.dataTransfer.setData("sourceCodedValue", event.target.getAttribute("coded-value"));
    }
}

window.allowDrop = function(event) {
    if (elementTypeOnDrag == event.target.getAttribute("element-type")) {
        event.preventDefault();
    }
}

function dragEnter(event) {
    if (event.clientX+75 < event.target.getBoundingClientRect().right) {
        if (metadataHelper.getHierarchyLevelOfElementType(elementTypeOnDrag) > metadataHelper.getHierarchyLevelOfElementType(event.target.getAttribute("element-type"))) {
            switch (event.target.getAttribute("element-type")) {
                case metadataHelper.elementTypes.STUDYEVENT:
                    studyEventClicked(event);
                    break;
                case metadataHelper.elementTypes.FORM:
                    formClicked(event);
                    break;
                case metadataHelper.elementTypes.ITEMGROUP:
                    itemGroupClicked(event);
                    break;
                case metadataHelper.elementTypes.ITEM:
                    itemClicked(event);
            }
        }
    }
}

function getCurrentElementOID() {
    if (currentPath.value) return currentPath.value;
    else if (currentPath.itemOID) return currentPath.itemOID;
    else if (currentPath.itemGroupOID) return currentPath.itemGroupOID;
    else if (currentPath.formOID) return currentPath.formOID;
    else if (currentPath.studyEventOID) return currentPath.studyEventOID;
}

function getCurrentElementType() {
    if (currentPath.value) return metadataHelper.elementTypes.CODELISTITEM;
    else if (currentPath.itemOID) return metadataHelper.elementTypes.ITEM;
    else if (currentPath.itemGroupOID) return metadataHelper.elementTypes.ITEMGROUP;
    else if (currentPath.formOID) return metadataHelper.elementTypes.FORM;
    else if (currentPath.studyEventOID) return metadataHelper.elementTypes.STUDYEVENT;
}

function getCurrentElementParentOID() {
    return getParentOID(getCurrentElementType());
}

function getParentOID(elementType) {
    switch (elementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            return null;
        case metadataHelper.elementTypes.FORM:
            return currentPath.studyEventOID;
        case metadataHelper.elementTypes.ITEMGROUP:
            return currentPath.formOID;
        case metadataHelper.elementTypes.ITEM:
            return currentPath.itemGroupOID;
        case metadataHelper.elementTypes.CODELISTITEM:
            return currentPath.itemOID;
    }
}

function setCurrentElementOID(elementOID) {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            currentPath.studyEventOID = elementOID;
            break;
        case metadataHelper.elementTypes.FORM:
            currentPath.formOID = elementOID;
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            currentPath.itemGroupOID = elementOID;
            break;
        case metadataHelper.elementTypes.ITEM:
            currentPath.itemOID = elementOID;
    }
}

window.elementDrop = async function(event) {
    if (viewOnlyMode) return;
    
    const sourceElementOID = event.dataTransfer.getData("sourceElementOID");
    const sourceCodedValue = event.dataTransfer.getData("sourceCodedValue");
    const sourceParentOID = event.dataTransfer.getData("sourceParentOID");
    const targetElementOID = event.target.getOID();
    const targetCodedValue = event.target.getAttribute("coded-value")
    const targetParentOID = getParentOID(elementTypeOnDrag);

    let sourceElementRef = null;
    let targetElementRef = null;

    if (sourceParentOID != targetParentOID) {
        // Extra if-statement for performance reasons (do not load all subjects when sourceParentOID and targetParentOID are equal)
        const subjectKeys = await clinicaldataHelper.getSubjectsHavingDataForElement(sourceElementOID, elementTypeOnDrag, sourceParentOID, sourceCodedValue);
        if (subjectKeys.length) {
            ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("element-not-moved-error"));
            return;
        }
    }

    if (elementTypeOnDrag == metadataHelper.elementTypes.CODELISTITEM) {
        sourceElementRef = metadataHelper.getCodeListItem(sourceElementOID, sourceCodedValue);
    } else {
        sourceElementRef = metadataHelper.getElementRefByOID(sourceElementOID, elementTypeOnDrag, sourceParentOID);
    }

    if (targetElementOID) {
        if (elementTypeOnDrag == metadataHelper.elementTypes.CODELISTITEM) {
            targetElementRef = metadataHelper.getCodeListItem(targetElementOID, targetCodedValue);
        } else {
            targetElementRef = metadataHelper.getElementRefByOID(targetElementOID, elementTypeOnDrag, targetParentOID);
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
        if (elementTypeOnDrag == metadataHelper.elementTypes.STUDYEVENT) metadataHelper.insertStudyEventRef(sourceElementRef);
        else if (elementTypeOnDrag == metadataHelper.elementTypes.FORM) metadataHelper.insertFormRef(sourceElementRef, targetParentOID);
        else if (elementTypeOnDrag == metadataHelper.elementTypes.ITEMGROUP) metadataHelper.insertItemGroupRef(sourceElementRef, targetParentOID);
        else if (elementTypeOnDrag == metadataHelper.elementTypes.ITEM) metadataHelper.insertFormRef(sourceElementRef, targetParentOID);
        else if (elementTypeOnDrag == metadataHelper.elementTypes.CODELISTITEM) metadataHelper.insertCodeListItem(sourceElementRef, metadataHelper.getCodeListOIDByItem(targetParentOID));
    }

    elementTypeOnDrag = null;
    reloadAndStoreMetadata();
}

window.showRemoveModal = async function() {
    const subjectKeys = await clinicaldataHelper.getSubjectsHavingDataForElement(getCurrentElementOID(), getCurrentElementType(), currentPath.itemOID, currentPath.value);
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

// TODO: Reorder other modal functions in this order (show -> save -> hide)
window.showCodeListModal = function() {
    if (!metadataHelper.itemHasCodeList(currentPath.itemOID)) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("no-codelist-hint"));
        return;
    }

    // Add the item question and use the name as fallback
    const itemDef = metadataHelper.getElementDefByOID(currentPath.itemOID);
    $("#codelist-modal h2").textContent = itemDef.getTranslatedQuestion(languageHelper.getCurrentLocale(), true);

    // Render the notification when the codelist is used for more than one item
    const codeListOID = metadataHelper.getCodeListOIDByItem(currentPath.itemOID);
    const codeListReferences = metadataHelper.getElementRefs(codeListOID, metadataHelper.elementTypes.CODELISTITEM);
    if (codeListReferences.length > 1) {
        const translatedQuestions = codeListReferences.map(reference => reference.parentNode.getTranslatedQuestion(languageHelper.getCurrentLocale(), true));
        $("#codelist-modal #codelist-references-list").innerHTML = translatedQuestions.join("<br>");
        $("#codelist-modal .notification").show();
        $("#codelist-modal #codelist-reference-field").hide();
    } else {
        $("#codelist-modal .notification").hide();
        $("#codelist-modal #codelist-reference-field").show();
        autocompleteHelper.enableAutocomplete($("#codelist-modal #codelist-reference-input"), autocompleteHelper.modes.ITEMWITHCODELIST);
    }

    // Generate the string containing all coded values and translated decodes
    const codeListItemsString = metadataHelper.getCodeListItemsByItem(currentPath.itemOID).reduce((string, item) => {
        return string += `${item.getCodedValue()}, ${item.getTranslatedDecode(languageHelper.getCurrentLocale()) || ""}\n`;
    }, "");

    $("#codelist-modal #textitems-textarea").value = codeListItemsString;
    $("#codelist-modal #codelist-reference-input").value = null;
    $("#codelist-modal").activate();
}

window.saveCodeListModal = function() {
    // Create a temporary element and move all code list items to that element
    const codeListOID = metadataHelper.getCodeListOIDByItem(currentPath.itemOID);
    const currentItems = document.createElement("current-items");
    metadataHelper.getCodeListItemsByItem(currentPath.itemOID).forEach(item => currentItems.appendChild(item));

    // Iterate over the text input and move existing items from the temporary element to the code list to preserve translations
    const lines = $("#textitems-textarea").value.split("\n");
    for (const line of lines) {
        const parts = line.split(",");
        if (parts.length < 2) continue;

        const codedValue = parts.shift();
        const translatedDecode = parts.join(",").trim();

        const currentItem = Array.from(currentItems.childNodes).find(item => item.getCodedValue() == codedValue);
        if (currentItem) metadataHelper.insertCodeListItem(currentItem, codeListOID);
        else metadataHelper.addCodeListItem(codeListOID, codedValue);

        metadataHelper.setCodeListItemDecodedText(codeListOID, codedValue, translatedDecode);
    }

    hideCodeListModal();
    reloadAndStoreMetadata();
}

window.hideCodeListModal = function() {
    autocompleteHelper.disableAutocomplete($("#codelist-modal #codelist-reference-input"));
    $("#codelist-modal").deactivate();
}

window.referenceCodeList = function() {
    const externalItemOID = metadataHelper.ODMPath.parse($("#codelist-modal #codelist-reference-input").value).itemOID;
    if (!externalItemOID) return;

    if (externalItemOID == currentPath.itemOID) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("same-item-referenced-error"));
        return;
    }

    const externalCodeListOID = metadataHelper.getCodeListOIDByItem(externalItemOID);
    if (!externalCodeListOID) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("codelist-not-found-error"));
        return;
    };

    const currentCodeListOID = metadataHelper.getCodeListOIDByItem(currentPath.itemOID);
    metadataHelper.removeCodeListRef(currentPath.itemOID, currentCodeListOID);
    metadataHelper.addCodeListRef(currentPath.itemOID, externalCodeListOID);
    currentPath.value = null;

    hideCodeListModal();
    reloadAndStoreMetadata();
}

window.unreferenceCodeList = function() {
    const currentCodeListOID = metadataHelper.getCodeListOIDByItem(currentPath.itemOID);
    const newCodeListOID = metadataHelper.copyCodeList(currentCodeListOID);
    metadataHelper.removeCodeListRef(currentPath.itemOID, currentCodeListOID);
    metadataHelper.addCodeListRef(currentPath.itemOID, newCodeListOID);
    currentPath.value = null;

    showCodeListModal();
    reloadAndStoreMetadata();
}

function reloadAndStoreMetadata() {
    $("#save-button").unhighlight();
    reloadTree();
    reloadDetailsPanel();

    // If connected to an actively used server, only submit the metadata if according button is pressed
    if (!asyncEditMode) metadataHelper.storeMetadata();
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

    viewOnlyMode = false;
    reloadTree();
    reloadDetailsPanel();
}

window.toggleMoreExtendedOptions = function() {
    for (const element of $$("#extended-options-button .icon, #extended-options-button .button-text, #condition-alias-column, #calculation-column")) {
        element.classList.toggle("is-hidden")
    }
    document.activeElement.blur();
}

window.storeMetadataAsync = function() {
    ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("save-forms-question"),
        {
            [languageHelper.getTranslation("save")]: async () => {
                await metadataHelper.storeMetadata();
                asyncEditMode = false;
                hide();
                $("#store-metadata-async-button").hide();
                ioHelper.showToast(languageHelper.getTranslation("forms-saved-hint"), 5000);
            }
        }
    );
}

function showFirstEventEditedHelp() {
    const element = metadataHelper.getElementDefByOID(getCurrentElementOID());
    if (!element.getTranslatedDescription(languageHelper.getCurrentLocale()) && $("#translation-textarea").value && metadataHelper.getStudyEvents().length == 1 && !ioHelper.isMobile()) {
        // Show the first event edited help message
        ioHelper.showToast(languageHelper.getTranslation("first-event-edited-hint"), 20000);
    }
}
