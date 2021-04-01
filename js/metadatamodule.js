import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as htmlElements from "./helper/htmlelements.js";

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
let currentElementType = null;
let elementTypeOnDrag = null;
let locale = null;

export function init() {
    metadataHelper.init();
    
    currentElementID.studyEvent = null;
    currentElementType = null;

    createDatatypeMandatorySelect();
    resetDetailsPanel();
    setIOListeners();
}

export function show() {
    reloadTree();
    reloadDetailsPanel();
    setArrowKeyListener();

    $("#metadata-section").classList.remove("is-hidden");
    $("#metadata-toggle-button").classList.add("is-hidden");

    languageHelper.createLanguageSelect(true);
    ioHelper.setTreeMaxHeight();
}

export function hide() {
    removeArrowKeyListener();

    $("#metadata-section").classList.add("is-hidden");
    $("#metadata-toggle-button").classList.remove("is-hidden");

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

function createConditionSelect() {
    ioHelper.removeElements($$("#condition-select-outer"));

    let conditions = [""];
    let selectedCondition = "";

    if (currentElementType == metadataHelper.elementTypes.ITEM) {
        for (let condition of metadataHelper.getConditions()) {
            conditions.push(condition.getAttribute("Name"));
        }
    
        let itemCondition = metadataHelper.getConditionByItem(currentElementID.item, currentElementID.itemGroup);   
        if (itemCondition) selectedCondition = itemCondition.getAttribute("Name");
    }

    let select = htmlElements.getSelect("condition-select", true, true, conditions, selectedCondition);
    $("#condition-label").insertAdjacentElement("afterend", select);

    if (currentElementType != metadataHelper.elementTypes.ITEM) {
        $("#condition-select-inner").disabled = true;
    }
}

function createMeasurementUnitSelect() {
    ioHelper.removeElements($$("#measurement-unit-select-outer"));

    let measurementUnits = [""];
    let selectedMeasurementUnit = "";

    if (currentElementType == metadataHelper.elementTypes.ITEM) {
        for (let measurementUnit of metadataHelper.getMeasurementUnits()) {
            measurementUnits.push(measurementUnit.getAttribute("Name"));
        }
    
        let itemMeasurementUnit = metadataHelper.getMeasurementUnitByItem(currentElementID.item);   
        if (itemMeasurementUnit) selectedMeasurementUnit = itemMeasurementUnit.getAttribute("Name");
    }

    let select = htmlElements.getSelect("measurement-unit-select", true, true, measurementUnits, selectedMeasurementUnit);
    $("#measurement-unit-label").insertAdjacentElement("afterend", select);

    if (currentElementType != metadataHelper.elementTypes.ITEM) {
        $("#measurement-unit-select-inner").disabled = true;
    }
}

function hideStudyEvents(hideTree) {
    ioHelper.removeElements($$("#study-event-panel-blocks a"));
    if (hideTree) {
        currentElementID.studyEvent = null;
        hideForms(true);
    }
}

function hideForms(hideTree) {
    ioHelper.removeElements($$("#form-panel-blocks a"));
    $("#forms-add-button button").disabled = true;
    if (hideTree) {
        currentElementID.form = null;
        hideItemGroups(true);
    }
}

function hideItemGroups(hideTree) {
    ioHelper.removeElements($$("#item-group-panel-blocks a"));
    $("#item-groups-add-button button").disabled = true;
    if (hideTree) {
        currentElementID.itemGroup = null;
        hideItems(true);
    }
}

function hideItems(hideTree) {
    ioHelper.removeElements($$("#item-panel-blocks a"));
    $("#items-add-button button").disabled = true;
    if (hideTree) {
        currentElementID.item = null;
        hideCodeListItems(true);
    }
}

function hideCodeListItems(hideTree) {
    ioHelper.removeElements($$("#code-list-item-panel-blocks a"));
    $("#code-list-items-add-button button").disabled = true;
    if (hideTree) {
        currentElementID.codeList = null;
        currentElementID.codeListItem = null;
    }
}

export function loadStudyEvents(hideTree) {
    hideStudyEvents(hideTree);

    let studyEventDefs = metadataHelper.getStudyEvents();
    for (let studyEventDef of studyEventDefs) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = studyEventClicked;
        $("#study-event-panel-blocks").appendChild(panelBlock);
    }
}

function studyEventClicked(event) {
    ioHelper.removeIsActiveFromElement($("#study-event-panel-blocks a.is-active"));
    event.target.classList.add("is-active");
    
    currentElementID.studyEvent = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.studyEvent, currentElementType);

    loadFormsByStudyEvent(currentElementID.studyEvent, true);
}

