import * as metadataTemplates from "./metadatatemplates.js";
import * as ioHelper from "./iohelper.js";

const $ = query => odm.querySelector(query);
const $$ = query => odm.querySelectorAll(query);

const metadataFileName = "metadata";

export const elementTypes = {
    STUDYEVENT: "studyevent",
    FORM: "form",
    ITEMGROUP: "itemgroup",
    ITEM: "item",
    CODELISTITEM: "codelistitem"
}

// TODO: Rename to metadata. And I probably need an odmhelper again, that takes an entire odm and gives the parts to the metadata- and clinicaldatahelper. And also merges then during the download.
let odm = null;

export function loadEmptyProject() {
    odm = metadataTemplates.getODMTemplate();
}

export function parseODM(odmXMLString) {
    odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
}

export async function loadExample() {
    let exampleResponse = await fetch(ioHelper.getBaseURL() + "/odm/example.xml");
    let exampleODM = await exampleResponse.text();

    odm = new DOMParser().parseFromString(exampleODM, "text/xml");
}

export function getSerializedODM() {
    return new XMLSerializer().serializeToString(odm);
}

export function getODM() {
    return odm;
}

export function storeMetadata() {
    localStorage.setItem(metadataFileName, getSerializedODM());
}

export function loadStoredMetadata() {
    let metadataXMLString = localStorage.getItem(metadataFileName);
    if (metadataXMLString) parseODM(metadataXMLString);

    if (getODM()) return true;
}

export function clearMetadata() {
    odm = null;
}

