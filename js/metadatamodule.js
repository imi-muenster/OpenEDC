import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
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

// Holds the OID of the currently selected SE, F, IG, I, and CL, as well as the CodedValue of the CLI
let currentElementID = {
    studyEvent: null,
    form: null,
    itemGroup: null,
    item: null,
    codeList: null,
    codeListItem: null
}

// Further auxiliary variables
let elementTypeOnDrag = null;
let locale = null;

export function init() {
    createDatatypeMandatorySelect();

    metadataHelper.init();
    setIOListeners();
}

export function show() {
    reloadTree();
    reloadDetailsPanel();

    $("#metadata-section").show();
    $("#metadata-toggle-button").hide();
    $("#clinicaldata-toggle-button").show();

    languageHelper.createLanguageSelect(true);
    ioHelper.setTreeMaxHeight();
}

function hide() {
    $("#metadata-section").hide();

    clinicaldataModule.show();
    ioHelper.hideMenu();
}

export function setLanguage(newLocale) {
    locale = newLocale;
}

function createPanelBlock(elementOID, elementType, displayText, fallbackText, subtitleText, codedValue) {
    let panelBlock = htmlElements.getMetadataPanelBlock(elementOID, elementType, displayText, fallbackText, subtitleText, codedValue);

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
        currentElementID.studyEvent = null;
        hideForms(true);
    }
}

function hideForms(hideTree) {
    $$("#form-panel-blocks a").removeElements();
    $("#forms-add-button").disabled = true;
    if (hideTree) {
        currentElementID.form = null;
        hideItemGroups(true);
    }
}

function hideItemGroups(hideTree) {
    $$("#item-group-panel-blocks a").removeElements();
    $("#item-groups-add-button").disabled = true;
    if (hideTree) {
        currentElementID.itemGroup = null;
        hideItems(true);
    }
}

function hideItems(hideTree) {
    $$("#item-panel-blocks a").removeElements();
    $("#items-add-button").disabled = true;
    if (hideTree) {
        currentElementID.item = null;
        hideCodeListItems(true);
    }
}

function hideCodeListItems(hideTree) {
    $$("#code-list-item-panel-blocks a").removeElements();
    $("#code-list-items-add-button").disabled = true;
    $("#code-list-items-opt-button").disabled = true;
    if (hideTree) {
        currentElementID.codeList = null;
        currentElementID.codeListItem = null;
    }
}

