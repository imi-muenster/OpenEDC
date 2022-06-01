// TODO: Make more modular by utilzing Web Component functionality
class ExportModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <div class="modal" id="export-modal">
            <div class="modal-background" onclick="hideExportModal()"></div>
            <div class="modal-content is-large">
                <div class="is-pulled-right">
                    <button class="delete is-close-button is-large" onclick="hideExportModal()"></button>
                </div>
                <div class="box">
                    <div class="notification is-link is-light">
                        <h1 class="title is-4" i18n="export-data"></h1>
                        <p class="mb-5" i18n="export-data-hint"></p>
                        <div class="is-flex is-centered is-flex-wrap-wrap">
                            <button class="button is-link column is-6 p-1 is-small" onclick="exportODM()" i18n="export-project"></button>
                            <button class="button column is-6 p-1 is-small" onclick="exportODMMetadata()" i18n="export-metadata"></button>
                            <button class="button column is-6 p-1 is-small" onclick="exportCSV()" i18n="export-clinicaldata"></button>
                            <button class="button column is-6 p-1 is-small" onclick="exportCSVZip()" i18n="export-clinicaldata-zip"></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }
}

window.customElements.define("export-modal", ExportModal);
