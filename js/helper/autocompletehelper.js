import ODMPath from "../odmwrapper/odmpath.js";
import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";
import * as languageHelper from "./languagehelper.js";
import * as ioHelper from "./iohelper.js";

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
    METHOD: 2,
    MEASUREMENTUNIT: 3,
    ITEMWITHCODELIST: 4,
    ITEM: 5
}

const compounds = ["AND", "OR"];
const comparators = ["==", "!=", "<", "<=", ">", ">="];
const operators = ["+", "-", "*", "/", "^"];

// TODO: Rename item, which can also be a measurement unit
const availableParts = {
    ITEM: 1,
    COMPARATOR: 2,
    VALUE: 3
}

let currentMode;
let currentInput;
let currentTokenIndex;
let currentPart;
let enabledParts;
let elements;

export const enableAutocomplete = (input, mode) => {
    // Set the mode to later adjust the input parts
    input.setAttribute("autocomplete-mode", mode);

    // Start autocomplete when element gets focus
    // TODO: Check if all listeners are really required -- use input within keydown/keyup?
    input.addEventListener("input", inputEventListener);
    input.addEventListener("click", inputEventListener);
    input.addEventListener("keydown", keydownEventListener);
    input.addEventListener("blur", blurEventListener);

    // Close the autocomplete list when the user clicks somewhere else
    ioHelper.addGlobalEventListener("click", closeLists);
}

export const disableAutocomplete = input => {
    input.removeAttribute("autocomplete-mode");

    input.removeEventListener("input", inputEventListener);
    input.removeEventListener("click", inputEventListener);
    input.removeEventListener("keydown", keydownEventListener);
    input.removeEventListener("blur", blurEventListener);
    if (!document.querySelector("input[autocomplete-mode]")) document.removeEventListener("click", closeLists);

    elements = null;
}

const inputEventListener = event => {
    if (event.detail.skipRender) return;

    setCurrentModeAndEnabledParts(event.target);
    closeLists(null, true);

    setCurrentPartAndInput(event.target);
    const value = removeQuotes(currentInput.value.split(" ")[currentTokenIndex]);

    const list = document.createElement("div");
    list.className = "autocomplete-list";

    setElements();
    const searchValue = removeParentheses(value.toLowerCase());
    const matchingElements = elements.filter(element => element.label.toLowerCase().includes(searchValue));
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
        case modes.METHOD:
            delete enabledParts.COMPARATOR;
            delete enabledParts.VALUE;
            break;
        case modes.MEASUREMENTUNIT:
            // Remove comparator and code list values
        case modes.ITEMWITHCODELIST:
        case modes.ITEM:
            delete enabledParts.COMPARATOR;
            delete enabledParts.VALUE;
    }
}

const setCurrentPartAndInput = input => {
    const substring = input.value.substring(0, input.selectionStart);
    const tokenIndex = substring.split(" ").length - 1;
    const lastCompoundTokenIndex = getLastIndexOfTokens(substring, compounds.concat(operators));
    const part = tokenIndex - lastCompoundTokenIndex;

    if (tokenIndex != currentTokenIndex || input != currentInput) elements = null;

    currentTokenIndex = tokenIndex;
    currentPart = part;
    currentInput = input;
}

const elementSelected = element => {
    // If a value is selected, add quotes
    let newValue;
    switch (currentPart) {
        case enabledParts.ITEM:
            const contextPath = ODMPath.parseAbsolute(currentInput.getAttribute("context-path"));
            newValue = ODMPath.parseAbsolute(element.value).getItemRelative(contextPath).toString();
            break;
        case enabledParts.VALUE:
            newValue = addQuotes(element.value);
            break;
        default:
            newValue = element.value;
    }

    let expressionParts = currentInput.value.split(" ");
    expressionParts[currentTokenIndex] = newValue;
    currentInput.value = expressionParts.join(" ");

    closeLists();
    if ((currentTokenIndex == expressionParts.length - 1 && currentPart != Object.keys(enabledParts).length) || currentMode == modes.METHOD) {
        currentInput.value += " ";
        currentInput.focus();
        currentInput.dispatchEvent(new CustomEvent("input", { detail: { skipRender: false } }));
    } else {
        currentInput.dispatchEvent(new CustomEvent("input", { detail: { skipRender: true } }));
    }
}

const getLastIndexOfTokens = (expression, tokens) => {
    return tokens.reduce((lastIndex, token) => {
        const index = expression.split(" ").lastIndexOf(token);
        return index > lastIndex ? index : lastIndex;
    }, -1);
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
        case Object.keys(enabledParts).length + 1:
            elements = getEndOfExpressionElements();
            break;
        default:
            elements = [];
    }
}

// TODO: Optimize performance for large projects with > 1000 item paths
const getItemElements = () => {
    let items;
    switch (currentMode) {
        case modes.CONDITION:
        case modes.METHOD:
        case modes.ITEM:
            items = metadataWrapper.getItemPaths();
            break;
        case modes.MEASUREMENTUNIT:
            items = metadataWrapper.getMeasurementUnits();
            break;
        case modes.ITEMWITHCODELIST:
            items = metadataWrapper.getItemPaths({ withCodeList: true });
    }

    switch (currentMode) {
        case modes.CONDITION:
        case modes.METHOD:
        case modes.ITEMWITHCODELIST:
        case modes.ITEM:
            return items.map(item => new AutocompleteElement(
                item.toString(),
                metadataWrapper.getElementDefByOID(item.itemOID).getTranslatedQuestion(languageHelper.getCurrentLocale())
            ));
        case modes.MEASUREMENTUNIT:
            return items.map(item => new AutocompleteElement(
                item.getTranslatedSymbol(languageHelper.getCurrentLocale())
            )).filter(element => element.value);
    }
}

const getComparatorElements = () => {
    return comparators.map(comparator => new AutocompleteElement(
        comparator
    ));
}

const getValueElements = () => {
    const itemPath = currentInput.value.split(" ")[currentTokenIndex - currentPart + 1];
    const itemOID = ODMPath.parseRelative(itemPath).itemOID;
    const item = metadataWrapper.getElementDefByOID(itemOID);
    if (item && item.getDataType() == metadataWrapper.dataTypes.BOOLEAN) {
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
        const codeListItems = metadataWrapper.getCodeListItemsByItem(itemOID);
        return codeListItems.map(codeListItem => new AutocompleteElement(
            codeListItem.getCodedValue(),
            codeListItem.getTranslatedDecode(languageHelper.getCurrentLocale())
        ));
    }
}

const getEndOfExpressionElements = () => {
    switch (currentMode) {
        case modes.CONDITION:
            return compounds.map(compound => new AutocompleteElement(compound));
        case modes.METHOD:
            return operators.map(operator => new AutocompleteElement(operator));
        case modes.ITEMWITHCODELIST:
        case modes.MEASUREMENTUNIT:
            return [];
    }
}

const addQuotes = string => '"' + string + '"';

const removeQuotes = string => string.replace(/['"]/g, "");

const removeParentheses = string => string.replace(/[\(\)]/g, "");
