import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";
import * as clinicalDataWrapper from "../odmwrapper/clinicaldatawrapper.js"

const $ = query => metadataWrapper.getMetadata().querySelector(query);
const $$ = query => metadataWrapper.getMetadata().querySelectorAll(query);

const defaultImageWidth = 40;

export async function getFormAsHTML(currentPath, currentSubjectKey, options) {
    const formOID = currentPath.formOID;
    const formAsHTML = document.createElement("div");
    formAsHTML.id = "odm-html-content";
    const hideForm = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', formOID);
    if(hideForm) formAsHTML.classList = 'is-hidden-survey-view'

    for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        let itemGroupContent;
        if(options.showAsLikert && isLikertPossible(itemGroupOID)) itemGroupContent = getItemGroupAsLikertScale(itemGroupOID, options);
        else itemGroupContent = await getItemGroupDefault(itemGroupOID, currentPath, currentSubjectKey, options);

        formAsHTML.appendChild(itemGroupContent);
    }

    return formAsHTML;
}

function isLikertPossible(itemGroupOID, options){
    let compareCodelistOID = null;
    if(metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-likert', itemGroupOID)) return false;

    for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
        const itemOID = itemRef.getAttribute("ItemOID");
        const itemDef = $(`ItemDef[OID="${itemOID}"]`);
        const codeListRef = itemDef.querySelector("CodeListRef"); 
        if(!codeListRef) return false;
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        const codeListItems = $$(`CodeList[OID="${codeListOID}"] CodeListItem`);
        if(codeListItems.length > options.likertScaleLimit) return false;
        if(compareCodelistOID != null && codeListOID != compareCodelistOID) return false;
        compareCodelistOID = codeListOID;
    }
    return true;
}

async function getItemGroupDefault(itemGroupOID, currentPath, currentSubjectKey, options) {

    const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    const hideItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemGroupOID);
    options["maxImageWidth"] = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'codelistitem-image-width', itemGroupOID);

    const itemGroupContent = document.createElement("div");
    itemGroupContent.className = `item-group-content ${hideItemGroup ? 'is-hidden-survey-view' : ''}`;
    itemGroupContent.setAttribute("item-group-content-oid", itemGroupOID);

    const itemGroupDescr = document.createElement("h2");
    itemGroupDescr.className = "subtitle";
    itemGroupDescr.innerHTML = processMarkdown(itemGroupDef.getTranslatedDescription(options.useNames ? null : options.locale, options.useNames));
    itemGroupContent.appendChild(itemGroupDescr);

    if(metadataWrapper.isItemGroupRepeating(itemGroupOID)) {
        let repeatKeysFound = false;
        let addButton = document.createElement("button");
        addButton.classList = "button is-small is-link mb-5";
        addButton.innerText = "Hinzufügen";
        addButton.onclick = () => {
            let itemGroupRepeats = [...itemGroupContent.querySelectorAll('[item-group-repeat-key]')];
            let nextKey = "1";
            if(itemGroupRepeats.length > 0) nextKey = +itemGroupRepeats[itemGroupRepeats.length -1].getAttribute("item-group-repeat-key") + 1;
            addItemGroupRepeatingBox(itemGroupContent, itemGroupOID, options, nextKey)
        }
        itemGroupContent.appendChild(addButton)

        if(currentSubjectKey) {
            const repeatKeys = await clinicalDataWrapper.getItemGroupRepeatKeys(currentPath, currentSubjectKey);
            repeatKeysFound = repeatKeys.length > 0;
            console.log(repeatKeys);
            [...repeatKeys].forEach(key =>addItemGroupRepeatingBox(itemGroupContent, itemGroupOID, options, key));
        }

        if(!repeatKeysFound) {
           addItemGroupRepeatingBox(itemGroupContent, itemGroupOID, options, "1");
        }
    }
    else addItemGroupElements(itemGroupContent, itemGroupOID, options);
    const divider = document.createElement("hr");
    itemGroupContent.appendChild(divider);
    return itemGroupContent;
}

