import * as metadataTemplates from "../odmtemplates/metadatatemplates.js";
import * as odmToHTML from "./odmtohtml.js";
import * as languageHelper from "./languagehelper.js";
import * as ioHelper from "./iohelper.js";

class MetadataFile {
    constructor(modifiedDate) {
        this.modifiedDate = modifiedDate || new Date();
    }

    static parse(fileName) {
        const modifiedDate = new Date(parseInt(fileName.split(ioHelper.fileNameSeparator)[1]));
        return new MetadataFile(modifiedDate);
    }

    get fileName() {
        return ioHelper.fileNames.metadata + ioHelper.fileNameSeparator + this.modifiedDate.getTime();
    }
}

export class ODMPath {
    static separator = "-";

    static parse(string) {
        const elements = string ? string.split(ODMPath.separator) : [];
        return new ODMPath(...Array(4 - elements.length), ...elements);
    }

    constructor(studyEventOID, formOID, itemGroupOID, itemOID) {
        this.studyEventOID = studyEventOID;
        this.formOID = formOID;
        this.itemGroupOID = itemGroupOID;
        this.itemOID = itemOID;
    }

    getRelative(contextPath) {
        if (this.studyEventOID != contextPath.studyEventOID) return this;
        else if (this.formOID != contextPath.formOID) return new ODMPath(null, this.formOID, this.itemGroupOID, this.itemOID);
        else if (this.itemGroupOID != contextPath.itemGroupOID) return new ODMPath(null, null, this.itemGroupOID, this.itemOID);
        else return new ODMPath(null, null, null, this.itemOID);
    }

    getAbsolute(contextPath) {
        return new ODMPath(
            this.studyEventOID ? this.studyEventOID : contextPath.studyEventOID,
            this.formOID ? this.formOID : contextPath.formOID,
            this.itemGroupOID ? this.itemGroupOID : contextPath.itemGroupOID,
            this.itemOID
        );
    }

    toString() {
        const separator = ODMPath.separator;
        return (this.studyEventOID ? this.studyEventOID + separator : "") + (this.formOID ? this.formOID + separator : "") + (this.itemGroupOID ? this.itemGroupOID + separator : "") + this.itemOID;
    }
}

const $ = query => metadata.querySelector(query);
const $$ = query => metadata.querySelectorAll(query);

export const elementTypes = {
    STUDYEVENT: "studyevent",
    FORM: "form",
    ITEMGROUP: "itemgroup",
    ITEM: "item",
    CODELIST: "codelist",
    CODELISTITEM: "codelistitem"
}

const expressionTypes = {
    CONDITION: "condition",
    METHOD: "method"
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
    const exampleResponse = await fetch(ioHelper.getBaseURL() + "/odm/example.xml");
    const exampleODM = await exampleResponse.text();

    metadata = new DOMParser().parseFromString(exampleODM, "text/xml");
    setStudyName(languageHelper.getTranslation("exemplary-project"));

    await storeMetadata();
}

export async function loadStoredMetadata() {
    metadataFile = MetadataFile.parse(await ioHelper.getODMFileName(ioHelper.fileNames.metadata));
    metadata = await ioHelper.getXMLData(metadataFile.fileName);
}

