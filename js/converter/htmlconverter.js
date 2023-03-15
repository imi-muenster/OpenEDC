import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";

const $ = query => metadataWrapper.getMetadata().querySelector(query);
const $$ = query => metadataWrapper.getMetadata().querySelectorAll(query);

let defaultCodeListItemImageWidth;
let defaultItemImageWidth;

export function getFormAsHTML(formOID, options) {
    defaultCodeListItemImageWidth = options['defaultCodeListItemImageWidth'];
    defaultItemImageWidth = options['defaultItemImageWidth']
    const formAsHTML = document.createElement("div");
    formAsHTML.id = "odm-html-content";
    const hideForm = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', formOID);
    if(hideForm) formAsHTML.classList = 'is-hidden-survey-view'

    for (const itemGroupRef of $$(`FormDef[OID="${formOID}"] ItemGroupRef`)) {
        const itemGroupOID = itemGroupRef.getAttribute("ItemGroupOID");
        let itemGroupContent;
        if(options.showAsLikert && isLikertPossible(itemGroupOID, options)) itemGroupContent = getItemGroupAsLikertScale(itemGroupOID, options);
        else itemGroupContent = getItemGroupDefault(itemGroupOID, options);
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

function getItemGroupDefault(itemGroupOID, options) {
    const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    const hideItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemGroupOID);
    options["maxImageWidth"] = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'codelistitem-image-width', itemGroupOID);

    const itemGroupContent = document.createElement("div");
    itemGroupContent.className = `item-group-content ${hideItemGroup ? 'is-hidden-survey-view' : ''}`;
    itemGroupContent.setAttribute("item-group-content-oid", itemGroupOID);

    const translatedDescription = processMarkdown(itemGroupDef.getTranslatedDescription(options.useItemGroupNames ? null : options.locale, options.useItemGroupNames));
    const itemGroupDescr = getItemGroupHeading(translatedDescription);
    itemGroupContent.appendChild(itemGroupDescr);

    for (const itemRef of $$(`ItemGroupDef[OID="${itemGroupOID}"] ItemRef`)) {
        const itemOID = itemRef.getAttribute("ItemOID");
        const itemDef = $(`ItemDef[OID="${itemOID}"]`);
        const hideItem = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemOID);

        const itemField = document.createElement("div");
        itemField.className = `item-field ${hideItem ? 'is-hidden-survey-view' : ''}`;
        itemField.setAttribute("item-field-oid", itemOID);
        itemField.setAttribute("mandatory", itemRef.getAttribute("Mandatory"));
        let itemQuestion = document.createElement('div');
        itemQuestion.classList = 'item-question'
        const translatedQuestion = processMarkdown(itemDef.getTranslatedQuestion(options.useItemNames ? null : options.locale, options.useItemNames)) || options.missingTranslation;
        const splits = transformImagesInTranslation(translatedQuestion)
        splits.forEach(split => {
            if(split.type === 'image') itemField.appendChild(split.value)
            else {
                const itemQuestionPart = document.createElement("label");
                itemQuestionPart.className = "label";
                itemQuestionPart.innerHTML = split.value;
                //itemQuestion.innerHTML += ;
                itemQuestion.appendChild(itemQuestionPart);
            }
        })

         if(itemRef.getAttribute("Mandatory") == "Yes") {
            let reverseChildren = [...itemField.children].slice().reverse();
            let lastLabelChildIndex = reverseChildren.findIndex(x => x.tagName == 'LABEL');
            if(lastLabelChildIndex >= 0) reverseChildren[lastLabelChildIndex].innerHTML += " (*)";
        }

        itemField.appendChild(itemQuestion)

        const itemInput = getItemInput(itemDef, itemGroupOID, options);
        itemField.appendChild(itemInput);
        itemGroupContent.appendChild(itemField);
        const divider = document.createElement("hr");
        itemField.appendChild(divider);
    }
    return itemGroupContent;
}

