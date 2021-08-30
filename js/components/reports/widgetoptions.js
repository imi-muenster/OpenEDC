import ODMPath from "../../odmwrapper/odmpath.js";
import * as metadataWrapper from "../../odmwrapper/metadatawrapper.js";
import * as languageHelper from "../../helper/languagehelper.js";
import * as reportsHelper from "../../helper/reportshelper.js";
import * as autocompleteHelper from "../../helper/autocompletehelper.js";

class WidgetOptions extends HTMLElement {
    setComponent(component) {
        this.component = component;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.className = "widget-options is-flex is-flex-direction-column is-justify-content-space-between is-align-items-center p-5";
        this.addTitle();
        this.addItemInput();
        this.addTypeSelect();
        this.addDetailsInput();
        this.addSizeOptions();
        this.addButtons();
    }

    addTitle() {
        const title = document.createElement("h2");
        title.className = "subtitle mb-1";
        title.contentEditable = true;
        title.textContent = this.component.widget.name;
        this.appendChild(title);
    }

    addItemInput() {
        const inputContainer = document.createElement("div");
        inputContainer.className = "control has-autocomplete-bottom is-fullwidth";

        const input = document.createElement("input");
        input.className = "input is-small";
        input.type = "text";
        input.placeholder = languageHelper.getTranslation("item");
        input.oninput = () => this.itemInputCallback();
        inputContainer.appendChild(input);
        autocompleteHelper.enableAutocomplete(input, autocompleteHelper.modes.ITEM);

        this.appendChild(inputContainer);
    }

    addTypeSelect() {
        const selectContainer = document.createElement("div");
        selectContainer.className = "select is-fullwidth is-small";
        const select = document.createElement("select");
        select.disabled = true;
        selectContainer.appendChild(select);

        this.appendChild(selectContainer);
    }

    addDetailsInput() {
        const inputContainer = document.createElement("div");
        inputContainer.className = "control has-autocomplete-bottom is-fullwidth";

        const input = document.createElement("input");
        input.className = "input is-small";
        input.type = "text";
        input.disabled = true;
        input.placeholder = languageHelper.getTranslation("options");
        inputContainer.appendChild(input);
        autocompleteHelper.enableAutocomplete(input, autocompleteHelper.modes.ITEMWITHCODELIST);

        this.appendChild(inputContainer);
    }

    addSizeOptions() {
        const sizeOptions = document.createElement("div");
        sizeOptions.className = "widget-size-options";
        for (const option of Object.values(reportsHelper.Widget.sizes)) {
            const sizeOption = document.createElement("label");
            sizeOption.className = "radio";
            const radioInput = document.createElement("input");
            radioInput.type = "radio";
            radioInput.name = this.component.widget.id;
            radioInput.value = option;
            if (this.component.widget.size && this.component.widget.size == option) radioInput.checked = true;
            sizeOption.appendChild(radioInput);
            sizeOption.appendChild(document.createTextNode(" " + languageHelper.getTranslation(option)));
            sizeOptions.appendChild(sizeOption);
        }

        this.appendChild(sizeOptions);
    }

    addButtons() {
        const buttons = document.createElement("div");
        buttons.className = "buttons";
        const saveButton = document.createElement("button");
        saveButton.className = "button is-link is-light is-small";
        saveButton.textContent = languageHelper.getTranslation("save");
        saveButton.onclick = () => this.saveOptions();
        buttons.appendChild(saveButton);

        const removeButton = document.createElement("button");
        removeButton.className = "button is-danger is-light is-small";
        removeButton.textContent = languageHelper.getTranslation("remove");
        buttons.appendChild(removeButton);

        const cancelButton = document.createElement("button");
        cancelButton.className = "button is-small";
        cancelButton.textContent = languageHelper.getTranslation("cancel");
        buttons.appendChild(cancelButton);
        
        this.appendChild(buttons);
    }

    itemInputCallback() {
        this.querySelectorAll("select option").removeElements();
        this.querySelector("select").disabled = true;
        this.querySelector("select").value = null;

        const path = ODMPath.parseAbsolute(this.querySelector("input").value);
        const itemDef = metadataWrapper.getElementDefByOID(path.itemOID);
        if (!itemDef) return;

        // TODO: Move to other location?
        const widgetDataTypeMapping = {
            [reportsHelper.Widget.types.SCATTER]: "integer, float, double",
            [reportsHelper.Widget.types.BAR]: "text"
        };

        const enabledWidgetTypes = Object.entries(widgetDataTypeMapping).filter(entry => entry[1].includes(itemDef.getDataType())).map(entry => entry[0]);
        for (const widgetType of enabledWidgetTypes) {
            const option = document.createElement("option");
            option.value = widgetType;
            option.textContent = languageHelper.getTranslation(widgetType);
            this.querySelector("select").appendChild(option);
            this.querySelector("select").disabled = false;
        }
    }

    saveOptions() {
        // Set widget size
        const size = this.querySelector(".widget-size-options input:checked")?.value;
        if (size && this.component.widget.size != size) this.setWidgetComponentSize(size);

        // Set widget name and properties
        const name = this.querySelector(".subtitle").textContent;
        const properties = Array.from(this.querySelectorAll("input[type='text']")).map(input => input.value).filter(value => value);
        if (name != this.component.widget.name) {
            this.component.widget.name = name;
        } else if (properties[0] != this.component.widget.properties[0]) {
            this.component.widget.name = properties[0];
        }
        if (properties && properties.toString() != this.component.widget.properties.toString()) this.component.widget.properties = properties;


        // Update widget component
        this.component.update();

        // Flip component, remove the options panel, and store the updated widget and report
        this.component.classList.remove("is-flipped");
        setTimeout(() => this.remove(), 500);
        reportsHelper.storeReports();
    }

    setWidgetComponentSize(size) {
        this.component.widget.size = size;
        Object.values(reportsHelper.Widget.sizes).forEach(option => this.component.classList.remove("is-" + option));
        this.component.classList.add("is-" + size);
    }
}

window.customElements.define("widget-options", WidgetOptions);