export async function storeMetadata() {
    const previousFileName = metadataFile ? metadataFile.fileName : null;

    metadataFile = new MetadataFile();
    await ioHelper.storeXMLData(metadataFile.fileName, metadata);

    if (previousFileName && previousFileName != metadataFile.fileName) ioHelper.removeXMLData(previousFileName);
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

export async function getFormAsHTML(formOID, textAsTextarea) {
    return odmToHTML.getFormAsHTML(metadata, formOID, {
        locale: languageHelper.getCurrentLocale(),
        defaultLocale: languageHelper.untranslatedLocale,
        missingTranslation: languageHelper.getTranslation("missing-translation"),
        yes: languageHelper.getTranslation("yes"),
        no: languageHelper.getTranslation("no"),
        textAsTextarea: textAsTextarea
    });
}

export function prepareDownload(dataStatusTypes) {
    let odmCopy = new DOMParser().parseFromString(getSerializedMetadata(), "text/xml");

    odmCopy.querySelector("ODM").setAttribute("FileOID", getStudyName());
    odmCopy.querySelector("ODM").setAttribute("CreationDateTime", new Date().toISOString());

    // Remove the default/untranslated locale that might have been added during odmValidation / preparation
    odmCopy.querySelectorAll(`TranslatedText[*|lang="${languageHelper.untranslatedLocale}"]`).forEach(translatedText => translatedText.removeAttribute("xml:lang"));

    // Add a code list with all data status types but only when downloading the ODM with clinical data
    if (dataStatusTypes) {
        const dataStatusCodeList = getDataStatusCodeList(dataStatusTypes);
        const insertPosition = odmCopy.querySelectorAll("ItemDef").getLastElement();
        if (insertPosition) insertPosition.insertAdjacentElement("afterend", dataStatusCodeList);
    }
    
    return odmCopy;
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
    return codeListRef ? codeListRef.getAttribute("CodeListOID") : null;
}

export function getCodeListItem(codeListOID, codedValue) {
    if (!codeListOID || !codedValue) return;
    return $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`);
}

export function getElementRefByOID(elementOID, elementType, parentElementOID) {
    switch (elementType) {
        case elementTypes.STUDYEVENT:
            return $(`StudyEventRef[StudyEventOID="${elementOID}"]`);
        case elementTypes.FORM:
            return $(`StudyEventDef[OID="${parentElementOID}"] FormRef[FormOID="${elementOID}"]`);
        case elementTypes.ITEMGROUP:
            return $(`FormDef[OID="${parentElementOID}"] ItemGroupRef[ItemGroupOID="${elementOID}"]`);
        case elementTypes.ITEM:
            return $(`ItemGroupDef[OID="${parentElementOID}"] ItemRef[ItemOID="${elementOID}"]`);
    }
}

export function getElementDefByOID(elementOID) {
    return $(`[OID="${elementOID}"]`);
}

export function getAliasesByElement(elementOID, codeListItemCodedValue) {
    if (!codeListItemCodedValue) {
        return $$(`[OID="${elementOID}"] Alias`);
    } else {
        return $$(`[OID="${elementOID}"] CodeListItem[CodedValue="${codeListItemCodedValue}"] Alias`);
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

export function getElementsWithExpression(studyEventOID, formOID) {
    let elementsWithExpression = [];
    for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        const conditionOID = itemGroupRef.getAttribute("CollectionExceptionConditionOID");
        if (conditionOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, elementTypes.ITEMGROUP, new ODMPath(studyEventOID, formOID, itemGroupOID), conditionOID, expressionTypes.CONDITION);

        for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[CollectionExceptionConditionOID], ItemGroupDef[OID="${itemGroupOID}"] ItemRef[MethodOID]`)) {
            const itemOID = itemRef.getAttribute("ItemOID");
            const conditionOID = itemRef.getAttribute("CollectionExceptionConditionOID");
            const methodOID = itemRef.getAttribute("MethodOID");
            if (conditionOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, elementTypes.ITEM, new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID), conditionOID, expressionTypes.CONDITION);
            if (methodOID) elementsWithExpression = addElementWithExpression(elementsWithExpression, elementTypes.ITEM, new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID), methodOID, expressionTypes.METHOD);
        }
    }

    return elementsWithExpression;
}

