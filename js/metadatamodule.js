import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as htmlElements from "./helper/htmlelements.js";
import * as autocompleteHelper from "./helper/autocompletehelper.js";

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

    languageHelper.createLanguageSelect(true);
    ioHelper.setTreeMaxHeight();
}

export function hide() {
    $("#metadata-section").hide();
    $("#metadata-toggle-button").show();

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
}

function studyEventClicked(event) {
    ioHelper.removeIsActiveFromElement($("#study-event-panel-blocks a.is-active"));
    event.target.activate();
    
    currentElementID.studyEvent = event.target.getOID();
    fillDetailsPanel();

    loadFormsByStudyEvent(currentElementID.studyEvent, true);
}

function loadFormsByStudyEvent(studyEventOID, hideTree) {
    hideForms(hideTree);
    $("#forms-add-button").disabled = false;

    let formDefs = metadataHelper.getFormsByStudyEvent(studyEventOID);
    for (let formDef of formDefs) {
        let translatedDescription = formDef.getTranslatedDescription(locale);
        let panelBlock = createPanelBlock(formDef.getOID(), metadataHelper.elementTypes.FORM, translatedDescription, formDef.getName());
        panelBlock.onclick = formClicked;
        $("#form-panel-blocks").appendChild(panelBlock);
    }
}

function formClicked(event) {
    ioHelper.removeIsActiveFromElement($("#form-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.form = event.target.getOID();
    fillDetailsPanel();

    loadItemGroupsByForm(currentElementID.form, true);
}

function loadItemGroupsByForm(formOID, hideTree) {
    hideItemGroups(hideTree);
    $("#item-groups-add-button").disabled = false;

    let itemGroupDefs = metadataHelper.getItemGroupsByForm(formOID);
    for (let itemGroupDef of itemGroupDefs) {
        let translatedDescription = itemGroupDef.getTranslatedDescription(locale);
        let panelBlock = createPanelBlock(itemGroupDef.getOID(), metadataHelper.elementTypes.ITEMGROUP, translatedDescription, itemGroupDef.getName());
        panelBlock.onclick = itemGroupClicked;
        $("#item-group-panel-blocks").appendChild(panelBlock);
    }
}

function itemGroupClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-group-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.itemGroup = event.target.getOID();
    fillDetailsPanel();

    loadItemsByItemGroup(currentElementID.itemGroup, true);
}

function loadItemsByItemGroup(itemGroupOID, hideTree) {
    hideItems(hideTree);
    $("#items-add-button").disabled = false;

    let itemDefs = metadataHelper.getItemsByItemGroup(itemGroupOID);
    for (let itemDef of itemDefs) {
        let translatedQuestion = itemDef.getTranslatedQuestion(locale);
        const dataType = itemDef.querySelector("CodeListRef") ? metadataHelper.elementTypes.CODELIST : itemDef.getDataType();
        let panelBlock = createPanelBlock(itemDef.getOID(), metadataHelper.elementTypes.ITEM, translatedQuestion, itemDef.getName(), languageHelper.getTranslation(dataType));
        panelBlock.onclick = itemClicked;
        $("#item-panel-blocks").appendChild(panelBlock);
    }
}

function itemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#item-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.item = event.target.getOID();
    fillDetailsPanel();

    loadCodeListItemsByItem(currentElementID.item, true);
}

function loadCodeListItemsByItem(itemOID, hideTree) {
    hideCodeListItems(hideTree);

    if (metadataHelper.itemHasCodeList(itemOID)) $("#code-list-items-add-button").disabled = false;
    $("#code-list-items-opt-button").disabled = false;

    let codeListItems = metadataHelper.getCodeListItemsByItem(itemOID);
    for (let codeListItem of codeListItems) {
        let translatedDecode = codeListItem.getTranslatedDecode(locale);
        let panelBlock = createPanelBlock(codeListItem.parentNode.getOID(), metadataHelper.elementTypes.CODELISTITEM, translatedDecode, codeListItem.getCodedValue(), null, codeListItem.getCodedValue());
        panelBlock.onclick = codeListItemClicked;
        $("#code-list-item-panel-blocks").appendChild(panelBlock);
    }
}