function loadFormsByStudyEvent(studyEventOID, hideTree) {
    hideForms(hideTree);
    $("#forms-add-button button").disabled = false;

    let formDefs = metadataHelper.getFormsByStudyEvent(studyEventOID);
    for (let formDef of formDefs) {
        let translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(formDef.getAttribute("OID"), metadataHelper.elementTypes.FORM, translatedText, formDef.getAttribute("Name"));
        panelBlock.onclick = formClicked;
        $("#form-panel-blocks").appendChild(panelBlock);
    }
}

function formClicked(event) {
    ioHelper.removeIsActiveFromElement($("#form-panel-blocks a.is-active"));
    event.target.classList.add("is-active");

    currentElementID.form = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.form, currentElementType);

    loadItemGroupsByForm(currentElementID.form, true);
}

function loadItemGroupsByForm(formOID, hideTree) {
    hideItemGroups(hideTree);
    $("#item-groups-add-button button").disabled = false;

    let itemGroupDefs = metadataHelper.getItemGroupsByForm(formOID);
    for (let itemGroupDef of itemGroupDefs) {
        let translatedText = itemGroupDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(itemGroupDef.getAttribute("OID"), metadataHelper.elementTypes.ITEMGROUP, translatedText, itemGroupDef.getAttribute("Name"));
        panelBlock.onclick = itemGroupClicked;
        $("#item-group-panel-blocks").appendChild(panelBlock);
    }
}

function itemGroupClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-group-panel-blocks a.is-active"));
    event.target.classList.add("is-active");

    currentElementID.itemGroup = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.itemGroup, currentElementType);

    loadItemsByItemGroup(currentElementID.itemGroup, true);
}

function loadItemsByItemGroup(itemGroupOID, hideTree) {
    hideItems(hideTree);
    $("#items-add-button button").disabled = false;

    let itemDefs = metadataHelper.getItemsByItemGroup(itemGroupOID);
    for (let itemDef of itemDefs) {
        let translatedText = itemDef.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
        const dataType = itemDef.querySelector("CodeListRef") ? "codelist" : itemDef.getAttribute("DataType");
        let panelBlock = createPanelBlock(itemDef.getAttribute("OID"), metadataHelper.elementTypes.ITEM, translatedText, itemDef.getAttribute("Name"), languageHelper.getTranslation(dataType));
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }
}

function itemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-panel-blocks a.is-active"));
    event.target.classList.add("is-active");

    currentElementID.item = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.item, currentElementType);

    loadCodeListItemsByItem(currentElementID.item, true);
}

function loadCodeListItemsByItem(itemOID, hideTree) {
    hideCodeListItems(hideTree);

    if (metadataHelper.itemHasCodeList(itemOID)) $("#code-list-items-add-button button").disabled = false;

    let codeListItems = metadataHelper.getCodeListItemsByItem(itemOID);
    for (let codeListItem of codeListItems) {
        let translatedText = codeListItem.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(codeListItem.parentNode.getAttribute("OID"), metadataHelper.elementTypes.CODELISTITEM, translatedText, codeListItem.getAttribute("CodedValue"), null, codeListItem.getAttribute("CodedValue"));
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }
}

function codeListItemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#code-list-item-panel-blocks a.is-active"));
    event.target.classList.add("is-active");

    currentElementID.codeList = event.target.getAttribute("oid");
    currentElementID.codeListItem = event.target.getAttribute("coded-value");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.codeList, currentElementType);
}

function reloadStudyEvents() {
    loadStudyEvents(currentElementID.studyEvent == null);
    if (currentElementID.studyEvent) $(`[oid="${currentElementID.studyEvent}"]`).classList.add("is-active");
}

function reloadForms() {
    if (currentElementID.studyEvent) {
        loadFormsByStudyEvent(currentElementID.studyEvent, currentElementID.form == null);
        if (currentElementID.form) $(`[oid="${currentElementID.form}"]`).classList.add("is-active");
    }
}

function reloadItemGroups() {
    if (currentElementID.form) {
        loadItemGroupsByForm(currentElementID.form, currentElementID.itemGroup == null);
        if (currentElementID.itemGroup) $(`[oid="${currentElementID.itemGroup}"]`).classList.add("is-active");
    }
}

function reloadItems() {
    if (currentElementID.itemGroup) {
        loadItemsByItemGroup(currentElementID.itemGroup, currentElementID.item == null);
        if (currentElementID.item) $(`[oid="${currentElementID.item}"]`).classList.add("is-active");
    }
}

