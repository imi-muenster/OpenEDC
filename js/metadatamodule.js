import * as metadataHelper from "./helper/metadatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as conditionHelper from "./helper/conditionhelper.js";
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
    currentElementID.studyEvent = null;
    currentElementType = null;

    createDatatypeMandatorySelect();
    resetDetailsPanel();
    setIOListeners();
    setArrowKeyListener();
}

export function show() {
    $("#metadata-section").classList.remove("is-hidden");
    $("#metadata-toggle-button").classList.add("is-hidden");
}

export function hide() {
    $("#metadata-section").classList.add("is-hidden");
    $("#metadata-toggle-button").classList.remove("is-hidden");
}

export function setLanguage(newLocale) {
    locale = newLocale;
}

function safeRemoveElement(element) {
    if (element != null) {
        element.remove();
    }
}

function createPanelBlock(elementOID, elementType, displayText, fallbackText, codedValue) {
    let panelBlock = htmlElements.getPanelBlock(true, elementOID, elementType, displayText, fallbackText, codedValue);

    panelBlock.ondragstart = dragStart;
    panelBlock.ondragend = dragEnd;
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
        if (itemCondition != null) {
            selectedCondition = itemCondition.getAttribute("Name");
        }
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
        if (itemMeasurementUnit != null) {
            selectedMeasurementUnit = itemMeasurementUnit.getAttribute("Name");
        }
    }

    let select = htmlElements.getSelect("measurement-unit-select", true, true, measurementUnits, selectedMeasurementUnit);
    $("#measurement-unit-label").insertAdjacentElement("afterend", select);

    if (currentElementType != metadataHelper.elementTypes.ITEM) {
        $("#measurement-unit-select-inner").disabled = true;
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

export function loadStudyEvents() {
    let studyEventDefs = metadataHelper.getStudyEvents();
    ioHelper.removeElements($$("#study-event-panel-blocks a"));
    for (let studyEventDef of studyEventDefs) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(studyEventDef.getAttribute("OID"), metadataHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = studyEventClicked;
        $("#study-event-panel-blocks").appendChild(panelBlock);
    }
}

function studyEventClicked(event) {
    ioHelper.removeIsActiveFromElements($$("#study-event-panel-blocks a"));
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
    ioHelper.removeIsActiveFromElements($$("#form-panel-blocks a"));
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
    ioHelper.removeIsActiveFromElements($$("#item-group-panel-blocks a"));
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
        let panelBlock = createPanelBlock(itemDef.getAttribute("OID"), metadataHelper.elementTypes.ITEM, translatedText, itemDef.getAttribute("Name"));
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }
}

