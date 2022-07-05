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
        return this._label ? `${this._label} (${this._value})` : this._value.toString();
    }
}

export const modes = {
    ITEMWITHCODELIST: 1,
    ITEM: 2,
    CODELIST: 3
}

let currentMode;
let currentInput;
let currentValue;
let elements;
let installedFilters;

export const enableAutocomplete = (input, mode, filters) => {
    // Set the mode to later adjust the input parts
    input.setAttribute("autocomplete-mode", mode);
    installedFilters = filters;

    // Start autocomplete when element gets focus
    // TODO: Check if all listeners are really required -- use input within keydown/keyup?
    input.addEventListener("input", debouncedInputEventListener);
    input.addEventListener("click", debouncedInputEventListener);
    input.addEventListener("keydown", debouncedKeyDownEventListener);
    input.addEventListener("blur", debouncedBlurEventListener);

    // Close the autocomplete list when the user clicks somewhere else
    ioHelper.addGlobalEventListener("click", closeLists);
}

export const disableAutocomplete = input => {
    input.removeAttribute("autocomplete-mode");

    input.removeEventListener("input", debouncedInputEventListener);
    input.removeEventListener("click", debouncedInputEventListener);
    input.removeEventListener("keydown", debouncedKeyDownEventListener);
    input.removeEventListener("blur", debouncedBlurEventListener);
    if (!document.querySelector("input[autocomplete-mode]")) document.removeEventListener("click", closeLists);

    elements = null;
}

const inputEventListener = event => {
    console.log("test");
    if (event.detail.skipRender) return;

    setCurrentModeAndEnabledParts(event.target);
    closeLists(null, true);

    setCurrentPartAndInput(event.target);
    const value = currentValue.toLowerCase();;
    const valueTokens = value.split(" ");
    const list = document.createElement("div");
    list.className = "autocomplete-list";

    setElements();
    console.log("before match")
    const matchingElements = elements.filter(element => valueTokens.every(token => element.label.toLowerCase().includes(token)));
    console.log(valueTokens)
    console.log(matchingElements);
    for (const element of matchingElements) {
        const option = document.createElement("div");
        option.className = "autocomplete-option";
        option.textContent = element.label;
        option.onclick = () => elementSelected(element);
        list.appendChild(option);
    }

    if (list.hasChildNodes()) currentInput.parentNode.appendChild(list);
    currentInput.parentNode.classList.add("is-relative");
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

const debouncedInputEventListener = debounce(inputEventListener, 500);
const debouncedKeyDownEventListener = debounce(keydownEventListener, 500);
const debouncedBlurEventListener = debounce(blurEventListener, 500);


const setCurrentModeAndEnabledParts = input => {
    if (input == currentInput) return; 
    currentMode = parseInt(input.getAttribute("autocomplete-mode"));
}

const setCurrentPartAndInput = input => {
    const substring = input.value.substring(0, input.selectionStart);

    if (input != currentInput) elements = null;

    currentValue = substring.toLowerCase();
    currentInput = input;
}

const elementSelected = element => {
    console.log(element);

    currentInput.value = element["_label"];
    currentInput.setAttribute("data-value",element["_value"].codeListItem);

    closeLists();
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
    elements = getElements()
}

// TODO: Optimize performance for large projects with > 1000 item paths
const getElements = () => {

    switch (currentMode) {
        case modes.CODELIST:
            const itemOID = installedFilters.itemOID;
            if(!itemOID) return [];
            return metadataWrapper.getCodeListItemsByItem(itemOID).map(codelistItem => new AutocompleteElement(
                new ODMPath(null, null, null, itemOID, codelistItem.getAttribute('CodedValue')),
                codelistItem.getTranslatedDecode(languageHelper.getCurrentLocale())
            ));
        case modes.ITEM:
            items = metadataWrapper.getItemPaths();
            break;
        case modes.ITEMWITHCODELIST:
            items = metadataWrapper.getItemPaths({ withCodeList: true });
            break;
        
    }

    Object.keys(installedFilters).forEach(key => {
        items = items.filter(item => item[key] == installedFilters[key])
    })
    return items.map(item => new AutocompleteElement(
        item.toString(),
        metadataWrapper.getElementDefByOID(item.itemOID).getTranslatedQuestion(languageHelper.getCurrentLocale())
    ));
}

function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