function reloadCodeListItems() {
    if (currentElementID.item) {
        loadCodeListItemsByItem(currentElementID.item, currentElementID.codeList == null);
        if (currentElementID.codeList) $(`[oid="${currentElementID.codeList}"][coded-value="${currentElementID.codeListItem}"]`).classList.add("is-active");
    }
}

export function reloadTree() {
    reloadStudyEvents();
    reloadForms();
    reloadItemGroups();
    reloadItems();
    reloadCodeListItems();
}

function fillDetailsPanel(elementOID, elementType) {
    resetDetailsPanel();
    $("#oid-input").disabled = false;
    $("#name-input").disabled = false;
    $("#question-textarea").disabled = false;
    $("#mandatory-select-inner").disabled = false;
    $("#remove-button").disabled = false;
    $("#remove-button-mobile").disabled = false;
    $("#duplicate-button").disabled = false;
    $("#duplicate-button-mobile").disabled = false;
    $("#more-button").disabled = false;
    $("#more-button-mobile").disabled = false;
    $("#oid-input").value = elementOID;

    let element = metadataHelper.getElementDefByOID(elementOID);
    let elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), currentElementType, getParentOID(currentElementType));
    $("#name-input").value = element.getAttribute("Name");

    let numberOfReferences = metadataHelper.getNumberOfRefs(elementOID, elementType);
    if (numberOfReferences > 1) {
        $("#references-tag").classList.remove("is-hidden");
        $("#number-of-references").textContent = numberOfReferences;
    }

    let translatedText = null;
    switch(elementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case metadataHelper.elementTypes.ITEM:
            $("#datatype-select-inner").disabled = false;
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-question");
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
            $("#datatype-select-inner").value = metadataHelper.itemHasCodeList(elementOID) ? "codelist (" + element.getAttribute("DataType") + ")" : element.getAttribute("DataType");
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            $("#mandatory-select-inner").disabled = true;
            $("#element-oid-label").textContent = languageHelper.getTranslation("choices-unique-id");
            $("#element-short-label").textContent = languageHelper.getTranslation("coded-value");
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-choice");
            element = metadataHelper.getCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            $("#name-input").value = element.getAttribute("CodedValue");
            translatedText = element.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
    }

    if (translatedText) $("#question-textarea").value = translatedText.textContent;
}

export function reloadDetailsPanel() {
    if (currentElementType) fillDetailsPanel(getCurrentElementOID(), currentElementType);
}