export function loadStudyEvents(hideTree) {
    hideStudyEvents(hideTree);

    let studyEventDefs = metadataHelper.getStudyEvents();
    for (let studyEventDef of studyEventDefs) {
        let translatedDescription = studyEventDef.getTranslatedDescription(locale);
        let panelBlock = createPanelBlock(studyEventDef.getOID(), metadataHelper.elementTypes.STUDYEVENT, translatedDescription, studyEventDef.getName());
        panelBlock.onclick = studyEventClicked;
        $("#study-event-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.studyEvent) $(`[oid="${currentElementID.studyEvent}"]`).activate();
}

function studyEventClicked(event) {
    ioHelper.removeIsActiveFromElement($("#study-event-panel-blocks a.is-active"));
    event.target.activate();
    
    currentElementID.studyEvent = event.target.getOID();
    loadFormsByStudyEvent(true);
    reloadDetailsPanel();
}

function loadFormsByStudyEvent(hideTree) {
    hideForms(hideTree);
    $("#forms-add-button").disabled = false;

    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);
    for (let formDef of formDefs) {
        let translatedDescription = formDef.getTranslatedDescription(locale);
        let panelBlock = createPanelBlock(formDef.getOID(), metadataHelper.elementTypes.FORM, translatedDescription, formDef.getName());
        panelBlock.onclick = formClicked;
        $("#form-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.form) $(`[oid="${currentElementID.form}"]`).activate();
}

function formClicked(event) {
    ioHelper.removeIsActiveFromElement($("#form-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.form = event.target.getOID();
    loadItemGroupsByForm(true);
    reloadDetailsPanel();
}

function loadItemGroupsByForm(hideTree) {
    hideItemGroups(hideTree);
    $("#item-groups-add-button").disabled = false;

    let itemGroupDefs = metadataHelper.getItemGroupsByForm(currentElementID.form);
    for (let itemGroupDef of itemGroupDefs) {
        let translatedDescription = itemGroupDef.getTranslatedDescription(locale);
        let panelBlock = createPanelBlock(itemGroupDef.getOID(), metadataHelper.elementTypes.ITEMGROUP, translatedDescription, itemGroupDef.getName());
        panelBlock.onclick = itemGroupClicked;
        $("#item-group-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.itemGroup) $(`[oid="${currentElementID.itemGroup}"]`).activate();
}

function itemGroupClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-group-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.itemGroup = event.target.getOID();
    loadItemsByItemGroup(true);
    reloadDetailsPanel();
}

function loadItemsByItemGroup(hideTree) {
    hideItems(hideTree);
    $("#items-add-button").disabled = false;

    let itemDefs = metadataHelper.getItemsByItemGroup(currentElementID.itemGroup);
    for (let itemDef of itemDefs) {
        let translatedQuestion = itemDef.getTranslatedQuestion(locale);
        const dataType = itemDef.querySelector("CodeListRef") ? metadataHelper.elementTypes.CODELIST : itemDef.getDataType();
        let panelBlock = createPanelBlock(itemDef.getOID(), metadataHelper.elementTypes.ITEM, translatedQuestion, itemDef.getName(), languageHelper.getTranslation(dataType));
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.item) $(`[oid="${currentElementID.item}"]`).activate();
}

function itemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.item = event.target.getOID();
    loadCodeListItemsByItem(true);
    reloadDetailsPanel();
}

function loadCodeListItemsByItem(hideTree) {
    hideCodeListItems(hideTree);

    if (metadataHelper.itemHasCodeList(currentElementID.item)) $("#code-list-items-add-button").disabled = false;
    $("#code-list-items-opt-button").disabled = false;

    let codeListItems = metadataHelper.getCodeListItemsByItem(currentElementID.item);
    for (let codeListItem of codeListItems) {
        let translatedDecode = codeListItem.getTranslatedDecode(locale);
        let panelBlock = createPanelBlock(codeListItem.parentNode.getOID(), metadataHelper.elementTypes.CODELISTITEM, translatedDecode, codeListItem.getCodedValue(), null, codeListItem.getCodedValue());
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }

    if (currentElementID.codeList && currentElementID.codeListItem) $(`[oid="${currentElementID.codeList}"][coded-value="${currentElementID.codeListItem}"]`).activate();
}

function codeListItemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#code-list-item-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.codeList = event.target.getOID();
    currentElementID.codeListItem = event.target.getAttribute("coded-value");
    reloadDetailsPanel();
}

export function reloadTree() {
    loadStudyEvents();
    if (currentElementID.studyEvent) loadFormsByStudyEvent();
    if (currentElementID.form) loadItemGroupsByForm();
    if (currentElementID.itemGroup) loadItemsByItemGroup();
    if (currentElementID.item) loadCodeListItemsByItem();
}

function resetDetailsPanel() {
    // Sidebar
    $("#remove-button").unhighlight();
    $("#save-button").unhighlight();

    // Foundational
    $("#oid-input").disabled = true;
    $("#translation-textarea").disabled = true;
    $("#datatype-select-inner").disabled = true;
    $("#mandatory-select-inner").disabled = true;
    $("#oid-input").value = "";
    $("#translation-textarea").value = "";
    $("#datatype-select-inner").value = "";
    $("#mandatory-select-inner").value = "";
    $("#element-oid-label").textContent = languageHelper.getTranslation("unique-id");
    $("#element-long-label").textContent = languageHelper.getTranslation("translated-description");

    // Extended
    $("#measurement-unit").disabled = true;
    $("#collection-condition").disabled = true;
    $("#add-range-check-button").disabled = true;
    $("#add-alias-button").disabled = true;
    $("#measurement-unit").value = "";
    $("#collection-condition").value = "";
    $$("#range-check-inputs .range-check-input").removeElements();
    $$("#alias-inputs .alias-input").removeElements();
    addEmptyRangeCheckInput(true);
    addEmptyAliasInput(true);

    // Duplicate
    $("#element-references-hint").textContent = "";
    $("#reference-button").disabled = true;
    $("#shallow-copy-button").disabled = true;
    $("#deep-copy-button").disabled = true;
}

function adjustDetailsPanelSidebar() {
    $("#remove-button").highlight();

    const references = metadataHelper.getElementRefs(getCurrentElementOID(), getCurrentElementType());
    if (references.length > 1) {
        $("#duplicate-option").classList.add("has-text-danger");
        $("#duplicate-option i").className = "fas fa-clone";
    } else {
        $("#duplicate-option").classList.remove("has-text-danger");
        $("#duplicate-option i").className = "far fa-clone";
    }
}

function fillDetailsPanelFoundational() {
    $("#oid-input").disabled = false;
    $("#translation-textarea").disabled = false;
    $("#oid-input").value = getCurrentElementOID();

    let element = metadataHelper.getElementDefByOID(getCurrentElementOID());
    const elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), getCurrentElementType(), getCurrentElementParentOID());
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#translation-textarea").value = element.getTranslatedDescription(locale);
            break;
        case metadataHelper.elementTypes.ITEM:
            $("#datatype-select-inner").disabled = false;
            $("#mandatory-select-inner").disabled = false;
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-question");
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            $("#translation-textarea").value = element.getTranslatedQuestion(locale);
            $("#datatype-select-inner").value = metadataHelper.itemHasCodeList(getCurrentElementOID()) ? metadataHelper.elementTypes.CODELIST + "-" + element.getDataType() : element.getDataType();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            $("#mandatory-select-inner").disabled = true;
            $("#element-oid-label").textContent = languageHelper.getTranslation("coded-value");
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-choice");
            element = metadataHelper.getCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            $("#oid-input").value = element.getCodedValue();
            $("#translation-textarea").value = element.getTranslatedDecode(locale);
    }
}

function fillDetailsPanelExtended() {
    fillElementAliases();
    $("#alias-inputs .alias-context").disabled = false;
    $("#alias-inputs .alias-name").disabled = false;
    $("#add-alias-button").disabled = false;

    const condition = metadataHelper.getElementCondition(getCurrentElementType(), getCurrentElementOID(), getCurrentElementParentOID());
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#collection-condition").value = condition ? condition.getFormalExpression() : null;
            $("#collection-condition").disabled = false;
            break;
        case metadataHelper.elementTypes.ITEM:
            fillItemRangeChecks();
            $("#range-check-inputs .range-check-comparator-inner").disabled = false;
            $("#range-check-inputs .range-check-value").disabled = false;
            $("#add-range-check-button").disabled = false;
            const measurementUnit = metadataHelper.getItemMeasurementUnit(getCurrentElementOID());
            $("#measurement-unit").value = measurementUnit ? measurementUnit.getTranslatedSymbol(locale) : null;
            $("#measurement-unit").disabled = false;
            $("#collection-condition").value = condition ? condition.getFormalExpression() : null;
            $("#collection-condition").disabled = false;
    }
}

