import * as reportsHelper from "../../helper/reportshelper.js";
import * as languageHelper from "../../helper/languagehelper.js";

class ReportModal extends HTMLElement {
    setReport(report) {
        this.report = report;
    }

    connectedCallback() {
        this.render();
        this.fillValues();
        this.setIOListeners();
    }

    render() {
        this.innerHTML = `
            <div class="modal is-active" id="report-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="is-pulled-right">
                        <button class="delete is-close-button is-large"></button>
                    </div>
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="report-options"></h1>
                            <h2 class="subtitle"><span i18n="for-report"></span>: <strong id="report-name-label"></strong></h2>
                            <hr>
                            <div class="field">
                                <label class="label" i18n="name"></label>
                                <div class="control">
                                    <input class="input" id="report-name-input" type="text">
                                </div>
                            </div>
                            <div class="field" id="standard-widgets">
                                <label class="label" i18n="standard-filters"></label>
                            </div>
                            <div class="buttons are-small">
                                <button class="button is-link" id="save-report-button" i18n="save-changes"></button>
                                <button class="button is-danger" id="remove-report-button" i18n="remove"></button>
                                <button class="button" id="close-report-button" i18n="cancel"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    fillValues() {
        this.querySelector("#report-name-label").textContent = this.report.name;
        this.querySelector("#report-name-input").value = this.report.name;

        for (const standardWidget of reportsHelper.standardReports.INCLUSIONS.widgets) {
            const checkboxWrapper = document.createElement("label");
            checkboxWrapper.className = "checkbox";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = standardWidget.name;
            if (this.report.widgets.find(widget => widget.name == standardWidget.name)) input.checked = true;
            checkboxWrapper.appendChild(input);

            const description = document.createElement("span");
            description.textContent = languageHelper.getTranslation(standardWidget.name);
            checkboxWrapper.appendChild(description);
            
            this.querySelector("#standard-widgets").insertAdjacentElement("beforeend", checkboxWrapper);
        }
    }

    setIOListeners() {
        this.querySelector(".modal-background").addEventListener("click", () => this.remove());
        this.querySelector(".is-close-button").addEventListener("click", () => this.remove());
        this.querySelector("#save-report-button").addEventListener("click", () => this.saveReport());
        this.querySelector("#remove-report-button").addEventListener("click", () => this.removeReport());
        this.querySelector("#close-report-button").addEventListener("click", () => this.remove());
    }

    saveReport() {
        this.report.name = this.querySelector("#report-name-input").value;

        for (const checkbox of this.querySelectorAll("#standard-widgets input[type='checkbox']")) {
            const standardWidget = reportsHelper.standardReports.INCLUSIONS.widgets.find(widget => widget.name == checkbox.name);
            const included = this.report.widgets.find(widget => widget.name == standardWidget.name);
            if (checkbox.checked && !included) reportsHelper.addWidget(this.report.id, standardWidget.name, standardWidget.type, standardWidget.itemPaths, standardWidget.size, true);
            else if (!checkbox.checked && included) this.report.widgets = this.report.widgets.filter(widget => widget.name != standardWidget.name);
        }

        document.dispatchEvent(new CustomEvent("ReportEdited"));
        this.remove();
    }

    removeReport() {
        document.dispatchEvent(new CustomEvent("ReportRemoved", { detail: this.report.id }));
        this.remove();
    }
}

window.customElements.define("report-modal", ReportModal);
