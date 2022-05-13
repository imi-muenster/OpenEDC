import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";

const $ = query => metadataWrapper.getMetadata().querySelector(query);
const $$ = query => metadataWrapper.getMetadata().querySelectorAll(query);

export function getFormAsHTML(formOID, options) {
    const formAsHTML = document.createElement("div");
    formAsHTML.id = "odm-html-content";

    for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        console.log(isLikertPossible(itemGroupOID));
        let itemGroupContent;
        if(options.showAsLikert && isLikertPossible(itemGroupOID)) itemGroupContent = getItemGroupAsLikertScale(itemGroupOID, options);
        else itemGroupContent = getItemGroupDefault(itemGroupOID, options);
        formAsHTML.appendChild(itemGroupContent);
    }

    return formAsHTML;
}

function isLikertPossible(itemGroupOID){
    let compareCodelistOID = null;
    if(metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-likert', itemGroupOID)) return false;
    for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
        const itemOID = itemRef.getAttribute("ItemOID");
        const itemDef = $(`ItemDef[OID="${itemOID}"]`);
        const codeListRef = itemDef.querySelector("CodeListRef");
        if(!codeListRef) return false;
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        if(compareCodelistOID != null && codeListOID != compareCodelistOID) return false;
        compareCodelistOID = codeListOID;
    }
    console.log("show as likert")
    return true;
}

function getItemGroupDefault(itemGroupOID, options) {
    const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    const showItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemGroupOID);

    const itemGroupContent = document.createElement("div");
    itemGroupContent.className = `item-group-content ${showItemGroup ? 'is-hidden-survey-view' : ''}`;
    itemGroupContent.setAttribute("item-group-content-oid", itemGroupOID);

    const itemGroupDescr = document.createElement("h2");
    itemGroupDescr.className = "subtitle";
    itemGroupDescr.innerHTML = processMarkdown(itemGroupDef.getTranslatedDescription(options.useNames ? null : options.locale, options.useNames));
    itemGroupContent.appendChild(itemGroupDescr);

    for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
        const itemOID = itemRef.getAttribute("ItemOID");
        const itemDef = $(`ItemDef[OID="${itemOID}"]`);
        const showItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemOID);

        const itemField = document.createElement("div");
        itemField.className = `item-field ${showItemGroup ? 'is-hidden-survey-view' : ''}`;
        itemField.setAttribute("item-field-oid", itemOID);
        itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));

        const itemQuestion = document.createElement("label");
        itemQuestion.className = "label";
        itemQuestion.innerHTML = processMarkdown(itemDef.getTranslatedQuestion(options.useNames ? null : options.locale, options.useNames)) || options.missingTranslation;
        itemQuestion.innerHTML += itemRef.getAttribute("Mandatory") == "Yes" ? " (*)" : "";
        itemField.appendChild(itemQuestion);

        const itemInput = getItemInput(itemDef, itemGroupOID, options);
        itemField.appendChild(itemInput);
        itemGroupContent.appendChild(itemField);
    }
    const divider = document.createElement("hr");
    itemGroupContent.appendChild(divider);
    return itemGroupContent;
}

