const $ = query => odm.querySelector(query);
const $$ = query => odm.querySelectorAll(query);

let odm = null;
let options = {};

// TODO: Handle defaultLocale
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
        itemGroupContent.id = itemGroupOID;

        const itemGroupDescr = document.createElement("h2");
        itemGroupDescr.className = "subtitle";
        const description = itemGroupDef.querySelector("Description");
        itemGroupDescr.textContent = description ? description.getTranslatedDescription(options.locale) : null;
        itemGroupContent.appendChild(itemGroupDescr);

        for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
            const itemOID = itemRef.getAttribute("ItemOID");
            const itemDef = $(`ItemDef[OID="${itemOID}"]`);

            const itemField = document.createElement("div");
            itemField.className = "item-field";
            itemField.id = itemOID;
            itemField.setAttribute("item-field-oid", itemOID);
            itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));

            const itemQuestion = document.createElement("label");
            itemQuestion.className = "label";
            const question = itemDef.querySelector("Question");
            itemQuestion.textContent = question ? question.getTranslatedQuestion(options.locale) : null;
            itemQuestion.textContent += itemRef.getAttribute("mandatory") == "Yes" ? " (*)" : "";
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
                const decode = codeListItem.querySelector("Decode");
                const translatedText = decode ? decode.getTranslatedDecode(options.locale) : null;
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
        const symbol = $(`MeasurementUnit[OID="${measurementUnitRef.getAttribute("MeasurementUnitOID")}"] Symbol`);
        unit.textContent = symbol ? symbol.getTranslatedSymbol(options.locale) : null;
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
    select.setAttribute("item-oid", itemOID);

    const option = document.createElement("option");
    option.value = "";
    select.appendChild(option);
    for (let codeListItem of codeListItems) {
        const option = document.createElement("option");
        option.value = codeListItem.getAttribute("CodedValue");
        const decode = codeListItem.querySelector("Decode");
        option.textContent = decode ? decode.getTranslatedDecode(options.locale) : null;
        select.appendChild(option);
    }

    selectContainer.appendChild(select);
    return selectContainer;
}

// TODO: Test radioContainer.innerHTML = ``; performance
// TODO: Could also take all codeListItems, iterate, add <br> and return entire element
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
        input.type = "textarea";
    }

    return input;
}