function fillDetailsPanelDuplicate() {
    const references = metadataHelper.getElementRefs(getCurrentElementOID(), getCurrentElementType());

    let translatedTexts = [];
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            $("#shallow-copy-button").disabled = false;
            $("#deep-copy-button").disabled = false;
            break;
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
        case metadataHelper.elementTypes.ITEM:
            translatedTexts = references.map(reference => reference.parentNode.getTranslatedDescription(locale, true));
            $("#reference-button").disabled = false;
            $("#shallow-copy-button").disabled = false;
            $("#deep-copy-button").disabled = false;
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            translatedTexts = references.map(reference => reference.parentNode.getTranslatedQuestion(locale, true));
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
    const rangeChecks = metadataHelper.getRangeChecksByItem(currentElementID.item);
    if (rangeChecks.length > 0) $$("#range-check-inputs .range-check-input").removeElements();

    for (const rangeCheck of rangeChecks) {
        const input = htmlElements.getRangeCheckInputElement(rangeCheck.getAttribute("Comparator"), rangeCheck.querySelector("CheckValue").textContent);
        input.querySelector(".range-check-comparator-inner").oninput = () => $("#save-button").highlight();
        input.querySelector(".range-check-value").oninput = () => $("#save-button").highlight();
        $("#range-check-inputs").appendChild(input);
    }
}

