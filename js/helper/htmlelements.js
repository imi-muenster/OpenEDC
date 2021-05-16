//
//
// TODO: This file should be refactored. ODM attributes should be moved to another file and range checks as well as data types combined to one object.
// Moreover, the code is quite redundant for some functions and creating a select should be refactored across the app as well.
// For the data types there are already translations in the i18n files available (different codelist data types may be removed for usability purposes)
//
//

import * as languageHelper from "./languagehelper.js";

const rangeCheckComparators = ["", "LT", "LE", "GT", "GE", "EQ", "NE"];
const rangeCheckComparatorsDisplay = ["", "<", "<=", ">", ">=", "=", "!="];
const dataTypes = ["integer", "float", "boolean", "text", "string", "date", "time", "datetime", "codelist-text", "codelist-integer", "codelist-float", "double"];
const mandatory = ["No", "Yes"];

export function getMetadataPanelBlock(elementOID, elementType, titleText, fallbackText, subtitleText, codedValue) {
    let panelBlock = document.createElement("a");
    panelBlock.className = "panel-block";
    panelBlock.setAttribute("draggable", true);
    panelBlock.setAttribute("oid", elementOID);
    panelBlock.setAttribute("element-type", elementType);
    if (codedValue) panelBlock.setAttribute("coded-value", codedValue);

    let title = document.createElement("div");
    title.className = "panel-block-title";

    if (titleText) {
        title.textContent = titleText;
    } else {
        let dot = document.createElement("span");
        dot.className = "panel-icon has-text-link";
        let dotIcon = document.createElement("i");
        dotIcon.className = "fas fa-question";
        dot.appendChild(dotIcon);
        panelBlock.appendChild(dot);
        subtitleText = languageHelper.getTranslation("missing-translation");
        if (fallbackText) {
            title.textContent = fallbackText;
        } else {
            title.innerHTML = "&nbsp;";
        }
    }

    if (subtitleText) {
        let content = document.createElement("div");
        content.className = "panel-block-content";
        content.appendChild(title);
        let subtitle = document.createElement("div");
        subtitle.className = "panel-block-subtitle";
        subtitle.textContent = subtitleText;
        content.appendChild(subtitle);
        panelBlock.appendChild(content);
    } else {
        panelBlock.appendChild(title);
    }

    return panelBlock;
}

export function getClinicaldataPanelBlock(elementOID, titleText, fallbackText, subtitleText, dataStatus) {
    let panelBlock = document.createElement("a");
    panelBlock.className = "panel-block";
    panelBlock.setAttribute("oid", elementOID);

    if (dataStatus) {
        let dot = document.createElement("span");
        dot.className = dataStatus == 5 ? "panel-icon has-text-danger" : "panel-icon has-text-link";
        let dotIcon = document.createElement("i");

        switch (dataStatus) {
            case 1:
                dotIcon.className = "far fa-circle";
                break;
            case 2:
                dotIcon.className = "fas fa-dot-circle";
                break;
            case 3:
                dotIcon.className = "fas fa-circle";
                break;
            case 4:
                dotIcon.className = "fas fa-check-circle";
                break;
            case 5:
                dotIcon.className = "fas fa-circle";
        }

        dot.appendChild(dotIcon);
        panelBlock.appendChild(dot);
    }

    let title = document.createElement("div");
    title.className = "panel-block-title";

    if (titleText) {
        title.textContent = titleText;
    } else if (fallbackText) {
        title.textContent = fallbackText;
    } else {
        title.innerHTML = "&nbsp;";
    }

    if (subtitleText) {
        let content = document.createElement("div");
        content.className = "panel-block-content";
        content.appendChild(title);
        let subtitle = document.createElement("div");
        subtitle.className = "panel-block-subtitle";
        subtitle.textContent = subtitleText;
        content.appendChild(subtitle);
        panelBlock.appendChild(content);
    } else {
        panelBlock.appendChild(title);
    }

    return panelBlock;
}

