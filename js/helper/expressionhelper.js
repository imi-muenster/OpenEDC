import { Parser } from "../../lib/expr-eval.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

let parser = null;

let expressionElements = [];
let conditionVariables = {};
let methodVariables = {};

function getParser() {
    if (!parser) parser = new Parser( { operators: { assignment: false } } );
    return parser;
}

export function parse(formalExpression) {
    try {
        // Expr-eval does not support dots in variables names which are therefore replaced with underscores
        return getParser().parse(escapeOIDDots(normalizeTokens(formalExpression)));
    } catch (error) {
        // Error while parsing the formal expressions
    }
}

export function getVariables(elements) {
    expressionElements = [];
    const variables = new Set();

    for (let element of elements) {
        const expression = parse(element.formalExpression);
        if (expression) {
            element.expression = expression;
            element.expression.variables().forEach(variable => variables.add(unescapeOIDDots(variable)));
            expressionElements.push(element);
        }
    }

    return Array.from(variables);
}

export function process(variables) {
    conditionVariables = {};
    methodVariables = {};
    
    for (const [key, value] of Object.entries(variables)) {
        conditionVariables[escapeOIDDots(key)] = value;
        // Only evaluate method expressions where all variables have a value != ""
        if (value != "") methodVariables[escapeOIDDots(key)] = value;
    }

    for (const elementWithExpression of expressionElements) {
        if (elementWithExpression.expressionType == "condition") processCondition(elementWithExpression);
        else if (elementWithExpression.expressionType == "method") processMethod(elementWithExpression);
    }
}

function processCondition(condition) {
    // Select conditional item group or item and hide it
    let conditionalElement;
    if (condition.elementType == "itemgroup") conditionalElement = $(`#clinicaldata-content [item-group-content-oid="${condition.oid}"]`);
    else if (condition.elementType == "item") conditionalElement = $(`#clinicaldata-content [item-field-oid="${condition.oid}"]`);
    conditionalElement.hide();

    // If the expression evaluates to true, show condition element
    if (condition.expression.evaluate(conditionVariables)) conditionalElement.show();

    // Add event listeners to respond to inputs to the determinant items
    for (const inputOID of condition.expression.variables()) {
        const inputElement = $(`#clinicaldata-content [item-oid="${unescapeOIDDots(inputOID)}"]`);
        if (!inputElement) continue;
        if (inputElement.getAttribute("type") == "text" || inputElement.getAttribute("type") == "select") {
            inputElement.addEventListener("input", event => respondToInputChangeCondition(event.target, inputOID, condition, conditionalElement));
        } else if (inputElement.getAttribute("type") == "radio") {
            const radioItems = $$(`#clinicaldata-content [item-oid="${unescapeOIDDots(inputOID)}"]`);
            for (const radioItem of radioItems) {
                radioItem.addEventListener("input", event => respondToInputChangeCondition(event.target, inputOID, condition, conditionalElement));
            }
        }
    }
}

function respondToInputChangeCondition(input, inputOID, condition, conditionalElement) {
    conditionVariables[inputOID] = !input.value ? "" : input.value;
    showOrHideConditionalElement(conditionalElement, condition.expression.evaluate(conditionVariables));
}

function showOrHideConditionalElement(conditionalElement, show) {
    if (show) {
        conditionalElement.show();
    } else {
        conditionalElement.hide();
        emptyConditionalElement(conditionalElement);
    }
}

function emptyConditionalElement(conditionalElement) {
    // For performance purposes, only send one radio input event for a group of radio buttons
    let lastRadioItemOID;

    const inputElements = conditionalElement.querySelectorAll("[item-oid]");
    for (const inputElement of inputElements) {
        if (inputElement.getAttribute("type") == "text" || inputElement.getAttribute("type") == "textarea" || inputElement.getAttribute("type") == "date") {
            inputElement.value = "";
            inputElement.dispatchEvent(new Event("input"));
        } else if (inputElement.getAttribute("type") == "select") {
            inputElement.selectedIndex = 0;
            inputElement.dispatchEvent(new Event("input"));
        } else if (inputElement.getAttribute("type") == "radio") {
            inputElement.checked = false;
            const itemOID = inputElement.getAttribute("item-oid");
            if (itemOID != lastRadioItemOID) {
                const event = new Event("input");
                Object.defineProperty(event, "target", { value: "", enumerable: true });
                inputElement.dispatchEvent(event);
                lastRadioItemOID = itemOID;
            }
        }
    }
}

function processMethod(method) {
    // Select conditional item group or item and make it read-only
    let computedElement = $(`#clinicaldata-content [item-oid="${method.oid}"]`);
    computedElement.readOnly = true;

    // If a value can already be calculated, assign it
    computedElement.value = computeExpression(method);

    // Add event listeners to respond to inputs to the determinant items
    for (const inputOID of method.expression.variables()) {
        const inputElement = $(`#clinicaldata-content [item-oid="${unescapeOIDDots(inputOID)}"]`);
        if (!inputElement) continue;
        if (inputElement.getAttribute("type") == "text" || inputElement.getAttribute("type") == "select") {
            inputElement.addEventListener("input", event => respondToInputChangeMethod(event.target, inputOID, method, computedElement));
        } else if (inputElement.getAttribute("type") == "radio") {
            const radioItems = $$(`#clinicaldata-content [item-oid="${inputOID}"]`);
            for (const radioItem of radioItems) {
                radioItem.addEventListener("input", event => respondToInputChangeMethod(event.target, inputOID, method, computedElement));
            }
        }
    }
}

function respondToInputChangeMethod(input, inputOID, method, computedElement) {
    if (input.value) methodVariables[inputOID] = input.value.replace(",", ".");
    else delete methodVariables[inputOID];

    computedElement.value = computeExpression(method);
    computedElement.dispatchEvent(new Event("input"));
}

function computeExpression(method) {
    try {
        const computedValue = method.expression.evaluate(methodVariables);
        return !isNaN(computedValue) && isFinite(computedValue) ? Math.round(computedValue * 100) / 100 : null;
    } catch (error) {
        return "";
    }
}

// Helper functions
function normalizeTokens(expression) {
    return expression.replace(/( AND | OR | && | \|\ )/g, function(string) {
        switch (string) {
            case " AND ": return " and ";
            case " OR ": return " or ";
            case " && ": return " and ";
            case " || ": return " or ";
        }
    });
}

function escapeOIDDots(expression) {
    return expression.replace(/\w+\.\w+\S*/g, function(string) {
        return string.replace(/\./g, "_");
    });
}

function unescapeOIDDots(expression) {
    return expression.replace(/\w+\_\w+\S*/g, function(string) {
        return string.replace(/\_/g, ".");
    });
}