function fillElementAliases() {
    const aliases = metadataHelper.getAliasesByElement(getCurrentElementOID(), currentElementID.codeListItem);
    if (aliases.length > 0) $$("#alias-inputs .alias-input").removeElements();

    for (const alias of aliases) {
        const input = htmlElements.getAliasInputElement(alias.getAttribute("Context"), alias.getName());
        input.querySelector(".alias-context").oninput = () => $("#save-button").highlight();
        input.querySelector(".alias-name").oninput = () => $("#save-button").highlight();
        $("#alias-inputs").appendChild(input);
    }
}

window.addEmptyRangeCheckInput = function(disabled) {
    const input = htmlElements.getRangeCheckInputElement(null, null);
    input.querySelector(".range-check-comparator-inner").oninput = () => $("#save-button").highlight();
    input.querySelector(".range-check-value").oninput = () => $("#save-button").highlight();

    if (disabled) {
        input.querySelector(".range-check-comparator-inner").disabled = true;
        input.querySelector(".range-check-value").disabled = true;
    }

    $("#range-check-inputs").appendChild(input);
    if (!disabled && !ioHelper.isMobile()) input.scrollIntoView();
}

window.addEmptyAliasInput = function(disabled) {
    const input = htmlElements.getAliasInputElement(null, null);
    input.querySelector(".alias-context").oninput = () => $("#save-button").highlight();
    input.querySelector(".alias-name").oninput = () => $("#save-button").highlight();

    if (disabled) {
        input.querySelector(".alias-context").disabled = true;
        input.querySelector(".alias-name").disabled = true;
    }

    $("#alias-inputs").appendChild(input);
    if (!disabled && !ioHelper.isMobile()) input.scrollIntoView();
}

window.saveElement = async function() {
    if (getCurrentDetailsView() == detailsPanelViews.FOUNDATIONAL) saveDetailsFoundational();
    else if (getCurrentDetailsView() == detailsPanelViews.EXTENDED) saveDetailsExtended();

    if (!languageHelper.getPresentLanguages().includes(locale)) {
        languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
        languageHelper.createLanguageSelect(true);
    }
}

async function saveDetailsFoundational() {
    const newOID = $("#oid-input").value;
    const newTranslatedText = $("#translation-textarea").value;

    // Update the OID for all elements but CodeListItems
    if (getCurrentElementOID() != newOID && getCurrentElementType() != metadataHelper.elementTypes.CODELISTITEM) {
        const getSubjectsHavingDataForElement = await clinicaldataHelper.getSubjectsHavingDataForElement(getCurrentElementOID());
        if (getSubjectsHavingDataForElement.length == 0) {
            await metadataHelper.setElementOID(getCurrentElementOID(), getCurrentElementType(), newOID)
                .then(() => {
                    setCurrentElementOID(newOID);
                    metadataHelper.setElementName(getCurrentElementOID(), newOID);
                })
                .catch(() => ioHelper.showMessage(languageHelper.getTranslation("id-not-changed"), languageHelper.getTranslation("id-not-changed-error-used")))
        } else {
            ioHelper.showMessage(languageHelper.getTranslation("id-not-changed"), languageHelper.getTranslation("id-not-changed-error-data"));
        }
    }

    // Update further details
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            showFirstEventEditedHelp();
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.setElementDescription(getCurrentElementOID(), newTranslatedText, locale);
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.setItemQuestion(getCurrentElementOID(), newTranslatedText, locale);
            metadataHelper.setElementMandatory(getCurrentElementOID(), getCurrentElementType(), $("#mandatory-select-inner").value, getCurrentElementParentOID());
            handleItemDataType(getCurrentElementOID(), $("#datatype-select-inner").value);
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            metadataHelper.setCodeListItemDecodedText(currentElementID.codeList, currentElementID.codeListItem, newTranslatedText, locale);
            // TODO: Should check if there is data assigned to it and if the codedvalue is occupied
            metadataHelper.setCodeListItemCodedValue(currentElementID.codeList, currentElementID.codeListItem, newOID);
            currentElementID.codeListItem = newOID;
    }

    reloadAndStoreMetadata();
}

