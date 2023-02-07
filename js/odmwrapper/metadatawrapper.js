import ODMPath from "./odmpath.js";
import * as metadataTemplates from "../odmtemplates/metadatatemplates.js";
import * as htmlConverter from "../converter/htmlconverter.js";
import * as languageHelper from "../helper/languagehelper.js";
import * as ioHelper from "../helper/iohelper.js";

class MetadataFile {
    constructor(modifiedDate) {
        this.modifiedDate = modifiedDate || new Date();
    }

    static parse(fileName) {
        const modifiedDate = new Date(parseInt(fileName.split(ioHelper.fileNameSeparator)[1]));
        return new MetadataFile(modifiedDate);
    }

    get fileName() {
        return ioHelper.odmFileNames.metadata + ioHelper.fileNameSeparator + this.modifiedDate.getTime();
    }
}

class OpenEDCSetting {
    constructor(context, {key, i18n, description, type, options, callback, scope}){
        this.context = context;
        this.key = key;
        this.i18n = i18n;
        this.description = description;
        this.type = type;
        this.options = options;
        this.callback = callback;
        this.scope = scope;
    }

    static parse(context, jsonString) {
        const data = JSON.parse(jsonString);
        return new OpenEDCSetting(context, data.key, data.i18n, data.description, data.type, data.options, data.callback, data.scope)
    }

    isInScope(scope){
        return this.scope.find(s => s.toLowerCase() == scope.toLowerCase()) || this.scope.find(s => s.toLowerCase() == 'all')
    }

}

export class FormImage{
    constructor( format, base64Data, width, name) {
        this.type = 'base64';
        this.format = format;
        this.base64Data = base64Data;
        this.width = width;
        this.name = name;
    }
}

let formImageDataMap = {}
export const defaultCodeListItemImageWidth = 40;
export const defaultItemImageWidth = '100%'

export let loadedSettings = new Map();
export const OPENEDC_SETTINGS_ALIAS_CONTEXT = 'openedc-settings';
export const SETTINGS_CONTEXT = "OpenEDC";

const $ = query => metadata.querySelector(query);
const $$ = query => metadata.querySelectorAll(query);

const expressionTypes = {
    CONDITION: "condition",
    METHOD: "method"
};

export const dataTypes = {
    INTEGER: "integer",
    FLOAT: "float",
    BOOLEAN: "boolean",
    TEXT: "text",
    STRING: "string",
    DATE: "date",
    TIME: "time",
    DATETIME: "datetime",
    CODELISTTEXT: "codelist-text",
    CODELISTINTEGER: "codelist-integer",
    CODELISTFLOAT: "codelist-float",
    DOUBLE: "double"
};

export const mandatoryTypes = {
    YES: "Yes",
    NO: "No"
}

export const repeatingTypes = {
    YES: "Yes",
    NO: "No"
}

export const dataStatusCodeListOID = "OpenEDC.DataStatus";

let metadata = null;
let metadataFile = null;

export async function loadEmptyProject() {
    metadata = metadataTemplates.getODMTemplate();
    setStudyName(languageHelper.getTranslation("new-project"));

    await storeMetadata();
}

export function importMetadata(odmXMLString) {
    metadata = new DOMParser().parseFromString(odmXMLString, "text/xml");
    
    // Remove ClinicalData and AdminData (the metadata helper stores the "shell" of an ODM-file, e.g., the GlobalVariables, MeasurementUnits, and both the ODM and Study elements)
    $$("ClinicalData").forEach(clinicalData => clinicalData.remove());
    $$("AdminData").forEach(adminData => adminData.remove());

    // Remove OpenEDC data status code list if present (used to interpret the flag of clinical data entries; will be created on download again)
    if ($(`CodeList[OID="${dataStatusCodeListOID}"]`)) $(`CodeList[OID="${dataStatusCodeListOID}"]`).remove();
    
    storeMetadata();
}

export async function loadExample() {
    const exampleResponse = await fetch(ioHelper.getBaseURL() + "/example/metadata.xml");
    const exampleODM = await exampleResponse.text();

    metadata = new DOMParser().parseFromString(exampleODM, "text/xml");
    setStudyName(languageHelper.getTranslation("exemplary-project"));

    await storeMetadata();
}

export async function loadStoredMetadata() {
    metadataFile = MetadataFile.parse(await ioHelper.getODMFileName(ioHelper.odmFileNames.metadata));
    metadata = await ioHelper.getODM(metadataFile.fileName);
}

export async function storeMetadata() {
    const previousFileName = metadataFile?.fileName;

    metadataFile = new MetadataFile();
    await ioHelper.setODM(metadataFile.fileName, metadata);

    if (previousFileName && previousFileName != metadataFile.fileName) ioHelper.removeODM(previousFileName);
    ioHelper.dispatchGlobalEvent('MetadataStored');
}

export function getSerializedMetadata() {
    return new XMLSerializer().serializeToString(metadata);
}

export function getMetadata() {
    return metadata;
}

export function getLastUpdate() {
    return metadataFile.modifiedDate.getTime();
}

export function removeMetadata() {
    metadata = null;
}

export async function getFormAsHTML(formOID, textAsTextarea = false, useItemNames = false, useItemGroupNames = false) {
    return htmlConverter.getFormAsHTML(formOID, {
        defaultCodeListItemImageWidth,
        defaultItemImageWidth,
        locale: languageHelper.getCurrentLocale(),
        missingTranslation: languageHelper.getTranslation("missing-translation"),
        yes: languageHelper.getTranslation("yes"),
        no: languageHelper.getTranslation("no"),
        textAsTextarea: textAsTextarea,
        useItemNames,
        useItemGroupNames,
        showAsLikert: ioHelper.getSetting("showLikertScale"),
        likertScaleLimit: ioHelper.getSetting("likertScaleLimit")
    });
}

export function prepareDownload(dataStatusTypes) {
    removeEmptyAliasses();
    let odmCopy = new DOMParser().parseFromString(getSerializedMetadata(), "text/xml");

    odmCopy.querySelector("ODM").setAttribute("FileOID", getStudyName());
    odmCopy.querySelector("ODM").setAttribute("CreationDateTime", new Date().toISOString());

    // Add a code list with all data status types but only when downloading the ODM with clinical data
    if (dataStatusTypes) {
        const dataStatusCodeList = getDataStatusCodeList(dataStatusTypes);
        const insertPosition = odmCopy.querySelectorAll("ItemDef").getLastElement();
        if (insertPosition) insertPosition.insertAdjacentElement("afterend", dataStatusCodeList);
    }
    
    return odmCopy;
}

function removeEmptyAliasses() {
    [...$$('Alias')]
    .filter(alias => !alias.getAttribute('Context') || alias.getAttribute('Context') === '' || !alias.getAttribute('Name') || alias.getAttribute('Name') === '')
    .forEach(filteredAlias => filteredAlias.parentNode.removeChild(filteredAlias));
}

export function getDataStatusCodeList(statusTypes) {
    let dataStatusCodeList = metadataTemplates.getCodeListDef(dataStatusCodeListOID);
    for (const [key, value] of Object.entries(statusTypes)) {
        let codeListItem = metadataTemplates.getCodeListItem(value);
        let decode = metadataTemplates.getDecode();
        decode.appendChild(metadataTemplates.getTranslatedText(key, "en"));
        codeListItem.appendChild(decode);
        dataStatusCodeList.appendChild(codeListItem);
    }

    return dataStatusCodeList;
}

