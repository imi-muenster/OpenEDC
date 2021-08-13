import * as languageHelper from "../../helper/languagehelper.js";
import * as reportsHelper from "../../helper/reportshelper.js";

class WidgetOptions extends HTMLElement {
    setComponent(component) {
        this.component = component;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.className = "widget-options is-flex is-flex-direction-column is-justify-content-space-between is-align-items-center p-5";

        const title = document.createElement("h2");
        title.className = "subtitle";
        title.textContent = languageHelper.getTranslation("options");
        this.appendChild(title);

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
            sizeOption.appendChild(document.createTextNode(" " + option));
            sizeOptions.appendChild(sizeOption);
        }
        this.appendChild(sizeOptions);

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

    saveOptions() {
        const sizeOption = this.querySelector(".widget-size-options input:checked");
        const size = sizeOption ? sizeOption.value : null;
        if (size && this.component.widget.size != size) this.setWidgetComponentSize(size);

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
