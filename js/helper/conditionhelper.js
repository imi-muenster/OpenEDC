const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export function process(conditions) {
    for (const condition of conditions) {
        // Unravel the the formal expression parts
        const formalExpressionParts = condition.formalExpression.split(" ");
        const determinant = formalExpressionParts[0];
        const operator = formalExpressionParts[1];
        const target = formalExpressionParts[2].replace(/['"]/g, "");

        // Select conditional item group or item
        let conditionalElement;
        if (condition.type == "itemgroup") conditionalElement = $(`[item-group-content-oid="${condition.oid}"]`);
        else if (condition.type == "item") conditionalElement = $(`[item-field-oid="${condition.oid}"]`);

        // Hide the element if the operator is !=
        if (operator == "!=") conditionalElement.hide();

        // Add event listeners to respond to inputs to the determinant items
        const inputElement = $(`[item-oid="${determinant}"]`);
        if (!inputElement) continue;
        if (inputElement.getAttribute("type") == "text" || inputElement.getAttribute("type") == "select") {
            inputElement.addEventListener("input", function(event) {
                respondToInputChange(event, conditionalElement, operator, target);
            });
        } else if (inputElement.getAttribute("type") == "radio") {
            const radioItems = $$(`[item-oid="${determinant}"]`);
            for (const radioItem of radioItems) {
                radioItem.addEventListener("input", function(event) {
                    respondToInputChange(event, conditionalElement, operator, target);
                });
            }
        }
    }
}

function respondToInputChange(event, conditionalElement, operator, target) {
    const value = !isNaN(event.target.value) ? parseFloat(event.target.value) : event.target.value;

    if (operator == "!=") {
        showOrHideConditionalElement(conditionalElement, value != target);
    } else if (operator == "==" || operator == "=") {
        showOrHideConditionalElement(conditionalElement, value == target);
    } else if (operator == ">=") {
        showOrHideConditionalElement(conditionalElement, !isNaN(value) && value >= target);
    } else if (operator == "<=") {
        showOrHideConditionalElement(conditionalElement, !isNaN(value) && value <= target);
    } else if (operator == ">") {
        showOrHideConditionalElement(conditionalElement, !isNaN(value) && value > target);
    } else if (operator == "<") {
        showOrHideConditionalElement(conditionalElement, !isNaN(value) && value < target);
    }
}

function showOrHideConditionalElement(conditionalElement, hide) {
    if (hide) {
        conditionalElement.hide();
        emptyConditionalElement(conditionalElement);
    } else {
        conditionalElement.show();
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