function addItemGroupRepeatingBox(parent, itemGroupOID, options, repeatKey) {
    let repeatBox = document.createElement('div');
    repeatBox.setAttribute("item-group-repeat-key", repeatKey);
    repeatBox.classList = 'box has-background-light mb-3 item-group-repetition p-2'
    let divheader = document.createElement('div');
    divheader.classList = 'is-flex is-align-items-center'
    let h3 = document.createElement('h3');
    h3.classList = 'is-flex-grow-1'
    h3.innerText = `#${repeatKey}`;
    divheader.appendChild(h3);
    let closeIcon = document.createElement('i');
    closeIcon.classList = 'fa-solid fa-close mr-0 is-flex-grow-0';
    closeIcon.onclick = () => console.log("close this event");
    divheader.appendChild(closeIcon)
    repeatBox.appendChild(divheader);
    addItemGroupElements(repeatBox, itemGroupOID, options);
    parent.insertBefore(repeatBox, parent.querySelector('button'));
}

function addItemGroupElements(parent, itemGroupOID, options) {
    for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
        const itemOID = itemRef.getAttribute("ItemOID");
        const itemDef = $(`ItemDef[OID="${itemOID}"]`);
        const hideItem = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemOID);

        const itemField = document.createElement("div");
        itemField.className = `item-field ${hideItem ? 'is-hidden-survey-view' : ''}`;
        itemField.setAttribute("item-field-oid", itemOID);
        itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));

        const itemQuestion = document.createElement("label");
        itemQuestion.className = "label";
        itemQuestion.innerHTML = processMarkdown(itemDef.getTranslatedQuestion(options.useNames ? null : options.locale, options.useNames)) || options.missingTranslation;
        itemQuestion.innerHTML += itemRef.getAttribute("Mandatory") == "Yes" ? " (*)" : "";
        itemField.appendChild(itemQuestion);

        const itemInput = getItemInput(itemDef, itemGroupOID, options);
        itemField.appendChild(itemInput);
        parent.appendChild(itemField);
    }
}

export function addItemGroupRepetition(itemGroupOID, itemGroupRepeatKey, options) {
    console.log(itemGroupOID, itemGroupRepeatKey);
    let parent = document.querySelector(`#clinicaldata-content .item-group-content[item-group-content-oid="${itemGroupOID}"]`);
    console.log(parent);
    if(!parent) return;
    console.log("adding repeat box")
    addItemGroupRepeatingBox(parent, itemGroupOID, options, itemGroupRepeatKey);
}