function addElementWithExpression(elementList, elementType, elementPath, expressionOID, expressionType) {
    const expressionElement = expressionType == expressionTypes.CONDITION ? $(`ConditionDef[OID="${expressionOID}"]`) : $(`MethodDef[OID="${expressionOID}"]`);
    const formalExpression = expressionElement ? expressionElement.getFormalExpression() : null;
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

export function getElementCondition(elementType, elementOID, parentElementOID) {
    let conditionRef;
    switch (elementType) {
        case elementTypes.ITEMGROUP:
            conditionRef = $(`FormDef[OID="${parentElementOID}"] ItemGroupRef[ItemGroupOID="${elementOID}"][CollectionExceptionConditionOID]`);
            break;
        case elementTypes.ITEM:
            conditionRef = $(`ItemGroupDef[OID="${parentElementOID}"] ItemRef[ItemOID="${elementOID}"][CollectionExceptionConditionOID]`);
    }

    if (conditionRef) {
        let oid = conditionRef.getAttribute("CollectionExceptionConditionOID");
        return $(`ConditionDef[OID="${oid}"]`);
    }
}

export function getItemMethod(itemOID, itemGroupOID) {
    let methodRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"][MethodOID]`);
    if (methodRef) {
        let oid = methodRef.getAttribute("MethodOID");
        return $(`MethodDef[OID="${oid}"]`);
    }
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
    const itemPaths = [];
    for (const studyEventRef of $$(`Protocol StudyEventRef`)) {
        const studyEventOID = studyEventRef.getAttribute("StudyEventOID");
        for (const formRef of $$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)) {
            const formOID = formRef.getAttribute("FormOID");
            for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
                const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
                for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
                    const itemOID = itemRef.getAttribute("ItemOID");
                    if (!options) itemPaths.push(new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID));
                    else if (options.withCodeList && itemHasCodeList(itemOID)) itemPaths.push(new ODMPath(studyEventOID, formOID, itemGroupOID, itemOID));
                }
            }
        }
    }

    return itemPaths;
}

export function getElementRefs(elementOID, elementType) {
    switch (elementType) {
        case elementTypes.STUDYEVENT:
            return Array.from($$(`StudyEventRef[StudyEventOID="${elementOID}"]`));
        case elementTypes.FORM:
            return Array.from($$(`FormRef[FormOID="${elementOID}"]`));
        case elementTypes.ITEMGROUP:
            return Array.from($$(`ItemGroupRef[ItemGroupOID="${elementOID}"]`));
        case elementTypes.ITEM:
            return Array.from($$(`ItemRef[ItemOID="${elementOID}"]`));
        case elementTypes.CODELISTITEM:
            return Array.from($$(`CodeListRef[CodeListOID="${elementOID}"]`));
    }
}

// TODO: Could be removed -- getCodeListOIDByItem allows the same
export function itemHasCodeList(itemOID) {
    let codeListRef = $(`[OID="${itemOID}"] CodeListRef`)

    return codeListRef != null;
}

