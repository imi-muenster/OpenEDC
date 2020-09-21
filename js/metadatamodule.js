import * as odmHelper from "./helper/odmhelper.js";
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

function removeIsActiveFromElements(elements) {
    for (let element of elements) {
        element.classList.remove("is-active");
    }
}

function safeRemoveElement(element) {
    if (element != null) {
        element.remove();
    }
}

function createPanelBlock(elementOID, elementType, displayText, fallbackText, codedValue) {
    let panelBlock = htmlElements.getPanelBlock(elementOID, elementType, displayText, fallbackText, codedValue);

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

    if (currentElementType == odmHelper.elementTypes.ITEM) {
        for (let condition of odmHelper.getConditions()) {
            conditions.push(condition.getAttribute("Name"));
        }
    
        let itemCondition = odmHelper.getConditionByItem(currentElementID.item, currentElementID.itemGroup);   
        if (itemCondition != null) {
            selectedCondition = itemCondition.getAttribute("Name");
        }
    }

    let select = htmlElements.getSelect("condition-select", true, true, conditions, selectedCondition);
    $("#condition-label").insertAdjacentElement("afterend", select);

    if (currentElementType != odmHelper.elementTypes.ITEM) {
        $("#condition-select-inner").disabled = true;
    }
}

function createMeasurementUnitSelect() {
    ioHelper.removeElements($$("#measurement-unit-select-outer"));

    let measurementUnits = [""];
    let selectedMeasurementUnit = "";

    if (currentElementType == odmHelper.elementTypes.ITEM) {
        for (let measurementUnit of odmHelper.getMeasurementUnits()) {
            measurementUnits.push(measurementUnit.getAttribute("Name"));
        }
    
        let itemMeasurementUnit = odmHelper.getMeasurementUnitByItem(currentElementID.item);   
        if (itemMeasurementUnit != null) {
            selectedMeasurementUnit = itemMeasurementUnit.getAttribute("Name");
        }
    }

    let select = htmlElements.getSelect("measurement-unit-select", true, true, measurementUnits, selectedMeasurementUnit);
    $("#measurement-unit-label").insertAdjacentElement("afterend", select);

    if (currentElementType != odmHelper.elementTypes.ITEM) {
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
    let studyEventDefs = odmHelper.getStudyEvents();
    ioHelper.removeElements($$("#study-event-panel-blocks a"));
    for (let studyEventDef of studyEventDefs) {
        let translatedText = studyEventDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(studyEventDef.getAttribute("OID"), odmHelper.elementTypes.STUDYEVENT, translatedText, studyEventDef.getAttribute("Name"));
        panelBlock.onclick = studyEventClicked;
        $("#study-event-panel-blocks").appendChild(panelBlock);
    }
}

function studyEventClicked(event) {
    removeIsActiveFromElements($$("#study-event-panel-blocks a"));
    event.target.classList.add("is-active");
    
    currentElementID.studyEvent = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.studyEvent, currentElementType);

    loadFormsByStudyEvent(currentElementID.studyEvent, true);
}

function loadFormsByStudyEvent(studyEventOID, hideTree) {
    hideForms(hideTree);
    $("#forms-add-button button").disabled = false;

    let formDefs = odmHelper.getFormsByStudyEvent(studyEventOID);
    for (let formDef of formDefs) {
        let translatedText = formDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(formDef.getAttribute("OID"), odmHelper.elementTypes.FORM, translatedText, formDef.getAttribute("Name"));
        panelBlock.onclick = formClicked;
        $("#form-panel-blocks").appendChild(panelBlock);
    }
}