function saveDetailsExtended() {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.ITEMGROUP:
            if (saveConditionPreCheck()) return;
            break;
        case metadataHelper.elementTypes.ITEM:
            if (saveConditionPreCheck()) return;
            if (saveMeasurementUnitPreCheck()) return;
            saveRangeChecks();
    }
    
    saveAliases();
    reloadAndStoreMetadata();
}

function saveConditionPreCheck() {
    const formalExpression = $("#collection-condition").value.escapeXML();
    const currentCondition = metadataHelper.getElementCondition(getCurrentElementType(), getCurrentElementOID(), getCurrentElementParentOID());
    if (formalExpression && currentCondition && formalExpression == currentCondition.getFormalExpression()) return;

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

function saveMeasurementUnitPreCheck() {
    const symbol = $("#measurement-unit").value.escapeXML();
    const currentMeasurementUnit = metadataHelper.getItemMeasurementUnit(getCurrentElementOID());
    if (symbol && currentMeasurementUnit && symbol == currentMeasurementUnit.getTranslatedSymbol(locale)) return;

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
    const identicalMeasurementUnit = metadataHelper.getMeasurementUnits().find(measurementUnit => measurementUnit.getTranslatedSymbol(locale) == symbol);

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
    metadataHelper.deleteRangeChecksOfItem(currentElementID.item);
    for (let rangeCheckInput of $$(".range-check-input")) {
        let comparator = rangeCheckInput.querySelector(".range-check-comparator-inner").value;
        let checkValue = rangeCheckInput.querySelector(".range-check-value").value.replace(",", ".");
        if (comparator && checkValue == parseFloat(checkValue)) {
            metadataHelper.setItemRangeCheck(currentElementID.item, comparator, checkValue);
        }
    }
}

function saveAliases() {
    metadataHelper.deleteAliasesOfElement(getCurrentElementOID(), currentElementID.codeListItem);
    for (let aliasInput of $$(".alias-input")) {
        let context = aliasInput.querySelector(".alias-context").value;
        let name = aliasInput.querySelector(".alias-name").value;
        if (context && name) {
            metadataHelper.setElementAlias(getCurrentElementOID(), currentElementID.codeListItem, context, name);
        }
    }
}

window.sidebarOptionClicked = function(event) {
    // Save the element if it has been updated and another sidebar option is selected
    if ($("#save-button").isHighlighted() && event.target.id != $(".sidebar-option.is-active").id) saveElement();

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
    $("#clinicaldata-toggle-button").onclick = () => hide();
    let inputElements = $$("#details-panel input, #details-panel textarea, #details-panel select");
    for (const inputElement of inputElements) {
        inputElement.oninput = () => $("#save-button").highlight();
        inputElement.onkeydown = keyEvent => {
            if (keyEvent.code == "Escape") {
                keyEvent.preventDefault();
                document.activeElement.blur();
            } else if (keyEvent.code == "Enter" && !keyEvent.shiftKey) {
                if ($(".autocomplete-list")) return;
                keyEvent.preventDefault();
                document.activeElement.blur();
                saveElement();
            }
        };
    }

    autocompleteHelper.enableAutocomplete($("#collection-condition"), autocompleteHelper.modes.CONDITION);
    autocompleteHelper.enableAutocomplete($("#measurement-unit"), autocompleteHelper.modes.MEASUREMENTUNIT);
}

function scrollParentToChild(child) {
    let parent = child.parentNode;
    let parentRect = parent.getBoundingClientRect();
    let childRect = child.getBoundingClientRect();
    let isVisibleTop = (childRect.top >= parentRect.top);
    let isVisibleBottom = (childRect.bottom <= parentRect.bottom);

    if (!isVisibleTop) {
        parent.scrollTop = (childRect.top + parent.scrollTop) - parentRect.top;
    } else if (!isVisibleBottom) {
        parent.scrollTop = (childRect.bottom + parent.scrollTop) - parentRect.bottom;
    }
}

window.addStudyEvent = function(event) {
    currentElementID.studyEvent = metadataHelper.createStudyEvent();
    loadStudyEvents();
    loadFormsByStudyEvent(true);
    reloadDetailsPanel();
    scrollParentToChild($(`[OID="${currentElementID.studyEvent}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();

    // Show the first study event help message
    if (metadataHelper.getStudyEvents().length == 1) {
        setTimeout(() => ioHelper.showMessage(languageHelper.getTranslation("first-event-title"), languageHelper.getTranslation("first-event-text")), 1000);
    }
}

window.addForm = function(event) {
    currentElementID.form = metadataHelper.createForm(currentElementID.studyEvent);
    loadFormsByStudyEvent();
    loadItemGroupsByForm(true);
    reloadDetailsPanel();
    scrollParentToChild($(`[OID="${currentElementID.form}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItemGroup = function(event) {
    currentElementID.itemGroup = metadataHelper.createItemGroup(currentElementID.form);
    loadItemGroupsByForm();
    loadItemsByItemGroup(true);
    reloadDetailsPanel();
    scrollParentToChild($(`[OID="${currentElementID.itemGroup}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItem = function(event) {
    currentElementID.item = metadataHelper.createItem(currentElementID.itemGroup);
    loadItemsByItemGroup();
    loadCodeListItemsByItem(true);
    reloadDetailsPanel();
    scrollParentToChild($(`[OID="${currentElementID.item}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addCodeListItem = function(event) {
    let codeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    if (codeListOID) {
        currentElementID.codeListItem = metadataHelper.addCodeListItem(codeListOID);
        currentElementID.codeList = codeListOID;
        loadCodeListItemsByItem();
        reloadDetailsPanel();
        scrollParentToChild($(`[coded-value="${currentElementID.codeListItem}"]`));
    }
    metadataHelper.storeMetadata();
    event.target.blur();
}

function removeElement() {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            metadataHelper.removeStudyEventRef(currentElementID.studyEvent);
            currentElementID.studyEvent = null;
            hideForms(true);
            break;
        case metadataHelper.elementTypes.FORM:
            metadataHelper.removeFormRef(currentElementID.studyEvent, currentElementID.form);
            currentElementID.form = null;
            hideItemGroups(true);
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.removeItemGroupRef(currentElementID.form, currentElementID.itemGroup);
            currentElementID.itemGroup = null;
            hideItems(true);
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.removeItemRef(currentElementID.itemGroup, currentElementID.item);
            currentElementID.item = null;
            hideCodeListItems(true);
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            metadataHelper.deleteCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            currentElementID.codeList = null;
            currentElementID.codeListItem = null;
    }

    reloadAndStoreMetadata();
}

window.duplicateReference = function() {
    if (getCurrentElementType() == metadataHelper.elementTypes.CODELISTITEM) return;

    const elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), getCurrentElementType(), getCurrentElementParentOID());
    elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);

    reloadTree();
    reloadDetailsPanel();
}

window.copyElement = function(deepCopy) {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            metadataHelper.copyStudyEvent(currentElementID.studyEvent, deepCopy);
            break;
        case metadataHelper.elementTypes.FORM:
            metadataHelper.copyForm(currentElementID.form, deepCopy, currentElementID.studyEvent);
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.copyItemGroup(currentElementID.itemGroup, deepCopy, currentElementID.form);
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.copyItem(currentElementID.item, deepCopy, currentElementID.itemGroup);
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            const newItemOID = metadataHelper.createItem(currentElementID.itemGroup);
            const newCodeListOID = metadataHelper.copyCodeList(currentElementID.codeList);
            metadataHelper.setItemDataType(newItemOID, metadataHelper.getElementDefByOID(currentElementID.item).getDataType());
            metadataHelper.addCodeListRef(newItemOID, newCodeListOID);
    }

    reloadTree();
    reloadDetailsPanel();
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
    // TODO: Good to return the codeList for the codeListItem?
    if (currentElementID.codeListItem) return currentElementID.codeList;
    else if (currentElementID.item) return currentElementID.item;
    else if (currentElementID.itemGroup) return currentElementID.itemGroup;
    else if (currentElementID.form) return currentElementID.form;
    else if (currentElementID.studyEvent) return currentElementID.studyEvent;
}

function getCurrentElementType() {
    if (currentElementID.codeListItem) return metadataHelper.elementTypes.CODELISTITEM;
    else if (currentElementID.item) return metadataHelper.elementTypes.ITEM;
    else if (currentElementID.itemGroup) return metadataHelper.elementTypes.ITEMGROUP;
    else if (currentElementID.form) return metadataHelper.elementTypes.FORM;
    else if (currentElementID.studyEvent) return metadataHelper.elementTypes.STUDYEVENT;
}

function getCurrentElementParentOID() {
    return getParentOID(getCurrentElementType());
}

function getParentOID(elementType) {
    switch (elementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            return null;
        case metadataHelper.elementTypes.FORM:
            return currentElementID.studyEvent;
        case metadataHelper.elementTypes.ITEMGROUP:
            return currentElementID.form;
        case metadataHelper.elementTypes.ITEM:
            return currentElementID.itemGroup;
        case metadataHelper.elementTypes.CODELISTITEM:
            return currentElementID.item;
    }
}

function setCurrentElementOID(elementOID) {
    switch (getCurrentElementType()) {
        case metadataHelper.elementTypes.STUDYEVENT:
            currentElementID.studyEvent = elementOID;
            break;
        case metadataHelper.elementTypes.FORM:
            currentElementID.form = elementOID;
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            currentElementID.itemGroup = elementOID;
            break;
        case metadataHelper.elementTypes.ITEM:
            currentElementID.item = elementOID;
    }
}

window.elementDrop = async function(event) {
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
        const subjectsHavingDataForElement = await clinicaldataHelper.getSubjectsHavingDataForElement(sourceElementOID);
        if (subjectsHavingDataForElement.length > 0) {
            ioHelper.showMessage(languageHelper.getTranslation("element-not-moved"), languageHelper.getTranslation("element-not-moved-error"));
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

        if (event.offsetY/event.target.offsetHeight >= 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef.nextSibling);
        } else if (event.offsetY/event.target.offsetHeight < 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef);
        }
    } else {
        // Allows the movement of an element into an empty parent element by dropping it on the column title
        switch (elementTypeOnDrag) {
            case metadataHelper.elementTypes.STUDYEVENT:
                metadataHelper.insertStudyEventRef(sourceElementRef);
                break;
            case metadataHelper.elementTypes.FORM:
                metadataHelper.insertFormRef(sourceElementRef, targetParentOID);
                break;
            case metadataHelper.elementTypes.ITEMGROUP:
                metadataHelper.insertItemGroupRef(sourceElementRef, targetParentOID);
                break;
            case metadataHelper.elementTypes.ITEM:
                metadataHelper.insertItemRef(sourceElementRef, targetParentOID);
                break;
            case metadataHelper.elementTypes.CODELISTITEM:
                metadataHelper.insertCodeListItem(sourceElementRef, metadataHelper.getCodeListOIDByItem(targetParentOID));
        }
    }

    elementTypeOnDrag = null;
    reloadAndStoreMetadata();
}