function codeListItemClicked(event) {
    ioHelper.removeIsActiveFromElement($("#code-list-item-panel-blocks a.is-active"));
    event.target.activate();

    currentElementID.codeList = event.target.getOID();
    currentElementID.codeListItem = event.target.getAttribute("coded-value");
    fillDetailsPanel();
}

function reloadStudyEvents() {
    loadStudyEvents(currentElementID.studyEvent == null);
    if (currentElementID.studyEvent) $(`[oid="${currentElementID.studyEvent}"]`).activate();
}

function reloadForms() {
    if (currentElementID.studyEvent) {
        loadFormsByStudyEvent(currentElementID.studyEvent, currentElementID.form == null);
        if (currentElementID.form) $(`[oid="${currentElementID.form}"]`).activate();
    }
}

function reloadItemGroups() {
    if (currentElementID.form) {
        loadItemGroupsByForm(currentElementID.form, currentElementID.itemGroup == null);
        if (currentElementID.itemGroup) $(`[oid="${currentElementID.itemGroup}"]`).activate();
    }
}

function reloadItems() {
    if (currentElementID.itemGroup) {
        loadItemsByItemGroup(currentElementID.itemGroup, currentElementID.item == null);
        if (currentElementID.item) $(`[oid="${currentElementID.item}"]`).activate();
    }
}

function reloadCodeListItems() {
    if (currentElementID.item) {
        loadCodeListItemsByItem(currentElementID.item, currentElementID.codeList == null);
        if (currentElementID.codeList) $(`[oid="${currentElementID.codeList}"][coded-value="${currentElementID.codeListItem}"]`).activate();
    }
}

export function reloadTree() {
    reloadStudyEvents();
    reloadForms();
    reloadItemGroups();
    reloadItems();
    reloadCodeListItems();
}

function resetDetailsPanel() {
    $("#duplicate-button").unhighlight();
    $("#remove-button").unhighlight();
    $("#save-button").unhighlight();
    $("#oid-input").disabled = true;
    $("#question-textarea").disabled = true;
    $("#datatype-select-inner").disabled = true;
    $("#mandatory-select-inner").disabled = true;
    $("#oid-input").value = "";
    $("#question-textarea").value = "";
    $("#datatype-select-inner").value = "";
    $("#mandatory-select-inner").value = "";
    $("#element-oid-label").textContent = languageHelper.getTranslation("unique-id");
    $("#element-long-label").textContent = languageHelper.getTranslation("translated-description");
}

function fillDetailsPanel() {
    const currentElementOID = getCurrentElementOID();
    const currentElementType = getCurrentElementType();

    resetDetailsPanel();
    $("#duplicate-button").highlight();
    $("#remove-button").highlight();
    $("#oid-input").disabled = false;
    $("#question-textarea").disabled = false;
    $("#remove-button").disabled = false;
    $("#duplicate-button").disabled = false;
    $("#oid-input").value = currentElementOID;

    let element = metadataHelper.getElementDefByOID(currentElementOID);
    const elementRef = metadataHelper.getElementRefByOID(currentElementOID, currentElementType, getParentOID(currentElementType));
    const references = metadataHelper.getElementRefs(currentElementOID, currentElementType);
    if (references.length > 1) {
        // TODO: Reimplement for new properties panel
    }

    switch (currentElementType) {
        case metadataHelper.elementTypes.STUDYEVENT:
        case metadataHelper.elementTypes.FORM:
        case metadataHelper.elementTypes.ITEMGROUP:
            $("#question-textarea").value = element.getTranslatedDescription(locale);
            break;
        case metadataHelper.elementTypes.ITEM:
            $("#datatype-select-inner").disabled = false;
            $("#mandatory-select-inner").disabled = false;
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-question");
            $("#mandatory-select-inner").value = elementRef.getAttribute("Mandatory");
            $("#question-textarea").value = element.getTranslatedQuestion(locale);
            $("#datatype-select-inner").value = metadataHelper.itemHasCodeList(currentElementOID) ? metadataHelper.elementTypes.CODELIST + "-" + element.getDataType() : element.getDataType();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            $("#mandatory-select-inner").disabled = true;
            $("#element-oid-label").textContent = languageHelper.getTranslation("coded-value");
            $("#element-long-label").textContent = languageHelper.getTranslation("translated-choice");
            element = metadataHelper.getCodeListItem(currentElementID.codeList, currentElementID.codeListItem);
            $("#oid-input").value = element.getCodedValue();
            $("#question-textarea").value = element.getTranslatedDecode(locale);
    }
}

