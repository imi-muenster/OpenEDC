class ReportsSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="reports-section">
                <div class="columns is-desktop">
                    <div class="column is-one-fifth-desktop">
                        <aside class="menu mx-5">
                            <p class="menu-label" i18n="reports"></p>
                            <div class="menu-list" id="reports-list"></div>
                            <p class="menu-label is-hidden" i18n="data-quality"></p>
                            <div class="menu-list is-hidden"></div>
                        </aside>
                        <div class="buttons m-5">
                            <button class="button is-link is-light is-small" id="add-report-button" i18n="add"></button>
                        </div>
                    </div>
                    <div class="column">
                        <div class="container">
                            <h1 class="title"></h1>
                            <h2 class="subtitle"></h2>
                            <div id="widgets"></div>
                        </div>      
                    </div>
                </div>
            </section>
        `;
    }
}

window.customElements.define("reports-section", ReportsSection);
