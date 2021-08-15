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
                                    <p class="menu-label" i18n="reports"></p>
                                    <div class="menu-list" id="reports-list"></div>
                                    <p class="menu-label is-hidden" i18n="data-quality"></p>
                                    <div class="menu-list is-hidden"></div>
                                </aside>
                                <div class="buttons mt-5">
                                    <button class="button is-link is-light is-small" id="add-report-button" i18n="add"></button>
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