export function getStudyName() {
    return $("GlobalVariables StudyName").textContent;
}

export function setStudyName(studyName) {
    $("GlobalVariables StudyName").textContent = studyName;
}

export function getStudyDescription() {
    return $("GlobalVariables StudyDescription").textContent;
}

export function setStudyDescription(studyDescription) {
    $("GlobalVariables StudyDescription").textContent = studyDescription;
}

export function getProtocolName() {
    return $("GlobalVariables ProtocolName").textContent;
}

export function setProtocolName(protocolName) {
    $("GlobalVariables ProtocolName").textContent = protocolName;
}

export function getStudyOID() {
    return $("Study").getOID();
}

export function getMetaDataVersionOID() {
    return $("MetaDataVersion").getOID();
}

// TODO: This could be used within getStudyEvents()
export function getStudyEventOIDs() {
    return Array.from($$("Protocol StudyEventRef")).map(studyEventRef => studyEventRef.getAttribute("StudyEventOID"));
}

export function getStudyEvents() {
    let studyEventDefs = [];
    for (let studyEventRef of $$("Protocol StudyEventRef")) {
        let studyEventOID = studyEventRef.getAttribute("StudyEventOID");
        let studyEventDef = $(`[OID="${studyEventOID}"]`);
        if (studyEventDef) studyEventDefs.push(studyEventDef);
    }

    return studyEventDefs;
}

// TODO: The same is used in safeDeleteStudyEvent() and could be replaced by this function call. It could also be used within getFormsByStudyEvent()
export function getFormOIDsByStudyEvent(studyEventOID) {
    return Array.from($$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)).map(formRef => formRef.getAttribute("FormOID"));
}

export function getFormsByStudyEvent(studyEventOID) {
    let formDefs = [];
    for (let formRef of $$(`[OID="${studyEventOID}"] FormRef`)) {
        let formOID = formRef.getAttribute("FormOID");
        let formDef = $(`[OID="${formOID}"]`);
        if (formDef) formDefs.push(formDef);
    }

    return formDefs;
}

export function getItemGroupsByForm(formOID) {
    let itemGroupDefs = [];
    for (let itemGroupRef of $$(`[OID="${formOID}"] ItemGroupRef`)) {
        let itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        let itemGroupDef = $(`[OID="${itemGroupOID}"]`);
        if (itemGroupDef) itemGroupDefs.push(itemGroupDef);
    }

    return itemGroupDefs;
}

export function getItemsByItemGroup(itemGroupOID) {
    let itemDefs = [];
    for (let itemRef of $$(`[OID="${itemGroupOID}"] ItemRef`)) {
        let itemOID = itemRef.getAttribute("ItemOID");
        let itemDef = $(`[OID="${itemOID}"]`);
        if (itemDef) itemDefs.push(itemDef);
    }

    return itemDefs;
}

export function getCodeListItemsByItem(itemOID) {
    const codeListRef = $(`[OID="${itemOID}"] CodeListRef`)
    if (codeListRef) {
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        return Array.from($$(`[OID="${codeListOID}"] CodeListItem`));
    }

    return [];
}

export function getCodeListOIDByItem(itemOID) {
    const codeListRef = $(`[OID="${itemOID}"] CodeListRef`);
    return codeListRef?.getAttribute("CodeListOID");
}

// TODO: Could be refactored to only take path as input parameter
export function getCodeListItem(codeListOID, codedValue) {
    if (!codeListOID || !codedValue) return;
    return $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`);
}

export function getElementRefByOID(elementType, path) {
    switch (elementType) {
        case ODMPath.elements.STUDYEVENT:
            return $(`StudyEventRef[StudyEventOID="${path.studyEventOID}"]`);
        case ODMPath.elements.FORM:
            return $(`StudyEventDef[OID="${path.studyEventOID}"] FormRef[FormOID="${path.formOID}"]`);
        case ODMPath.elements.ITEMGROUP:
            return $(`FormDef[OID="${path.formOID}"] ItemGroupRef[ItemGroupOID="${path.itemGroupOID}"]`);
        case ODMPath.elements.ITEM:
            return $(`ItemGroupDef[OID="${path.itemGroupOID}"] ItemRef[ItemOID="${path.itemOID}"]`);
    }
}

export function getElementDefByOID(elementOID) {
    return $(`[OID="${elementOID}"]`);
}

export function getElementAliases(path) {
    if (path.last.element != ODMPath.elements.CODELISTITEM) {
        return $$(`[OID="${path.last.value}"] Alias`);
    } else {
        const codeListOID = getCodeListOIDByItem(path.itemOID);
        return $$(`[OID="${codeListOID}"] CodeListItem[CodedValue="${path.codeListItem}"] Alias`);
    }
}

export function getRangeChecksByItem(itemOID) {
    return $$(`ItemDef[OID="${itemOID}"] RangeCheck`);
}

export function getConditions() {
    return Array.from($$("ConditionDef"));
}

export function getMethods() {
    return Array.from($$("MethodDef"));
}

export function getItemOIDsWithDataType(dataType) {
    return Array.from($$(`ItemDef[DataType="${dataType}"]`)).map(item => item.getOID());
}

export function getElementsWithExpressionIncludeForms(studyEventOID, formOID) {
    if(!studyEventOID) return [];
    let elementsWithExpression = [];
    for (const formRef of $$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)) {
        const formRefOID = formRef.getAttribute("FormOID");
        if(!formOID  || formOID === formRefOID) {
            const conditionOID = formRef.getAttribute("CollectionExceptionConditionOID");
            if (conditionOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, ODMPath.elements.FORM, new ODMPath(studyEventOID, formRefOID), conditionOID, expressionTypes.CONDITION);
            elementsWithExpression = elementsWithExpression.concat(getElementsWithExpression(studyEventOID, formRefOID));
        }
    }
    return elementsWithExpression;

}
export function getElementsWithExpression(studyEventOID, formOID) {
    let elementsWithExpression = [];
    for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        const conditionOID = itemGroupRef.getAttribute("CollectionExceptionConditionOID");
        if (conditionOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, ODMPath.elements.ITEMGROUP, new ODMPath(studyEventOID, formOID, itemGroupOID), conditionOID, expressionTypes.CONDITION);

        for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[CollectionExceptionConditionOID], ItemGroupDef[OID="${itemGroupOID}"] ItemRef[MethodOID]`)) {
            const itemOID = itemRef.getAttribute("ItemOID");
            const conditionOID = itemRef.getAttribute("CollectionExceptionConditionOID");
            const methodOID = itemRef.getAttribute("MethodOID");
            if (conditionOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, ODMPath.elements.ITEM, new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID), conditionOID, expressionTypes.CONDITION);
            if (methodOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, ODMPath.elements.ITEM, new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID), methodOID, expressionTypes.METHOD);
        }
    }

    return elementsWithExpression;
}
export function getItemDefsForMethodOID(methodOID) {
    return [...$$('ItemRef')].filter(itemDef => itemDef.getAttribute('MethodOID') == methodOID).map(itemRef => getElementDefByOID(itemRef.getAttribute('ItemOID')));
}