function formClicked(event) {
    removeIsActiveFromElements($$("#form-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.form = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.form, currentElementType);

    loadItemGroupsByForm(currentElementID.form, true);
}

function loadItemGroupsByForm(formOID, hideTree) {
    hideItemGroups(hideTree);
    $("#item-groups-add-button button").disabled = false;

    let itemGroupDefs = odmHelper.getItemGroupsByForm(formOID);
    for (let itemGroupDef of itemGroupDefs) {
        let translatedText = itemGroupDef.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(itemGroupDef.getAttribute("OID"), odmHelper.elementTypes.ITEMGROUP, translatedText, itemGroupDef.getAttribute("Name"));
        panelBlock.onclick = itemGroupClicked;
        $("#item-group-panel-blocks").appendChild(panelBlock);
    }
}

function itemGroupClicked(event) {
    removeIsActiveFromElements($$("#item-group-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.itemGroup = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.itemGroup, currentElementType);

    loadItemsByItemGroup(currentElementID.itemGroup, true);
}

function loadItemsByItemGroup(itemGroupOID, hideTree) {
    hideItems(hideTree);
    $("#items-add-button button").disabled = false;

    let itemDefs = odmHelper.getItemsByItemGroup(itemGroupOID);
    for (let itemDef of itemDefs) {
        let translatedText = itemDef.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(itemDef.getAttribute("OID"), odmHelper.elementTypes.ITEM, translatedText, itemDef.getAttribute("Name"));
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }
}

function itemClicked(event) {
    removeIsActiveFromElements($$("#item-panel-blocks a"));
    event.target.classList.add("is-active");

    currentElementID.item = event.target.getAttribute("oid");
    currentElementType = event.target.getAttribute("element-type");
    fillDetailsPanel(currentElementID.item, currentElementType);

    loadCodeListItemsByItem(currentElementID.item, true);
}

function loadCodeListItemsByItem(itemOID, hideTree) {
    hideCodeListItems(hideTree);

    if (odmHelper.itemHasCodeList(itemOID)) {
        $("#code-list-items-add-button button").disabled = false;
    }

    let codeListItems = odmHelper.getCodeListItemsByItem(itemOID);
    for (let codeListItem of codeListItems) {
        let translatedText = codeListItem.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
        let panelBlock = createPanelBlock(codeListItem.parentNode.getAttribute("OID"), odmHelper.elementTypes.CODELISTITEM, translatedText, codeListItem.getAttribute("CodedValue"), codeListItem.getAttribute("CodedValue"));
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }
}

function codeListItemClicked(event) {
    removeIsActiveFromElements($$("#code-list-item-panel-blocks a"));
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

    let element = odmHelper.getElementDefByOID(elementOID);
    let elementRef = odmHelper.getElementRefByOID(getCurrentElementOID(), currentElementType, getParentOID(currentElementType));
    $("#name-input").value = element.getAttribute("Name");

    let numberOfReferences = odmHelper.getNumberOfRefs(elementOID, elementType);
    if (numberOfReferences > 1) {
        $("#references-tag").classList.remove("is-hidden");
        $("#number-of-references").textContent = numberOfReferences;
    }

    let translatedText = null;
    switch(elementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            $("#preview-button").disabled = true;
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case odmHelper.elementTypes.FORM:
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case odmHelper.elementTypes.ITEMGROUP:
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
            break;
        case odmHelper.elementTypes.ITEM:
            $("#datatype-select-inner").disabled = false;
            $("#element-long-label").textContent = "Question";
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            translatedText = element.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
            $("#datatype-select-inner").value = odmHelper.itemHasCodeList(elementOID) ? "codelist (" + element.getAttribute("DataType") + ")" : element.getAttribute("DataType");
            break;
        case odmHelper.elementTypes.CODELISTITEM:
            $("#mandatory-select-inner").disabled = true;
            $("#element-oid-label").textContent = "CodeList OID";
            $("#element-short-label").textContent = "CodedValue";
            $("#element-long-label").textContent = "Decode";
            element = odmHelper.getCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
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

    let aliases = odmHelper.getAliasesByElement(getCurrentElementOID(), currentElementID.codeListItem);
    for (let alias of aliases) {
        let newInput = htmlElements.getAliasInputElement(alias.getAttribute("Context"), alias.getAttribute("Name"));
        $(".empty-alias-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function fillRangeChecks() {
    ioHelper.removeElements($$(".range-check-input"));
    $("#range-check-label").insertAdjacentElement("afterend", htmlElements.getEmptyRangeCheckInputElement());

    let rangeChecks = odmHelper.getRangeChecksByItem(currentElementID.item);
    for (let rangeCheck of rangeChecks) {
        let newInput = htmlElements.getRangeCheckInputElement(rangeCheck.getAttribute("Comparator"), rangeCheck.querySelector("CheckValue").textContent);
        $(".empty-range-check-field").insertAdjacentElement("beforebegin", newInput);
    }

    $("#add-range-check-button").disabled = false;
    if (currentElementType != odmHelper.elementTypes.ITEM) {
        $(".range-check-comparator-inner").disabled = true;
        $(".range-check-value").disabled = true;
        $("#add-range-check-button").disabled = true;
    }
}

function fillElementDescription() {
    $("#element-description-textarea").value = null;
    $("#element-description-textarea").disabled = false;
    if (currentElementType == odmHelper.elementTypes.CODELISTITEM) {
        $("#element-description-textarea").disabled = true;
    } else if (currentElementType == odmHelper.elementTypes.ITEM) {
        let element = odmHelper.getElementDefByOID(currentElementID.item);
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
    
    let conditions = odmHelper.getConditions();
    for (let condition of conditions) {
        let formalExpression = condition.querySelector(`FormalExpression`).textContent;
        let newInput = htmlElements.getConditionInputElement(condition.getAttribute("OID"), condition.getAttribute("Name"), formalExpression);
        $(".empty-condition-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function fillMeasurementUnits() {
    ioHelper.removeElements($$(".measurement-unit-input"));
    $("#measurement-units-label").insertAdjacentElement("afterend", htmlElements.getEmptyMeasurementUnitInputElement());

    let measurementUnits = odmHelper.getMeasurementUnits();
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
        case odmHelper.elementTypes.STUDYEVENT:
            if (odmHelper.setElementOID(currentElementID.studyEvent, $("#oid-input").value, currentElementType)) {
                currentElementID.studyEvent = $("#oid-input").value;
            } else {
                showOIDUsedModal();
            }
            odmHelper.setElementName(currentElementID.studyEvent, $("#name-input").value);
            odmHelper.setElementDescription(currentElementID.studyEvent, $("#question-textarea").value, locale);
            odmHelper.setElementMandatory(currentElementID.studyEvent, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadStudyEvents();
            break;
        case odmHelper.elementTypes.FORM:
            if (odmHelper.setElementOID(currentElementID.form, $("#oid-input").value, currentElementType)) {
                currentElementID.form = $("#oid-input").value;
            } else {
                showOIDUsedModal();
            }
            odmHelper.setElementName(currentElementID.form, $("#name-input").value);
            odmHelper.setElementDescription(currentElementID.form, $("#question-textarea").value, locale);
            odmHelper.setElementMandatory(currentElementID.form, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadForms();
            break;
        case odmHelper.elementTypes.ITEMGROUP:
            if (odmHelper.setElementOID(currentElementID.itemGroup, $("#oid-input").value, currentElementType)) {
                currentElementID.itemGroup = $("#oid-input").value;
            } else {
                showOIDUsedModal();
            }
            odmHelper.setElementName(currentElementID.itemGroup, $("#name-input").value);
            odmHelper.setElementDescription(currentElementID.itemGroup, $("#question-textarea").value, locale);
            odmHelper.setElementMandatory(currentElementID.itemGroup, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadItemGroups();
            break;
        case odmHelper.elementTypes.ITEM:
            if (odmHelper.setElementOID(currentElementID.item, $("#oid-input").value, currentElementType)) {
                currentElementID.item = $("#oid-input").value;
            } else {
                showOIDUsedModal();
            }
            odmHelper.setElementName(currentElementID.item, $("#name-input").value);
            odmHelper.setItemQuestion(currentElementID.item, $("#question-textarea").value, locale);
            odmHelper.setElementMandatory(currentElementID.item, currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            handleItemDataType(currentElementID.item, $("#datatype-select-inner").value);
            reloadItems();
            break;
        case odmHelper.elementTypes.CODELISTITEM:
            if (odmHelper.setElementOID(currentElementID.codeList, $("#oid-input").value, currentElementType)) {
                currentElementID.codeList = $("#oid-input").value;
            } else {
                showOIDUsedModal();
            }
            odmHelper.setCodeListItemDecodedText(currentElementID.codeList, currentElementID.codeListItem, $("#question-textarea").value, locale);
            odmHelper.setCodeListItemCodedValue(currentElementID.codeList, currentElementID.codeListItem, $("#name-input").value);
            currentElementID.codeListItem = $("#name-input").value;
            reloadCodeListItems();
    }

    if (!languageHelper.getPresentLanguages().includes(locale)) {
        languageHelper.populatePresentLanguages(odmHelper.getODM());
        languageHelper.createLanguageSelect();
    }
    
    reloadDetailsPanel();
    document.activeElement.blur();
    $("#save-button").disabled = true;
    $("#save-button-mobile").disabled = true;
}

window.saveMoreModal = function() {
    if (currentElementType == odmHelper.elementTypes.ITEM) {
        saveCondition();
        saveMeasurementUnit();
        saveRangeChecks();
    }
    if (currentElementType != odmHelper.elementTypes.CODELISTITEM) {
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
    odmHelper.setItemCondition(currentElementID.item, currentElementID.itemGroup, conditionName);
}

function saveMeasurementUnit() {
    let measurementUnitName = $("#measurement-unit-select-inner").value;
    odmHelper.setItemMeasurementUnit(currentElementID.item, measurementUnitName);
}

function saveRangeChecks() {
    odmHelper.deleteRangeChecksOfItem(currentElementID.item);
    let rangeCheckInputs = $$(".range-check-input");
    for (let rangeCheckInput of rangeCheckInputs) {
        let comparator = rangeCheckInput.querySelector(".range-check-comparator-inner").value;
        let checkValue = rangeCheckInput.querySelector(".range-check-value").value;
        if (comparator && checkValue) {
            odmHelper.setItemRangeCheck(currentElementID.item, comparator, checkValue);
        }
    }
}

function saveAliases() {
    odmHelper.deleteAliasesOfElement(getCurrentElementOID(), currentElementID.codeListItem);
    let aliasInputs = $$(".alias-input");
    for (let aliasInput of aliasInputs) {
        let context = aliasInput.querySelector(".alias-context").value;
        let name = aliasInput.querySelector(".alias-name").value;
        if (context && name) {
            odmHelper.setElementAlias(getCurrentElementOID(), currentElementID.codeListItem, context, name);
        }
    }
}

function saveElementDescription() {
    odmHelper.setElementDescription(getCurrentElementOID(), $("#element-description-textarea").value, locale);
}

function saveConditions() {
    let conditionInputs = $$(".condition-input");
    for (let conditionInput of conditionInputs) {
        let oid = conditionInput.getAttribute("oid");
        let name = conditionInput.querySelector(".condition-name").value;
        let formalExpression = conditionInput.querySelector(".condition-formex").value;
        if (name && formalExpression) {
            if (oid == null) {
                odmHelper.createCondition(name, formalExpression, locale);
            } else {
                odmHelper.setElementName(oid, name);
                odmHelper.setConditionFormalExpression(oid, formalExpression);
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
                odmHelper.createMeasurementUnit(name, symbol, locale);
            } else {
                odmHelper.setElementName(oid, name);
                odmHelper.setMeasurementUnitSymbol(oid, symbol, locale);
            }
        }
    }
    ioHelper.removeElements($$(".measurement-unit-input"));
}

function handleItemDataType(itemOID, dataType) {
    let dataTypeIsCodelist = dataType.startsWith("codelist");
    let codeListType = dataTypeIsCodelist ? dataType.match(/\((.*)\)/)[1] : null;

    let codeListRef = odmHelper.getElementDefByOID(itemOID).querySelector("CodeListRef");
    if (codeListRef != null && !dataTypeIsCodelist) {
        odmHelper.removeCodeListRef(itemOID, codeListRef.getAttribute("CodeListOID"));
        reloadCodeListItems();
    } else if (codeListRef == null && dataTypeIsCodelist) {
        odmHelper.createCodeList(itemOID);
        reloadCodeListItems();
    }

    if (dataTypeIsCodelist) {
        odmHelper.setItemDataType(itemOID, codeListType);
        odmHelper.setCodeListDataType(odmHelper.getCodeListOIDByItem(itemOID), codeListType);
    } else {
        odmHelper.setItemDataType(itemOID, dataType);
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
    $("body").onresize = ioHelper.setTreeMaxHeight;
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
        if (currentElementType == odmHelper.elementTypes.CODELISTITEM) {
            target = $(`[coded-value="${currentElementID.codeListItem}"]`).previousSibling;
        }
    } else if (event.code == "ArrowDown") {
        event.preventDefault();
        let currentElement = $(`[oid="${getCurrentElementOID()}"]`);
        if (currentElement != null) {
            target = currentElement.nextSibling;
        }
        if (currentElementType == odmHelper.elementTypes.CODELISTITEM) {
            target = $(`[coded-value="${currentElementID.codeListItem}"]`).nextSibling;
        }
    } else if (event.code == "ArrowLeft") {
        event.preventDefault();
        if (currentElementType != odmHelper.elementTypes.STUDYEVENT) {
            target = $(`[oid="${getParentOID(currentElementType)}"]`);
            setCurrentElementOID(null);
            currentElementType = getParentElementType(currentElementType);
        }
    } else if (event.code == "ArrowRight") {
        event.preventDefault();
        if (currentElementType != odmHelper.elementTypes.CODELISTITEM && getCurrentElementFirstChild() != null) {
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
        currentElementType = odmHelper.elementTypes.STUDYEVENT;        
    }

    if (target != null && target.tagName == "A") {
        setCurrentElementOID(target.getAttribute("oid"));
        if (currentElementType == odmHelper.elementTypes.CODELISTITEM) {
            currentElementID.codeListItem = target.getAttribute("coded-value");
        }
        reloadDetailsPanel();
    
        reloadTree();

        if (currentElementType == odmHelper.elementTypes.CODELISTITEM) {
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
    currentElementID.studyEvent = odmHelper.createStudyEvent();
    currentElementType = odmHelper.elementTypes.STUDYEVENT;
    reloadStudyEvents();
    reloadDetailsPanel();
    loadFormsByStudyEvent(currentElementID.studyEvent, true);
    scrollParentToChild($(`[OID="${currentElementID.studyEvent}"]`));
}

window.addForm = function() {
    currentElementID.form = odmHelper.createForm(currentElementID.studyEvent);
    currentElementType = odmHelper.elementTypes.FORM;
    reloadForms();
    reloadDetailsPanel();
    loadItemGroupsByForm(currentElementID.form, true);
    scrollParentToChild($(`[OID="${currentElementID.form}"]`));
}

window.addItemGroup = function() {
    currentElementID.itemGroup = odmHelper.createItemGroup(currentElementID.form);
    currentElementType = odmHelper.elementTypes.ITEMGROUP;
    reloadItemGroups();
    reloadDetailsPanel();
    loadItemsByItemGroup(currentElementID.itemGroup, true);
    scrollParentToChild($(`[OID="${currentElementID.itemGroup}"]`));
}

window.addItem = function() {
    currentElementID.item = odmHelper.createItem(currentElementID.itemGroup);
    currentElementType = odmHelper.elementTypes.ITEM;
    reloadItems();
    reloadDetailsPanel();
    loadCodeListItemsByItem(currentElementID.item, true);
    scrollParentToChild($(`[OID="${currentElementID.item}"]`));
}

window.addCodeListItem = function() {
    let codeListOID = odmHelper.getCodeListOIDByItem(currentElementID.item);

    if (codeListOID != null) {
        currentElementID.codeListItem = odmHelper.addCodeListItem(codeListOID);
        currentElementID.codeList = codeListOID;
        currentElementType = odmHelper.elementTypes.CODELISTITEM;
        reloadCodeListItems();
        reloadDetailsPanel();
        scrollParentToChild($(`[coded-value="${currentElementID.codeListItem}"]`));
    }
}

window.deleteElement = function() {
    switch (currentElementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            odmHelper.removeStudyEventRef(currentElementID.studyEvent);
            currentElementID.studyEvent = null;
            hideForms(true);
            break;
        case odmHelper.elementTypes.FORM:
            odmHelper.removeFormRef(currentElementID.studyEvent, currentElementID.form);
            currentElementID.form = null;
            hideItemGroups(true);
            break;
        case odmHelper.elementTypes.ITEMGROUP:
            odmHelper.removeItemGroupRef(currentElementID.form, currentElementID.itemGroup);
            currentElementID.itemGroup = null;
            hideItems(true);
            break;
        case odmHelper.elementTypes.ITEM:
            odmHelper.removeItemRef(currentElementID.itemGroup, currentElementID.item);
            currentElementID.item = null;
            hideCodeListItems(true);
            break;
        case odmHelper.elementTypes.CODELISTITEM:
            odmHelper.deleteCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            currentElementID.codeList = null;
            currentElementID.codeListItem = null;
    }

    hideDeleteModal();
    resetDetailsPanel();
    reloadTree();
}

window.duplicateReference = function() {
    if (currentElementType === odmHelper.elementTypes.CODELISTITEM) {
        let newItemOID = odmHelper.createItem(currentElementID.itemGroup);
        odmHelper.addCodeListRef(newItemOID, currentElementID.codeList);
    } else {
        let elementRef = odmHelper.getElementRefByOID(getCurrentElementOID(), currentElementType, getParentOID(currentElementType));
        elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);
    }

    hideDuplicateModal();
    reloadTree();
    reloadDetailsPanel();
}

window.shallowOrDeepCopy = function(deepCopy) {
    switch (currentElementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            odmHelper.copyStudyEvent(currentElementID.studyEvent, deepCopy);
            break;
        case odmHelper.elementTypes.FORM:
            odmHelper.copyForm(currentElementID.form, deepCopy, currentElementID.studyEvent);
            break;
        case odmHelper.elementTypes.ITEMGROUP:
            odmHelper.copyItemGroup(currentElementID.itemGroup, deepCopy, currentElementID.form);
            break;
        case odmHelper.elementTypes.ITEM:
            odmHelper.copyItem(currentElementID.item, deepCopy, currentElementID.itemGroup);
            break;
        case odmHelper.elementTypes.CODELISTITEM:
            let newItemOID = odmHelper.createItem(currentElementID.itemGroup);
            let newCodeListOID = odmHelper.copyCodeList(currentElementID.codeList);
            odmHelper.addCodeListRef(newItemOID, newCodeListOID);
    }

    hideDuplicateModal();
    reloadTree();
    reloadDetailsPanel();
}

function dragStart(event) {
    elementTypeOnDrag = event.target.getAttribute("element-type");
    event.dataTransfer.setData("sourceElementOID", event.target.getAttribute("oid"));
    event.dataTransfer.setData("sourceParentOID", getParentOID(elementTypeOnDrag));
    if (elementTypeOnDrag === odmHelper.elementTypes.CODELISTITEM) {
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
        if (odmHelper.getHierarchyLevelOfElementType(elementTypeOnDrag) > odmHelper.getHierarchyLevelOfElementType(event.target.getAttribute("element-type"))) {
            switch(event.target.getAttribute("element-type")) {
                case odmHelper.elementTypes.STUDYEVENT:
                    studyEventClicked(event);
                    break;
                case odmHelper.elementTypes.FORM:
                    formClicked(event);
                    break;
                case odmHelper.elementTypes.ITEMGROUP:
                    itemGroupClicked(event);
                    break;
                case odmHelper.elementTypes.ITEM:
                    itemClicked(event);
            }
        }
    }
}

function getParentOID(elementType) {
    switch (elementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            return null;
        case odmHelper.elementTypes.FORM:
            return currentElementID.studyEvent;
        case odmHelper.elementTypes.ITEMGROUP:
            return currentElementID.form;
        case odmHelper.elementTypes.ITEM:
            return currentElementID.itemGroup;
        case odmHelper.elementTypes.CODELISTITEM:
            return currentElementID.item;
    }
}

function getParentElementType(elementType) {
    switch (elementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            return null;
        case odmHelper.elementTypes.FORM:
            return odmHelper.elementTypes.STUDYEVENT;
        case odmHelper.elementTypes.ITEMGROUP:
            return odmHelper.elementTypes.FORM;
        case odmHelper.elementTypes.ITEM:
            return odmHelper.elementTypes.ITEMGROUP;
        case odmHelper.elementTypes.CODELISTITEM:
            return odmHelper.elementTypes.ITEM;
    }
}

function getChildElementType(elementType) {
    switch (elementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            return odmHelper.elementTypes.FORM;
        case odmHelper.elementTypes.FORM:
            return odmHelper.elementTypes.ITEMGROUP;
        case odmHelper.elementTypes.ITEMGROUP:
            return odmHelper.elementTypes.ITEM;
        case odmHelper.elementTypes.ITEM:
            return odmHelper.elementTypes.CODELISTITEM;
    }
}

function addCurrentElementType() {
    switch (currentElementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            addStudyEvent();
            break;
        case odmHelper.elementTypes.FORM:
            addForm();
            break;
        case odmHelper.elementTypes.ITEMGROUP:
            addItemGroup();
            break;
        case odmHelper.elementTypes.ITEM:
            addItem();
            break;
        case odmHelper.elementTypes.CODELISTITEM:
            addCodeListItem();
    }
}

function getCurrentElementFirstChild() {
    switch (currentElementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            return $(`a[element-type="form"]`);
        case odmHelper.elementTypes.FORM:
            return $(`a[element-type="itemgroup"]`);
        case odmHelper.elementTypes.ITEMGROUP:
            return $(`a[element-type="item"]`);
        case odmHelper.elementTypes.ITEM:
            return $(`a[element-type="codelistitem"]`);
    }
}

function getCurrentElementOID() {
    switch (currentElementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            return currentElementID.studyEvent;
        case odmHelper.elementTypes.FORM:
            return currentElementID.form;
        case odmHelper.elementTypes.ITEMGROUP:
            return currentElementID.itemGroup;
        case odmHelper.elementTypes.ITEM:
            return currentElementID.item;
        case odmHelper.elementTypes.CODELISTITEM:
            return currentElementID.codeList;
    }
}

function setCurrentElementOID(elementOID) {
    switch (currentElementType) {
        case odmHelper.elementTypes.STUDYEVENT:
            currentElementID.studyEvent = elementOID;
            break;
        case odmHelper.elementTypes.FORM:
            currentElementID.form = elementOID;
            break;
        case odmHelper.elementTypes.ITEMGROUP:
            currentElementID.itemGroup = elementOID;
            break;
        case odmHelper.elementTypes.ITEM:
            currentElementID.item = elementOID;
            break;
        case odmHelper.elementTypes.CODELISTITEM:
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

    if (elementTypeOnDrag === odmHelper.elementTypes.CODELISTITEM) {
        sourceElementRef = odmHelper.getCodeListItem(sourceElementOID, event.dataTransfer.getData("sourceCodedValue"));
    } else {
        sourceElementRef = odmHelper.getElementRefByOID(sourceElementOID, elementTypeOnDrag, sourceParentOID);
    }

    if (targetElementOID != null) {
        if (elementTypeOnDrag === odmHelper.elementTypes.CODELISTITEM) {
            targetElementRef = odmHelper.getCodeListItem(targetElementOID, event.target.getAttribute("coded-value"));
        } else {
            targetElementRef = odmHelper.getElementRefByOID(targetElementOID, elementTypeOnDrag, targetParentOID);
        }

        if (event.offsetY/event.target.offsetHeight >= 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef.nextSibling);
        } else if (event.offsetY/event.target.offsetHeight < 0.5) {
            targetElementRef.parentNode.insertBefore(sourceElementRef, targetElementRef);
        }
    } else {
        switch(elementTypeOnDrag) {
            case odmHelper.elementTypes.STUDYEVENT:
                odmHelper.insertStudyEventRef(sourceElementRef);
                break;
            case odmHelper.elementTypes.FORM:
                odmHelper.insertFormRef(sourceElementRef, targetParentOID);
                break;
            case odmHelper.elementTypes.ITEMGROUP:
                odmHelper.insertItemGroupRef(sourceElementRef, targetParentOID);
                break;
            case odmHelper.elementTypes.ITEM:
                odmHelper.insertItemGroupRef(sourceElementRef, targetParentOID);
                break;
            case odmHelper.elementTypes.CODELISTITEM:
                odmHelper.insertCodeListItem(sourceElementRef, odmHelper.getCodeListOIDByItem(targetParentOID));
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

window.showOIDUsedModal = function() {
    removeArrowKeyListener();
    $("#oid-used-modal").classList.add("is-active");
}

window.hideOIDUsedModal = function() {
    $("#oid-used-modal").classList.remove("is-active");
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
    removeIsActiveFromElements($$("#more-tabs ul li"));
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

    let translatedText = odmHelper.getElementDefByOID(formOID).querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        $("#preview-form-title").textContent = translatedText.textContent;
    } else {
        $("#preview-form-title").textContent = odmHelper.getStudyName();
    }

    let form = await odmHelper.getFormAsHTML(formOID, locale);
    safeRemoveElement($("#odm-html-content"));
    $("#preview-content").appendChild(form);

    conditionHelper.process(odmHelper.getItemOIDSWithConditionByForm(formOID));

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
    let formDefs = odmHelper.getFormsByStudyEvent(currentElementID.studyEvent);

    let nextFormOID = null;
    for (let i = 0; i < formDefs.length-1; i++) {
        if (formDefs[i].getAttribute("OID") == previousFormOID) {
            nextFormOID = formDefs[i+1].getAttribute("OID");
        }
    }

    return nextFormOID;
}

function getPreviousFormOID(nextFormOID) {
    let formDefs = odmHelper.getFormsByStudyEvent(currentElementID.studyEvent);

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
    removeIsActiveFromElements($$("#project-tabs ul li"));
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
    removeIsActiveFromElements($$("#more-tabs ul li"));
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