export function setElementOID(elementOID, elementType, newOID) {
    if ($(`[OID="${newOID}"]`)) return Promise.reject();

    switch (elementType) {
        case elementTypes.STUDYEVENT:
            $$(`StudyEventRef[StudyEventOID="${elementOID}"]`).forEach(studyEventRef => studyEventRef.setAttribute("StudyEventOID", newOID));
            $(`StudyEventDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case elementTypes.FORM:
            $$(`FormRef[FormOID="${elementOID}"]`).forEach(formRef => formRef.setAttribute("FormOID", newOID));
            $(`FormDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case elementTypes.ITEMGROUP:
            $$(`ItemGroupRef[ItemGroupOID="${elementOID}"]`).forEach(itemGroupRef => itemGroupRef.setAttribute("ItemGroupOID", newOID));
            $(`ItemGroupDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case elementTypes.ITEM:
            $$(`ItemRef[ItemOID="${elementOID}"]`).forEach(itemRef => itemRef.setAttribute("ItemOID", newOID));
            $(`ItemDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            break;
        case elementTypes.CODELIST:
            $$(`CodeListRef[CodeListOID="${elementOID}"]`).forEach(codeListRef => codeListRef.setAttribute("CodeListOID", newOID));
            $(`CodeList[OID="${elementOID}"]`).setAttribute("OID", newOID);
    }

    return Promise.resolve();
}

export function setElementName(elementOID, name) {
    $(`[OID="${elementOID}"]`).setAttribute("Name", name);
}

// TODO: Refactor -- passing the local as parameter is not required anymore since the metadatahelper has access to the language helper
export function setElementDescription(elementOID, description, locale) {
    let translatedText = $(`[OID="${elementOID}"] Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText && description) {
        translatedText.textContent = description;
    } else if (translatedText && !description) {
        translatedText.remove();
        if (!$(`[OID="${elementOID}"] Description TranslatedText`)) $(`[OID="${elementOID}"] Description`).remove();
    } else if (!translatedText && description) {
        let elementDescription = $(`[OID="${elementOID}"] Description`);
        if (!elementDescription) $(`[OID="${elementOID}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getDescription());
        $(`[OID="${elementOID}"] Description`).appendChild(metadataTemplates.getTranslatedText(description, locale));
    }
}

export function setItemQuestion(itemOID, question, locale) {
    let translatedText = $(`ItemDef[OID="${itemOID}"] Question TranslatedText[*|lang="${locale}"]`);
    if (translatedText && question) {
        translatedText.textContent = question;
    } else if (translatedText && !question) {
        translatedText.remove();
        if (!$(`[OID="${itemOID}"] Question TranslatedText`)) $(`[OID="${itemOID}"] Question`).remove();
    } else if (translatedText == null && question) {
        let itemQuestion = $(`ItemDef[OID="${itemOID}"] Question`);
        if (!itemQuestion) {
            $(`[OID="${itemOID}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getQuestion());
        }
        $(`ItemDef[OID="${itemOID}"] Question`).appendChild(metadataTemplates.getTranslatedText(question, locale));
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

export function setElementMandatory(elementOID, elementType, mandatory, parentElementOID) {
    switch (elementType) {
        case elementTypes.STUDYEVENT:
            $(`StudyEventRef[StudyEventOID="${elementOID}"]`).setAttribute("Mandatory", mandatory);
            break;
        case elementTypes.FORM:
            $(`StudyEventDef[OID="${parentElementOID}"] FormRef[FormOID="${elementOID}"]`).setAttribute("Mandatory", mandatory);
            break;
        case elementTypes.ITEMGROUP:
            $(`FormDef[OID="${parentElementOID}"] ItemGroupRef[ItemGroupOID="${elementOID}"]`).setAttribute("Mandatory", mandatory);
            break;
        case elementTypes.ITEM:
            $(`ItemGroupDef[OID="${parentElementOID}"] ItemRef[ItemOID="${elementOID}"]`).setAttribute("Mandatory", mandatory);
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

export function setCodeListItemDecodedText(codeListOID, codedValue, decodedText, locale) {
    let translatedText = $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode TranslatedText[*|lang="${locale}"]`);
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
        $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`).appendChild(metadataTemplates.getTranslatedText(decodedText, locale));
    }
}

export function setElementAlias(elementOID, codeListItemCodedValue, context, name) {
    if (!codeListItemCodedValue) {
        $(`[OID="${elementOID}"]`).appendChild(metadataTemplates.getAlias(context, name));
    } else {
        $(`[OID="${elementOID}"] CodeListItem[CodedValue="${codeListItemCodedValue}"]`).appendChild(metadataTemplates.getAlias(context, name));
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

export function insertCodeListRef(codeListRef, itemOID) {
    let insertPositionRef = $$(`[OID="${itemOID}"] Question`).getLastElement();
    if (insertPositionRef) {
        insertPositionRef.insertAdjacentElement("afterend", codeListRef);
    } else {
        $(`[OID="${itemOID}"]`).insertAdjacentElement("beforeend", codeListRef);
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
    getElementDefByOID(itemOID).appendChild(metadataTemplates.getCodeListRef(codeListOID));
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
    if (!$(`StudyEventRef[StudyEventOID="${studyEventOID}"]`)) ioHelper.safeRemoveElement($(`StudyEventDef[OID="${studyEventOID}"]`));
    for (let formOID of formOIDs) {
        safeDeleteForm(formOID);
    }
}

function safeDeleteForm(formOID) {
    // Get all ItemGroups within the Form and safe-delete them
    let itemGroupOIDs = Array.from($$(`FormDef[OID="${formOID}"] ItemGroupRef`)).map(item => item.getAttribute("ItemGroupOID"));
    // Search for other references of the Form and delete the Def only if there is no one left
    if (!$(`FormRef[FormOID="${formOID}"]`)) ioHelper.safeRemoveElement($(`FormDef[OID="${formOID}"]`));
    for (let itemGroupOID of itemGroupOIDs) {
        safeDeleteItemGroup(itemGroupOID);
    }
}

function safeDeleteItemGroup(itemGroupOID) {
    // Get all Items within the ItemGroup and safe-delete them
    let itemOIDs = Array.from($$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)).map(item => item.getAttribute("ItemOID"));
    // Search for other references of the ItemGroup and delete the Def only if there is no one left
    if (!$(`ItemGroupRef[ItemGroupOID="${itemGroupOID}"]`)) ioHelper.safeRemoveElement($(`ItemGroupDef[OID="${itemGroupOID}"]`));
    for (let itemOID of itemOIDs) {
        safeDeleteItem(itemOID);
    }
}

function safeDeleteItem(itemOID) {
    // Get the CodeList within the Item and remove it
    let codeListRef = $(`ItemDef[OID="${itemOID}"] CodeListRef`);
    // Search for other references of the Item and delete the Def only if there is no one left
    if (!$(`ItemRef[ItemOID="${itemOID}"]`)) ioHelper.safeRemoveElement($(`ItemDef[OID="${itemOID}"]`));
    if (codeListRef) safeDeleteCodeList(codeListRef.getAttribute("CodeListOID"));
}

function safeDeleteCodeList(codeListOID) {
    // Search for other references of the CodeList and delete the Def only if there is no one left
    if (!$(`CodeListRef[CodeListOID="${codeListOID}"]`)) ioHelper.safeRemoveElement($(`CodeList[OID="${codeListOID}"]`));
}

export function deleteCodeListItem(codeListOID, codedValue) {
    ioHelper.safeRemoveElement($(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`));
}

export function safeDeleteCondition(conditionOID) {
    if (!$(`[CollectionExceptionConditionOID="${conditionOID}"]`)) ioHelper.safeRemoveElement($(`ConditionDef[OID="${conditionOID}"]`));
}

export function safeDeleteMethod(methodOID) {
    if (!$(`[MethodOID="${methodOID}"]`)) ioHelper.safeRemoveElement($(`MethodDef[OID="${methodOID}"]`));
}

export function safeDeleteMeasurementUnit(measurementUnitOID) {
    if (!$(`MeasurementUnitRef[MeasurementUnitOID="${measurementUnitOID}"]`)) ioHelper.safeRemoveElement($(`MeasurementUnit[OID="${measurementUnitOID}"]`));
}

export function deleteAliasesOfElement(elementOID, codeListItemCodedValue) {
    if (!codeListItemCodedValue) $$(`[OID="${elementOID}"] Alias`).removeElements();
    else $$(`[OID="${elementOID}"] CodeListItem[CodedValue="${codeListItemCodedValue}"] Alias`).removeElements();
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
        let formRefs = studyEventDefClone.querySelectorAll(`FormRef`);
        for (let formRef of formRefs) {
            let newFormOID = copyForm(formRef.getAttribute("FormOID"), true);
            formRef.setAttribute("FormOID", newFormOID);
        }
    }
}

export function copyForm(formOID, deepCopy, studyEventOID) {
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
        let itemGroupRefs = formDefClone.querySelectorAll(`ItemGroupRef`);
        for (let itemGroupRef of itemGroupRefs) {
            let newItemGroupOID = copyItemGroup(itemGroupRef.getAttribute("ItemGroupOID"), true);
            itemGroupRef.setAttribute("ItemGroupOID", newItemGroupOID);
        }
    }

    return newFormOID;
}

export function copyItemGroup(itemGroupOID, deepCopy, formOID) {
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
        let itemRefs = itemGroupDefClone.querySelectorAll(`ItemRef`);
        for (let itemRef of itemRefs) {
            let newItemOID = copyItem(itemRef.getAttribute("ItemOID"), true);
            itemRef.setAttribute("ItemOID", newItemOID);
            itemRef.removeAttribute("CollectionExceptionConditionOID");
        }
    }

    return newItemGroupOID;
}

