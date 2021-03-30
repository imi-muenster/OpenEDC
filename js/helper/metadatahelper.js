import * as metadataTemplates from "../odmtemplates/metadatatemplates.js";
import * as languageHelper from "./languagehelper.js";
import * as ioHelper from "./iohelper.js";

const $ = query => metadata.querySelector(query);
const $$ = query => metadata.querySelectorAll(query);

export const elementTypes = {
    STUDYEVENT: "studyevent",
    FORM: "form",
    ITEMGROUP: "itemgroup",
    ITEM: "item",
    CODELISTITEM: "codelistitem"
}

const elementDefinitonNames = {
    STUDYEVENT: "StudyEventDef",
    FORM: "FormDef",
    ITEMGROUP: "ItemGroupDef",
    ITEM: "ItemDef",
    CODELIST: "CodeList",
    MEASUREMENTUNIT: "MeasurementUnit",
    CONDITION: "ConditionDef"
}

export const dataStatusCodeListOID = "OpenEDC.DataStatus";

let xsltStylesheet;
let metadata;

export async function init() {
    let xsltResponse = await fetch(ioHelper.getBaseURL() + "/xsl/odmtohtml.xsl");
    xsltStylesheet = await xsltResponse.text();
}

export async function loadEmptyProject() {
    metadata = metadataTemplates.getODMTemplate();
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
    let exampleResponse = await fetch(ioHelper.getBaseURL() + "/odm/example.xml");
    let exampleODM = await exampleResponse.text();

    metadata = new DOMParser().parseFromString(exampleODM, "text/xml");
    storeMetadata();
}

export async function loadStoredMetadata() {
    metadata = await ioHelper.getMetadata();
}

export async function storeMetadata() {
    await ioHelper.storeMetadata(metadata);
}

export function getSerializedMetadata() {
    return new XMLSerializer().serializeToString(metadata);
}

export function getMetadata() {
    return metadata;
}

export function removeMetadata() {
    metadata = null;
}

export async function getFormAsHTML(formOID, textAsTextarea) {
    // Create a new ODM copy that only includes the required elements for performance reasons
    // This might look like a lot of code but it increases the performance significantly
    const prettifiedODM = ioHelper.prettifyContent(getSerializedMetadata());
    const reducedODM = new DOMParser().parseFromString(prettifiedODM, "text/xml");

    const itemGroupOIDs = [];
    for (const formDef of reducedODM.querySelectorAll("FormDef")) {
        if (formDef.getAttribute("OID") == formOID) {
            for (const itemGroupRef of formDef.querySelectorAll("ItemGroupRef")) {
                itemGroupOIDs.push(itemGroupRef.getAttribute("ItemGroupOID"));
            }
        } else formDef.remove();
    }
    const itemOIDs = [];
    for (const itemGroupDef of reducedODM.querySelectorAll("ItemGroupDef")) {
        if (itemGroupOIDs.includes(itemGroupDef.getAttribute("OID"))) {
            for (const itemRef of itemGroupDef.querySelectorAll("ItemRef")) {
                itemOIDs.push(itemRef.getAttribute("ItemOID"));
            }
        } else itemGroupDef.remove();
    }
    const codeListOIDs = [];
    for (const itemDef of reducedODM.querySelectorAll("ItemDef")) {
        if (itemOIDs.includes(itemDef.getAttribute("OID"))) {
            if (itemDef.querySelector("CodeListRef")) {
                codeListOIDs.push(itemDef.querySelector("CodeListRef").getAttribute("CodeListOID"));
            }
        } else itemDef.remove();
    }
    for (const codeList of reducedODM.querySelectorAll("CodeList")) {
        if (!codeListOIDs.includes(codeList.getAttribute("OID"))) codeList.remove();
    }

    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(new DOMParser().parseFromString(xsltStylesheet, "text/xml"));
    xsltProcessor.setParameter(null, "formOID", formOID);
    xsltProcessor.setParameter(null, "locale", languageHelper.getCurrentLocale());
    xsltProcessor.setParameter(null, "defaultLocale", languageHelper.untranslatedLocale);
    xsltProcessor.setParameter(null, "yes", languageHelper.getTranslation("yes"));
    xsltProcessor.setParameter(null, "no", languageHelper.getTranslation("no"));
    xsltProcessor.setParameter(null, "textAsTextarea", textAsTextarea.toString());

    return xsltProcessor.transformToFragment(reducedODM, document);
}

