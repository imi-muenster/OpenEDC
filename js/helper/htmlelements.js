const rangeCheckComparators = ["--", "LT", "LE", "GT", "GE", "EQ", "NE"];
const dataTypes = ["text", "string", "date", "boolean", "integer", "float", "choices (text)", "choices (integer)", "choices (float)"];
const mandatory = ["No", "Yes"];

export function getMetadataPanelBlock(elementOID, elementType, displayText, fallbackText, codedValue) {
    let panelBlock = document.createElement("a");
    panelBlock.className = "panel-block";
    panelBlock.setAttribute("draggable", true);
    panelBlock.setAttribute("oid", elementOID);
    panelBlock.setAttribute("element-type", elementType);

    if (codedValue) {
        panelBlock.setAttribute("coded-value", codedValue);
    }
    if (typeof displayText === "object" && displayText) {
        panelBlock.appendChild(document.createTextNode(displayText.textContent));
    } else if (displayText) {
        panelBlock.appendChild(document.createTextNode(displayText));
    } else {
        let dot = document.createElement("span");
        dot.className = "panel-icon has-text-link";
        let dotIcon = document.createElement("i");
        dotIcon.className = "fas fa-exclamation";
        dot.appendChild(dotIcon);
        panelBlock.appendChild(dot);
        panelBlock.title = "Element not translated.";
        if (fallbackText) {
            panelBlock.appendChild(document.createTextNode(fallbackText));
        } else {
            panelBlock.appendChild(document.createTextNode("\u00A0"));
        }
    }

    return panelBlock;
}

export function getClinicaldataPanelBlock(elementOID, displayText, fallbackText, dataStatus) {
    let panelBlock = document.createElement("a");
    panelBlock.className = "panel-block";
    panelBlock.setAttribute("oid", elementOID);

    if (dataStatus) {
        let dot = document.createElement("span");
        dot.className = dataStatus == "Conflict" ? "panel-icon has-text-danger" : "panel-icon has-text-link";
        let dotIcon = document.createElement("i");

        switch (dataStatus) {
            case "Empty":
                dotIcon.className = "far fa-circle";
                break;
            case "Existing":
                dotIcon.className = "fas fa-circle";
                break;
            case "Verified":
                dotIcon.className = "fas fa-check-circle";
                break;
            case "Conflict":
                dotIcon.className = "fas fa-circle";
        }

        dot.appendChild(dotIcon);
        panelBlock.appendChild(dot);
    }

    if (typeof displayText === "object" && displayText) {
        panelBlock.appendChild(document.createTextNode(displayText.textContent));
    } else if (displayText) {
        panelBlock.appendChild(document.createTextNode(displayText));
    } else if (fallbackText) {
        panelBlock.appendChild(document.createTextNode(fallbackText));
    } else {
        panelBlock.appendChild(document.createTextNode("\u00A0"));
    }

    return panelBlock;
}

export function getAliasInputElement(context, name) {
    let field = document.createElement("div");
    field.className = "field alias-input is-grouped";

    let input = document.createElement("input");
    input.setAttribute("type", "text");

    input.value = context;
    input.className = "input alias-context";
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.value = name;
    input.className = "input alias-name";
    field.appendChild(input.cloneNode());

    return field;
}

export function getEmptyAliasInputElement() {
    let field = document.createElement("div");
    field.className = "field alias-input empty-alias-field is-grouped";

    let input = document.createElement("input");
    input.setAttribute("type", "text");

    input.className = "input alias-context";
    input.setAttribute("placeholder", "Context");
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.className = "input alias-name";
    input.setAttribute("placeholder", "Name");
    field.appendChild(input.cloneNode());

    return field;
}

export function getMeasurementUnitInputElement(oid, name, symbol) {
    let field = document.createElement("div");
    field.className = "field measurement-unit-input is-grouped";
    field.setAttribute("oid", oid);

    let input = document.createElement("input");
    input.setAttribute("type", "text");

    input.value = name;
    input.className = "input measurement-unit-name";
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.value = symbol;
    input.className = "input measurement-unit-symbol";
    field.appendChild(input.cloneNode());

    return field;
}