export function reloadDetailsPanel() {
    if (getCurrentElementType()) fillDetailsPanel();
    else resetDetailsPanel();
}

function fillAliases() {
    $$(".alias-input").removeElements();
    $("#alias-label").insertAdjacentElement("afterend", htmlElements.getEmptyAliasInputElement());

    let aliases = metadataHelper.getAliasesByElement(getCurrentElementOID(), currentElementID.codeListItem);
    for (let alias of aliases) {
        let newInput = htmlElements.getAliasInputElement(alias.getAttribute("Context"), alias.getName());
        $(".empty-alias-field").insertAdjacentElement("beforebegin", newInput);
    }
}

function fillRangeChecks() {
    $$(".range-check-input").removeElements();
    $("#range-check-label").insertAdjacentElement("afterend", htmlElements.getEmptyRangeCheckInputElement());

    let rangeChecks = metadataHelper.getRangeChecksByItem(currentElementID.item);
    for (let rangeCheck of rangeChecks) {
        let newInput = htmlElements.getRangeCheckInputElement(rangeCheck.getAttribute("Comparator"), rangeCheck.querySelector("CheckValue").textContent);
        $(".empty-range-check-field").insertAdjacentElement("beforebegin", newInput);
    }

    $("#add-range-check-button").disabled = false;
    if (getCurrentElementType() != metadataHelper.elementTypes.ITEM) {
        $(".range-check-comparator-inner").disabled = true;
        $(".range-check-value").disabled = true;
        $("#add-range-check-button").disabled = true;
    }
}

