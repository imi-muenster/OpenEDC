const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

// TODO: Rename preview ... to metadata
export function process(itemsWithCondition) {
    for (let itemWithCondition of itemsWithCondition) {
        let conditionalItem = itemWithCondition.itemOID;

        let formalExpressionParts = itemWithCondition.formalExpression.split(" ");
        let determinant = formalExpressionParts[0];
        let operator = formalExpressionParts[1];
        let target = formalExpressionParts[2].replace(/['"]+/g, "");

        if (operator == "!=") {
            $(`[preview-field-oid="${conditionalItem}"]`).classList.add("is-hidden");
        }

        let previewFieldInput = $(`[preview-oid="${determinant}"]`);
        if (previewFieldInput.type == "text" || previewFieldInput.type == "select-one") {
            previewFieldInput.addEventListener("input", function(event) {
                respondToInputChange(event, conditionalItem, operator, target);
            });
        } else if (previewFieldInput.type == "radio") {
            let radioItems = $$(`[preview-oid="${determinant}"]`)
            for (let radioItem of radioItems) {
                radioItem.addEventListener("input", function(event) {
                    respondToInputChange(event, conditionalItem, operator, target);
                });
            }
        }
    }
}

function respondToInputChange(event, conditionalItem, operator, target) {
    let value = event.target.value;

    if (operator == "!=") {
        if (value != target) {
            $(`[preview-field-oid="${conditionalItem}"]`).classList.add("is-hidden");
            emptyConditionalItem(conditionalItem);
        } else {
            $(`[preview-field-oid="${conditionalItem}"]`).classList.remove("is-hidden");
        }
    } else if (operator == "==" || operator == "=") {
        if (value == target) {
            $(`[preview-field-oid="${conditionalItem}"]`).classList.add("is-hidden");
            emptyConditionalItem(conditionalItem);
        } else {
            $(`[preview-field-oid="${conditionalItem}"]`).classList.remove("is-hidden");
        }        
    }
}

function emptyConditionalItem(previewOID) {
    let previewFieldInput = $(`[preview-oid="${previewOID}"]`);
    if (previewFieldInput.type == "text" || previewFieldInput.type == "date") {
        previewFieldInput.value = "";
        previewFieldInput.dispatchEvent(new Event("input"));
    } else if (previewFieldInput.type == "select-one") {
        previewFieldInput.selectedIndex = 0;
        previewFieldInput.dispatchEvent(new Event("input"));
    } else if (previewFieldInput.type == "radio") {
        let radioItems = $$(`[preview-oid="${previewOID}"]`);
        let radioItem = null;
        for (radioItem of radioItems) {
            radioItem.checked = false;
        }
        let event = new Event("input");
        Object.defineProperty(event, "target", {value: "", enumerable: true});
        radioItem.dispatchEvent(event);
    }
}