window.showRemoveModal = async function() {
    const currentElementOID = getCurrentElementType() == metadataHelper.elementTypes.CODELISTITEM ? currentElementID.item : getCurrentElementOID();
    const subjectKeys = await clinicaldataHelper.getSubjectsHavingDataForElement(currentElementOID);
    
    if (subjectKeys.length > 0) {
        ioHelper.showMessage(languageHelper.getTranslation("cannot-be-removed"), languageHelper.getTranslation("cannot-be-removed-text") + subjectKeys.join(", ") + "</strong>");
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("element-remove-hint"),
            {
                [languageHelper.getTranslation("remove")]: () => removeElement()
            },
            ioHelper.callbackTypes.DANGER
        );
    }
}

// TODO: Reorder other modal functions in this order (show -> save -> hide)
window.showCodeListModal = function() {
    if (!metadataHelper.itemHasCodeList(currentElementID.item)) {
        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("no-codelist-hint"));
        return;
    }

    // Add the item question and use the name as fallback
    const itemDef = metadataHelper.getElementDefByOID(currentElementID.item);
    $("#codelist-modal h2").textContent = itemDef.getTranslatedQuestion(locale, true);

    // Render the notification when the codelist is used for more than one item
    const codeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    const codeListReferences = metadataHelper.getElementRefs(codeListOID, metadataHelper.elementTypes.CODELISTITEM);
    if (codeListReferences.length > 1) {
        const translatedQuestions = codeListReferences.map(reference => reference.parentNode.getTranslatedQuestion(locale, true));
        $("#codelist-modal #codelist-references-list").innerHTML = translatedQuestions.join("<br>");
        $("#codelist-modal .notification").show();
        $("#codelist-modal #codelist-reference-field").hide();
    } else {
        $("#codelist-modal .notification").hide();
        $("#codelist-modal #codelist-reference-field").show();
        autocompleteHelper.enableAutocomplete($("#codelist-modal #codelist-reference-input"), autocompleteHelper.modes.ITEMWITHCODELIST);
    }

    // Generate the string containing all coded values and translated decodes
    const codeListItemsString = metadataHelper.getCodeListItemsByItem(currentElementID.item).reduce((string, item) => {
        return string += `${item.getCodedValue()}, ${item.getTranslatedDecode(locale) || ""}\n`;
    }, "");

    $("#codelist-modal #textitems-textarea").value = codeListItemsString;
    $("#codelist-modal #codelist-reference-input").value = null;
    $("#codelist-modal").activate();
}

