const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export function process(elementsWithCondition) {
    for (const elementWithCondition of elementsWithCondition) {
        const formalExpressionParts = elementWithCondition.formalExpression.split(" ");
        const determinant = formalExpressionParts[0];
        const operator = formalExpressionParts[1];
        const target = formalExpressionParts[2].replace(/['"]/g, "");

        if (operator == "!=") {
            $(`[item-field-oid="${elementWithCondition.oid}"]`).hide();
        }

        const inputElement = $(`[item-oid="${determinant}"]`);
        if (!inputElement) continue;
        if (inputElement.getAttribute("type") == "text" || inputElement.getAttribute("type") == "select") {
            inputElement.addEventListener("input", function(event) {
                respondToInputChange(event, elementWithCondition.oid, operator, target);
            });
        } else if (inputElement.getAttribute("type") == "radio") {
            const radioItems = $$(`[item-oid="${determinant}"]`);
            for (const radioItem of radioItems) {
                radioItem.addEventListener("input", function(event) {
                    respondToInputChange(event, elementWithCondition.oid, operator, target);
                });
            }
        }
    }
}

function respondToInputChange(event, conditionalItem, operator, target) {
    const value = !isNaN(event.target.value) ? parseFloat(event.target.value) : event.target.value;

    if (operator == "!=") {
        showOrHideConditionalItem(conditionalItem, value != target);
    } else if (operator == "==" || operator == "=") {
        showOrHideConditionalItem(conditionalItem, value == target);
    } else if (operator == ">=") {
        showOrHideConditionalItem(conditionalItem, !isNaN(value) && value >= target);
    } else if (operator == "<=") {
        showOrHideConditionalItem(conditionalItem, !isNaN(value) && value <= target);
    } else if (operator == ">") {
        showOrHideConditionalItem(conditionalItem, !isNaN(value) && value > target);
    } else if (operator == "<") {
        showOrHideConditionalItem(conditionalItem, !isNaN(value) && value < target);
    }
}

function showOrHideConditionalItem(itemOID, hide) {
    if (hide) {
        $(`[item-field-oid="${itemOID}"]`).hide();
        emptyConditionalItem(itemOID);
    } else {
        $(`[item-field-oid="${itemOID}"]`).show();
    }
}

function emptyConditionalItem(itemOID) {
    const inputElement = $(`[item-oid="${itemOID}"]`);
    if (inputElement.getAttribute("type") == "text" || inputElement.getAttribute("type") == "textarea" || inputElement.getAttribute("type") == "date") {
        inputElement.value = "";
        inputElement.dispatchEvent(new Event("input"));
    } else if (inputElement.getAttribute("type") == "select") {
        inputElement.selectedIndex = 0;
        inputElement.dispatchEvent(new Event("input"));
    } else if (inputElement.getAttribute("type") == "radio") {
        const radioItems = $$(`[item-oid="${itemOID}"]`);
        let radioItem;
        for (radioItem of radioItems) {
            radioItem.checked = false;
        }
        const event = new Event("input");
        Object.defineProperty(event, "target", { value: "", enumerable: true });
        radioItem.dispatchEvent(event);
    }
}
