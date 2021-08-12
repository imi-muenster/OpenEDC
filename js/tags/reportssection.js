class ReportsSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="reports-section">
                <div class="columns is-desktop">
                    <div class="column is-one-fifth-desktop">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="reports"></p>
                            <div class="tree-panel-blocks" id="reports-panel-blocks"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" id="reports-add-button" onclick="addReport()" i18n="add"></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <p>Widgets</p>
                    </div>
                </div>
            </section>
        `;
    }
}

window.customElements.define("reports-section", ReportsSection);