function addElementWithExpression(elementList, elementType, elementPath, expressionOID, expressionType) {
    const expressionElement = expressionType == expressionTypes.CONDITION ? $(`ConditionDef[OID="${expressionOID}"]`) : $(`MethodDef[OID="${expressionOID}"]`);
    const formalExpression = expressionElement?.getFormalExpression();
    if (formalExpression) elementList.push({ elementType, elementPath, expressionType, formalExpression });

    return elementList;
}

export function getElementRefsHavingCondition(conditionOID) {
    return Array.from($$(`[CollectionExceptionConditionOID="${conditionOID}"]`));
}

export function getElementRefsHavingMethod(methodOID) {
    return Array.from($$(`[MethodOID="${methodOID}"]`));
}

export function getItemDefsHavingMeasurementUnit(measuremenUnitOID) {
    return Array.from($$(`[MeasurementUnitOID="${measuremenUnitOID}"]`)).map(measurementUnitRef => measurementUnitRef.parentNode);
}

// TODO: Introduce own class for the two arrays? If yes, implement it for getElementsWithExpression as well
// TODO: Could also handle soft and hard RangeChecks
export function getItemsWithRangeChecks(formOID) {
    let itemOIDSWithRangeCheck = [];
    for (let itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        let itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        for (let itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
            let itemOID = itemRef.getAttribute("ItemOID");
            let rangeChecks = [];
            for (let rangeCheck of getRangeChecksByItem(itemOID)) {
                if (!rangeCheck.querySelector("CheckValue")) continue;
                rangeChecks.push({
                    comparator: rangeCheck.getAttribute("Comparator"),
                    checkValue: rangeCheck.querySelector("CheckValue").textContent
                });
            }
            if (rangeChecks.length) {
                itemOIDSWithRangeCheck.push({
                    itemOID: itemOID,
                    rangeChecks: rangeChecks
                });
            }
        }
    }

    return itemOIDSWithRangeCheck;
}

export function getMeasurementUnits() {
    return Array.from($$("BasicDefinitions MeasurementUnit"));
}

export function getElementCondition(elementType, path) {
    let conditionRef;
    switch (elementType) {
        case ODMPath.elements.FORM: 
            if(path.studyEventOID) conditionRef = $(`StudyEventDef[OID="${path.studyEventOID}"] FormRef[FormOID="${path.formOID}"][CollectionExceptionConditionOID]`);
            break;
        case ODMPath.elements.ITEMGROUP:
            conditionRef = $(`FormDef[OID="${path.formOID}"] ItemGroupRef[ItemGroupOID="${path.itemGroupOID}"][CollectionExceptionConditionOID]`);
            break;
        case ODMPath.elements.ITEM:
            conditionRef = $(`ItemGroupDef[OID="${path.itemGroupOID}"] ItemRef[ItemOID="${path.itemOID}"][CollectionExceptionConditionOID]`);
    }

    if (conditionRef) {
        let oid = conditionRef.getAttribute("CollectionExceptionConditionOID");
        return $(`ConditionDef[OID="${oid}"]`);
    }
}

export function getItemMethod(path) {
    let methodRef = $(`ItemGroupDef[OID="${path.itemGroupOID}"] ItemRef[ItemOID="${path.itemOID}"][MethodOID]`);
    if (methodRef) {
        let oid = methodRef.getAttribute("MethodOID");
        return $(`MethodDef[OID="${oid}"]`);
    }
}

export function getStudyEventRepeating(studyEventOID) {
    // Ad hoc implementation, improve for OpenEDC 2.0
    return $(`StudyEventDef[OID="${studyEventOID}"]`)?.getAttribute("Repeating") ?? repeatingTypes.NO;
}

export function setStudyEventRepeating(studyEventOID, repeating) {
    $(`StudyEventDef[OID="${studyEventOID}"]`).setAttribute("Repeating", repeating);
}

export function isStudyEventRepeating(studyEventOID) {
    return $(`StudyEventDef[OID="${studyEventOID}"]`).getAttribute('Repeating') && $(`StudyEventDef[OID="${studyEventOID}"]`).getAttribute('Repeating') == "Yes";
}

export function getItemMeasurementUnit(itemOID) {
    let measurementUnitRef = $(`ItemDef[OID="${itemOID}"] MeasurementUnitRef`);

    if (measurementUnitRef) {
        let oid = measurementUnitRef.getAttribute("MeasurementUnitOID");
        return $(`MeasurementUnit[OID="${oid}"]`);
    }
}

export function getItems() {
    return Array.from($$("ItemDef"));
}

export function getItemPaths(options) {
    return getItemPathsForStudyEvents(null, options);
}

export function getItemPathsForStudyEvents(sOIDs, options) {
    const itemPaths = [];
    for (const studyEventRef of $$(`Protocol StudyEventRef`)) {
        const studyEventOID = studyEventRef.getAttribute("StudyEventOID");
        if(sOIDs && !sOIDs.includes(studyEventOID)) continue;
        if (options && options.includeStudyEvents) itemPaths.push(new ODMPath(studyEventOID, formOID, itemGroup));
        for (const formRef of $$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)) {
            const formOID = formRef.getAttribute("FormOID");
            if (options && options.includeForms) itemPaths.push(new ODMPath(studyEventOID, formOID));
            for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
                const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
                if (options && options.includeItemGroups) itemPaths.push(new ODMPath(studyEventOID, formOID, itemGroupOID));
                for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
                    const itemOID = itemRef.getAttribute("ItemOID");
                    if (options && options.withCodeList) {
                        if (getCodeListOIDByItem(itemOID)) itemPaths.push(new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID));
                    } else {
                        itemPaths.push(new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID));
                    }
                }
            }
        }
    }
    return itemPaths;
}

export function getElementRefs(elementOID, elementType) {
    switch (elementType) {
        case ODMPath.elements.STUDYEVENT:
            return Array.from($$(`StudyEventRef[StudyEventOID="${elementOID}"]`));
        case ODMPath.elements.FORM:
            return Array.from($$(`FormRef[FormOID="${elementOID}"]`));
        case ODMPath.elements.ITEMGROUP:
            return Array.from($$(`ItemGroupRef[ItemGroupOID="${elementOID}"]`));
        case ODMPath.elements.ITEM:
            return Array.from($$(`ItemRef[ItemOID="${elementOID}"]`));
        case ODMPath.elements.CODELISTITEM:
            return Array.from($$(`CodeListRef[CodeListOID="${elementOID}"]`));
    }
}