export function getAliasInputElement(context, name, disabled) {
    let field = document.createElement("div");
    field.className = "field alias-input is-grouped";

    let input = document.createElement("input");
    input.type = "text";
    if (disabled) input.disabled = true;

    input.value = context;
    input.className = "input alias-context";
    if (!context) input.placeholder = languageHelper.getTranslation("context");
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.value = name;
    input.className = "input alias-name";
    if (!name) input.placeholder = languageHelper.getTranslation("name");
    field.appendChild(input.cloneNode());

    return field;
}

export function getRangeCheckInputElement(selectedComparator, checkValue, disabled) {
    let field = document.createElement("div");
    field.className = "field range-check-input is-grouped";

    let select = getSelect("range-check-comparator", false, false, rangeCheckComparators, selectedComparator, rangeCheckComparatorsDisplay, null, disabled);
    field.appendChild(select);
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    let input = document.createElement("input");
    input.type = "text";
    input.value = checkValue;
    input.className = "input range-check-value";
    if (!checkValue) input.placeholder = languageHelper.getTranslation("check-value");
    if (disabled) input.disabled = true;
    field.appendChild(input.cloneNode());

    return field;
}

export function getDataTypeSelect() {
    const translatedOptions = dataTypes.map(option => languageHelper.getTranslation(option));
    return getSelect("datatype-select", true, true, dataTypes, null, translatedOptions, true);
}

export function getMandatorySelect() {
    const translatedOptions = mandatory.map(option => languageHelper.getTranslation(option.toLowerCase()));
    return getSelect("mandatory-select", true, true, mandatory, null, translatedOptions, true);
}

export function getSelect(name, isUnique, isFullwidth, values, selectedValue, displayTexts, i18n, disabled) {
    let select = document.createElement("div");
    if (isUnique) {
        select.id = `${name}-outer`;
        if (isFullwidth) {
            select.className = `select is-fullwidth`;
        } else {
            select.className = `select`;
        }
    } else {
        if (isFullwidth) {
            select.className = `select is-fullwidth ${name}-outer`;
        } else {
            select.className = `select ${name}-outer`;
        }
    }

    let innerSelect = document.createElement("select");
    if (disabled) innerSelect.disabled = true;
    if (isUnique) {
        innerSelect.id = `${name}-inner`;
    } else {
        innerSelect.className = `${name}-inner`;
    }

    for (let i = 0; i < values.length; i++) {
        let option = document.createElement("option");
        option.value = values[i];
        option.textContent = displayTexts ? displayTexts[i] : values[i];
        if (i18n) option.setAttribute("i18n", values[i].toLowerCase());
        if (values[i] == selectedValue) option.selected = true;
        innerSelect.appendChild(option);
    }

    select.appendChild(innerSelect);

    return select;
}

// TODO: Used the DOMParser as alternative to document.createElement. Check if the performance is not significantly worse
// TODO: Not very legible -- should be edited
export function getAuditRecord(type, studyEvent, form, dataStatus, user, site, dateTime) {
    return new DOMParser().parseFromString(`
        <div class="notification">
            <p class="mb-3"><strong>${languageHelper.getTranslation(type)}</strong></p>
            <p>${languageHelper.getTranslation("timestamp")}: <strong>${dateTime.toLocaleDateString()} – ${dateTime.toLocaleTimeString()}</strong></p>
            ${form && studyEvent ? '<p>' + languageHelper.getTranslation('form') + ': <strong>' + studyEvent + ' – ' + form + '</strong></p>': ''}
            ${dataStatus ? '<p>' + languageHelper.getTranslation('data-status') + ': <strong>' + languageHelper.getTranslation(dataStatus) + '</strong></p>': ''}
            ${user ? '<p>' + languageHelper.getTranslation('user') + ': <strong>' + user + '</strong></p>': ''}
            ${site ? '<p>' + languageHelper.getTranslation('site') + ': <strong>' + site + '</strong></p>': ''}
            ${form ? '<button class="button is-small mt-3">' + languageHelper.getTranslation('view-data') + '</button>' : ''}
        </div>
    `, "text/html").body.firstChild;
}
