import { getItemsWithCodeList } from "./metadatahelper.js";
import { getCurrentLocale } from "./languagehelper.js";

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
    FORMALEXPRESSION: 1,
    ITEM: 2,
    ITEMWITHCODELIST: 3
}

let parts = {
    ITEM: 1,
    OPERATOR: 2,
    VALUE: 3
}

let elements;
let currentMode;
let currentPart;
let currentInput;

export const enableAutocomplete = (input, mode) => {
    // Set the mode and adjust the input parts
    currentMode = mode;
    setParts();

    // Start autocomplete when element gets focus
    input.addEventListener("input", inputEventListener);
    input.addEventListener("click", inputEventListener);
    input.addEventListener("keydown", keydownEventListener);

    // Close the autocomplete list when the user clicks somewhere else
    document.addEventListener("click", closeLists);
}

export const disableAutocomplete = input => {
    input.removeEventListener("input", inputEventListener);
    input.removeEventListener("click", inputEventListener);
    input.removeEventListener("keydown", keydownEventListener);
    document.removeEventListener("click", closeLists);
    elements = null;
}

const setParts = () => {
    switch (currentMode) {
        case modes.FORMALEXPRESSION:
            // Keep all parts
            break;
        case modes.ITEM:
        case modes.ITEMWITHCODELIST:
            delete parts.OPERATOR;
            delete parts.VALUE;
    }
}

const inputEventListener = event => {
    closeLists();
    if (!event.target.value) return;

    setCurrentPartAndInput(event.target);
    const value = getExpressionParts(event.target.value)[currentPart-1];

    const list = document.createElement("div");
    list.className = "autocomplete-list has-background-white-bis";
    event.target.parentNode.appendChild(list);

    setElements();
    const matchingElements = elements.filter(element => element.label.toLowerCase().includes(value.toLowerCase()));
    for (const element of matchingElements) {
        const option = document.createElement("div");
        option.className = "autocomplete-option is-clickable p-3";
        option.textContent = element.label;
        option.onclick = () => elementSelected(element, event.target);
        list.appendChild(option);
    }
}

const keydownEventListener = event => {
    if (event.key == "Enter") {
        const firstOption = event.target.parentNode.querySelector(".autocomplete-option");
        if (firstOption) firstOption.click();
    }
}

const setCurrentPartAndInput = input => {
    const part = input.value.substring(0, input.selectionStart).split(" ").length;
    if (part != currentPart || input != currentInput) elements = null;

    currentPart = part;
    currentInput = input;
}

const elementSelected = (element, input) => {
    let expressionParts = getExpressionParts(input.value);
    expressionParts[currentPart-1] = element.value;

    let existingParts = expressionParts.filter(part => part);
    input.value = existingParts.join(" ");

    closeLists();
    if (existingParts.length < Object.keys(parts).length) {
        input.value += " ";
        input.focus();
        input.click();
    }
}

const getExpressionParts = expression => {
    return [
        expression.split(" ")[0],
        expression.split(" ").length > 1 ? expression.split(" ")[1] : null,
        expression.split(" ").length > 2 ? expression.split(" ")[2] : null
    ];
}

const closeLists = event => {
    document.querySelectorAll(".autocomplete-list").forEach(list => {
        if (event && event.target && (event.target == currentInput || event.target.className == "autocomplete-option")) return;
        list.remove();
    });
}

const setElements = () => {
    if (elements) return;

    console.log("Load autocomplete elements");
    switch (currentPart) {
        case parts.ITEM:
            elements = getItemElements();
            break;
        case parts.OPERATOR:
            // TODO: Adjust for formal expression autocomplete
            elements = [];
            break;
        case parts.VALUE:
            // TODO: Adjust for formal expression autocomplete
            elements = [];
            break;
        default:
            elements = [];
    }
}

const getItemElements = () => {
    // TODO: null ...
    const items = currentMode == modes.ITEMWITHCODELIST ? getItemsWithCodeList() : null;
    return items.map(item => new AutocompleteElement(
        item.getOID(),
        item.getTranslatedQuestion(getCurrentLocale(), true)
    ));
}