window.saveCodeListModal = function() {
    // Create a temporary element and move all code list items to that element
    const codeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    const currentItems = document.createElement("current-items");
    metadataHelper.getCodeListItemsByItem(currentElementID.item).forEach(item => currentItems.appendChild(item));

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

        metadataHelper.setCodeListItemDecodedText(codeListOID, codedValue, translatedDecode, locale);
    }

    hideCodeListModal();
    reloadAndStoreMetadata();
}

window.hideCodeListModal = function() {
    autocompleteHelper.disableAutocomplete($("#codelist-modal #codelist-reference-input"));
    $("#codelist-modal").deactivate();
}

window.referenceCodeList = function() {
    const externalItemOID = $("#codelist-modal #codelist-reference-input").value;
    if (!externalItemOID) return;

    if (externalItemOID == currentElementID.item) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("same-item-referenced-error"));
        return;
    }

    const externalCodeListOID = metadataHelper.getCodeListOIDByItem(externalItemOID);
    if (!externalCodeListOID) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("codelist-not-found-error"));
        return;
    };

    const currentCodeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    metadataHelper.removeCodeListRef(currentElementID.item, currentCodeListOID);
    metadataHelper.addCodeListRef(currentElementID.item, externalCodeListOID);
    if (getCurrentElementType() == metadataHelper.elementTypes.CODELISTITEM) currentElementID.codeList = externalCodeListOID;

    hideCodeListModal();
    reloadAndStoreMetadata();
}