window.saveElement = async function() {
    const newOID = $("#oid-input").value;
    const currentElementOID = getCurrentElementOID();
    const currentElementType = getCurrentElementType();

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
            metadataHelper.setElementName(getCurrentElementOID(), newOID);
            metadataHelper.setElementDescription(getCurrentElementOID(), $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(getCurrentElementOID(), currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            reloadTree();
            break;
        case metadataHelper.elementTypes.ITEM:
            metadataHelper.setElementName(getCurrentElementOID(), newOID);
            metadataHelper.setItemQuestion(getCurrentElementOID(), $("#question-textarea").value, locale);
            metadataHelper.setElementMandatory(getCurrentElementOID(), currentElementType, $("#mandatory-select-inner").value, getParentOID(currentElementType));
            handleItemDataType(getCurrentElementOID(), $("#datatype-select-inner").value);
            reloadItems();
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            metadataHelper.setCodeListItemDecodedText(currentElementID.codeList, currentElementID.codeListItem, $("#question-textarea").value, locale);
            metadataHelper.setCodeListItemCodedValue(currentElementID.codeList, currentElementID.codeListItem, newOID);
            currentElementID.codeListItem = newOID;
            reloadCodeListItems();
    }

    if (!languageHelper.getPresentLanguages().includes(locale)) {
        languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
        languageHelper.createLanguageSelect(true);
    }
    
    reloadDetailsPanel();
    document.activeElement.blur();
    $("#save-button").unhighlight();

    metadataHelper.storeMetadata();
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

function handleItemDataType(itemOID, dataType) {
    let dataTypeIsCodeList = dataType.startsWith(metadataHelper.elementTypes.CODELIST);
    let codeListType = dataTypeIsCodeList ? dataType.split("-")[1] : null;

    let codeListRef = metadataHelper.getElementDefByOID(itemOID).querySelector("CodeListRef");
    if (codeListRef && !dataTypeIsCodeList) {
        metadataHelper.removeCodeListRef(itemOID, codeListRef.getAttribute("CodeListOID"));
        reloadCodeListItems();
    } else if (!codeListRef && dataTypeIsCodeList) {
        metadataHelper.createCodeList(itemOID);
        reloadCodeListItems();
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
                keyEvent.preventDefault();
                saveElement();
            }
        };
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
    reloadForms();
    reloadDetailsPanel();
    loadItemGroupsByForm(currentElementID.form, true);
    scrollParentToChild($(`[OID="${currentElementID.form}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItemGroup = function(event) {
    currentElementID.itemGroup = metadataHelper.createItemGroup(currentElementID.form);
    reloadItemGroups();
    reloadDetailsPanel();
    loadItemsByItemGroup(currentElementID.itemGroup, true);
    scrollParentToChild($(`[OID="${currentElementID.itemGroup}"]`));
    metadataHelper.storeMetadata();
    event.target.blur();
}

window.addItem = function(event) {
    currentElementID.item = metadataHelper.createItem(currentElementID.itemGroup);
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
        reloadCodeListItems();
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

    resetDetailsPanel();
    reloadTree();
    metadataHelper.storeMetadata();
}

function duplicateReference() {
    const currentElementType = getCurrentElementType();
    if (currentElementType == metadataHelper.elementTypes.CODELISTITEM) {
        const newItemOID = metadataHelper.createItem(currentElementID.itemGroup);
        metadataHelper.setItemDataType(newItemOID, metadataHelper.getElementDefByOID(currentElementID.item).getDataType());
        metadataHelper.addCodeListRef(newItemOID, currentElementID.codeList);
    } else {
        let elementRef = metadataHelper.getElementRefByOID(getCurrentElementOID(), currentElementType, getParentOID(currentElementType));
        elementRef.parentNode.insertBefore(elementRef.cloneNode(), elementRef.nextSibling);
    }

    reloadTree();
    reloadDetailsPanel();
}

function copyElement(deepCopy) {
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
            break;
        case metadataHelper.elementTypes.CODELISTITEM:
            currentElementID.codeList = elementOID;
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
    reloadTree();
    metadataHelper.storeMetadata();
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

window.showDuplicateModal = function() {
    ioHelper.showMessage(languageHelper.getTranslation("mode-of-duplication"), languageHelper.getTranslation("duplication-hint"),
        {
            [languageHelper.getTranslation("reference")]: () => duplicateReference(),
            [languageHelper.getTranslation("shallow-copy")]: () => copyElement(false),
            [languageHelper.getTranslation("deep-copy")]: () => copyElement(true)
        }
    );
}

window.addAliasInput = function() {
    $$(".empty-alias-field").getLastElement().insertAdjacentElement("afterend", htmlElements.getEmptyAliasInputElement());
}

window.addRangeCheckInput = function() {
    $$(".empty-range-check-field").getLastElement().insertAdjacentElement("afterend", htmlElements.getEmptyRangeCheckInputElement());
}

window.addMeasurementUnitInput = function() {
    $$(".empty-measurement-unit-field").getLastElement().insertAdjacentElement("afterend", htmlElements.getEmptyMeasurementUnitInputElement());
}

window.addConditionInput = function() {
    const conditionInput = htmlElements.getEmptyConditionInputElement();
    autocompleteHelper.enableAutocomplete(conditionInput.querySelector("input.condition-formex"), autocompleteHelper.modes.CONDITION);
    $$(".empty-condition-field").getLastElement().insertAdjacentElement("afterend", conditionInput);
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
        const translatedQuestions = Array.from(codeListReferences).map(reference => reference.parentNode.getTranslatedQuestion(locale, true));
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
    reloadTree();
    metadataHelper.storeMetadata();
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
    reloadTree();
    reloadDetailsPanel();
    metadataHelper.storeMetadata();
}

window.unreferenceCodeList = function() {
    const currentCodeListOID = metadataHelper.getCodeListOIDByItem(currentElementID.item);
    const newCodeListOID = metadataHelper.copyCodeList(currentCodeListOID);
    metadataHelper.removeCodeListRef(currentElementID.item, currentCodeListOID);
    metadataHelper.addCodeListRef(currentElementID.item, newCodeListOID);
    if (getCurrentElementType() == metadataHelper.elementTypes.CODELISTITEM) currentElementID.codeList = newCodeListOID;

    showCodeListModal();
    reloadTree();
    reloadDetailsPanel();
    metadataHelper.storeMetadata();
}

function showFirstEventEditedHelp() {
    const element = metadataHelper.getElementDefByOID(getCurrentElementOID());
    if (!element.getTranslatedDescription() && $("#question-textarea").value && metadataHelper.getStudyEvents().length == 1) {
        // Show the first event edited help message
        setTimeout(() => ioHelper.showMessage(languageHelper.getTranslation("first-event-edited-title"), languageHelper.getTranslation("first-event-edited-text")), 1000);
    }
}