export function setElementOID(elementOID, elementType, newOID) {
    if ($(`[OID="${newOID}"]`)) return Promise.reject();

    switch (elementType) {
        case ODMPath.elements.STUDYEVENT:
            $$(`StudyEventRef[StudyEventOID="${elementOID}"]`).forEach(studyEventRef => studyEventRef.setAttribute("StudyEventOID", newOID));
            $(`StudyEventDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case ODMPath.elements.FORM:
            $$(`FormRef[FormOID="${elementOID}"]`).forEach(formRef => formRef.setAttribute("FormOID", newOID));
            $(`FormDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case ODMPath.elements.ITEMGROUP:
            $$(`ItemGroupRef[ItemGroupOID="${elementOID}"]`).forEach(itemGroupRef => itemGroupRef.setAttribute("ItemGroupOID", newOID));
            $(`ItemGroupDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case ODMPath.elements.ITEM:
            $$(`ItemRef[ItemOID="${elementOID}"]`).forEach(itemRef => itemRef.setAttribute("ItemOID", newOID));
            $(`ItemDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
    }

    return Promise.resolve();
}

export function setElementName(elementOID, name) {
    $(`[OID="${elementOID}"]`).setAttribute("Name", name);
}

export function setElementDescription(elementOID, description) {
    let translatedText = $(`[OID="${elementOID}"] Description TranslatedText[*|lang="${languageHelper.getCurrentLocale()}"]`);
    if (translatedText && description) {
        translatedText.textContent = description;
    } else if (translatedText && !description) {
        translatedText.remove();
        if (!$(`[OID="${elementOID}"] Description TranslatedText`)) $(`[OID="${elementOID}"] Description`).remove();
    } else if (!translatedText && description) {
        let elementDescription = $(`[OID="${elementOID}"] Description`);
        if (!elementDescription) $(`[OID="${elementOID}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getDescription());
        $(`[OID="${elementOID}"] Description`).appendChild(metadataTemplates.getTranslatedText(description, languageHelper.getCurrentLocale()));
    }
}

export function setItemQuestion(itemOID, question) {
    let translatedText = $(`ItemDef[OID="${itemOID}"] Question TranslatedText[*|lang="${languageHelper.getCurrentLocale()}"]`);
    if (translatedText && question) {
        translatedText.textContent = question;
    } else if (translatedText && !question) {
        translatedText.remove();
        if (!$(`[OID="${itemOID}"] Question TranslatedText`)) $(`[OID="${itemOID}"] Question`).remove();
    } else if (!translatedText && question) {
        let itemQuestion = $(`ItemDef[OID="${itemOID}"] Question`);
        if (!itemQuestion) {
            //if description exists, it has to be inserted after description, otherwise as first element
            let itemDescription = $(`ItemDef[OID="${itemOID}"] Description`);
            if(itemDescription)
                itemDescription.insertAdjacentElement("afterend", metadataTemplates.getQuestion());
            else
                $(`[OID="${itemOID}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getQuestion());
        }
        $(`ItemDef[OID="${itemOID}"] Question`).appendChild(metadataTemplates.getTranslatedText(question, languageHelper.getCurrentLocale()));
    }
}

export function setConditionFormalExpression(conditionOID, formalExpression) {
    // Since ODM only provides a CollectionExceptionCondition, but a CollectionCondition is much more user friendly, the expression is negated
    const negatedFormalExpression = `!(${formalExpression})`;
    const formalExpressionElement = $(`ConditionDef[OID="${conditionOID}"] FormalExpression`);
    formalExpressionElement.setAttribute("Context", "OpenEDC");
    formalExpressionElement.textContent = negatedFormalExpression;
}

export function setMethodFormalExpression(methodOID, formalExpression) {
    const formalExpressionElement = $(`MethodDef[OID="${methodOID}"] FormalExpression`);
    formalExpressionElement.setAttribute("Context", "OpenEDC");
    formalExpressionElement.textContent = formalExpression;
}

export function setMeasurementUnitSymbol(measurementUnitOID, symbol) {
    let translatedText = $(`MeasurementUnit[OID="${measurementUnitOID}"] Symbol TranslatedText[*|lang="${languageHelper.getCurrentLocale()}"]`);
    if (translatedText) {
        translatedText.textContent = symbol;
    } else {
        $(`MeasurementUnit[OID="${measurementUnitOID}"] Symbol`).appendChild(metadataTemplates.getTranslatedText(symbol, languageHelper.getCurrentLocale()));
    }
}

export function setItemDataType(itemOID, dataType) {
    $(`[OID="${itemOID}"]`).setAttribute("DataType", dataType);
}

export function setElementMandatory(elementType, path, mandatory) {
    switch (elementType) {
        case ODMPath.elements.STUDYEVENT:
            $(`StudyEventRef[StudyEventOID="${path.studyEventOID}"]`).setAttribute("Mandatory", mandatory);
            break;
        case ODMPath.elements.FORM:
            $(`StudyEventDef[OID="${path.studyEventOID}"] FormRef[FormOID="${path.formOID}"]`).setAttribute("Mandatory", mandatory);
            break;
        case ODMPath.elements.ITEMGROUP:
            $(`FormDef[OID="${path.formOID}"] ItemGroupRef[ItemGroupOID="${path.itemGroupOID}"]`).setAttribute("Mandatory", mandatory);
            break;
        case ODMPath.elements.ITEM:
            $(`ItemGroupDef[OID="${path.itemGroupOID}"] ItemRef[ItemOID="${path.itemOID}"]`).setAttribute("Mandatory", mandatory);
    }
}

export function setCodeListDataType(codeListOID, codeListType) {
    $(`[OID="${codeListOID}"]`).setAttribute("DataType", codeListType);
}

export function setCodeListItemCodedValue(codeListOID, codedValue, newCodedValue) {
    if ($(`[OID="${codeListOID}"] CodeListItem[CodedValue="${newCodedValue}"]`)) return Promise.reject();
    
    $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`).setAttribute("CodedValue", newCodedValue);
    return Promise.resolve();
}

export function setCodeListItemDecodedText(codeListOID, codedValue, decodedText) {
    let translatedText = $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode TranslatedText[*|lang="${languageHelper.getCurrentLocale()}"]`);
    if (translatedText && decodedText) {
        translatedText.textContent = decodedText;
    } else if (translatedText && !decodedText) {
        translatedText.remove();
        if (!$(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode TranslatedText`)) {
            $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`).remove();
        }
    } else if (!translatedText && decodedText) {
        let codeListItemDecode = $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`);
        if (!codeListItemDecode) {
            $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getDecode());
        }
        $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`).appendChild(metadataTemplates.getTranslatedText(decodedText, languageHelper.getCurrentLocale()));
    }
}

export function setElementAlias(path, context, name) {
    if (path.last.element != ODMPath.elements.CODELISTITEM) {
        $(`[OID="${path.last.value}"]`).appendChild(metadataTemplates.getAlias(context, name));
    } else {
        const codeListOID = getCodeListOIDByItem(path.itemOID);
        $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${path.codeListItem}"]`).appendChild(metadataTemplates.getAlias(context, name));
    } 
}

export function setItemRangeCheck(itemOID, comparator, checkValue) {
    let insertPosition = $$(`[OID="${itemOID}"] RangeCheck`).getLastElement();
    if (!insertPosition) {
        insertPosition = $(`[OID="${itemOID}"] MeasurementUnitRef`);
    }
    if (!insertPosition) {
        insertPosition = $(`[OID="${itemOID}"] Question`);
    }

    insertPosition.insertAdjacentElement("afterend", metadataTemplates.getRangeCheck(comparator, checkValue));
}

export function setElementRefCondition(elementRef, conditionOID) {
    if (conditionOID) elementRef.setAttribute("CollectionExceptionConditionOID", conditionOID);
    else elementRef.removeAttribute("CollectionExceptionConditionOID");
}

export function setElementRefMethod(elementRef, methodOID) {
    if (methodOID) elementRef.setAttribute("MethodOID", methodOID);
    else elementRef.removeAttribute("MethodOID");
}

export function setItemDefMeasurementUnit(itemDef, measurementUnitOID) {
    let measurementUnitRef = itemDef.querySelector("MeasurementUnitRef");
    if (measurementUnitOID) {
        if (measurementUnitRef) {
            measurementUnitRef.setAttribute("MeasurementUnitOID", measurementUnitOID);
        } else {
            measurementUnitRef = metadataTemplates.getMeasurementUnitRef(measurementUnitOID);
            const insertPosition = itemDef.querySelector("Question");
            if (insertPosition) insertPosition.insertAdjacentElement("afterend", measurementUnitRef);
            else itemDef.appendChild(measurementUnitRef);
        }
    } else {
        if (measurementUnitRef) measurementUnitRef.remove();
    }
}

function generateUniqueOID(oidPrefix) {
    let count = 1;
    while (getElementDefByOID(oidPrefix + count)) count += 1;

    return oidPrefix + count;
}

function generateUniqueCodedValue(codeListOID) {
    let count = 1;
    while ($(`[OID="${codeListOID}"] CodeListItem[CodedValue="${count}"]`)) count += 1;

    return count;
}

export function createStudyEvent() {
    const newStudyEventOID = generateUniqueOID("SE.");
    insertStudyEventRef(metadataTemplates.getStudyEventRef(newStudyEventOID));
    insertElementDef(metadataTemplates.getStudyEventDef(newStudyEventOID, languageHelper.getTranslation("new-event")));
    
    return newStudyEventOID;
}

export function insertStudyEventRef(studyEventRef) {
    $("Protocol").appendChild(studyEventRef);
}

// TODO: .tagName approach could also be used for insertElementRef
function insertElementDef(elementDef) {
    const insertPositionDef = $$(elementDef.tagName).getLastElement();
    if (insertPositionDef) {
        insertPositionDef.insertAdjacentElement("afterend", elementDef);
    } else {
        // CodeLists must be inserted before Conditions and Conditions before Methods (the order of other elements is naturally preserved)
        if (elementDef.tagName == "CodeList") $("ItemDef") ? $$("ItemDef").getLastElement().insertAdjacentElement("afterend", elementDef) : $("MetaDataVersion").appendChild(elementDef);
        else if (elementDef.tagName == "ConditionDef") $("MethodDef") ? $("MethodDef").insertAdjacentElement("beforebegin", elementDef) : $("MetaDataVersion").appendChild(elementDef);
        else $("MetaDataVersion").appendChild(elementDef);
    }
}

export function createForm(studyEventOID) {
    const newFormOID = generateUniqueOID("F.");
    insertFormRef(metadataTemplates.getFormRef(newFormOID), studyEventOID);
    insertElementDef(metadataTemplates.getFormDef(newFormOID, languageHelper.getTranslation("new-form")));

    return newFormOID;
}

export function insertFormRef(formRef, studyEventOID) {
    let insertPositionRef = $$(`[OID="${studyEventOID}"] FormRef`).getLastElement();
    if (insertPositionRef) {
        insertPositionRef.insertAdjacentElement("afterend", formRef);
    } else {
        insertPositionRef = $(`[OID="${studyEventOID}"] Alias`);
        if (insertPositionRef) {
            insertPositionRef.insertAdjacentElement("beforebegin", formRef);
        } else {
            $(`[OID="${studyEventOID}"]`).insertAdjacentElement("beforeend", formRef);
        }
    }
}

export function createItemGroup(formOID) {
    const newItemGroupOID = generateUniqueOID("IG.");
    insertItemGroupRef(metadataTemplates.getItemGroupRef(newItemGroupOID), formOID);
    insertElementDef(metadataTemplates.getItemGroupDef(newItemGroupOID, languageHelper.getTranslation("new-group")));

    return newItemGroupOID;
}

export function insertItemGroupRef(itemGroupRef, formOID) {
    let insertPositionRef = $$(`[OID="${formOID}"] ItemGroupRef`).getLastElement();
    if (insertPositionRef) {
        insertPositionRef.insertAdjacentElement("afterend", itemGroupRef);
    } else {
        insertPositionRef = $(`[OID="${formOID}"] Alias`);
        if (insertPositionRef) {
            insertPositionRef.insertAdjacentElement("beforebegin", itemGroupRef);
        } else {
            $(`[OID="${formOID}"]`).insertAdjacentElement("beforeend", itemGroupRef);
        }
    }
}

export function createItem(itemGroupOID) {
    const newItemOID = generateUniqueOID("I.");
    insertItemRef(metadataTemplates.getItemRef(newItemOID), itemGroupOID);
    insertElementDef(metadataTemplates.getItemDef(newItemOID, languageHelper.getTranslation("new-item")));

    return newItemOID;
}

export function insertItemRef(itemRef, itemGroupOID) {
    let insertPositionRef = $$(`[OID="${itemGroupOID}"] ItemRef`).getLastElement();
    if (insertPositionRef) {
        insertPositionRef.insertAdjacentElement("afterend", itemRef);
    } else {
        insertPositionRef = $(`[OID="${itemGroupOID}"] Alias`);
        if (insertPositionRef) {
            insertPositionRef.insertAdjacentElement("beforebegin", itemRef);
        } else {
            $(`[OID="${itemGroupOID}"]`).insertAdjacentElement("beforeend", itemRef);
        }
    }
}

export function createCodeList(itemOID) {
    const newCodeListOID = generateUniqueOID("CL.");
    insertCodeListRef(metadataTemplates.getCodeListRef(newCodeListOID), itemOID);
    insertElementDef(metadataTemplates.getCodeListDef(newCodeListOID));

    return newCodeListOID;
}

// TODO: insertPositionRef approach similar to insertItemRef, insertItemGroupRef, and insertFormRef -- should be abstracted in the future
export function insertCodeListRef(codeListRef, itemOID) {
    let insertPositionRef = $$(`[OID="${itemOID}"] Question`).getLastElement();
    if (insertPositionRef) {
        insertPositionRef.insertAdjacentElement("afterend", codeListRef);
    } else {
        insertPositionRef = $(`[OID="${itemOID}"] Alias`);
        if (insertPositionRef) {
            insertPositionRef.insertAdjacentElement("beforebegin", codeListRef);
        } else {
            $(`[OID="${itemOID}"]`).insertAdjacentElement("beforeend", codeListRef);
        }
    }
}

// Currently, use the generated OID also as name and description for usability purposes (for conditions, methods, and measurement units)
// Prospectively, a user could be asked to enter a name and description for a new condition
export function createCondition(formalExpression) {
    const newConditionOID = generateUniqueOID("C.");
    insertElementDef(metadataTemplates.getConditionDef(newConditionOID, newConditionOID, newConditionOID, languageHelper.getCurrentLocale(), formalExpression));
    
    return newConditionOID;
}

export function createMethod(formalExpression) {
    const newMethodOID = generateUniqueOID("M.");
    insertElementDef(metadataTemplates.getMethodDef(newMethodOID, newMethodOID, newMethodOID, languageHelper.getCurrentLocale(), formalExpression));
    
    return newMethodOID;
}

export function createMeasurementUnit(symbol) {
    const newMeasurementUnitOID = generateUniqueOID("MU.");
    insertMeasurementUnit(metadataTemplates.getMeasurementUnitDef(newMeasurementUnitOID, newMeasurementUnitOID, symbol, languageHelper.getCurrentLocale()));

    return newMeasurementUnitOID;
}

function insertMeasurementUnit(measurementUnit) {
    if (!$("BasicDefinitions")) $("GlobalVariables").insertAdjacentElement("afterend", metadataTemplates.getBasicDefintions());
    $("BasicDefinitions").appendChild(measurementUnit);
}

export function addCodeListItem(codeListOID, codedValue) {
    if (!codedValue) codedValue = generateUniqueCodedValue(codeListOID);
    let codeList = getElementDefByOID(codeListOID);
    
    codeList.appendChild(metadataTemplates.getCodeListItem(codedValue));

    return codedValue;
}

export function insertCodeListItem(codeListItem, codeListOID) {
    getElementDefByOID(codeListOID).appendChild(codeListItem);
}

export function addCodeListRef(itemOID, codeListOID) {
    insertCodeListRef(metadataTemplates.getCodeListRef(codeListOID), itemOID);
}

export function removeStudyEventRef(studyEventOID) {
    $(`StudyEventRef[StudyEventOID="${studyEventOID}"]`).remove();
    safeDeleteStudyEvent(studyEventOID);
}

export function removeFormRef(studyEventOID, formOID) {
    $(`StudyEventDef[OID="${studyEventOID}"] FormRef[FormOID="${formOID}"]`).remove();
    safeDeleteForm(formOID);
}

export function removeItemGroupRef(formOID, itemGroupOID) {
    $(`FormDef[OID="${formOID}"] ItemGroupRef[ItemGroupOID="${itemGroupOID}"]`).remove();
    safeDeleteItemGroup(itemGroupOID);
}

export function removeItemRef(itemGroupOID, itemOID) {
    $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`).remove();
    safeDeleteItem(itemOID);
}

export function removeCodeListRef(itemOID, codeListOID) {
    $(`ItemDef[OID="${itemOID}"] CodeListRef[CodeListOID="${codeListOID}"]`).remove();
    safeDeleteCodeList(codeListOID);
}

function safeDeleteStudyEvent(studyEventOID) {
    // Get all Forms within the StudyEvent and safe-delete them
    let formOIDs = Array.from($$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)).map(item => item.getAttribute("FormOID"));
    // Search for other references of the StudyEvent and delete the Def only if there is no one left
    if (!$(`StudyEventRef[StudyEventOID="${studyEventOID}"]`)) $(`StudyEventDef[OID="${studyEventOID}"]`)?.remove();
    for (let formOID of formOIDs) {
        safeDeleteForm(formOID);
    }
}

function safeDeleteForm(formOID) {
    // Get all ItemGroups within the Form and safe-delete them
    let itemGroupOIDs = Array.from($$(`FormDef[OID="${formOID}"] ItemGroupRef`)).map(item => item.getAttribute("ItemGroupOID"));
    // Search for other references of the Form and delete the Def only if there is no one left
    if (!$(`FormRef[FormOID="${formOID}"]`)) $(`FormDef[OID="${formOID}"]`)?.remove();
    for (let itemGroupOID of itemGroupOIDs) {
        safeDeleteItemGroup(itemGroupOID);
    }
}

function safeDeleteItemGroup(itemGroupOID) {
    // Get all Items within the ItemGroup and safe-delete them
    let itemOIDs = Array.from($$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)).map(item => item.getAttribute("ItemOID"));
    // Search for other references of the ItemGroup and delete the Def only if there is no one left
    if (!$(`ItemGroupRef[ItemGroupOID="${itemGroupOID}"]`)) $(`ItemGroupDef[OID="${itemGroupOID}"]`)?.remove();
    for (let itemOID of itemOIDs) {
        safeDeleteItem(itemOID);
    }
}

function safeDeleteItem(itemOID) {
    // Get the CodeList within the Item and remove it
    let codeListRef = $(`ItemDef[OID="${itemOID}"] CodeListRef`);
    // Search for other references of the Item and delete the Def only if there is no one left
    if (!$(`ItemRef[ItemOID="${itemOID}"]`)) $(`ItemDef[OID="${itemOID}"]`)?.remove();
    if (codeListRef) safeDeleteCodeList(codeListRef.getAttribute("CodeListOID"));
}

function safeDeleteCodeList(codeListOID) {
    // Search for other references of the CodeList and delete the Def only if there is no one left
    if (!$(`CodeListRef[CodeListOID="${codeListOID}"]`)) $(`CodeList[OID="${codeListOID}"]`)?.remove();
}

export function deleteCodeListItem(codeListOID, codedValue) {
    $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`)?.remove();
}