function getItemGroupAsLikertScale(itemGroupOID, options) {
    const itemGroupDef = $(`ItemGroupDef[OID="${itemGroupOID}"]`);
    const hideItemGroup = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'no-survey', itemGroupOID);
    const maxImageWidth = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'codelistitem-image-width', itemGroupOID);

    const itemGroupContent = document.createElement("div");
    itemGroupContent.className = `item-group-content ${hideItemGroup ? 'is-hidden-survey-view' : ''}`;
    itemGroupContent.setAttribute("item-group-content-oid", itemGroupOID);

    const translatedDescription = processMarkdown(itemGroupDef.getTranslatedDescription(options.useItemGroupNames ? null : options.locale, options.useItemGroupNames));
    const itemGroupDescr = getItemGroupHeading(translatedDescription);
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
            questionDiv.classList = "has-overflow-wrap has-text-align-center item-question";
            const translatedText = codeListItem.getTranslatedDecode(options.locale, false) || options.missingTranslation;

            const splits = transformImagesInTranslation(translatedText)
            splits.forEach(split => {
                if(split.type === 'image') {
                    split.value.style = `width: ${maxImageWidth ? maxImageWidth : defaultCodeListItemImageWidth}px;`
                    questionDiv.appendChild(split.value);
                }
                else {
                    const codeListItemPart = document.createElement("span");
                    codeListItemPart.className = "span";
                    codeListItemPart.innerHTML = split.value;
                    questionDiv.appendChild(codeListItemPart);
                }
            })
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

            const itemQuestion = document.createElement("div");
            itemQuestion.className = "column is-4 item-question";
            const translatedQuestion = processMarkdown(itemDef.getTranslatedQuestion(options.useItemNames ? null : options.locale, options.useItemNames)) || options.missingTranslation;
            //itemQuestion.innerHTML += itemRef.getAttribute("Mandatory") == "Yes" ? " (*)" : "";
            //itemRow.appendChild(itemQuestion);

            const splits = transformImagesInTranslation(translatedQuestion)
            splits.forEach(split => {
                if(split.type === 'image') itemQuestion.appendChild(split.value)
                else {
                    const itemQuestionPart = document.createElement("label");
                    itemQuestionPart.className = "label";
                    itemQuestionPart.innerHTML = split.value;
                    //itemQuestion.innerHTML += ;
                    itemQuestion.appendChild(itemQuestionPart);
                }
            })
            if(itemRef.getAttribute("Mandatory") == "Yes") {
                let reverseChildren = [...itemQuestion.children].slice().reverse();
                let lastLabelChildIndex = reverseChildren.findIndex(x => x.tagName == 'LABEL');
                if(lastLabelChildIndex >= 0) reverseChildren[lastLabelChildIndex].innerHTML += " (*)";
            }

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

function getItemGroupHeading(translatedDescription) {
    const itemGroupDescr = document.createElement("h2");
    itemGroupDescr.className = "subtitle";
    const splits = transformImagesInTranslation(translatedDescription)
    splits.forEach(split => {
        if(split.type === 'image') itemGroupDescr.appendChild(split.value)
        else {
            const itemDescriptionPart = document.createElement("span");
            itemDescriptionPart.className = "span";
            itemDescriptionPart.innerHTML = split.value;
            //itemQuestion.innerHTML += ;
            itemGroupDescr.appendChild(itemDescriptionPart);
        }
    })
    return itemGroupDescr;
}

