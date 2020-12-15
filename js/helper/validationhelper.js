import * as ioHelper from "./iohelper.js";
import * as languageHelper from "./languagehelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export function process(itemsWithRangeChecks) {
    // First, handle data types (e.g., integer and float)
    for (let input of $$("#clinicaldata-content [inputmode='numeric'], #clinicaldata-content [inputmode='decimal'], #clinicaldata-content [type='date']")) {
        input.addEventListener("focusout", event => {
            let type = input.getAttribute("inputmode") || input.getAttribute("type");
            switch (type) {
                case "numeric":
                    if (input.value && !isInt(input.value)) {
                        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("whole-number-warning"));
                        event.target.focus();
                    }
                    break;
                case "decimal":
                    input.value = input.value.replace(",", ".");
                    if (input.value && !isDecimal(input.value)) {
                        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("number-warning"));
                        event.target.focus();
                    }
                    break;
                case "date":
                    if (input.value && !isDate(input.value)) {
                        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("date-warning"));
                        event.target.focus();
                    }
                    break;
            }
        });
    }

    // Second, handle range checks
    for (let item of itemsWithRangeChecks) {
        let input = $(`#clinicaldata-content [preview-oid='${item.itemOID}']`);
        input.addEventListener("focusout", event => {
            for (let rangeCheck of item.rangeChecks) {
                switch (rangeCheck.comparator) {
                    case "LT":
                        if (rangeCheckValue(input.value) >= rangeCheck.checkValue) showRangeCheckWarning(event.target, rangeCheck);
                        break;
                    case "LE":
                        if (rangeCheckValue(input.value) > rangeCheck.checkValue) showRangeCheckWarning(event.target, rangeCheck);
                        break;
                    case "GT":
                        if (rangeCheckValue(input.value) <= rangeCheck.checkValue) showRangeCheckWarning(event.target, rangeCheck);
                        break;
                    case "GE":
                        if (rangeCheckValue(input.value) < rangeCheck.checkValue) showRangeCheckWarning(event.target, rangeCheck);
                        break;
                    case "EQ":
                        if (input.value && isDecimal(input.value) && rangeCheckValue(input.value) != rangeCheck.checkValue) showRangeCheckWarning(event.target, rangeCheck);
                        break;
                    case "NE":
                        if (rangeCheckValue(input.value) == rangeCheck.checkValue) showRangeCheckWarning(event.target, rangeCheck);
                }
            }
        });
    }
}

function isInt(value) {
    return value == parseInt(value) && !value.includes(".");
}

function isDecimal(value) {
    return value == parseFloat(value);
}

function isDate(value) {
    return !isNaN(Date.parse(value));
}

function rangeCheckValue(value) {
    let float = parseFloat(value);
    return value == float ? float : undefined;
}

function showRangeCheckWarning(input, rangeCheck) {
    ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("value-must-be") + " " + languageHelper.getTranslation(rangeCheck.comparator) + " " + rangeCheck.checkValue + languageHelper.getTranslation("value-must-be-closing"));
    input.focus();
}