export function safeDeleteCondition(conditionOID) {
    if (!$(`[CollectionExceptionConditionOID="${conditionOID}"]`)) $(`ConditionDef[OID="${conditionOID}"]`)?.remove();
}

export function safeDeleteMethod(methodOID) {
    if (!$(`[MethodOID="${methodOID}"]`)) $(`MethodDef[OID="${methodOID}"]`)?.remove();
}

export function safeDeleteMeasurementUnit(measurementUnitOID) {
    if (!$(`MeasurementUnitRef[MeasurementUnitOID="${measurementUnitOID}"]`)) $(`MeasurementUnit[OID="${measurementUnitOID}"]`)?.remove();
}

export function deleteElementAliases(path) {
    if (path.last.element != ODMPath.elements.CODELISTITEM) {
        $$(`[OID="${path.last.value}"] Alias`).removeElements();
    } else {
        const codeListOID = getCodeListOIDByItem(path.itemOID);
        $$(`[OID="${codeListOID}"] CodeListItem[CodedValue="${path.codeListItem}"] Alias`).removeElements();
    }
}

export function deleteRangeChecksOfItem(itemOID) {
    $$(`[OID="${itemOID}"] RangeCheck`).removeElements();
}

export function copyStudyEvent(studyEventOID, deepCopy) {
    let newStudyEventOID = generateUniqueOID("SE.");

    let studyEventRef = $(`StudyEventRef[StudyEventOID="${studyEventOID}"]`);
    studyEventRef.insertAdjacentElement("afterend", metadataTemplates.getStudyEventRef(newStudyEventOID));

    let studyEventDef = $(`StudyEventDef[OID="${studyEventOID}"]`);
    let studyEventDefClone = studyEventDef.cloneNode(true);
    studyEventDefClone.setAttribute("OID", newStudyEventOID);
    studyEventDef.insertAdjacentElement("afterend", studyEventDefClone);

    if (deepCopy) {
        let replacedOIDs = {};
        replacedOIDs[studyEventOID] = newStudyEventOID;
        let formRefs = studyEventDefClone.querySelectorAll(`FormRef`);
        for (let formRef of formRefs) {
            let {newFormOID, ...info} = copyForm(formRef.getAttribute("FormOID"), true, null, replacedOIDs);
            formRef.setAttribute("FormOID", newFormOID);
            replacedOIDs = info.replacedOIDs;
        }
    }
    
    return {newStudyEventOID};
}