export function copyItem(itemOID, deepCopy, itemGroupOID) {
    let newItemOID = generateUniqueOID("I.");

    if (itemGroupOID) {
        let itemRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`);
        itemRef.insertAdjacentElement("afterend", metadataTemplates.getItemRef(newItemOID));
    }

    let itemDef = $(`ItemDef[OID="${itemOID}"]`);
    let itemDefClone = itemDef.cloneNode(true);
    itemDefClone.setAttribute("OID", newItemOID);
    itemDef.insertAdjacentElement("afterend", itemDefClone);

    if (deepCopy) {
        let codeListRef = itemDefClone.querySelector("CodeListRef");
        if (codeListRef) {
            let newCodeListOID = copyCodeList(codeListRef.getAttribute("CodeListOID"));
            codeListRef.setAttribute("CodeListOID", newCodeListOID);
        }
    }

    return newItemOID;
}

export function copyCodeList(codeListOID) {
    let newCodeListOID = generateUniqueOID("CL.");

    let codeListDef = $(`CodeList[OID="${codeListOID}"]`);
    let codeListDefClone = codeListDef.cloneNode(true);
    codeListDefClone.setAttribute("OID", newCodeListOID);

    codeListDef.insertAdjacentElement("afterend", codeListDefClone);

    return newCodeListOID;
}

export function getHierarchyLevelOfElementType(elementType) {
    switch (elementType) {
        case elementTypes.STUDYEVENT:
            return 0;
        case elementTypes.FORM:
            return 1;
        case elementTypes.ITEMGROUP:
            return 2;
        case elementTypes.ITEM:
            return 3;
        case elementTypes.CODELISTITEM:
            return 4;
    }
}

export function getCSVHeaders() {
    let headers = [];

    for (const studyEventRef of $$("Protocol StudyEventRef")) {
        const studyEventOID = studyEventRef.getAttribute("StudyEventOID");
        const studyEventName = $(`StudyEventDef[OID="${studyEventOID}"]`).getName();
        for (const formRef of $$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)) {
            const formOID = formRef.getAttribute("FormOID");
            const formName = $(`FormDef[OID="${formOID}"]`).getName();
            for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
                const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
                for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
                    const itemOID = itemRef.getAttribute("ItemOID");
                    const itemName = $(`ItemDef[OID="${itemOID}"]`).getName();
                    headers.push([
                        studyEventOID,
                        formOID,
                        itemGroupOID,
                        itemOID,
                        studyEventName,
                        formName,
                        itemName
                    ]);
                }
            }
        }
    }

    return headers;
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

        // Replace all OIDs that need to be replaced
        Object.keys(replaceOIDs).reverse().forEach(oldOID => odmXMLString = odmXMLString.replace(new RegExp(`OID="${oldOID}"`, "g"), `OID="${replaceOIDs[oldOID]}"`));
        const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");

        // Merge the new model into the old one
        odm.querySelectorAll("MeasurementUnit").forEach(measurementUnit => insertMeasurementUnit(measurementUnit));
        odm.querySelectorAll("StudyEventRef").forEach(studyEventRef => insertStudyEventRef(studyEventRef));
        odm.querySelectorAll("StudyEventDef").forEach(studyEventDef => insertElementDef(studyEventDef));
        odm.querySelectorAll("FormDef").forEach(formDef => insertElementDef(formDef));
        odm.querySelectorAll("ItemGroupDef").forEach(itemGroupDef => insertElementDef(itemGroupDef));
        odm.querySelectorAll("ItemDef").forEach(itemDef => insertElementDef(itemDef));
        odm.querySelectorAll("CodeList").forEach(codeList => insertElementDef(codeList));
        odm.querySelectorAll("ConditionDef").forEach(conditionDef => insertElementDef(conditionDef));
        odm.querySelectorAll("MethodDef").forEach(conditionDef => insertElementDef(conditionDef));
    }

    await storeMetadata();
}
