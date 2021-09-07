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
                            <div class="buttons">
                                <button class="button is-link is-small" id="save-report-button" i18n="save-changes"></button>
                                <button class="button is-danger is-small" id="remove-report-button" i18n="remove"></button>
                                <button class="button is-small" id="close-report-button" i18n="cancel"></button>
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
        document.dispatchEvent(new CustomEvent("ReportEdited"));
        this.remove();
    }

    removeReport() {
        document.dispatchEvent(new CustomEvent("ReportRemoved", { detail: this.report.id }));
        this.remove();
    }
}

window.customElements.define("report-modal", ReportModal);