export function copyForm(formOID, deepCopy, studyEventOID, replacedOIDs = {}) {
    let newFormOID = generateUniqueOID("F.");

    if (studyEventOID) {
        let formRef = $(`StudyEventDef[OID="${studyEventOID}"] FormRef[FormOID="${formOID}"]`);
        formRef.insertAdjacentElement("afterend", metadataTemplates.getFormRef(newFormOID));
    }

    let formDef = $(`FormDef[OID="${formOID}"]`);
    let formDefClone = formDef.cloneNode(true);
    formDefClone.setAttribute("OID", newFormOID);
    formDef.insertAdjacentElement("afterend", formDefClone);

    if (deepCopy) {
        replacedOIDs[formOID] = newFormOID;
        let itemGroupRefs = formDefClone.querySelectorAll(`ItemGroupRef`);
        for (let itemGroupRef of itemGroupRefs) {
            let {newItemGroupOID,...info} = copyItemGroup(itemGroupRef.getAttribute("ItemGroupOID"), true, null, replacedOIDs);
            itemGroupRef.setAttribute("ItemGroupOID", newItemGroupOID);
            replacedOIDs = info.replacedOIDs;
        }
    }
    return {newFormOID, replacedOIDs};
}

export function copyItemGroup(itemGroupOID, deepCopy, formOID, replacedOIDs = {}) {
    let newItemGroupOID = generateUniqueOID("IG.");

    if (formOID) {
        let itemGroupRef = $(`FormDef[OID="${formOID}"] ItemGroupRef[ItemGroupOID="${itemGroupOID}"]`);
        itemGroupRef.insertAdjacentElement("afterend", metadataTemplates.getItemGroupRef(newItemGroupOID));
    }

    let itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    let itemGroupDefClone = itemGroupDef.cloneNode(true);
    itemGroupDefClone.setAttribute("OID", newItemGroupOID);
    itemGroupDef.insertAdjacentElement("afterend", itemGroupDefClone);

    if (deepCopy) {
        replacedOIDs[itemGroupOID] = newItemGroupOID;
        let itemRefs = itemGroupDefClone.querySelectorAll(`ItemRef`);
        for (let itemRef of itemRefs) {
            let {newItemOID,...info} = copyItem(itemRef.getAttribute("ItemOID"), true, null, replacedOIDs);
            itemRef.setAttribute("ItemOID", newItemOID);
            let collectionExceptionConditionOID = itemRef.getAttribute('CollectionExceptionConditionOID');
            if(collectionExceptionConditionOID){
                let newConditionDefOID =  copyConditionDef(collectionExceptionConditionOID, replacedOIDs);
                itemRef.setAttribute('CollectionExceptionConditionOID', newConditionDefOID);
            }
            let methodOID = itemRef.getAttribute('MethodOID');
            if(methodOID){
                let newMethodOID = copyMethodDef(methodOID, replacedOIDs);
                itemRef.setAttribute('MethodOID', newMethodOID)
            }
            replacedOIDs = info.replacedOIDs;
        }
    }
    return {newItemGroupOID, replacedOIDs};
}