function getItemGroupAsLikertScale(itemGroupOID, options) {
    const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    const hideItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemGroupOID);
    const maxImageWidth = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'codelistitem-image-width', itemGroupOID);

    const itemGroupContent = document.createElement("div");
    itemGroupContent.className = `item-group-content ${hideItemGroup ? 'is-hidden-survey-view' : ''}`;
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
        likertOptionsPlaceholder.classList = "column is-4";
        let likertOptionsHeader = document.createElement('div');
        likertOptionsHeader.classList = 'column is-8 grid-even-columns has-text-weight-bold';
        likertOptionsDiv.appendChild(likertOptionsPlaceholder)
        likertOptionsDiv.appendChild(likertOptionsHeader);
        likertContent.appendChild(likertOptionsDiv);

        for (let codeListItem of codeListItems) {
            let questionDiv = document.createElement('div');
            questionDiv.classList = "has-overvlow-wrap has-text-align-center";
            const translatedText = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;

            if(translatedText.startsWith("base64;")) {
                const splits = translatedText.split(";")
                let img = document.createElement('img');
                img.style = `width: ${maxImageWidth ? maxImageWidth : defaultImageWidth}px;`
                img.setAttribute("src", `data:image/${splits[1] == 'svg' ? 'svg+xml' : splits[1]};base64,${splits[2]}`);
                questionDiv.appendChild(img);
            }
            else {
                questionDiv.innerText = translatedText;
                //if(showtext) radioContainer.appendChild(document.createTextNode(" " + translatedText));
            }
           
            likertOptionsHeader.appendChild(questionDiv);
        }

        for (const itemRef of itemRefs) {
            const itemOID = itemRef.getAttribute("ItemOID");
            const itemDef = $(`ItemDef[OID="${itemOID}"]`);
            const hideItem = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemOID);

            //const itemRow = document.createElement('div');
            //itemRow.classList = "column is-5";

            const itemField = document.createElement("div");
            itemField.className = `item-field column is-12 columns ${hideItemGroup || hideItem ? 'is-hidden-survey-view' : ''}`;
            itemField.setAttribute("item-field-oid", itemOID);
            itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));

            const itemQuestion = document.createElement("label");
            itemQuestion.className = "label column is-4";
            itemQuestion.innerHTML = processMarkdown(itemDef.getTranslatedQuestion(options.useNames ? null : options.locale, options.useNames)) || options.missingTranslation;
            itemQuestion.innerHTML += itemRef.getAttribute("Mandatory") == "Yes" ? " (*)" : "";
            //itemRow.appendChild(itemQuestion);

            const itemOptions = document.createElement('div');
            itemOptions.classList = "field column is-8 grid-even-columns has-text-align-center is-align-content-center";

            for (let codeListItem of codeListItems) {
                const translatedText  = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;
                const radioInput = getRadioInput(codeListItem.getAttribute("CodedValue"), translatedText, itemDef.getAttribute("OID"), itemGroupOID, options, false);
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
    const itemOID = itemDef.getAttribute('OID');
    const inputContainer = document.createElement("div");
    inputContainer.className = "field";

    const codeListRef = itemDef.querySelector("CodeListRef");
    const measurementUnitRef = itemDef.querySelector("MeasurementUnitRef");
    if (codeListRef) {
        const codeListOID = codeListRef.getAttribute("CodeListOID");
        const codeListItems = $$(`CodeList[OID="${codeListOID}"] CodeListItem`);
        options["maxImageWidth"] = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'codelistitem-image-width', itemOID) || options["maxImageWidth"];
        const forceCheckboxes = containsImages(codeListItems, options);
        if (!forceCheckboxes && codeListItems.length >= 5) {
            const selectInput = getSelectInput(codeListItems, itemOID, options);
            inputContainer.appendChild(selectInput);
        } else {
            for (let codeListItem of codeListItems) {
                const translatedText = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;
                const radioInput = getRadioInput(codeListItem.getAttribute("CodedValue"), translatedText, itemOID, itemGroupOID, options);
                inputContainer.appendChild(radioInput);
                //inputContainer.appendChild(document.createElement("br"));
            }
        }
    } else if (itemDef.getAttribute("DataType") == "boolean") {
        const radioInputYes = getRadioInput("1", options.yes, itemOID, itemGroupOID, options);
        const radioInputNo = getRadioInput("0", options.no, itemOID, itemGroupOID, options);
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

const containsImages = (codeListItems, options) => {
    for (let codeListItem of codeListItems) {
        if(codeListItem.getTranslatedDecode(options.locale, options.useNames).startsWith("base64"))
            return true;
    }
    return false;
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

const getRadioInput = (value, translatedText, itemOID, itemGroupOID, options, noLikert = true) => {
    

    const radioContainer = document.createElement("label");
    radioContainer.className = `radio ${noLikert ? 'ml-0 is-flex is-align-items-center' : ''}`;
    radioContainer.style = "gap: 5px";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = itemGroupOID + "-" + itemOID;
    radio.value = value;
    radio.setAttribute("item-oid", itemOID);
    radioContainer.codedValue = value;
    radioContainer.textValue = translatedText;
    
    radioContainer.appendChild(radio);
    if(noLikert){
        if(translatedText.startsWith("base64;")) {
            const splits = translatedText.split(";")
            let img = document.createElement('img');
            img.style = `width: ${options.maxImageHeight ? options.maxImageHeight : defaultImageWidth}px;`
            img.setAttribute("src", `data:image/${splits[1] == 'svg' ? 'svg+xml' : splits[1]};base64,${splits[2]}`);
            radioContainer.appendChild(img);
        }
        else {
            radioContainer.appendChild(document.createTextNode(" " + translatedText));
        }
    }
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
    } else if (dataType == "text" && options.textAsTextarea) {
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
