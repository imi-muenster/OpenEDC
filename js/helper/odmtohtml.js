const $ = query => odm.querySelector(query);
const $$ = query => odm.querySelectorAll(query);

let odm = null;
let options = {};

export function getFormAsHTML(odmParam, formOID, optionsParam) {
    odm = odmParam;
    options = optionsParam;

    const formAsHTML = document.createElement("div");
    formAsHTML.id = "odm-html-content";

    for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);

        const itemGroupContent = document.createElement("div");
        itemGroupContent.className = "item-group-content";
        itemGroupContent.setAttribute("item-group-content-oid", itemGroupOID);

        const itemGroupDescr = document.createElement("h2");
        itemGroupDescr.className = "subtitle";
        itemGroupDescr.innerHTML = processMarkdown(itemGroupDef.getTranslatedDescription(options.locale, false, options.defaultLocale));
        itemGroupContent.appendChild(itemGroupDescr);

        for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
            const itemOID = itemRef.getAttribute("ItemOID");
            const itemDef = $(`ItemDef[OID="${itemOID}"]`);

            const itemField = document.createElement("div");
            itemField.className = "item-field";
            itemField.setAttribute("item-field-oid", itemOID);
            itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));

            const itemQuestion = document.createElement("label");
            itemQuestion.className = "label";
            itemQuestion.innerHTML = processMarkdown(itemDef.getTranslatedQuestion(options.locale, false, options.defaultLocale));
            itemQuestion.innerHTML += itemRef.getAttribute("Mandatory") == "Yes" ? " (*)" : "";
            itemField.appendChild(itemQuestion);

            const itemInput = getItemInput(itemDef, itemGroupOID);
            itemField.appendChild(itemInput);
            itemGroupContent.appendChild(itemField);
        }
        
        const divider = document.createElement("hr");
        itemGroupContent.appendChild(divider);
        formAsHTML.appendChild(itemGroupContent);
    }

    odm = null;
    return formAsHTML;
}

function getItemInput(itemDef, itemGroupOID) {
    const inputContainer = document.createElement("div");
    inputContainer.className = "field";

    const codeListRef = itemDef.querySelector("CodeListRef");
    const measurementUnitRef = itemDef.querySelector("MeasurementUnitRef");
    if (codeListRef) {
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        const codeListItems = $$(`CodeList[OID="${codeListOID}"] CodeListItem`);
        if (codeListItems.length >= 10) {
            const selectInput = getSelectInput(codeListItems, itemDef.getAttribute("OID"));
            inputContainer.appendChild(selectInput);
        } else {
            for (let codeListItem of codeListItems) {
                const translatedText = codeListItem.getTranslatedDecode(options.locale, false, options.defaultLocale);
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
        unit.textContent = measurementUnitDef.getTranslatedSymbol(options.locale, false, options.defaultLocale);
        addonUnit.appendChild(unit);
        inputContainer.appendChild(addonUnit);
    } else {
        const textInput = getTextInput(itemDef);
        inputContainer.appendChild(textInput);
    }

    return inputContainer;
}

const getSelectInput = (codeListItems, itemOID) => {
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
        option.textContent = codeListItem.getTranslatedDecode(options.locale, false, options.defaultLocale);
        select.appendChild(option);
    }

    selectContainer.appendChild(select);
    return selectContainer;
}

const getRadioInput = (value, translatedText, itemOID, itemGroupOID) => {
    const radioContainer = document.createElement("label");
    radioContainer.className = "radio";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = itemGroupOID + "-" + itemOID;
    radio.value = value;
    radio.setAttribute("item-oid", itemOID);

    radioContainer.appendChild(radio);
    radioContainer.appendChild(document.createTextNode(" " + translatedText));
    return radioContainer;
}

const getTextInput = itemDef => {
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

    translatedText = translatedText.replace(/\*\*(.+)\*\*/g, "<b>$1</b>");
    translatedText = translatedText.replace(/\*(.+)\*/g, "<i>$1</i>");
    translatedText = translatedText.replace(/\_(.+)\_/g, "<u>$1</u>");
    return translatedText;
}