function getItemGroupAsLikertScale(itemGroupOID, options) {
    const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    const showItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemGroupOID);

    const itemGroupContent = document.createElement("div");
    itemGroupContent.className = `item-group-content ${showItemGroup ? 'is-hidden-survey-view' : ''}`;
    itemGroupContent.setAttribute("item-group-content-oid", itemGroupOID);

    const itemGroupDescr = document.createElement("h2");
    itemGroupDescr.className = "subtitle";
    itemGroupDescr.innerHTML = processMarkdown(itemGroupDef.getTranslatedDescription(options.useNames ? null : options.locale, options.useNames));
    itemGroupContent.appendChild(itemGroupDescr);

    let itemRefs = $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`);
    if(itemRefs.length > 0){
        let likertContent = document.createElement('div');
        likertContent.classList = "columns is-multiline is-gapless";

        //Get codelist from first item
        const itemOID = itemRefs[0].getAttribute("ItemOID");
        const itemDef = $(`ItemDef[OID="${itemOID}"]`);
        const codeListRef = itemDef.querySelector("CodeListRef");
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        const codeListItems = $$(`CodeList[OID="${codeListOID}"] CodeListItem`);

        let likertOptionsDiv = document.createElement('div');
        likertOptionsDiv.classList = "column is-12 columns is-mobile-hidden";


        let likertOptionsPlaceholder = document.createElement('div');
        likertOptionsPlaceholder.classList = "column is-5";
        let likertOptionsHeader = document.createElement('div');
        likertOptionsHeader.classList = 'column is-7 grid-even-columns has-text-weight-bold';
        likertOptionsDiv.appendChild(likertOptionsPlaceholder)
        likertOptionsDiv.appendChild(likertOptionsHeader);
        likertContent.appendChild(likertOptionsDiv);


        for (let codeListItem of codeListItems) {
            const translatedText = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;
            let questionDiv = document.createElement('div');
            questionDiv.classList = "has-overvlow-wrap has-text-align-center";
            questionDiv.innerText = translatedText;
            likertOptionsHeader.appendChild(questionDiv);
        }

        for (const itemRef of itemRefs) {
            const itemOID = itemRef.getAttribute("ItemOID");
            const itemDef = $(`ItemDef[OID="${itemOID}"]`);
            const showItem = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemOID);

            //const itemRow = document.createElement('div');
            //itemRow.classList = "column is-5";

            const itemField = document.createElement("div");
            itemField.className = "item-field column is-12 columns";
            itemField.setAttribute("item-field-oid", itemOID);
            itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));

            const itemQuestion = document.createElement("label");
            itemField.className = `item-field column is-12 columns ${showItem ? 'is-hidden-survey-view' : ''}`;
            itemQuestion.innerHTML = processMarkdown(itemDef.getTranslatedQuestion(options.useNames ? null : options.locale, options.useNames)) || options.missingTranslation;
            itemQuestion.innerHTML += itemRef.getAttribute("Mandatory") == "Yes" ? " (*)" : "";
            //itemRow.appendChild(itemQuestion);

            const itemOptions = document.createElement('div');
            itemOptions.classList = "field column is-7 grid-even-columns has-text-align-center is-align-content-center";

            for (let codeListItem of codeListItems) {
                const translatedText = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;
                const radioInput = getRadioInput(codeListItem.getAttribute("CodedValue"), translatedText, itemDef.getAttribute("OID"), itemGroupOID, false);
                const span = document.createElement('span');
                span.classList = "mobile-span";
                span.innerText = translatedText;
                radioInput.appendChild(span);
                itemOptions.appendChild(radioInput);
            }

            itemField.appendChild(itemQuestion);
            itemField.appendChild(itemOptions);
            likertContent.appendChild(itemField);
        }
        itemGroupContent.appendChild(likertContent);
    }

    const divider = document.createElement("hr");
    itemGroupContent.appendChild(divider);
    return itemGroupContent;
}

function getItemInput(itemDef, itemGroupOID, options) {
    const inputContainer = document.createElement("div");
    inputContainer.className = "field";

    const codeListRef = itemDef.querySelector("CodeListRef");
    const measurementUnitRef = itemDef.querySelector("MeasurementUnitRef");
    if (codeListRef) {
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        const codeListItems = $$(`CodeList[OID="${codeListOID}"] CodeListItem`);
        if (codeListItems.length >= 10) {
            const selectInput = getSelectInput(codeListItems, itemDef.getAttribute("OID"), options);
            inputContainer.appendChild(selectInput);
        } else {
            for (let codeListItem of codeListItems) {
                const translatedText = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;
                const radioInput = getRadioInput(codeListItem.getAttribute("CodedValue"), translatedText, itemDef.getAttribute("OID"), itemGroupOID);
                inputContainer.appendChild(radioInput);
                inputContainer.appendChild(document.createElement("br"));
            }
        }
    } else if (itemDef.getAttribute("DataType") == "boolean") {
        const radioInputYes = getRadioInput("1", options.yes, itemDef.getAttribute("OID"), itemGroupOID);
        const radioInputNo = getRadioInput("0", options.no, itemDef.getAttribute("OID"), itemGroupOID);
        inputContainer.appendChild(radioInputYes);
        inputContainer.appendChild(document.createElement("br"));
        inputContainer.appendChild(radioInputNo);
    } else if (measurementUnitRef) {
        inputContainer.classList.add("has-addons");
        const addonInput = document.createElement("div");
        addonInput.className = "control is-expanded";
        const textInput = getTextInput(itemDef);
        addonInput.appendChild(textInput);
        inputContainer.appendChild(addonInput);
        const addonUnit = document.createElement("div");
        addonUnit.className = "control";
        const unit = document.createElement("a");
        unit.className = "button is-static";
        const measurementUnitDef = $(`MeasurementUnit[OID="${measurementUnitRef.getAttribute("MeasurementUnitOID")}"]`);
        unit.textContent = measurementUnitDef.getTranslatedSymbol(options.useNames ? null : options.locale, options.useNames) || options.missingTranslation;
        addonUnit.appendChild(unit);
        inputContainer.appendChild(addonUnit);
    } else {
        const textInput = getTextInput(itemDef, options);
        inputContainer.appendChild(textInput);
    }

    return inputContainer;
}

const getSelectInput = (codeListItems, itemOID, options) => {
    const selectContainer = document.createElement("div");
    selectContainer.className = "select is-fullwidth";
    const select = document.createElement("select");
    select.setAttribute("type", "select");
    select.setAttribute("item-oid", itemOID);

    const option = document.createElement("option");
    option.value = "";
    select.appendChild(option);
    for (let codeListItem of codeListItems) {
        const option = document.createElement("option");
        option.value = codeListItem.getAttribute("CodedValue");
        option.textContent = codeListItem.getTranslatedDecode(options.useNames ? null : options.locale, options.useNames) || options.missingTranslation;
        select.appendChild(option);
    }

    selectContainer.appendChild(select);
    return selectContainer;
}

const getRadioInput = (value, translatedText, itemOID, itemGroupOID, showtext = true) => {
    const radioContainer = document.createElement("label");
    radioContainer.className = "radio";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = itemGroupOID + "-" + itemOID;
    radio.value = value;
    radio.setAttribute("item-oid", itemOID);
    radioContainer.codedValue = value;
    radioContainer.textValue = translatedText;

    radioContainer.appendChild(radio);
    if(showtext) radioContainer.appendChild(document.createTextNode(" " + translatedText));
    return radioContainer;
}

const getTextInput = (itemDef, options) => {
    let input = document.createElement("input");
    input.type = "text";
    input.className = "input";
    input.setAttribute("item-oid", itemDef.getAttribute("OID"));
    
    const dataType = itemDef.getAttribute("DataType");
    if (dataType == "integer") {
        input.inputMode = "numeric";
    } else if (dataType == "float" || dataType == "double") {
        input.inputMode = "decimal";
    } else if (dataType == "date") {
        input.type = "date";
    } else if (dataType == "time") {
        input.type = "time";
    } else if (dataType == "datetime") {
        input.type = "datetime-local";
    } else if (dataType == "string" && options.textAsTextarea) {
        input = document.createElement("textarea");
        input.className = "textarea";
        input.setAttribute("type", "textarea");
        input.setAttribute("item-oid", itemDef.getAttribute("OID"));
    }

    return input;
}

const processMarkdown = translatedText => {
    if (!translatedText) return "";

    translatedText = translatedText.replace(/\*\*(.+?)\*\*(?!\w)/g, "<b>$1</b>");
    translatedText = translatedText.replace(/\*(.+?)\*(?!\w|\*)/g, "<i>$1</i>");
    translatedText = translatedText.replace(/\_(.+?)\_(?!\w)/g, "<u>$1</u>");
    return translatedText;
}
