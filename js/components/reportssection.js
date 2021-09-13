class ReportsSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="reports-section">
                <div class="columns is-desktop">
                    <div class="column is-offset-one-fifth-desktop">
                        <h1 class="title"></h1>
                        <h2 class="subtitle"></h2>
                    </div>
                </div>
                <div class="columns is-desktop">
                    <div class="column is-one-fifth-desktop">
                        <div class="card has-border-shadow">
                            <div class="card-content">
                                <aside class="menu">
                                    <p class="menu-label" id="standard-reports-label" i18n="standard-reports"></p>
                                    <div class="menu-list" id="standard-reports-list"></div>
                                    <p class="menu-label" id="custom-reports-label" i18n="custom-reports"></p>
                                    <div class="menu-list" id="custom-reports-list"></div>
                                </aside>
                                <div class="buttons mt-5" id="manage-report-buttons">
                                    <button class="button is-link is-light is-small" id="add-report-button" i18n="add"></button>
                                    <button class="button is-small is-hidden" id="edit-report-button" i18n="edit"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="column">
                        <div id="widgets"></div>    
                    </div>
                </div>
            </section>
        `;
    }
}

window.customElements.define("reports-section", ReportsSection);
