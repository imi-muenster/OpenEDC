const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

// TODO: Rename preview ... to metadata
export function process(itemsWithCondition) {
    for (const itemWithCondition of itemsWithCondition) {
        const conditionalItem = itemWithCondition.itemOID;

        const formalExpressionParts = itemWithCondition.formalExpression.split(" ");
        const determinant = formalExpressionParts[0];
        const operator = formalExpressionParts[1];
        const target = formalExpressionParts[2].replace(/['"]+/g, "");

        if (operator == "!=") {
            $(`[preview-field-oid="${conditionalItem}"]`).classList.add("is-hidden");
        }

        const previewFieldInput = $(`[preview-oid="${determinant}"]`);
        if (!previewFieldInput) continue;
        if (previewFieldInput.getAttribute("type") == "text" || previewFieldInput.getAttribute("type") == "select") {
            previewFieldInput.addEventListener("input", function(event) {
                respondToInputChange(event, conditionalItem, operator, target);
            });
        } else if (previewFieldInput.getAttribute("type") == "radio") {
            const radioItems = $$(`[preview-oid="${determinant}"]`)
            for (const radioItem of radioItems) {
                radioItem.addEventListener("input", function(event) {
                    respondToInputChange(event, conditionalItem, operator, target);
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

function showOrHideConditionalItem(previewOID, hide) {
    if (hide) {
        $(`[preview-field-oid="${previewOID}"]`).classList.add("is-hidden");
        emptyConditionalItem(previewOID);
    } else {
        $(`[preview-field-oid="${previewOID}"]`).classList.remove("is-hidden");
    }
}

function emptyConditionalItem(previewOID) {
    const previewFieldInput = $(`[preview-oid="${previewOID}"]`);
    if (previewFieldInput.getAttribute("type") == "text" || previewFieldInput.getAttribute("type") == "date") {
        previewFieldInput.value = "";
        previewFieldInput.dispatchEvent(new Event("input"));
    } else if (previewFieldInput.getAttribute("type") == "select") {
        previewFieldInput.selectedIndex = 0;
        previewFieldInput.dispatchEvent(new Event("input"));
    } else if (previewFieldInput.getAttribute("type") == "radio") {
        const radioItems = $$(`[preview-oid="${previewOID}"]`);
        let radioItem = null;
        for (radioItem of radioItems) {
            radioItem.checked = false;
        }
        const event = new Event("input");
        Object.defineProperty(event, "target", {value: "", enumerable: true});
        radioItem.dispatchEvent(event);
    }
}