window.unreferenceCodeList = function() {
    const currentCodeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    const newCodeListOID = metadataHelper.copyCodeList(currentCodeListOID);
    metadataHelper.removeCodeListRef(currentElementID.item, currentCodeListOID);
    metadataHelper.addCodeListRef(currentElementID.item, newCodeListOID);
    if (getCurrentElementType() == metadataHelper.elementTypes.CODELISTITEM) currentElementID.codeList = newCodeListOID;

    showCodeListModal();
    reloadAndStoreMetadata();
}

function reloadAndStoreMetadata() {
    $("#save-button").unhighlight();
    reloadTree();
    reloadDetailsPanel();
    metadataHelper.storeMetadata();
}

function getCurrentDetailsView() {
    if ($("#foundational-option").isActive()) return detailsPanelViews.FOUNDATIONAL;
    else if ($("#extended-option").isActive()) return detailsPanelViews.EXTENDED;
    else if ($("#duplicate-option").isActive()) return detailsPanelViews.DUPLICATE;
}

function showFirstEventEditedHelp() {
    const element = metadataHelper.getElementDefByOID(getCurrentElementOID());
    if (!element.getTranslatedDescription(locale) && $("#translation-textarea").value && metadataHelper.getStudyEvents().length == 1) {
        // Show the first event edited help message
        setTimeout(() => ioHelper.showMessage(languageHelper.getTranslation("first-event-edited-title"), languageHelper.getTranslation("first-event-edited-text")), 1000);
    }
}