function fillAliases() {
    ioHelper.removeElements($$(".alias-input"));
    $("#alias-label").insertAdjacentElement("afterend", htmlElements.getEmptyAliasInputElement());

    let aliases = metadataHelper.getAliasesByElement(getCurrentElementOID(), currentElementID.codeListItem);
    for (let alias of aliases) {
        let newInput = htmlElements.getAliasInputElement(alias.getAttribute("Context"), alias.getAttribute("Name"));
        $(".empty-alias-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function fillRangeChecks() {
    ioHelper.removeElements($$(".range-check-input"));
    $("#range-check-label").insertAdjacentElement("afterend", htmlElements.getEmptyRangeCheckInputElement());

    let rangeChecks = metadataHelper.getRangeChecksByItem(currentElementID.item);
    for (let rangeCheck of rangeChecks) {
        let newInput = htmlElements.getRangeCheckInputElement(rangeCheck.getAttribute("Comparator"), rangeCheck.querySelector("CheckValue").textContent);
        $(".empty-range-check-field").insertAdjacentElement("beforebegin", newInput);
    }

    $("#add-range-check-button").disabled = false;
    if (currentElementType != metadataHelper.elementTypes.ITEM) {
        $(".range-check-comparator-inner").disabled = true;
        $(".range-check-value").disabled = true;
        $("#add-range-check-button").disabled = true;
    }
}

function fillElementDescription() {
    $("#element-description-textarea").value = null;
    $("#element-description-textarea").disabled = true;
    if (currentElementType == metadataHelper.elementTypes.ITEM) {
        let element = metadataHelper.getElementDefByOID(currentElementID.item);
        let translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        if (translatedText) $("#element-description-textarea").value = translatedText.textContent;
        $("#element-description-textarea").disabled = false;
    }
}

function fillConditions() {
    ioHelper.removeElements($$(".condition-input"));
    $("#conditions-label").insertAdjacentElement("afterend", htmlElements.getEmptyConditionInputElement());
    
    for (let condition of metadataHelper.getConditions()) {
        let formalExpression = condition.querySelector(`FormalExpression`).textContent;
        let newInput = htmlElements.getConditionInputElement(condition.getAttribute("OID"), condition.getAttribute("Name"), formalExpression);
        $(".empty-condition-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function fillMeasurementUnits() {
    ioHelper.removeElements($$(".measurement-unit-input"));
    $("#measurement-units-label").insertAdjacentElement("afterend", htmlElements.getEmptyMeasurementUnitInputElement());

    for (let measurementUnit of metadataHelper.getMeasurementUnits()) {
        let translatedText = measurementUnit.querySelector(`Symbol TranslatedText[*|lang="${locale}"]`);
        let symbol = null;
        if (translatedText) symbol = translatedText.textContent;
        let newInput = htmlElements.getMeasurementUnitInputElement(measurementUnit.getAttribute("OID"), measurementUnit.getAttribute("Name"), symbol);
        $(".empty-measurement-unit-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function resetDetailsPanel() {
    $("#oid-input").disabled = true;
    $("#name-input").disabled = true;
    $("#save-button").disabled = true;
    $("#save-button-mobile").disabled = true;
    $("#remove-button").disabled = true;
    $("#remove-button-mobile").disabled = true;
    $("#duplicate-button").disabled = true;
    $("#duplicate-button-mobile").disabled = true;
    $("#more-button").disabled = true;
    $("#more-button-mobile").disabled = true;
    $("#question-textarea").disabled = true;
    $("#datatype-select-inner").disabled = true;
    $("#mandatory-select-inner").disabled = true;
    $("#oid-input").value = "";
    $("#name-input").value = "";
    $("#name-input").placeholder = "";
    $("#question-textarea").value = "";
    $("#datatype-select-inner").value = "";
    $("#mandatory-select-inner").value = "";
    $("#references-tag").classList.add("is-hidden");
    $("#element-oid-label").textContent = languageHelper.getTranslation("unique-id");
    $("#element-short-label").textContent = languageHelper.getTranslation("name");
    $("#element-long-label").textContent = languageHelper.getTranslation("translated-description");
}

window.saveElement = async function() {
    const newOID = $("#oid-input").value;
    const currentElementOID = getCurrentElementOID();
    if (currentElementOID != newOID) {
        const getSubjectsHavingDataForElement = await clinicaldataHelper.getSubjectsHavingDataForElement(currentElementOID);
        if (getSubjectsHavingDataForElement.length == 0) {
            if (metadataHelper.setElementOID(currentElementOID, newOID, currentElementType)) {
                setCurrentElementOID(newOID);
            } else {
                ioHelper.showMessage(languageHelper.getTranslation("id-not-changed"), languageHelper.getTranslation("id-not-changed-error-used"));
            }
        } else {
            ioHelper.showMessage(languageHelper.getTranslation("id-not-changed"), languageHelper.getTranslation("id-not-changed-error-data"));
        }
    }

    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            showFirstEventEditedHelp();
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.setElementName(getCurrentElementOID(), $("#name-input").value);
            metadataHelper.setElementDescription(getCurrentElementOID(), $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(getCurrentElementOID(), currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadTree();
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.setElementName(getCurrentElementOID(), $("#name-input").value);
            metadataHelper.setItemQuestion(getCurrentElementOID(), $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(getCurrentElementOID(), currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            handleItemDataType(getCurrentElementOID(), $("#datatype-select-inner").value);
            reloadItems();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            metadataHelper.setCodeListItemDecodedText(currentElementID.codeList, currentElementID.codeListItem, $("#question-textarea").value, locale);
            metadataHelper.setCodeListItemCodedValue(currentElementID.codeList, currentElementID.codeListItem, $("#name-input").value);
            currentElementID.codeListItem = $("#name-input").value;
            reloadCodeListItems();
    }

    if (!languageHelper.getPresentLanguages().includes(locale)) {
        languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
        languageHelper.createLanguageSelect(true);
    }
    
    reloadDetailsPanel();
    document.activeElement.blur();
    $("#save-button").disabled = true;
    $("#save-button-mobile").disabled = true;

    metadataHelper.storeMetadata();
}

window.saveMoreModal = function() {
    if (currentElementType == metadataHelper.elementTypes.ITEM) {
        saveCondition();
        saveMeasurementUnit();
        saveRangeChecks();
        saveDescription();
    }

    saveAliases();
    saveConditions();
    saveMeasurementUnits();
    hideMoreModal();
    setArrowKeyListener();

    metadataHelper.storeMetadata();
}

function saveCondition() {
    let conditionName = $("#condition-select-inner").value;
    metadataHelper.setItemCondition(currentElementID.item, currentElementID.itemGroup, conditionName);
}

function saveMeasurementUnit() {
    let measurementUnitName = $("#measurement-unit-select-inner").value;
    metadataHelper.setItemMeasurementUnit(currentElementID.item, measurementUnitName);
}

function saveRangeChecks() {
    metadataHelper.deleteRangeChecksOfItem(currentElementID.item);
    let rangeCheckInputs = $$(".range-check-input");
    for (let rangeCheckInput of rangeCheckInputs) {
        let comparator = rangeCheckInput.querySelector(".range-check-comparator-inner").value;
        let checkValue = rangeCheckInput.querySelector(".range-check-value").value.replace(",", ".");
        if (comparator && checkValue == parseFloat(checkValue)) {
            metadataHelper.setItemRangeCheck(currentElementID.item, comparator, checkValue);
        }
    }
}

function saveAliases() {
    metadataHelper.deleteAliasesOfElement(getCurrentElementOID(), currentElementID.codeListItem);
    let aliasInputs = $$(".alias-input");
    for (let aliasInput of aliasInputs) {
        let context = aliasInput.querySelector(".alias-context").value;
        let name = aliasInput.querySelector(".alias-name").value;
        if (context && name) {
            metadataHelper.setElementAlias(getCurrentElementOID(), currentElementID.codeListItem, context, name);
        }
    }
}

function saveDescription() {
    metadataHelper.setElementDescription(getCurrentElementOID(), $("#element-description-textarea").value, locale);
}

function saveConditions() {
    let conditionInputs = $$(".condition-input");
    for (let conditionInput of conditionInputs) {
        let oid = conditionInput.getAttribute("oid");
        let name = conditionInput.querySelector(".condition-name").value;
        let formalExpression = conditionInput.querySelector(".condition-formex").value;
        if (name && formalExpression) {
            if (!oid) {
                metadataHelper.createCondition(name, formalExpression, locale);
            } else {
                metadataHelper.setElementName(oid, name);
                metadataHelper.setConditionFormalExpression(oid, formalExpression);
            }
        }
    }
    ioHelper.removeElements($$(".condition-input"));
}

function saveMeasurementUnits() {
    let measurementUnitInputs = $$(".measurement-unit-input");
    for (let measurementUnitInput of measurementUnitInputs) {
        let oid = measurementUnitInput.getAttribute("oid");
        let name = measurementUnitInput.querySelector(".measurement-unit-name").value;
        let symbol = measurementUnitInput.querySelector(".measurement-unit-symbol").value;
        if (name && symbol) {
            if (!oid) {
                metadataHelper.createMeasurementUnit(name, symbol, locale);
            } else {
                metadataHelper.setElementName(oid, name);
                metadataHelper.setMeasurementUnitSymbol(oid, symbol, locale);
            }
        }
    }
    ioHelper.removeElements($$(".measurement-unit-input"));
}

function handleItemDataType(itemOID, dataType) {
    let dataTypeIsCodelist = dataType.startsWith("codelist");
    let codeListType = dataTypeIsCodelist ? dataType.match(/\((.*)\)/)[1] : null;

    let codeListRef = metadataHelper.getElementDefByOID(itemOID).querySelector("CodeListRef");
    if (codeListRef && !dataTypeIsCodelist) {
        metadataHelper.removeCodeListRef(itemOID, codeListRef.getAttribute("CodeListOID"));
        reloadCodeListItems();
    } else if (codeListRef == null && dataTypeIsCodelist) {
        metadataHelper.createCodeList(itemOID);
        reloadCodeListItems();
    }

    if (dataTypeIsCodelist) {
        metadataHelper.setItemDataType(itemOID, codeListType);
        metadataHelper.setCodeListDataType(metadataHelper.getCodeListOIDByItem(itemOID), codeListType);
    } else {
        metadataHelper.setItemDataType(itemOID, dataType);
    }
}

function setIOListeners() {
    $("#clinicaldata-toggle-button").onclick = () => hide();
    let inputElements = $$("#details-panel input, #details-panel textarea, #details-panel select");
    for (let [index, inputElement] of inputElements.entries()) {
        inputElement.oninput = function() {
            $("#save-button").disabled = false;
            $("#save-button-mobile").disabled = false;
        };
        inputElement.onkeydown = function(keyEvent) {
            if (keyEvent.code == "Escape") {
                keyEvent.preventDefault();
                document.activeElement.blur();
            } else if (keyEvent.code == "Enter" && !keyEvent.shiftKey) {
                keyEvent.preventDefault();
                saveElement();
            }
        };
        inputElement.onfocus = removeArrowKeyListener;
        inputElement.onblur = setArrowKeyListener;
        inputElement.tabIndex = index + 1;
    }
    $("#save-button").tabIndex = 6;
    $("#remove-button").tabIndex = 7;
}

export function removeArrowKeyListener() {
    document.removeEventListener("keydown", arrowKeyListener);
}

export function setArrowKeyListener() {
    document.addEventListener("keydown", arrowKeyListener);
}

function arrowKeyListener(event) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyA", "KeyR", "Tab"].includes(event.code)) return;
    event.preventDefault();

    let target = null;
    if (event.code == "ArrowUp") {
        if (currentElementType) target = $(`[oid="${getCurrentElementOID()}"]`).previousSibling;
        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) target = $(`[coded-value="${currentElementID.codeListItem}"]`).previousSibling;
    } else if (event.code == "ArrowDown") {
        if (currentElementType) target = $(`[oid="${getCurrentElementOID()}"]`).nextSibling;
        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) target = $(`[coded-value="${currentElementID.codeListItem}"]`).nextSibling;
    } else if (event.code == "ArrowLeft") {
        if (currentElementType != metadataHelper.elementTypes.STUDYEVENT) {
            target = $(`[oid="${getParentOID(currentElementType)}"]`);
            setCurrentElementOID(null);
            currentElementType = getParentElementType(currentElementType);
        }
    } else if (event.code == "ArrowRight") {
        if (currentElementType != metadataHelper.elementTypes.CODELISTITEM && getCurrentElementFirstChild()) {
            target = getCurrentElementFirstChild();
            currentElementType = getChildElementType(currentElementType);
        }
    } else if (event.code == "KeyA") {
        addCurrentElementType();
    } else if (event.code == "KeyR") {
        showRemoveModal();
    } else if (event.code == "Tab") {
        $("#oid-input").focus();
    }

    if (!currentElementType && (event.code == "ArrowDown" || event.code == "ArrowRight")) {
        target = $(`a[element-type="studyevent"]`);
        currentElementType = metadataHelper.elementTypes.STUDYEVENT;        
    }

    if (target && target.tagName == "A") {
        setCurrentElementOID(target.getAttribute("oid"));
        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) currentElementID.codeListItem = target.getAttribute("coded-value");
        
        reloadDetailsPanel();
        reloadTree();

        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
            scrollParentToChild($(`[coded-value="${currentElementID.codeListItem}"]`));
        } else {
            scrollParentToChild($(`[oid="${getCurrentElementOID()}"]`));
        }
    }
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
    currentElementType = metadataHelper.elementTypes.STUDYEVENT;
    reloadStudyEvents();
    reloadDetailsPanel();
    loadFormsByStudyEvent(currentElementID.studyEvent, true);
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
    currentElementType = metadataHelper.elementTypes.FORM;
    reloadForms();
    reloadDetailsPanel();
    loadItemGroupsByForm(currentElementID.form, true);
    scrollParentToChild($(`[OID="${currentElementID.form}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItemGroup = function(event) {
    currentElementID.itemGroup = metadataHelper.createItemGroup(currentElementID.form);
    currentElementType = metadataHelper.elementTypes.ITEMGROUP;
    reloadItemGroups();
    reloadDetailsPanel();
    loadItemsByItemGroup(currentElementID.itemGroup, true);
    scrollParentToChild($(`[OID="${currentElementID.itemGroup}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItem = function(event) {
    currentElementID.item = metadataHelper.createItem(currentElementID.itemGroup);
    currentElementType = metadataHelper.elementTypes.ITEM;
    reloadItems();
    reloadDetailsPanel();
    loadCodeListItemsByItem(currentElementID.item, true);
    scrollParentToChild($(`[OID="${currentElementID.item}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addCodeListItem = function(event) {
    let codeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    if (codeListOID) {
        currentElementID.codeListItem = metadataHelper.addCodeListItem(codeListOID);
        currentElementID.codeList = codeListOID;
        currentElementType = metadataHelper.elementTypes.CODELISTITEM;
        reloadCodeListItems();
        reloadDetailsPanel();
        scrollParentToChild($(`[coded-value="${currentElementID.codeListItem}"]`));
    }
    metadataHelper.storeMetadata();
    event.target.blur();
}

function removeElement() {
    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            metadataHelper.removeStudyEventRef(currentElementID.studyEvent);
            currentElementID.studyEvent = null;
            break;
        case metadataHelper.elementTypes.FORM:
            metadataHelper.removeFormRef(currentElementID.studyEvent, currentElementID.form);
            currentElementID.form = null;
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            metadataHelper.removeItemGroupRef(currentElementID.form, currentElementID.itemGroup);
            currentElementID.itemGroup = null;
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.removeItemRef(currentElementID.itemGroup, currentElementID.item);
            currentElementID.item = null;
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            metadataHelper.deleteCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            currentElementID.codeList = null;
            currentElementID.codeListItem = null;
    }
    currentElementType = null;

    resetDetailsPanel();
    reloadTree();
    metadataHelper.storeMetadata();
}

function duplicateReference() {
    if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
        let newItemOID = metadataHelper.createItem(currentElementID.itemGroup);
        metadataHelper.addCodeListRef(newItemOID, currentElementID.codeList);
    } else {
        let elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), currentElementType, getParentOID(currentElementType));
        elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);
    }

    reloadTree();
    reloadDetailsPanel();
}

function copyElement(deepCopy) {
    switch (currentElementType) {
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
            let newItemOID = metadataHelper.createItem(currentElementID.itemGroup);
            let newCodeListOID = metadataHelper.copyCodeList(currentElementID.codeList);
            metadataHelper.addCodeListRef(newItemOID, newCodeListOID);
    }

    reloadTree();
    reloadDetailsPanel();
}

function dragStart(event) {
    elementTypeOnDrag = event.target.getAttribute("element-type");
    event.dataTransfer.setData("sourceElementOID", event.target.getAttribute("oid"));
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
            switch(event.target.getAttribute("element-type")) {
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

function getParentElementType(elementType) {
    switch (elementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            return null;
        case metadataHelper.elementTypes.FORM:
            return metadataHelper.elementTypes.STUDYEVENT;
        case metadataHelper.elementTypes.ITEMGROUP:
            return metadataHelper.elementTypes.FORM;
        case metadataHelper.elementTypes.ITEM:
            return metadataHelper.elementTypes.ITEMGROUP;
        case metadataHelper.elementTypes.CODELISTITEM:
            return metadataHelper.elementTypes.ITEM;
    }
}

function getChildElementType(elementType) {
    switch (elementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            return metadataHelper.elementTypes.FORM;
        case metadataHelper.elementTypes.FORM:
            return metadataHelper.elementTypes.ITEMGROUP;
        case metadataHelper.elementTypes.ITEMGROUP:
            return metadataHelper.elementTypes.ITEM;
        case metadataHelper.elementTypes.ITEM:
            return metadataHelper.elementTypes.CODELISTITEM;
    }
}

function addCurrentElementType() {
    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            addStudyEvent();
            break;
        case metadataHelper.elementTypes.FORM:
            addForm();
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            addItemGroup();
            break;
        case metadataHelper.elementTypes.ITEM:
            addItem();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            addCodeListItem();
    }
}

function getCurrentElementFirstChild() {
    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            return $(`a[element-type="form"]`);
        case metadataHelper.elementTypes.FORM:
            return $(`a[element-type="itemgroup"]`);
        case metadataHelper.elementTypes.ITEMGROUP:
            return $(`a[element-type="item"]`);
        case metadataHelper.elementTypes.ITEM:
            return $(`a[element-type="codelistitem"]`);
    }
}

function getCurrentElementOID() {
    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            return currentElementID.studyEvent;
        case metadataHelper.elementTypes.FORM:
            return currentElementID.form;
        case metadataHelper.elementTypes.ITEMGROUP:
            return currentElementID.itemGroup;
        case metadataHelper.elementTypes.ITEM:
            return currentElementID.item;
        case metadataHelper.elementTypes.CODELISTITEM:
            return currentElementID.codeList;
    }
}

function setCurrentElementOID(elementOID) {
    switch (currentElementType) {
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
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            currentElementID.codeList = elementOID;
    }
}

window.elementDrop = async function(event) {
    const sourceElementOID = event.dataTransfer.getData("sourceElementOID");
    const sourceCodedValue = event.dataTransfer.getData("sourceCodedValue");
    const sourceParentOID = event.dataTransfer.getData("sourceParentOID");
    const targetElementOID = event.target.getAttribute("oid");
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
        switch(elementTypeOnDrag) {
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
    reloadTree();
    metadataHelper.storeMetadata();
}

window.showRemoveModal = async function() {
    const currentElement = currentElementType == metadataHelper.elementTypes.CODELISTITEM ? currentElementID.item : getCurrentElementOID();
    const subjectKeys = await clinicaldataHelper.getSubjectsHavingDataForElement(currentElement);
    
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

window.showDuplicateModal = function() {
    ioHelper.showMessage(languageHelper.getTranslation("mode-of-duplication"), languageHelper.getTranslation("duplication-hint"),
        {
            [languageHelper.getTranslation("reference")]: () => duplicateReference(),
            [languageHelper.getTranslation("shallow-copy")]: () => copyElement(false),
            [languageHelper.getTranslation("deep-copy")]: () => copyElement(true)
        }
    );
}

window.showMoreModal = function() {
    removeArrowKeyListener();
    $("#more-modal").classList.add("is-active");
    createConditionSelect();
    createMeasurementUnitSelect();
    fillRangeChecks();
    fillAliases();
    fillElementDescription();
}

window.hideMoreModal = function() {
    ioHelper.removeIsActiveFromElement($("#more-tabs ul li.is-active"));
    $("#element-options-tab").classList.add("is-active");
    $("#element-options").classList.remove("is-hidden");
    $("#element-description").classList.add("is-hidden");
    $("#measurement-units").classList.add("is-hidden");
    $("#conditions").classList.add("is-hidden");
    $("#more-modal").classList.remove("is-active");
    setArrowKeyListener();
}

window.addAliasInput = function() {
    let emptyAliasFields = $$(".empty-alias-field");
    emptyAliasFields[emptyAliasFields.length-1].insertAdjacentElement("afterend", htmlElements.getEmptyAliasInputElement());
}

window.addRangeCheckInput = function() {
    let emptyRangeCheckFields = $$(".empty-range-check-field");
    emptyRangeCheckFields[emptyRangeCheckFields.length-1].insertAdjacentElement("afterend", htmlElements.getEmptyRangeCheckInputElement());
}

window.addMeasurementUnitInput = function() {
    let emptyMeasurementUnitFields = $$(".empty-measurement-unit-field");
    emptyMeasurementUnitFields[emptyMeasurementUnitFields.length-1].insertAdjacentElement("afterend", htmlElements.getEmptyMeasurementUnitInputElement());    
}

window.addConditionInput = function() {
    let emptyConditionFields = $$(".empty-condition-field");
    emptyConditionFields[emptyConditionFields.length-1].insertAdjacentElement("afterend", htmlElements.getEmptyConditionInputElement());    
}

window.moreTabClicked = function(event) {
    ioHelper.removeIsActiveFromElement($("#more-tabs ul li.is-active"));
    event.target.parentNode.classList.add("is-active");

    switch(event.target.parentNode.id) {
        case "element-options-tab":
            saveConditions();
            saveMeasurementUnits();
            createConditionSelect();
            createMeasurementUnitSelect();
            $("#element-options").classList.remove("is-hidden");
            $("#element-description").classList.add("is-hidden");
            $("#measurement-units").classList.add("is-hidden");
            $("#conditions").classList.add("is-hidden");
            break;
        case "element-description-tab":
            $("#element-options").classList.add("is-hidden");
            $("#element-description").classList.remove("is-hidden");
            $("#measurement-units").classList.add("is-hidden");
            $("#conditions").classList.add("is-hidden");
            break;
        case "conditions-tab":
            saveCondition();
            fillConditions();
            $("#element-options").classList.add("is-hidden");
            $("#element-description").classList.add("is-hidden");
            $("#measurement-units").classList.add("is-hidden");
            $("#conditions").classList.remove("is-hidden");
            break;
        case "measurement-units-tab":
            saveMeasurementUnit();
            fillMeasurementUnits();
            $("#element-options").classList.add("is-hidden");
            $("#element-description").classList.add("is-hidden");
            $("#measurement-units").classList.remove("is-hidden");
            $("#conditions").classList.add("is-hidden");
    }
}

function showFirstEventEditedHelp() {
    const element = metadataHelper.getElementDefByOID(getCurrentElementOID());
    const translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (!translatedText && $("#question-textarea").value && metadataHelper.getStudyEvents().length == 1) {
        // Show the first event edited help message
        setTimeout(() => ioHelper.showMessage(languageHelper.getTranslation("first-event-edited-title"), languageHelper.getTranslation("first-event-edited-text")), 1000);
    }
}