export function copyItem(itemOID, deepCopy, itemGroupOID, replacedOIDs = {}) {
    let newItemOID = generateUniqueOID("I.");

    if (itemGroupOID) {
        let itemRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`);
        itemRef.insertAdjacentElement("afterend", metadataTemplates.getItemRef(newItemOID));
        let collectionExceptionConditionOID = itemRef.getAttribute('CollectionExceptionConditionOID');
        if(collectionExceptionConditionOID){
            let newConditionDefOID = copyConditionDef(collectionExceptionConditionOID, replacedOIDs);
            $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${newItemOID}"]`).setAttribute('CollectionExceptionConditionOID', newConditionDefOID)
        }

        let methodOID = itemRef.getAttribute('MethodOID');
        if(methodOID){
            let newMethodOID = copyMethodDef(methodOID, replacedOIDs);
            $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${newItemOID}"]`).setAttribute('MethodOID', newMethodOID)
        }

        let mandatory = itemRef.getAttribute('Mandatory');
        if(mandatory) {
            $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${newItemOID}"]`).setAttribute('Mandatory', mandatory);
        }
    }

    let itemDef = $(`ItemDef[OID="${itemOID}"]`);
    let itemDefClone = itemDef.cloneNode(true);
    itemDefClone.setAttribute("OID", newItemOID);
    itemDef.insertAdjacentElement("afterend", itemDefClone);

    if (deepCopy) {
        replacedOIDs[itemOID]  =newItemOID;
        let codeListRef = itemDefClone.querySelector("CodeListRef");
        if (codeListRef) {
            let newCodeListOID = copyCodeList(codeListRef.getAttribute("CodeListOID"));
            codeListRef.setAttribute("CodeListOID", newCodeListOID);
        }
    }
    return {newItemOID, replacedOIDs};
}

export function copyCodeList(codeListOID) {
    let newCodeListOID = generateUniqueOID("CL.");

    let codeListDef = $(`CodeList[OID="${codeListOID}"]`);
    let codeListDefClone = codeListDef.cloneNode(true);
    codeListDefClone.setAttribute("OID", newCodeListOID);

    codeListDef.insertAdjacentElement("afterend", codeListDefClone);

    return newCodeListOID;
}

function copyConditionDef(conditionDefOID, replacedOIDs) {
    let newConditionDefOID = generateUniqueOID("CD.");
    let conditionDef = $(`ConditionDef[OID="${conditionDefOID}"]`);
    let conditionDefClone = conditionDef.cloneNode(true);
    conditionDefClone.setAttribute("OID", newConditionDefOID);
    if(replacedOIDs){
        Object.keys(replacedOIDs).forEach(oldOID => {
            conditionDefClone.querySelector("FormalExpression").textContent = conditionDefClone.querySelector("FormalExpression").textContent.replace(new RegExp(`${oldOID}([\\s*\\/+<>^=?:()-]|$)`, "g"), `${replacedOIDs[oldOID]}$1`);
        });
    }
    conditionDef.insertAdjacentElement("afterend", conditionDefClone);
    return newConditionDefOID;
}

function copyMethodDef(methodOID, replacedOIDs) {
    let newMethodOID = generateUniqueOID("M.");
    let methodDef = $(`MethodDef[OID="${methodOID}"]`);
    let methodDefClone = methodDef.cloneNode(true);
    methodDefClone.setAttribute("OID", newMethodOID);
    if(replacedOIDs){
        Object.keys(replacedOIDs).forEach(oldOID => {
            methodDefClone.querySelector("FormalExpression").textContent = methodDefClone.querySelector("FormalExpression").textContent.replace(new RegExp(`${oldOID}([\\s*\\/+<>^=?:()-]|$)`, "g"), `${replacedOIDs[oldOID]}$1`);
        });
    }
    methodDef.insertAdjacentElement("afterend", methodDefClone);
    return newMethodOID;
}

export function getHierarchyLevelOfElementType(elementType) {
    switch (elementType) {
        case ODMPath.elements.STUDYEVENT:
            return 0;
        case ODMPath.elements.FORM:
            return 1;
        case ODMPath.elements.ITEMGROUP:
            return 2;
        case ODMPath.elements.ITEM:
            return 3;
        case ODMPath.elements.CODELISTITEM:
            return 4;
    }
}

