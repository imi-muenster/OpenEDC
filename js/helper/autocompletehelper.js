import * as metadataHelper from "./metadatahelper.js";
import * as languageHelper from "./languagehelper.js";

class AutocompleteElement {
    constructor(value, label) {
        this._value = value;
        this._label = label;
    }

    get value() {
        return this._value;
    }

    get label() {
        return this._label ? `${this._label} (${this._value})` : this._value;
    }
}

export const modes = {
    CONDITION: 1,
    MEASUREMENTUNIT: 2,
    ITEMWITHCODELIST: 3
}

const comparators = ["==", "!=", "<", "<=", ">", ">="];

// TODO: Rename item, which can also be a measurement unit
const availableParts = {
    ITEM: 1,
    COMPARATOR: 2,
    VALUE: 3
}

let currentMode;
let currentInput;
let currentPart;
let currentLocale;
let enabledParts;
let elements;

export const enableAutocomplete = (input, mode) => {
    // Set the mode to later adjust the input parts
    input.setAttribute("autocomplete-mode", mode);

    // Start autocomplete when element gets focus
    // TODO: Check if all listeners are really required -- use input within keydown?
    input.addEventListener("input", inputEventListener);
    input.addEventListener("click", inputEventListener);
    input.addEventListener("keydown", keydownEventListener);
    input.addEventListener("blur", blurEventListener);

    // Close the autocomplete list when the user clicks somewhere else
    document.addEventListener("click", closeLists);
}

export const disableAutocomplete = input => {
    input.removeEventListener("input", inputEventListener);
    input.removeEventListener("click", inputEventListener);
    input.removeEventListener("keydown", keydownEventListener);
    input.removeEventListener("blur", blurEventListener);
    document.removeEventListener("click", closeLists);
    elements = null;
}

const inputEventListener = event => {
    setCurrentModeAndEnabledParts(event.target);
    closeLists(null, true);
    if (!event.target.value) return;

    setCurrentPartInputAndLocale(event.target);
    const value = getExpressionParts(currentInput.value)[currentPart-1];

    const list = document.createElement("div");
    list.className = "autocomplete-list";

    setElements();
    const matchingElements = elements.filter(element => element.label.toLowerCase().includes(value.toLowerCase()));
    for (const element of matchingElements) {
        const option = document.createElement("div");
        option.className = "autocomplete-option";
        option.textContent = element.label;
        option.onclick = () => elementSelected(element);
        list.appendChild(option);
    }

    if (list.hasChildNodes()) currentInput.parentNode.appendChild(list);
}

const keydownEventListener = event => {
    if (event.key == "Enter") {
        const firstOption = event.target.parentNode.querySelector(".autocomplete-option");
        if (firstOption) firstOption.click();
    }
}

const blurEventListener = () => {
    elements = null;
}

const setCurrentModeAndEnabledParts = input => {
    if (input == currentInput) return;
    
    currentMode = parseInt(input.getAttribute("autocomplete-mode"));
    enabledParts = { ...availableParts };
    switch (currentMode) {
        case modes.CONDITION:
            // Keep all parts
            break;
        case modes.MEASUREMENTUNIT:
            // Remove comparator and code list values
        case modes.ITEMWITHCODELIST:
            delete enabledParts.COMPARATOR;
            delete enabledParts.VALUE;
    }
}

const setCurrentPartInputAndLocale = input => {
    const part = input.value.substring(0, input.selectionStart).split(" ").length;
    const locale = languageHelper.getCurrentLocale();
    // TODO: Check if all checks are really required
    if (part != currentPart || input != currentInput || locale != currentLocale) elements = null;

    currentPart = part;
    currentInput = input;
    currentLocale = locale;
}

const elementSelected = element => {
    let expressionParts = getExpressionParts(currentInput.value);
    expressionParts[currentPart-1] = element.value;

    let existingParts = expressionParts.filter(part => part);
    currentInput.value = existingParts.join(" ");

    closeLists();
    if (existingParts.length < Object.keys(enabledParts).length) {
        currentInput.value += " ";
        currentInput.focus();
        currentInput.click();
    }
}

const getExpressionParts = expression => {
    return [
        expression.split(" ")[0],
        expression.split(" ").length > 1 ? expression.split(" ")[1] : null,
        expression.split(" ").length > 2 ? expression.split(" ")[2] : null
    ];
}

const closeLists = (event, keepElements) => {
    document.querySelectorAll(".autocomplete-list").forEach(list => {
        if (event && event.target && (event.target == currentInput || event.target.classList.contains("autocomplete-option"))) return;
        if (!keepElements) elements = null;
        list.remove();
    });
}

const setElements = () => {
    if (elements) return;

    console.log("Load autocomplete elements");
    switch (currentPart) {
        case enabledParts.ITEM:
            elements = getItemElements();
            break;
        case enabledParts.COMPARATOR:
            elements = getComparatorElements();
            break;
        case enabledParts.VALUE:
            elements = getValueElements();
            break;
        default:
            elements = [];
    }
}

const getItemElements = () => {
    let items;
    switch (currentMode) {
        case modes.CONDITION:
            items = metadataHelper.getItems();
            break;
        case modes.MEASUREMENTUNIT:
            items = metadataHelper.getMeasurementUnits();
            break;
        case modes.ITEMWITHCODELIST:
            items = metadataHelper.getItemsWithCodeList();
    }

    switch (currentMode) {
        case modes.CONDITION:
        case modes.ITEMWITHCODELIST:
            return items.map(item => new AutocompleteElement(
                item.getOID(),
                item.getTranslatedQuestion(languageHelper.getCurrentLocale())
            ));
        case modes.MEASUREMENTUNIT:
            return items.map(item => new AutocompleteElement(
                item.getTranslatedSymbol(languageHelper.getCurrentLocale())
            ));
    }

}

const getComparatorElements = () => {
    return comparators.map(comparator => new AutocompleteElement(
        comparator
    ));
}

const getValueElements = () => {
    const itemOID = getExpressionParts(currentInput.value)[0];
    const item = metadataHelper.getElementDefByOID(itemOID);
    if (item.getDataType() == "boolean") {
        return [
            new AutocompleteElement(
                "1",
                languageHelper.getTranslation("yes")
            ),
            new AutocompleteElement(
                "0",
                languageHelper.getTranslation("no")
            )
        ];
    } else {
        const codeListItems = metadataHelper.getCodeListItemsByItem(itemOID);
        return codeListItems.map(codeListItem => new AutocompleteElement(
            codeListItem.getCodedValue(),
            codeListItem.getTranslatedDecode(languageHelper.getCurrentLocale())
        ));
    }
}