function transformImagesInTranslation(translatedString) {
    let transformedParts = [];
    const splits = metadataWrapper.getImageSplitsForString(translatedString);
    splits.forEach(split => {
        if(split.startsWith("![")) {
            const imageInfo = metadataWrapper.extractImageInfo(split).data;
            if(!imageInfo) return;
            let img = document.createElement('img');
            const width = imageInfo.width?? defaultItemImageWidth;
            img.style = `width: ${width};`;

            const format = imageInfo.format?? 'png';

            img.setAttribute("src", `data:image/${format == 'svg' ? 'svg+xml' : format};base64,${imageInfo.base64Data}`);
            transformedParts.push({type: 'image', value: img});
        }
        else if(split.trim() != "") {
            const text = split.trim();
            transformedParts.push({type: 'text', value: text});
        }
    });
    return transformedParts;
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
        options['maxCodelistItemImageWidthForItem'] = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'codelistitem-image-width', itemOID) || options["maxImageWidth"];
        const forceCheckboxes = containsImages(codeListItems, options);
        if (!forceCheckboxes && codeListItems.length >= 5) {
            const selectInput = getSelectInput(codeListItems, itemOID, options);
            inputContainer.appendChild(selectInput);
        } else {
            let presentationType = metadataWrapper.getSettingStatusByOID(metadataWrapper.SETTINGS_CONTEXT, 'presentation-type', itemOID);
            options.noMargin = false;
            if(presentationType == 'next-to-each-other') {
                inputContainer.classList.add('is-flex', "is-justify-content-space-between");
                options.noMargin = true;
            }
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
        unit.textContent = measurementUnitDef.getTranslatedSymbol(options.useItemNames ? null : options.locale, options.useItemNames) || options.missingTranslation;
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
        const translatedDecode = codeListItem.getTranslatedDecode(options.locale, options.useItemNames);
        if(!translatedDecode) continue;
        const splits = translatedDecode.split(/(!\[.*?\](?:\(data:image\/[a-z]+;base64,[a-zA-Z0-9\/+=]+\))?(?:\[(?:[a-z]+:[a-zA-Z0-9%]+?)+;\])?)/g);
        if(translatedDecode && translatedDecode.startsWith("base64"))
            return true;
        for(let split of splits) {
            if(split && split.startsWith("![")) return true;
        }
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
        option.textContent = codeListItem.getTranslatedDecode(options.useItemNames ? null : options.locale, options.useItemNames) || options.missingTranslation;
        select.appendChild(option);
    }

    selectContainer.appendChild(select);
    return selectContainer;
}

const getRadioInput = (value, translatedText, itemOID, itemGroupOID, options, noLikert = true) => {
    

    const radioContainer = document.createElement("label");
    radioContainer.className = `radio ${noLikert ? 'ml-0 is-flex is-align-items-center' : ''} ${options.noMargin ? 'm-0' : ''}`;
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
        const splits = translatedText.split(/(!\[.*?\](?:\(data:image\/[a-z]+;base64,[a-zA-Z0-9\/+=]+\))?(?:\[(?:[a-z]+:[a-zA-Z0-9%]+?)+;\])?)/g);
        splits.forEach(split => {
            if(split.startsWith("![")) {
                const imageInfo = metadataWrapper.extractImageInfo(split).data;
                if(!imageInfo) return;
                let img = document.createElement('img');
                img.style = `width: ${options.maxCodelistItemImageWidthForItem ? options.maxCodelistItemImageWidthForItem : defaultCodeListItemImageWidth}px;`
                const format = imageInfo.format?? 'png';
                img.setAttribute("src", `data:image/${format == 'svg' ? 'svg+xml' : format};base64,${imageInfo.base64Data}`);
                radioContainer.appendChild(img);
            }
            else if(split.trim() != "") {
                radioContainer.appendChild(document.createTextNode(" " + split.trim()));
            }
        });
        /* if(translatedText.startsWith("base64;")) {
            const splits = translatedText.split(";")
            let img = document.createElement('img');
            img.style = `width: ${options.maxImageWidth ? options.maxImageWidth : defaultCodeListItemImageWidth}px;`
            img.setAttribute("src", `data:image/${splits[1] == 'svg' ? 'svg+xml' : splits[1]};base64,${splits[2]}`);
            radioContainer.appendChild(img);
        }
        else {
            radioContainer.appendChild(document.createTextNode(" " + translatedText));
        } */
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