export async function mergeMetadata(odmXMLString) {
    // Simply import the metadata if there is no one yet
    if (!metadata) importMetadata(odmXMLString);
    else {
        // Create a register of all OIDs that need to be replaced with a new unique OID
        let replaceOIDs = {};

        // RegExp to get all OIDs does not work as Safari currently does not support lookbehind (odmXMLString.match(/(?<= OID\=\")(.*?)(?=\")/g).forEach ... )
        const odmCandidate = new DOMParser().parseFromString(odmXMLString, "text/xml");
        odmCandidate.querySelectorAll("[OID]").forEach(element => {
            const oid = element.getOID();
            if (getElementDefByOID(oid) || Object.values(replaceOIDs).includes(oid)) {
                const oidPrefix = oid.split(".")[0] + ".";
                let count = 1;
                while (getElementDefByOID(oidPrefix + count) || Object.values(replaceOIDs).includes(oidPrefix + count) || odmCandidate.querySelector(`[OID="${oidPrefix + count}"]`)) count += 1;
                replaceOIDs[oid] = oidPrefix + count;
            }
        });

        // Replace all OIDs that need to be replaced. Also consider ConditionDefs and MethodDefs
        
        Object.keys(replaceOIDs).reverse().forEach(oldOID => {
            odmXMLString = odmXMLString.replace(new RegExp(`OID="${oldOID}"`, "g"), `OID="${replaceOIDs[oldOID]}"`)
        });

        // Replace old OIDs by new OIDs in every conditionDef and methodDef


        const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
        let conditionDefs = odm.querySelectorAll("ConditionDef");
        let methodDefs = odm.querySelectorAll("MethodDef");
        Object.keys(replaceOIDs).forEach(oldOID => {
            conditionDefs.forEach(c => {
                c.querySelector("FormalExpression").textContent = c.querySelector("FormalExpression").textContent.replace(new RegExp(oldOID, "g"), replaceOIDs[oldOID]);
            });
            methodDefs.forEach(m => {
                m.querySelector("FormalExpression").textContent = m.querySelector("FormalExpression").textContent.replace(new RegExp(oldOID, "g"), replaceOIDs[oldOID]);
            });
        });

        // Remove OpenEDC data status code list if present (used to interpret the flag of clinical data entries; will be created on download again)
        // TODO: This is similar to importMetadata() and should be abstracted, e.g., in validateODM()
        odm.querySelector(`CodeList[OID="${dataStatusCodeListOID}"]`)?.remove();

        // Merge the new model into the old one
        odm.querySelectorAll("MeasurementUnit").forEach(measurementUnit => insertMeasurementUnit(measurementUnit));
        odm.querySelectorAll("StudyEventRef").forEach(studyEventRef => insertStudyEventRef(studyEventRef));
        odm.querySelectorAll("StudyEventDef").forEach(studyEventDef => insertElementDef(studyEventDef));
        odm.querySelectorAll("FormDef").forEach(formDef => insertElementDef(formDef));
        odm.querySelectorAll("ItemGroupDef").forEach(itemGroupDef => insertElementDef(itemGroupDef));
        odm.querySelectorAll("ItemDef").forEach(itemDef => insertElementDef(itemDef));
        odm.querySelectorAll("CodeList").forEach(codeList => insertElementDef(codeList));
        odm.querySelectorAll("ConditionDef").forEach(conditionDef => insertElementDef(conditionDef));
        odm.querySelectorAll("MethodDef").forEach(methodDef => insertElementDef(methodDef));
    }

    await storeMetadata();
}

export function extractImageInfo(imageString, identifier) {
    if(!imageString.startsWith("![")) return {data: null, identifier: null};

    let name;
    let nameArray = imageString.match(/!\[[^\]]+?\]/);
    if(nameArray && nameArray.length > 0) {
        name = nameArray[0].replace('!', '').replace('[','').replace(']','');
    }

    let format = undefined;
    let width = undefined;
    let base64Data = undefined;

    let dataArray = imageString.match(/\(data.*?\)/);
    if(dataArray && dataArray.length > 0) {
        let data = dataArray[0];

        let formatArray = data.match(/image\/[a-z]+?;/);
        if(formatArray && formatArray.length > 0){
            format = formatArray[0].substring(formatArray[0].indexOf('/') + 1, formatArray[0].indexOf(';'));
        }

        const base64DataArray = data.split(',');
        if(base64DataArray.length > 1) base64Data = base64DataArray[1].replace(')','');
    }

    let settingsArray = imageString.match(/\[(?:[a-z]+:.*?;?)+\]/);
    if(settingsArray && settingsArray.length > 0) {
        let innerSplits = settingsArray[0].split(';');
        let widthSplit = innerSplits.find(innerSplit => innerSplit.split(":")[0].includes("width"));
        if(widthSplit) widthSplit = widthSplit.split(":");
        width = widthSplit && widthSplit.length == 2 ? widthSplit[1].replace(";","") : undefined;
    }

    identifier = identifier || makeid(20);;
    formImageDataMap[identifier] = new FormImage(format, base64Data, width, name);
    return {data: formImageDataMap[identifier], identifier}
    
}

export function getFormImageData(identifier) {
    return {data: formImageDataMap[identifier], identifier};
}

export function updateFormImageData(identifier, formImageData) {
    if(!identifier) return;
    formImageDataMap[identifier] = formImageData;
}

export function getImageSplitsForString(string) {
    if(!string) return [];
    return string.split(/(!\[.*?\](?:\(data:image\/[a-z]+;base64,[a-zA-Z0-9\/+=]+\))?(?:\[(?:[a-z]+:[a-zA-Z0-9%]+?)+;\])?)/g);
}

export function loadPossibleOpenEDCSettings() {
    fetch('./settings.json')
    .then(response => response.json())
    .then(data => loadSettings(SETTINGS_CONTEXT, data))
}

export function loadSettings(context, data) {
    loadedSettings.set(context, []);
    data.forEach(d => loadedSettings.get(context).push(new OpenEDCSetting(context, d)))
}

export function getCurrentElementSettings(path) {
    const aliasses = getElementAliases(path);
    const alias = [...aliasses].find(a => a.getAttribute('Context') == OPENEDC_SETTINGS_ALIAS_CONTEXT);
    if(alias) return JSON.parse(alias.getAttribute('Name'));
    return {};

}

export function getCurrentElementSettingsByOID(oid) {
    const aliasses = $$(`[OID="${oid}"] Alias`);
    const alias = [...aliasses].find(a => a.getAttribute('Context') == OPENEDC_SETTINGS_ALIAS_CONTEXT);
    if(alias) return JSON.parse(alias.getAttribute('Name'));
    return {}
}

export function getSettingStatus(context, option, path) {
    const settings = getCurrentElementSettings(path);
    if(!settings[context] || !settings[context][option]) return false;
    return settings[context][option];
}

export function getSettingStatusByOID(context, option, oid) {
    const settings = getCurrentElementSettingsByOID(oid);
    if(!settings[context] || !settings[context][option]) return false;
    return settings[context][option];
}

export function setCurrentElementSettings(path, settings) {
    const aliasses = getElementAliases(path);
    const alias = [...aliasses].find(a => a.getAttribute('Context') == OPENEDC_SETTINGS_ALIAS_CONTEXT);
    if(alias) alias.setAttribute('Name', JSON.stringify(settings));
    else setElementAlias(path, OPENEDC_SETTINGS_ALIAS_CONTEXT, JSON.stringify(settings));
}

export function setCurrentElementSettingsByOID(oid, settings) {
    const aliasses = $$(`[OID="${oid}"] Alias`);
    const alias = [...aliasses].find(a => a.getAttribute('Context') == OPENEDC_SETTINGS_ALIAS_CONTEXT);
    if(alias) alias.setAttribute('Name', JSON.stringify(settings));
    else setElementAlias(path, OPENEDC_SETTINGS_ALIAS_CONTEXT, JSON.stringify(settings));
}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