export function getEmptyMeasurementUnitInputElement() {
    let field = document.createElement("div");
    field.className = "field measurement-unit-input empty-measurement-unit-field is-grouped";

    let input = document.createElement("input");
    input.setAttribute("type", "text");

    input.className = "input measurement-unit-name";
    input.setAttribute("placeholder", "Name");
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.className = "input measurement-unit-symbol";
    input.setAttribute("placeholder", "Symbol");
    field.appendChild(input.cloneNode());

    return field;
}

export function getConditionInputElement(oid, name, formaleExpression) {
    let field = document.createElement("div");
    field.className = "field condition-input is-grouped";
    field.setAttribute("oid", oid);

    let input = document.createElement("input");
    input.setAttribute("type", "text");

    input.value = name;
    input.className = "input condition-name";
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.value = formaleExpression;
    input.className = "input condition-formex";
    field.appendChild(input.cloneNode());

    return field;
}

export function getEmptyConditionInputElement() {
    let field = document.createElement("div");
    field.className = "field condition-input empty-condition-field is-grouped";

    let input = document.createElement("input");
    input.setAttribute("type", "text");

    input.className = "input condition-name";
    input.setAttribute("placeholder", "Name");
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.className = "input condition-formex";
    input.setAttribute("placeholder", "Formal expression");
    field.appendChild(input.cloneNode());

    return field;
}

export function getRangeCheckInputElement(selectedComparator, checkValue) {
    let field = document.createElement("div");
    field.className = "field range-check-input is-grouped";

    let select =  getSelect("range-check-comparator", false, false, rangeCheckComparators, selectedComparator);
    field.appendChild(select);
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    let input = document.createElement("input");
    input.setAttribute("type", "text");
    input.value = checkValue;
    input.className = "input range-check-value";
    field.appendChild(input.cloneNode());

    return field;
}

export function getEmptyRangeCheckInputElement() {
    let field = document.createElement("div");
    field.className = "field range-check-input empty-range-check-field is-grouped";

    let select = getSelect("range-check-comparator", false, false, rangeCheckComparators, "");
    field.appendChild(select);
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    let input = document.createElement("input");
    input.setAttribute("type", "text");
    input.className = "input range-check-value";
    input.setAttribute("placeholder", "Check value");
    field.appendChild(input);

    return field;
}

export function getDataTypeSelect() {
    return getSelect("datatype-select", true, true, dataTypes);
}

export function getMandatorySelect() {
    return getSelect("mandatory-select", true, true, mandatory);
}

export function getSelect(name, isUnique, isFullwidth, values, selectedValue) {
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
    if (isUnique) {
        innerSelect.id = `${name}-inner`;
    } else {
        innerSelect.className = `${name}-inner`;
    }

    for (let value of values) {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(value));
        if (value == selectedValue) {
            option.selected = true;
        }
        innerSelect.appendChild(option);
    }

    select.appendChild(innerSelect);

    return select;
}

// TODO: Used the DOMParser as alternative to document.createElement. Check if the performance is not significantly worse
export function getAuditRecord(type, studyEvent, form, user, site, dateTime) {
    return new DOMParser().parseFromString(`
        <div class="notification">
            <p class="mb-3"><strong>${type}</strong></p>
            <p>Timestamp: <strong>${dateTime.toLocaleDateString()} – ${dateTime.toLocaleTimeString()}</strong></p>
            ${form && studyEvent ? '<p>Form: <strong>' + studyEvent + ' – ' + form + '</strong></p>': ''}
            ${user ? '<p>User: <strong>' + user + '</strong></p>': ''}
            ${site ? '<p>Site: <strong>' + site + '</strong></p>': ''}
            ${form ? '<button class="button is-small mt-3">View Data</button>' : ""}
        </div>
    `, "text/html").body.firstChild;
}
