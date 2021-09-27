import * as ioHelper from "./iohelper.js";
import * as languageHelper from "./languagehelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export function process(itemsWithRangeChecks) {
    // First, handle data types (e.g., integer and float)
    for (let input of $$("#clinicaldata-content [inputmode='numeric'], #clinicaldata-content [inputmode='decimal'], #clinicaldata-content [type='date'], #clinicaldata-content [type='time'], #clinicaldata-content [type='datetime-local']")) {
        if (input.readOnly) continue;
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
                case "time":
                    if (input.value && !isTime(input.value)) {
                        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("time-warning"));
                        event.target.focus();
                    }
                    break;
                case "datetime-local":
                    if (input.value && !isDate(input.value)) {
                        ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("datetime-warning"));
                        event.target.focus();
                    }
            }
        });
    }

    // Second, handle range checks
    for (let item of itemsWithRangeChecks) {
        let input = $(`#clinicaldata-content [item-oid='${item.itemOID}']`);
        if (input.readOnly) continue;
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

export function isInt(value) {
    return value == parseInt(value) && !value.includes(".");
}

export function isDecimal(value) {
    return value == parseFloat(value);
}

export function isDate(value) {
    return !isNaN(Date.parse(value));
}

export function isTime(value) {
    return new RegExp(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/).test(value);
}

function rangeCheckValue(value) {
    let float = parseFloat(value);
    return value == float ? float : undefined;
}

function showRangeCheckWarning(input, rangeCheck) {
    ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("value-must-be") + " " + languageHelper.getTranslation(rangeCheck.comparator) + " " + rangeCheck.checkValue + languageHelper.getTranslation("value-must-be-closing"));
    input.focus();
}