function itemClicked(event) {
    ioHelper.removeIsActiveFromElements($$("#item-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.item = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.item, currentElementType);

    loadCodeListItemsByItem(currentElementID.item, true);
}

function loadCodeListItemsByItem(itemOID, hideTree) {
    hideCodeListItems(hideTree);

    if (metadataHelper.itemHasCodeList(itemOID)) {
        $("#code-list-items-add-button button").disabled = false;
    }

    let codeListItems = metadataHelper.getCodeListItemsByItem(itemOID);
    for (let codeListItem of codeListItems) {
        let translatedText = codeListItem.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(codeListItem.parentNode.getAttribute("OID"), metadataHelper.elementTypes.CODELISTITEM, translatedText, codeListItem.getAttribute("CodedValue"), codeListItem.getAttribute("CodedValue"));
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }
}

function codeListItemClicked(event) {
    ioHelper.removeIsActiveFromElements($$("#code-list-item-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.codeList = event.target.getAttribute("oid");
    currentElementID.codeListItem = event.target.getAttribute("coded-value");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.codeList, currentElementType);
}

function reloadStudyEvents() {
    loadStudyEvents();
    if (currentElementID.studyEvent != null) {
        $(`[oid="${currentElementID.studyEvent}"]`).classList.add("is-active");
    }
}

function reloadForms() {
    if (currentElementID.studyEvent != null) {
        loadFormsByStudyEvent(currentElementID.studyEvent, currentElementID.form === null);
        if (currentElementID.form != null) {
            $(`[oid="${currentElementID.form}"]`).classList.add("is-active");
        }
    }
}

function reloadItemGroups() {
    if (currentElementID.form != null) {
        loadItemGroupsByForm(currentElementID.form, currentElementID.itemGroup === null);
        if (currentElementID.itemGroup != null) {
            $(`[oid="${currentElementID.itemGroup}"]`).classList.add("is-active");
        }
    }
}

function reloadItems() {
    if (currentElementID.itemGroup != null) {
        loadItemsByItemGroup(currentElementID.itemGroup, currentElementID.item === null);
        if (currentElementID.item != null) {
            $(`[oid="${currentElementID.item}"]`).classList.add("is-active");
        }
    }
}

function reloadCodeListItems() {
    if (currentElementID.item) {
        loadCodeListItemsByItem(currentElementID.item, currentElementID.codeList === null);
        if (currentElementID.codeList != null) {
            $(`[oid="${currentElementID.codeList}"][coded-value="${currentElementID.codeListItem}"]`).classList.add("is-active");
        }
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
    $("#delete-button").disabled = false;
    $("#delete-button-mobile").disabled = false;
    $("#preview-button").disabled = false;
    $("#duplicate-button").disabled = false;
    $("#duplicate-button-mobile").disabled = false;
    $("#more-button").disabled = false;
    $("#more-button-mobile").disabled = false;

    $("#oid-input").value = elementOID;
    $("#question-textarea").placeholder = "Display property";

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
            $("#preview-button").disabled = true;
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case metadataHelper.elementTypes.FORM:
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case metadataHelper.elementTypes.ITEM:
            $("#datatype-select-inner").disabled = false;
            $("#element-long-label").textContent = "Question";
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
            $("#datatype-select-inner").value = metadataHelper.itemHasCodeList(elementOID) ? "codelist (" + element.getAttribute("DataType") + ")" : element.getAttribute("DataType");
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            $("#mandatory-select-inner").disabled = true;
            $("#element-oid-label").textContent = "CodeList OID";
            $("#element-short-label").textContent = "CodedValue";
            $("#element-long-label").textContent = "Decode";
            element = metadataHelper.getCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            $("#name-input").value = element.getAttribute("CodedValue");
            translatedText = element.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
    }
    if (translatedText != null) {
        $("#question-textarea").value = translatedText.textContent;
    }
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
    $("#element-description-textarea").disabled = false;
    if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
        $("#element-description-textarea").disabled = true;
    } else if (currentElementType == metadataHelper.elementTypes.ITEM) {
        let element = metadataHelper.getElementDefByOID(currentElementID.item);
        let translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        if (translatedText != null) {
            $("#element-description-textarea").value = translatedText.textContent;
        }
    } else {
        $("#element-description-textarea").value = $("#question-textarea").value;
    }
}

function fillConditions() {
    ioHelper.removeElements($$(".condition-input"));
    $("#conditions-label").insertAdjacentElement("afterend", htmlElements.getEmptyConditionInputElement());
    
    let conditions = metadataHelper.getConditions();
    for (let condition of conditions) {
        let formalExpression = condition.querySelector(`FormalExpression`).textContent;
        let newInput = htmlElements.getConditionInputElement(condition.getAttribute("OID"), condition.getAttribute("Name"), formalExpression);
        $(".empty-condition-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function fillMeasurementUnits() {
    ioHelper.removeElements($$(".measurement-unit-input"));
    $("#measurement-units-label").insertAdjacentElement("afterend", htmlElements.getEmptyMeasurementUnitInputElement());

    let measurementUnits = metadataHelper.getMeasurementUnits();
    for (let measurementUnit of measurementUnits) {
        let translatedText = measurementUnit.querySelector(`Symbol TranslatedText[*|lang="${locale}"]`);
        let symbol = null;
        if (translatedText != null) {
            symbol = translatedText.textContent;
        }
        let newInput = htmlElements.getMeasurementUnitInputElement(measurementUnit.getAttribute("OID"), measurementUnit.getAttribute("Name"), symbol);
        $(".empty-measurement-unit-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function resetDetailsPanel() {
    $("#oid-input").disabled = true;
    $("#name-input").disabled = true;
    $("#save-button").disabled = true;
    $("#save-button-mobile").disabled = true;
    $("#delete-button").disabled = true;
    $("#delete-button-mobile").disabled = true;
    $("#preview-button").disabled = true;
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
    $("#question-textarea").placeholder = "";
    $("#datatype-select-inner").value = "";
    $("#mandatory-select-inner").value = "";
    $("#references-tag").classList.add("is-hidden");
    $("#element-oid-label").textContent = "OID";
    $("#element-short-label").textContent = "Name";
    $("#element-long-label").textContent = "Description";
}

window.saveElement = function() {
    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
            if (metadataHelper.setElementOID(currentElementID.studyEvent, $("#oid-input").value, currentElementType)) {
                currentElementID.studyEvent = $("#oid-input").value;
            } else {
                ioHelper.showWarning("OID not changed", "The entered OID is already in use.");
            }
            metadataHelper.setElementName(currentElementID.studyEvent, $("#name-input").value);
            metadataHelper.setElementDescription(currentElementID.studyEvent, $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(currentElementID.studyEvent, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadStudyEvents();
            break;
        case metadataHelper.elementTypes.FORM:
            if (metadataHelper.setElementOID(currentElementID.form, $("#oid-input").value, currentElementType)) {
                currentElementID.form = $("#oid-input").value;
            } else {
                ioHelper.showWarning("OID not changed", "The entered OID is already in use.");
            }
            metadataHelper.setElementName(currentElementID.form, $("#name-input").value);
            metadataHelper.setElementDescription(currentElementID.form, $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(currentElementID.form, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadForms();
            break;
        case metadataHelper.elementTypes.ITEMGROUP:
            if (metadataHelper.setElementOID(currentElementID.itemGroup, $("#oid-input").value, currentElementType)) {
                currentElementID.itemGroup = $("#oid-input").value;
            } else {
                ioHelper.showWarning("OID not changed", "The entered OID is already in use.");
            }
            metadataHelper.setElementName(currentElementID.itemGroup, $("#name-input").value);
            metadataHelper.setElementDescription(currentElementID.itemGroup, $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(currentElementID.itemGroup, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadItemGroups();
            break;
        case metadataHelper.elementTypes.ITEM:
            if (metadataHelper.setElementOID(currentElementID.item, $("#oid-input").value, currentElementType)) {
                currentElementID.item = $("#oid-input").value;
            } else {
                ioHelper.showWarning("OID not changed", "The entered OID is already in use.");
            }
            metadataHelper.setElementName(currentElementID.item, $("#name-input").value);
            metadataHelper.setItemQuestion(currentElementID.item, $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(currentElementID.item, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            handleItemDataType(currentElementID.item, $("#datatype-select-inner").value);
            reloadItems();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            if (metadataHelper.setElementOID(currentElementID.codeList, $("#oid-input").value, currentElementType)) {
                currentElementID.codeList = $("#oid-input").value;
            } else {
                ioHelper.showWarning("OID not changed", "The entered OID is already in use.");
            }
            metadataHelper.setCodeListItemDecodedText(currentElementID.codeList, currentElementID.codeListItem, $("#question-textarea").value, locale);
            metadataHelper.setCodeListItemCodedValue(currentElementID.codeList, currentElementID.codeListItem, $("#name-input").value);
            currentElementID.codeListItem = $("#name-input").value;
            reloadCodeListItems();
    }

    if (!languageHelper.getPresentLanguages().includes(locale)) {
        languageHelper.populatePresentLanguages(metadataHelper.getODM());
        languageHelper.createLanguageSelect();
    }
    
    reloadDetailsPanel();
    document.activeElement.blur();
    $("#save-button").disabled = true;
    $("#save-button-mobile").disabled = true;
}

window.saveMoreModal = function() {
    if (currentElementType == metadataHelper.elementTypes.ITEM) {
        saveCondition();
        saveMeasurementUnit();
        saveRangeChecks();
    }
    if (currentElementType != metadataHelper.elementTypes.CODELISTITEM) {
        saveElementDescription();
        reloadDetailsPanel();
    }
    saveAliases();
    saveConditions();
    saveMeasurementUnits();
    hideMoreModal();
    setArrowKeyListener();
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
        let checkValue = rangeCheckInput.querySelector(".range-check-value").value;
        if (comparator && checkValue) {
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

function saveElementDescription() {
    metadataHelper.setElementDescription(getCurrentElementOID(), $("#element-description-textarea").value, locale);
}

function saveConditions() {
    let conditionInputs = $$(".condition-input");
    for (let conditionInput of conditionInputs) {
        let oid = conditionInput.getAttribute("oid");
        let name = conditionInput.querySelector(".condition-name").value;
        let formalExpression = conditionInput.querySelector(".condition-formex").value;
        if (name && formalExpression) {
            if (oid == null) {
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
            if (oid == null) {
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
    if (codeListRef != null && !dataTypeIsCodelist) {
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
    $("#delete-button").tabIndex = 7;
}

export function removeArrowKeyListener() {
    document.removeEventListener("keydown", arrowKeyListener);
}

export function setArrowKeyListener() {
    document.addEventListener("keydown", arrowKeyListener);
}

function arrowKeyListener(event) {
    let target = null;

    if (event.code == "ArrowUp") {
        event.preventDefault();
        let currentElement = $(`[oid="${getCurrentElementOID()}"]`);
        if (currentElement != null) {
            target = currentElement.previousSibling;
        }
        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
            target = $(`[coded-value="${currentElementID.codeListItem}"]`).previousSibling;
        }
    } else if (event.code == "ArrowDown") {
        event.preventDefault();
        let currentElement = $(`[oid="${getCurrentElementOID()}"]`);
        if (currentElement != null) {
            target = currentElement.nextSibling;
        }
        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
            target = $(`[coded-value="${currentElementID.codeListItem}"]`).nextSibling;
        }
    } else if (event.code == "ArrowLeft") {
        event.preventDefault();
        if (currentElementType != metadataHelper.elementTypes.STUDYEVENT) {
            target = $(`[oid="${getParentOID(currentElementType)}"]`);
            setCurrentElementOID(null);
            currentElementType = getParentElementType(currentElementType);
        }
    } else if (event.code == "ArrowRight") {
        event.preventDefault();
        if (currentElementType != metadataHelper.elementTypes.CODELISTITEM && getCurrentElementFirstChild() != null) {
            target = getCurrentElementFirstChild();
            currentElementType = getChildElementType(currentElementType);
        }
    } else if (event.code == "KeyA") {
        event.preventDefault();
        addCurrentElementType();
    } else if (event.code == "KeyR") {
        event.preventDefault();
        deleteElement();
    } else if (event.code == "Tab") {
        event.preventDefault();
        $("#oid-input").focus();
    }

    if (currentElementType == null && (event.code == "ArrowDown" || event.code == "ArrowRight")) {
        event.preventDefault();
        target = $(`a[element-type="studyevent"]`);
        currentElementType = metadataHelper.elementTypes.STUDYEVENT;        
    }

    if (target != null && target.tagName == "A") {
        setCurrentElementOID(target.getAttribute("oid"));
        if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
            currentElementID.codeListItem = target.getAttribute("coded-value");
        }
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

window.addStudyEvent = function() {
    currentElementID.studyEvent = metadataHelper.createStudyEvent();
    currentElementType = metadataHelper.elementTypes.STUDYEVENT;
    reloadStudyEvents();
    reloadDetailsPanel();
    loadFormsByStudyEvent(currentElementID.studyEvent, true);
    scrollParentToChild($(`[OID="${currentElementID.studyEvent}"]`));
}

window.addForm = function() {
    currentElementID.form = metadataHelper.createForm(currentElementID.studyEvent);
    currentElementType = metadataHelper.elementTypes.FORM;
    reloadForms();
    reloadDetailsPanel();
    loadItemGroupsByForm(currentElementID.form, true);
    scrollParentToChild($(`[OID="${currentElementID.form}"]`));
}

window.addItemGroup = function() {
    currentElementID.itemGroup = metadataHelper.createItemGroup(currentElementID.form);
    currentElementType = metadataHelper.elementTypes.ITEMGROUP;
    reloadItemGroups();
    reloadDetailsPanel();
    loadItemsByItemGroup(currentElementID.itemGroup, true);
    scrollParentToChild($(`[OID="${currentElementID.itemGroup}"]`));
}

window.addItem = function() {
    currentElementID.item = metadataHelper.createItem(currentElementID.itemGroup);
    currentElementType = metadataHelper.elementTypes.ITEM;
    reloadItems();
    reloadDetailsPanel();
    loadCodeListItemsByItem(currentElementID.item, true);
    scrollParentToChild($(`[OID="${currentElementID.item}"]`));
}

window.addCodeListItem = function() {
    let codeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);

    if (codeListOID != null) {
        currentElementID.codeListItem = metadataHelper.addCodeListItem(codeListOID);
        currentElementID.codeList = codeListOID;
        currentElementType = metadataHelper.elementTypes.CODELISTITEM;
        reloadCodeListItems();
        reloadDetailsPanel();
        scrollParentToChild($(`[coded-value="${currentElementID.codeListItem}"]`));
    }
}

window.deleteElement = function() {
    switch (currentElementType) {
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

    hideDeleteModal();
    resetDetailsPanel();
    reloadTree();
}

window.duplicateReference = function() {
    if (currentElementType === metadataHelper.elementTypes.CODELISTITEM) {
        let newItemOID = metadataHelper.createItem(currentElementID.itemGroup);
        metadataHelper.addCodeListRef(newItemOID, currentElementID.codeList);
    } else {
        let elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), currentElementType, getParentOID(currentElementType));
        elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);
    }

    hideDuplicateModal();
    reloadTree();
    reloadDetailsPanel();
}

window.shallowOrDeepCopy = function(deepCopy) {
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

    hideDuplicateModal();
    reloadTree();
    reloadDetailsPanel();
}

function dragStart(event) {
    elementTypeOnDrag = event.target.getAttribute("element-type");
    event.dataTransfer.setData("sourceElementOID", event.target.getAttribute("oid"));
    event.dataTransfer.setData("sourceParentOID", getParentOID(elementTypeOnDrag));
    if (elementTypeOnDrag === metadataHelper.elementTypes.CODELISTITEM) {
        event.dataTransfer.setData("sourceCodedValue", event.target.getAttribute("coded-value"));
    }
    for (let panel of $$(".panel")) {
        panel.classList.add("no-hover");
    }
}

function dragEnd() {
    elementTypeOnDrag = null;
    for (let panel of $$(".panel")) {
        panel.classList.remove("no-hover");
    }
}

window.allowDrop = function(event) {
    if (elementTypeOnDrag === event.target.getAttribute("element-type")) {
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

window.elementDrop = function(event) {
    let sourceElementOID = event.dataTransfer.getData("sourceElementOID");
    let targetElementOID = event.target.getAttribute("oid");
    let sourceParentOID = event.dataTransfer.getData("sourceParentOID");
    let targetParentOID = getParentOID(elementTypeOnDrag);
    let sourceElementRef = null;
    let targetElementRef = null;

    if (elementTypeOnDrag === metadataHelper.elementTypes.CODELISTITEM) {
        sourceElementRef = metadataHelper.getCodeListItem(sourceElementOID, event.dataTransfer.getData("sourceCodedValue"));
    } else {
        sourceElementRef = metadataHelper.getElementRefByOID(sourceElementOID, elementTypeOnDrag, sourceParentOID);
    }

    if (targetElementOID != null) {
        if (elementTypeOnDrag === metadataHelper.elementTypes.CODELISTITEM) {
            targetElementRef = metadataHelper.getCodeListItem(targetElementOID, event.target.getAttribute("coded-value"));
        } else {
            targetElementRef = metadataHelper.getElementRefByOID(targetElementOID, elementTypeOnDrag, targetParentOID);
        }

        if (event.offsetY/event.target.offsetHeight >= 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef.nextSibling);
        } else if (event.offsetY/event.target.offsetHeight < 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef);
        }
    } else {
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
                metadataHelper.insertItemGroupRef(sourceElementRef, targetParentOID);
                break;
            case metadataHelper.elementTypes.CODELISTITEM:
                metadataHelper.insertCodeListItem(sourceElementRef, metadataHelper.getCodeListOIDByItem(targetParentOID));
        }
    }

    reloadTree();
}

window.showDeleteModal = function() {
    removeArrowKeyListener();
    $("#delete-modal").classList.add("is-active");
}

window.hideDeleteModal = function() {
    $("#delete-modal").classList.remove("is-active");
    setArrowKeyListener();
}

window.showDuplicateModal = function() {
    removeArrowKeyListener();
    $("#duplicate-modal").classList.add("is-active");
}

window.hideDuplicateModal = function() {
    $("#duplicate-modal").classList.remove("is-active");
    setArrowKeyListener();
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
    ioHelper.removeIsActiveFromElements($$("#more-tabs ul li"));
    $("#element-options-tab").classList.add("is-active");
    $("#element-options").classList.remove("is-hidden");
    $("#element-description").classList.add("is-hidden");
    $("#measurement-units").classList.add("is-hidden");
    $("#conditions").classList.add("is-hidden");
    $("#more-modal").classList.remove("is-active");
    setArrowKeyListener();
}

window.showPreviewModal = async function() {
    removeArrowKeyListener();
    $("#preview-modal").classList.add("is-active");

    $("#preview-next-button").classList.add("is-loading");
    await loadFormPreview(currentElementID.form);
    $("#preview-next-button").classList.remove("is-loading");
}

async function loadFormPreview(formOID) {
    $("#preview-modal").setAttribute("preview-form-oid", formOID);

    let translatedText = metadataHelper.getElementDefByOID(formOID).querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        $("#preview-form-title").textContent = translatedText.textContent;
    } else {
        $("#preview-form-title").textContent = metadataHelper.getStudyName();
    }

    let form = await metadataHelper.getFormAsHTML(formOID, locale);
    safeRemoveElement($("#odm-html-content"));
    $("#preview-content").appendChild(form);

    conditionHelper.process(metadataHelper.getItemOIDSWithConditionByForm(formOID));

    getNextFormOID(formOID) == null ? $("#preview-next-button").disabled = true : $("#preview-next-button").disabled = false;
    getPreviousFormOID(formOID) == null ? $("#preview-previous-button").disabled = true : $("#preview-previous-button").disabled = false;

    $("#preview-form-title").scrollIntoView({block: "end", behavior: "smooth"});
}

window.loadNextFormPreview = async function() {
    let nextFormOID = getNextFormOID($("#preview-modal").getAttribute("preview-form-oid"));

    if (nextFormOID != null) {
        $("#preview-next-button").classList.add("is-loading");
        await loadFormPreview(nextFormOID);
        $("#preview-next-button").classList.remove("is-loading");
    }
}

window.loadPreviousFormPreview = async function() {
    let previousFormOID = getPreviousFormOID($("#preview-modal").getAttribute("preview-form-oid"));

    if (previousFormOID != null) {
        $("#preview-previous-button").classList.add("is-loading");
        await loadFormPreview(previousFormOID);
        $("#preview-previous-button").classList.remove("is-loading");
    }
}

function getNextFormOID(previousFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);

    let nextFormOID = null;
    for (let i = 0; i < formDefs.length-1; i++) {
        if (formDefs[i].getAttribute("OID") == previousFormOID) {
            nextFormOID = formDefs[i+1].getAttribute("OID");
        }
    }

    return nextFormOID;
}

function getPreviousFormOID(nextFormOID) {
    let formDefs = metadataHelper.getFormsByStudyEvent(currentElementID.studyEvent);

    let previousFormOID = null;
    for (let i = 1; i < formDefs.length; i++) {
        if (formDefs[i].getAttribute("OID") == nextFormOID) {
            previousFormOID = formDefs[i-1].getAttribute("OID");
        }
    }

    return previousFormOID;
}

window.hidePreviewModal = function() {
    $("#preview-modal").classList.remove("is-active");
    $("html").classList.remove("no-scroll");
    $("#preview-modal .modal-content").classList.remove("is-fullscreen");
    $("#preview-modal .modal-content").classList.add("is-large");
    $("#preview-fs-button").classList.remove("is-hidden");
    safeRemoveElement($("#odm-html-content"));
    setArrowKeyListener();
}

window.togglePreviewFS = function() {
    $("html").classList.toggle("no-scroll");
    $("#preview-modal .modal-content").classList.toggle("is-large");
    $("#preview-modal .modal-content").classList.toggle("is-fullscreen");
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

window.projectTabClicked = function(event) {
    ioHelper.removeIsActiveFromElements($$("#project-tabs ul li"));
    event.target.parentNode.classList.add("is-active");

    switch(event.target.parentNode.id) {
        case "general-options-tab":
            $("#general-options").classList.remove("is-hidden");
            $("#users-locations").classList.add("is-hidden");
            $("#name-description").classList.add("is-hidden");
            break;
        case "users-locations-tab":
            $("#general-options").classList.add("is-hidden");
            $("#users-locations").classList.remove("is-hidden");
            $("#name-description").classList.add("is-hidden");
            break;
        case "name-description-tab":
            $("#general-options").classList.add("is-hidden");
            $("#users-locations").classList.add("is-hidden");
            $("#name-description").classList.remove("is-hidden");
    }
}

window.moreTabClicked = function(event) {
    ioHelper.removeIsActiveFromElements($$("#more-tabs ul li"));
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