export function prepareDownload(dataStatusTypes) {
    let odmCopy = new DOMParser().parseFromString(getSerializedMetadata(), "text/xml");

    odmCopy.querySelector("ODM").setAttribute("FileOID", getStudyName());
    odmCopy.querySelector("ODM").setAttribute("CreationDateTime", new Date().toISOString());

    // Remove the default/untranslated locale that might have been added during odmValidation / preparation
    odmCopy.querySelectorAll(`TranslatedText[*|lang="${languageHelper.untranslatedLocale}"]`).forEach(translatedText =>  translatedText.removeAttribute("xml:lang"));

    // Add a code list with all data status types but only when downloading the ODM with clinical data
    if (dataStatusTypes) {
        const dataStatusCodeList = getDataStatusCodeList(dataStatusTypes);
        const insertPosition = ioHelper.getLastElement(odmCopy.querySelectorAll("ItemDef"));
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
    return $("Study").getAttribute("OID");
}

export function getMetaDataVersionOID() {
    return $("MetaDataVersion").getAttribute("OID");
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
    let codeListItems = []
    let codeListRef = $(`[OID="${itemOID}"] CodeListRef`)
    if (codeListRef) {
        let codeListOID = codeListRef.getAttribute("CodeListOID");
        for (let codeListItem of $$(`[OID="${codeListOID}"] CodeListItem`)) {
            codeListItems.push(codeListItem);
        }
    }

    return codeListItems;
}

export function getCodeListOIDByItem(itemOID) {
    return $(`[OID="${itemOID}"] CodeListRef`).getAttribute("CodeListOID");
}

export function getCodeListItem(codeListOID, codedValue) {
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
    return $$("ConditionDef");
}

export function getItemOIDSWithConditionByForm(formOID) {
    let itemOIDSWithCondition = [];
    for (let itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        let itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        for (let itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[CollectionExceptionConditionOID]`)) {
            let itemOID = itemRef.getAttribute("ItemOID");
            let conditionOID = itemRef.getAttribute("CollectionExceptionConditionOID");
            let formalExpression = $(`ConditionDef[OID="${conditionOID}"] FormalExpression`);
            if (formalExpression) {
                itemOIDSWithCondition.push({
                    itemOID: itemOID,
                    formalExpression: formalExpression.textContent
                });
            }
        }
    }

    return itemOIDSWithCondition;
}

// TODO: Introduce own class for the two arrays? If yes, implement it for getItemOIDSWithConditionByForm as well
// TODO: Could also handle soft and hard RangeChecks
export function getItemOIDSWithRangeChecksByForm(formOID) {
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
            if (rangeChecks.length > 0) {
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
    return $$("BasicDefinitions MeasurementUnit");
}

export function getConditionByItem(itemOID, itemGroupOID) {
    let conditionRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"][CollectionExceptionConditionOID]`);

    if (conditionRef) {
        let oid = conditionRef.getAttribute("CollectionExceptionConditionOID");
        return $(`ConditionDef[OID="${oid}"]`);
    }
}

export function getMeasurementUnitByItem(itemOID) {
    let measurementUnitRef = $(`ItemDef[OID="${itemOID}"] MeasurementUnitRef`);

    if (measurementUnitRef) {
        let oid = measurementUnitRef.getAttribute("MeasurementUnitOID");
        return $(`MeasurementUnit[OID="${oid}"]`);
    }
}

export function getNumberOfRefs(elementOID, elementType) {
    switch (elementType) {
        case elementTypes.STUDYEVENT:
            return $$(`StudyEventRef[StudyEventOID="${elementOID}"]`).length;
        case elementTypes.FORM:
            return $$(`FormRef[FormOID="${elementOID}"]`).length;
        case elementTypes.ITEMGROUP:
            return $$(`ItemGroupRef[ItemGroupOID="${elementOID}"]`).length;
        case elementTypes.ITEM:
            return $$(`ItemRef[ItemOID="${elementOID}"]`).length;
        case elementTypes.CODELISTITEM:
            return $$(`CodeListRef[CodeListOID="${elementOID}"]`).length;
    }
}

export function itemHasCodeList(itemOID) {
    let codeListRef = $(`[OID="${itemOID}"] CodeListRef`)

    return codeListRef != null;
}

export function setElementOID(elementOID, newOID, elementType) {
    if (elementOID === newOID) {
        return true;
    } else if ($(`[OID="${newOID}"]`)) {
        return false;
    }

    switch (elementType) {
        case elementTypes.STUDYEVENT:
            let studyEventRefs = $$(`StudyEventRef[StudyEventOID="${elementOID}"]`);
            for (let studyEventRef of studyEventRefs) {
                studyEventRef.setAttribute("StudyEventOID", newOID);
            }
            $(`StudyEventDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            return true;
        case elementTypes.FORM:
            let formRefs = $$(`FormRef[FormOID="${elementOID}"]`);
            for (let formRef of formRefs) {
                formRef.setAttribute("FormOID", newOID);
            }
            $(`FormDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            return true;
        case elementTypes.ITEMGROUP:
            let itemGroupRefs = $$(`ItemGroupRef[ItemGroupOID="${elementOID}"]`);
            for (let itemGroupRef of itemGroupRefs) {
                itemGroupRef.setAttribute("ItemGroupOID", newOID);
            }
            $(`ItemGroupDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            return true;
        case elementTypes.ITEM:
            let itemRefs = $$(`ItemRef[ItemOID="${elementOID}"]`);
            for (let itemRef of itemRefs) {
                itemRef.setAttribute("ItemOID", newOID);
            }
            $(`ItemDef[OID="${elementOID}"]`).setAttribute("OID", newOID);
            return true;
        case elementTypes.CODELISTITEM:
            let codeListRefs = $$(`CodeListRef[CodeListOID="${elementOID}"]`);
            for (let codeListRef of codeListRefs) {
                codeListRef.setAttribute("CodeListOID", newOID);
            }
            $(`CodeList[OID="${elementOID}"]`).setAttribute("OID", newOID);
            return true;
    }

    return false;
}

export function setElementName(elementOID, name) {
    $(`[OID="${elementOID}"]`).setAttribute("Name", name);
}

export function setElementDescription(elementOID, description, locale) {
    let translatedText = $(`[OID="${elementOID}"] Description TranslatedText[*|lang="${locale}"]`);
    if (translatedText && description) {
        translatedText.textContent = description;
    } else if (translatedText && !description) {
        translatedText.remove();
        if ($$(`[OID="${elementOID}"] Description TranslatedText`).length == 0) $(`[OID="${elementOID}"] Description`).remove();
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
        if ($$(`[OID="${itemOID}"] Question TranslatedText`).length == 0) {
            $(`[OID="${itemOID}"] Question`).remove();
        }
    } else if (translatedText == null && question) {
        let itemQuestion = $(`ItemDef[OID="${itemOID}"] Question`);
        if (!itemQuestion) {
            $(`[OID="${itemOID}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getQuestion());
        }
        $(`ItemDef[OID="${itemOID}"] Question`).appendChild(metadataTemplates.getTranslatedText(question, locale));
    }
}

export function setConditionFormalExpression(conditionOID, formalExpression) {
    $(`ConditionDef[OID="${conditionOID}"] FormalExpression`).textContent = formalExpression;
}

export function setMeasurementUnitSymbol(measurementUnitOID, symbol, locale) {
    let translatedText = $(`MeasurementUnit[OID="${measurementUnitOID}"] Symbol TranslatedText[*|lang="${locale}"]`);
    if (translatedText) {
        translatedText.textContent = symbol;
    } else {
        $(`MeasurementUnit[OID="${measurementUnitOID}"] Symbol`).appendChild(metadataTemplates.getTranslatedText(symbol, locale));
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
    $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`).setAttribute("CodedValue", newCodedValue);
}

export function setCodeListItemDecodedText(codeListOID, codedValue, decodedText, locale) {
    let translatedText = $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode TranslatedText[*|lang="${locale}"]`);
    if (translatedText && decodedText) {
        translatedText.textContent = decodedText;
    } else if (translatedText && !decodedText) {
        translatedText.remove();
        if ($$(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode TranslatedText`).length == 0) {
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
    let insertPosition = ioHelper.getLastElement($$(`[OID="${itemOID}"] RangeCheck`));
    if (!insertPosition) {
        insertPosition = $(`[OID="${itemOID}"] MeasurementUnitRef`);
    }
    if (!insertPosition) {
        insertPosition = $(`[OID="${itemOID}"] Question`);
    }

    insertPosition.insertAdjacentElement("afterend", metadataTemplates.getRangeCheck(comparator, checkValue));
}

export function setItemCondition(itemOID, itemGroupOID, conditionName) {
    let conditionRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"][CollectionExceptionConditionOID]`);

    if (conditionName) {
        let conditionOID = $(`ConditionDef[Name="${conditionName}"]`).getAttribute("OID");
        $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`).setAttribute("CollectionExceptionConditionOID", conditionOID);
    } else {
        if (conditionRef) $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`).removeAttribute("CollectionExceptionConditionOID");
    }
}

export function setItemMeasurementUnit(itemOID, measurementUnitName) {
    let measurementUnitRef = $(`[OID="${itemOID}"] MeasurementUnitRef`);

    if (measurementUnitName) {
        let measurementUnitOID = $(`MeasurementUnit[Name="${measurementUnitName}"]`).getAttribute("OID");
        if (measurementUnitRef) {
            measurementUnitRef.setAttribute("MeasurementUnitOID", measurementUnitOID);
        } else {
            let insertPosition = $(`[OID="${itemOID}"] Question`);
            if (insertPosition) {
                insertPosition.insertAdjacentElement("afterend", metadataTemplates.getMeasurementUnitRef(measurementUnitOID));
            } else {
                $(`[OID="${itemOID}"]`).appendChild(metadataTemplates.getMeasurementUnitRef(measurementUnitOID));
            }
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
    insertElementDef(elementDefinitonNames.STUDYEVENT, metadataTemplates.getStudyEventDef(newStudyEventOID, "New Event"));
    
    return newStudyEventOID;
}

export function insertStudyEventRef(studyEventRef) {
    $("Protocol").appendChild(studyEventRef);
}

function insertElementDef(definitionName, studyEventDef) {
    const insertPositionDef = ioHelper.getLastElement($$(definitionName));
    if (insertPositionDef) {
        insertPositionDef.insertAdjacentElement("afterend", studyEventDef);
    } else {
        $("MetaDataVersion").appendChild(studyEventDef);
    }
}

export function createForm(studyEventOID) {
    const newFormOID = generateUniqueOID("F.");
    insertFormRef(metadataTemplates.getFormRef(newFormOID), studyEventOID);
    insertElementDef(elementDefinitonNames.FORM, metadataTemplates.getFormDef(newFormOID, "New Form"));

    return newFormOID;
}

export function insertFormRef(formRef, studyEventOID) {
    let insertPositionRef = ioHelper.getLastElement($$(`[OID="${studyEventOID}"] FormRef`));
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
    insertElementDef(elementDefinitonNames.ITEMGROUP, metadataTemplates.getItemGroupDef(newItemGroupOID, "New Group"));

    return newItemGroupOID;
}

export function insertItemGroupRef(itemGroupRef, formOID) {
    let insertPositionRef = ioHelper.getLastElement($$(`[OID="${formOID}"] ItemGroupRef`));
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
    insertElementDef(elementDefinitonNames.ITEM, metadataTemplates.getItemDef(newItemOID, "New Item"));

    return newItemOID;
}

export function insertItemRef(itemRef, itemGroupOID) {
    let insertPositionRef = ioHelper.getLastElement($$(`[OID="${itemGroupOID}"] ItemRef`));
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
    insertElementDef(elementDefinitonNames.CODELIST, metadataTemplates.getCodeListDef(newCodeListOID));

    return newCodeListOID;
}

export function insertCodeListRef(codeListRef, itemOID) {
    let insertPositionRef = ioHelper.getLastElement($$(`[OID="${itemOID}"] Question`));
    if (insertPositionRef) {
        insertPositionRef.insertAdjacentElement("afterend", codeListRef);
    } else {
        $(`[OID="${itemOID}"]`).insertAdjacentElement("beforeend", codeListRef);
    }
}

export function createCondition(name, formalExpression, locale) {
    const newConditionOID = generateUniqueOID("C.");
    insertElementDef(elementDefinitonNames.CONDITION, metadataTemplates.getConditionDef(newConditionOID, name, formalExpression, locale));
    
    return newConditionOID;
}

export function createMeasurementUnit(name, symbol, locale) {
    const newMeasurementUnitOID = generateUniqueOID("MM.");
    insertMeasurementUnit(metadataTemplates.getMeasurementUnitDef(newMeasurementUnitOID, name, symbol, locale));

    return newMeasurementUnitOID;
}

function insertMeasurementUnit(measurementUnit) {
    if (!$("BasicDefinitions")) $("GlobalVariables").insertAdjacentElement("afterend", metadataTemplates.getBasicDefintions());
    $("BasicDefinitions").appendChild(measurementUnit);
}

export function addCodeListItem(codeListOID) {
    let codedValue = generateUniqueCodedValue(codeListOID);
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

export function safeDeleteStudyEvent(studyEventOID) {
    // Get all Forms within the StudyEvent and safe-delete them
    let formOIDs = Array.from($$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)).map(item => item.getAttribute("FormOID"));
    // Search for other references of the StudyEvent and delete the Def only if there is no one left
    if (!$(`StudyEventRef[StudyEventOID="${studyEventOID}"]`)) {
        let studyEventDef = $(`StudyEventDef[OID="${studyEventOID}"]`);
        if (studyEventDef) studyEventDef.remove();
    }
    for (let formOID of formOIDs) {
        safeDeleteForm(formOID);
    }
}

export function safeDeleteForm(formOID) {
    // Get all ItemGroups within the Form and safe-delete them
    let itemGroupOIDs = Array.from($$(`FormDef[OID="${formOID}"] ItemGroupRef`)).map(item => item.getAttribute("ItemGroupOID"));
    // Search for other references of the Form and delete the Def only if there is no one left
    if (!$(`FormRef[FormOID="${formOID}"]`)) {
        let formDef = $(`FormDef[OID="${formOID}"]`);
        if (formDef) formDef.remove();
    }
    for (let itemGroupOID of itemGroupOIDs) {
        safeDeleteItemGroup(itemGroupOID);
    }
}

export function safeDeleteItemGroup(itemGroupOID) {
    // Get all Items within the ItemGroup and safe-delete them
    let itemOIDs = Array.from($$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)).map(item => item.getAttribute("ItemOID"));
    // Search for other references of the ItemGroup and delete the Def only if there is no one left
    if (!$(`ItemGroupRef[ItemGroupOID="${itemGroupOID}"]`)) {
        let itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`)
        if (itemGroupDef) itemGroupDef.remove();
    }
    for (let itemOID of itemOIDs) {
        safeDeleteItem(itemOID);
    }
}

export function safeDeleteItem(itemOID) {
    // Get the CodeList within the Item and remove it
    let codeListRef = $(`ItemDef[OID="${itemOID}"] CodeListRef`);
    // Search for other references of the Item and delete the Def only if there is no one left
    if (!$(`ItemRef[ItemOID="${itemOID}"]`)) {
        let itemDef = $(`ItemDef[OID="${itemOID}"]`);
        if (itemDef) itemDef.remove();
    }
    if (codeListRef) safeDeleteCodeList(codeListRef.getAttribute("CodeListOID"));
}

export function safeDeleteCodeList(codeListOID) {
    // Search for other references of the CodeList and delete the Def only if there is no one left
    if (!$(`CodeListRef[CodeListOID="${codeListOID}"]`)) {
        let codeList = $(`CodeList[OID="${codeListOID}"]`);
        if (codeList) codeList.remove();
    }
}

export function deleteCodeListItem(codeListOID, codedValue) {
    $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`).remove();
}

export function deleteAliasesOfElement(elementOID, codeListItemCodedValue) {
    let aliases = [];
    if (!codeListItemCodedValue) {
        aliases = $$(`[OID="${elementOID}"] Alias`);
    } else {
        aliases = $$(`[OID="${elementOID}"] CodeListItem[CodedValue="${codeListItemCodedValue}"] Alias`);
    }

    for (let alias of aliases) {
        alias.remove();
    }
}

export function deleteRangeChecksOfItem(itemOID) {
    let rangeChecks = $$(`[OID="${itemOID}"] RangeCheck`);
    for (let rangeCheck of rangeChecks) {
        rangeCheck.remove();
    }
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
        const studyEventName = $(`StudyEventDef[OID="${studyEventOID}"]`).getAttribute("Name");
        for (const formRef of $$(`StudyEventDef[OID="${studyEventOID}"] FormRef`)) {
            const formOID = formRef.getAttribute("FormOID");
            const formName = $(`FormDef[OID="${formOID}"]`).getAttribute("Name");
            for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
                const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
                for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
                    const itemOID = itemRef.getAttribute("ItemOID");
                    const itemName = $(`ItemDef[OID="${itemOID}"]`).getAttribute("Name");
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
            const oid = element.getAttribute("OID");
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
        odm.querySelectorAll("StudyEventDef").forEach(studyEventDef => insertElementDef(elementDefinitonNames.STUDYEVENT, studyEventDef));
        odm.querySelectorAll("FormDef").forEach(formDef => insertElementDef(elementDefinitonNames.FORM, formDef));
        odm.querySelectorAll("ItemGroupDef").forEach(itemGroupDef => insertElementDef(elementDefinitonNames.ITEMGROUP, itemGroupDef));
        odm.querySelectorAll("ItemDef").forEach(itemDef => insertElementDef(elementDefinitonNames.ITEM, itemDef));
        odm.querySelectorAll("CodeList").forEach(codeList => insertElementDef(elementDefinitonNames.CODELIST, codeList));
        odm.querySelectorAll("ConditionDef").forEach(conditionDef => insertElementDef(elementDefinitonNames.CONDITION, conditionDef));
    }

    await storeMetadata();
}