export async function getFormAsHTML(formOID, locale) {
    let prettifiedODM = ioHelper.prettifyContent(getSerializedODM());

    let xsltResponse = await fetch(ioHelper.getBaseURL() + "/xsl/odmtohtml.xsl");
    let xsltStylesheet = await xsltResponse.text();

    let xsltProcessor = new XSLTProcessor();
    let domParser = new DOMParser();
    xsltProcessor.importStylesheet(domParser.parseFromString(xsltStylesheet, "text/xml"));
    xsltProcessor.setParameter(null, "formOID", formOID);
    xsltProcessor.setParameter(null, "locale", locale);
    return xsltProcessor.transformToFragment(domParser.parseFromString(prettifiedODM, "text/xml"), document);
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

export function setFileOID(fileOID) {
    $("ODM").setAttribute("FileOID", fileOID);
}

export function setCreationDateTimeNow() {
    let now = new Date();
    let date = now.getFullYear()+"-"+("0"+(now.getMonth()+1)).slice(-2)+"-"+("0"+now.getDate()).slice(-2);
    let time = ("0"+now.getHours()).slice(-2) + ":" + ("0"+now.getMinutes()).slice(-2) + ":" + ("0"+now.getSeconds()).slice(-2);
    let offset = now.getTimezoneOffset()/60;

    let creationDateTime;
    if (offset >= 0) {
        offset = ("0"+offset).slice(-2)+":00";
        creationDateTime = date+"T"+time+"-"+offset;
    } else {
        offset = offset*(-1);
        offset = ("0"+offset).slice(-2)+":00";
        creationDateTime = date+"T"+time+"+"+offset;
    }

    $("ODM").setAttribute("CreationDateTime", creationDateTime);
}

export function getStudyEvents() {
    let studyEventDefs = [];
    for (let studyEventRef of $$("StudyEventRef")) {
        let studyEventOID = studyEventRef.getAttribute("StudyEventOID");
        let studyEventDef = $(`[OID="${studyEventOID}"]`);
        if (studyEventDef != null) {
            studyEventDefs.push(studyEventDef);
        }
    }

    return studyEventDefs;
}

export function getFormsByStudyEvent(studyEventOID) {
    let formDefs = [];
    for (let formRef of $$(`[OID="${studyEventOID}"] FormRef`)) {
        let formOID = formRef.getAttribute("FormOID");
        let formDef = $(`[OID="${formOID}"]`);
        if (formDef != null) {
            formDefs.push(formDef);
        }
    }

    return formDefs;
}

export function getItemGroupsByForm(formOID) {
    let itemGroupDefs = [];
    for (let itemGroupRef of $$(`[OID="${formOID}"] ItemGroupRef`)) {
        let itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        let itemGroupDef = $(`[OID="${itemGroupOID}"]`);
        if (itemGroupDef != null) {
            itemGroupDefs.push(itemGroupDef);
        }
    }

    return itemGroupDefs;
}

export function getItemsByItemGroup(itemGroupOID) {
    let itemDefs = [];
    for (let itemRef of $$(`[OID="${itemGroupOID}"] ItemRef`)) {
        let itemOID = itemRef.getAttribute("ItemOID");
        let itemDef = $(`[OID="${itemOID}"]`);
        if (itemDef != null) {
            itemDefs.push(itemDef);
        }
    }

    return itemDefs;
}

export function getCodeListItemsByItem(itemOID) {
    let codeListItems = []
    let codeListRef = $(`[OID="${itemOID}"] CodeListRef`)
    if (codeListRef != null) {
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
    if (codeListItemCodedValue == null) {
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
    let itemGroupRefs = $$(`FormDef[OID="${formOID}"] ItemGroupRef`);

    let itemOIDSWithCondition = [];
    for (let itemGroupRef of itemGroupRefs) {
        let itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        let itemRefs = $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[CollectionExceptionConditionOID]`);
        for (let itemRef of itemRefs) {
            let itemOID = itemRef.getAttribute("ItemOID");
            let conditionOID = itemRef.getAttribute("CollectionExceptionConditionOID");
            let formalExpression = $(`ConditionDef[OID="${conditionOID}"] FormalExpression`);
            if (formalExpression != null) {
                itemOIDSWithCondition.push({
                    itemOID: itemOID,
                    formalExpression: formalExpression.textContent
                });
            }
        }
    }

    return itemOIDSWithCondition;
}

export function getMeasurementUnits() {
    return $$("BasicDefinitions MeasurementUnit");
}

export function getConditionByItem(itemOID, itemGroupOID) {
    let conditionRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"][CollectionExceptionConditionOID]`);

    if (conditionRef != null) {
        let oid = conditionRef.getAttribute("CollectionExceptionConditionOID");
        return $(`ConditionDef[OID="${oid}"]`);
    }
}

export function getMeasurementUnitByItem(itemOID) {
    let measurementUnitRef = $(`ItemDef[OID="${itemOID}"] MeasurementUnitRef`);

    if (measurementUnitRef != null) {
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
    } else if ($(`[OID="${newOID}"]`) != null) {
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
    if (translatedText != null && description) {
        translatedText.textContent = description;
    } else if (translatedText != null && !description) {
        translatedText.remove();
        if ($$(`[OID="${elementOID}"] Description TranslatedText`).length == 0) {
            $(`[OID="${elementOID}"] Description`).remove();
        }
    } else if (translatedText == null && description) {
        let elementDescription = $(`[OID="${elementOID}"] Description`);
        if (elementDescription == null) {
            $(`[OID="${elementOID}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getDescription());
        }
        $(`[OID="${elementOID}"] Description`).appendChild(metadataTemplates.getTranslatedText(description, locale));
    }
}

export function setItemQuestion(itemOID, question, locale) {
    let translatedText = $(`ItemDef[OID="${itemOID}"] Question TranslatedText[*|lang="${locale}"]`);
    if (translatedText != null && question) {
        translatedText.textContent = question;
    } else if (translatedText != null && !question) {
        translatedText.remove();
        if ($$(`[OID="${itemOID}"] Question TranslatedText`).length == 0) {
            $(`[OID="${itemOID}"] Question`).remove();
        }
    } else if (translatedText == null && question) {
        let itemQuestion = $(`ItemDef[OID="${itemOID}"] Question`);
        if (itemQuestion == null) {
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
    if (translatedText != null) {
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
    if (translatedText != null && decodedText) {
        translatedText.textContent = decodedText;
    } else if (translatedText != null && !decodedText) {
        translatedText.remove();
        if ($$(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode TranslatedText`).length == 0) {
            $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`).remove();
        }
    } else if (translatedText == null && decodedText) {
        let codeListItemDecode = $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`);
        if (codeListItemDecode == null) {
            $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`).insertAdjacentElement("afterbegin", metadataTemplates.getDecode());
        }
        $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"] Decode`).appendChild(metadataTemplates.getTranslatedText(decodedText, locale));
    }
}

export function setElementAlias(elementOID, codeListItemCodedValue, context, name) {
    if (codeListItemCodedValue == null) {
        $(`[OID="${elementOID}"]`).appendChild(metadataTemplates.getAlias(context, name));
    } else {
        $(`[OID="${elementOID}"] CodeListItem[CodedValue="${codeListItemCodedValue}"]`).appendChild(metadataTemplates.getAlias(context, name));
    } 
}

export function setItemRangeCheck(itemOID, comparator, checkValue) {
    let insertPosition = getLastElement($$(`[OID="${itemOID}"] RangeCheck`));
    if (insertPosition == null) {
        insertPosition = $(`[OID="${itemOID}"] MeasurementUnitRef`);
    }
    if (insertPosition == null) {
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
        if (conditionRef != null) {
            $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`).removeAttribute("CollectionExceptionConditionOID");
        }
    }
}

export function setItemMeasurementUnit(itemOID, measurementUnitName) {
    let measurementUnitRef = $(`[OID="${itemOID}"] MeasurementUnitRef`);

    if (measurementUnitName) {
        let measurementUnitOID = $(`MeasurementUnit[Name="${measurementUnitName}"]`).getAttribute("OID");
        if (measurementUnitRef != null) {
            measurementUnitRef.setAttribute("MeasurementUnitOID", measurementUnitOID);
        } else {
            let insertPosition = $(`[OID="${itemOID}"] Question`);
            if (insertPosition != null) {
                insertPosition.insertAdjacentElement("afterend", metadataTemplates.getMeasurementUnitRef(measurementUnitOID));
            } else {
                $(`[OID="${itemOID}"]`).appendChild(metadataTemplates.getMeasurementUnitRef(measurementUnitOID));
            }
        }
    } else {
        if (measurementUnitRef != null) {
            measurementUnitRef.remove();
        }
    }
}

function generateUniqueOID(oidPrefix) {
    let count = 1;
    while ($$(`[OID="${oidPrefix+count}"]`).length > 0) {
        count += 1;
    }

    return oidPrefix+count;
}

function generateUniqueCodedValue(codeListOID) {
    let count = 1;
    while ($$(`[OID="${codeListOID}"] CodeListItem[CodedValue="${count}"]`).length > 0) {
        count += 1;
    }

    return count;
}

export function createStudyEvent() {
    let newStudyEventOID = generateUniqueOID("SE.");

    insertStudyEventRef(metadataTemplates.getStudyEventRef(newStudyEventOID));

    let insertPositionDef = getLastElement($$("StudyEventDef"));
    if (insertPositionDef != null) {
        insertPositionDef.insertAdjacentElement("afterend", metadataTemplates.getStudyEventDef(newStudyEventOID));
    } else {
        $("MetaDataVersion").appendChild(metadataTemplates.getStudyEventDef(newStudyEventOID));
    }

    return newStudyEventOID;
}

export function insertStudyEventRef(studyEventRef) {
    $("Protocol").appendChild(studyEventRef);
}

export function createForm(studyEventOID) {
    let newFormOID = generateUniqueOID("F.");

    insertFormRef(metadataTemplates.getFormRef(newFormOID), studyEventOID);

    let insertPositionDef = getLastElement($$(`FormDef`));
    if (insertPositionDef != null) {
        insertPositionDef.insertAdjacentElement("afterend", metadataTemplates.getFormDef(newFormOID));
    } else {
        $("MetaDataVersion").appendChild(metadataTemplates.getFormDef(newFormOID));
    }

    return newFormOID;
}

export function insertFormRef(formRef, studyEventOID) {
    let insertPositionRef = getLastElement($$(`[OID="${studyEventOID}"] FormRef`));
    if (insertPositionRef != null) {
        insertPositionRef.insertAdjacentElement("afterend", formRef);
    } else {
        insertPositionRef = $(`[OID="${studyEventOID}"] Alias`);
        if (insertPositionRef != null) {
            insertPositionRef.insertAdjacentElement("beforebegin", formRef);
        } else {
            $(`[OID="${studyEventOID}"]`).insertAdjacentElement("beforeend", formRef);
        }
    }
}

export function createItemGroup(formOID) {
    let newItemGroupOID = generateUniqueOID("IG.");

    insertItemGroupRef(metadataTemplates.getItemGroupRef(newItemGroupOID), formOID);

    let insertPositionDef = getLastElement($$(`ItemGroupDef`));
    if (insertPositionDef != null) {
        insertPositionDef.insertAdjacentElement("afterend", metadataTemplates.getItemGroupDef(newItemGroupOID));
    } else {
        $("MetaDataVersion").appendChild(metadataTemplates.getItemGroupDef(newItemGroupOID));
    }

    return newItemGroupOID;
}

export function insertItemGroupRef(itemGroupRef, formOID) {
    let insertPositionRef = getLastElement($$(`[OID="${formOID}"] ItemGroupRef`));
    if (insertPositionRef != null) {
        insertPositionRef.insertAdjacentElement("afterend", itemGroupRef);
    } else {
        insertPositionRef = $(`[OID="${formOID}"] Alias`);
        if (insertPositionRef != null) {
            insertPositionRef.insertAdjacentElement("beforebegin", itemGroupRef);
        } else {
            $(`[OID="${formOID}"]`).insertAdjacentElement("beforeend", itemGroupRef);
        }
    }
}

export function createItem(itemGroupOID) {
    let newItemOID = generateUniqueOID("I.");

    insertItemRef(metadataTemplates.getItemRef(newItemOID), itemGroupOID);

    let insertPositionDef = getLastElement($$(`ItemDef`));
    if (insertPositionDef != null) {
        insertPositionDef.insertAdjacentElement("afterend", metadataTemplates.getItemDef(newItemOID));
    } else {
        $("MetaDataVersion").appendChild(metadataTemplates.getItemDef(newItemOID));
    }

    return newItemOID;
}

export function insertItemRef(itemRef, itemGroupOID) {
    let insertPositionRef = getLastElement($$(`[OID="${itemGroupOID}"] ItemRef`));
    if (insertPositionRef != null) {
        insertPositionRef.insertAdjacentElement("afterend", itemRef);
    } else {
        insertPositionRef = $(`[OID="${itemGroupOID}"] Alias`);
        if (insertPositionRef != null) {
            insertPositionRef.insertAdjacentElement("beforebegin", itemRef);
        } else {
            $(`[OID="${itemGroupOID}"]`).insertAdjacentElement("beforeend", itemRef);
        }
    }
}

export function createCodeList(itemOID) {
    let newCodeListOID = generateUniqueOID("CL.");

    insertCodeListRef(metadataTemplates.getCodeListRef(newCodeListOID), itemOID);

    let insertPositionDef = getLastElement($$(`CodeList`));
    if (insertPositionDef != null) {
        insertPositionDef.insertAdjacentElement("afterend", metadataTemplates.getCodeListDef(newCodeListOID));
    } else {
        $("MetaDataVersion").appendChild(metadataTemplates.getCodeListDef(newCodeListOID));
    }
}

export function insertCodeListRef(codeListRef, itemOID) {
    let insertPositionRef = getLastElement($$(`[OID="${itemOID}"] Question`));
    if (insertPositionRef != null) {
        insertPositionRef.insertAdjacentElement("afterend", codeListRef);
    } else {
        $(`[OID="${itemOID}"]`).insertAdjacentElement("beforeend", codeListRef);
    }
}

export function createCondition(name, formalExpression, locale) {
    let newConditionOID = generateUniqueOID("C.");

    $("MetaDataVersion").appendChild(metadataTemplates.getConditionDef(newConditionOID, name, formalExpression, locale));
}

export function createMeasurementUnit(name, symbol, locale) {
    let newMeasurementUnitOID = generateUniqueOID("MM.");

    if (!$("BasicDefinitions")) {
        $("GlobalVariables").insertAdjacentElement("afterend", metadataTemplates.getBasicDefintions());
    }

    $("BasicDefinitions").appendChild(metadataTemplates.getMeasurementUnitDef(newMeasurementUnitOID, name, symbol, locale));
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
    if ($(`StudyEventRef[StudyEventOID="${studyEventOID}"]`) == null) {
        let studyEventDef = $(`StudyEventDef[OID="${studyEventOID}"]`);
        if (studyEventDef != null) {
            studyEventDef.remove();
        }
    }
    for (let formOID of formOIDs) {
        safeDeleteForm(formOID);
    }
}

export function safeDeleteForm(formOID) {
    // Get all ItemGroups within the Form and safe-delete them
    let itemGroupOIDs = Array.from($$(`FormDef[OID="${formOID}"] ItemGroupRef`)).map(item => item.getAttribute("ItemGroupOID"));
    // Search for other references of the Form and delete the Def only if there is no one left
    if ($(`FormRef[FormOID="${formOID}"]`) == null) {
        let formDef = $(`FormDef[OID="${formOID}"]`);
        if (formDef != null) {
            formDef.remove();
        }
    }
    for (let itemGroupOID of itemGroupOIDs) {
        safeDeleteItemGroup(itemGroupOID);
    }
}

export function safeDeleteItemGroup(itemGroupOID) {
    // Get all Items within the ItemGroup and safe-delete them
    let itemOIDs = Array.from($$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)).map(item => item.getAttribute("ItemOID"));
    // Search for other references of the ItemGroup and delete the Def only if there is no one left
    if ($(`ItemGroupRef[ItemGroupOID="${itemGroupOID}"]`) == null) {
        let itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`)
        if (itemGroupDef != null) {
            itemGroupDef.remove();
        }
    }
    for (let itemOID of itemOIDs) {
        safeDeleteItem(itemOID);
    }
}

export function safeDeleteItem(itemOID) {
    // Get the CodeList within the Item and remove it
    let codeListRef = $(`ItemDef[OID="${itemOID}"] CodeListRef`);
    // Search for other references of the Item and delete the Def only if there is no one left
    if ($(`ItemRef[ItemOID="${itemOID}"]`) == null) {
        let itemDef = $(`ItemDef[OID="${itemOID}"]`);
        if (itemDef != null) {
            itemDef.remove();
        }
    }
    if (codeListRef != null) {
        safeDeleteCodeList(codeListRef.getAttribute("CodeListOID"));
    }
}

export function safeDeleteCodeList(codeListOID) {
    // Search for other references of the CodeList and delete the Def only if there is no one left
    if ($(`CodeListRef[CodeListOID="${codeListOID}"]`) == null) {
        let codeList = $(`CodeList[OID="${codeListOID}"]`);
        if (codeList != null) {
            codeList.remove();
        }
    }
}

export function deleteCodeListItem(codeListOID, codedValue) {
    $(`[OID="${codeListOID}"] CodeListItem[CodedValue="${codedValue}"]`).remove();
}

export function deleteAliasesOfElement(elementOID, codeListItemCodedValue) {
    let aliases = [];
    if (codeListItemCodedValue == null) {
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

    if (studyEventOID != null) {
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

    if (formOID != null) {
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

    if (itemGroupOID != null) {
        let itemRef = $(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef[ItemOID="${itemOID}"]`);
        itemRef.insertAdjacentElement("afterend", metadataTemplates.getItemRef(newItemOID));
    }

    let itemDef = $(`ItemDef[OID="${itemOID}"]`);
    let itemDefClone = itemDef.cloneNode(true);
    itemDefClone.setAttribute("OID", newItemOID);
    itemDef.insertAdjacentElement("afterend", itemDefClone);

    if (deepCopy) {
        let codeListRef = itemDefClone.querySelector("CodeListRef");
        if (codeListRef != null) {
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

export function getStudyEventAndFormList() {
    let studyEventAndFormList = [];

    let studyEventDefs = getStudyEvents();
    for (let studyEventDef of studyEventDefs) {
        studyEventAndFormList.push({"name": studyEventDef.getAttribute("Name"), "type": elementTypes.STUDYEVENT, "oid": studyEventDef.getAttribute("OID")});
        let formDefs = getFormsByStudyEvent(studyEventDef.getAttribute("OID"));
        for (let formDef of formDefs) {
            studyEventAndFormList.push({"name": formDef.getAttribute("Name"), "type": elementTypes.FORM, "oid": formDef.getAttribute("OID")});
        }
    }

    return studyEventAndFormList;
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

function getLastElement(elements) {
    if (elements.length >= 1) {
        return elements[elements.length - 1];
    } else {
        return null;
    }
}
