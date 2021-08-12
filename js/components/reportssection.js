class ReportsSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="reports-section">
                <div class="columns is-desktop">
                    <div class="column is-one-fifth-desktop">
                        <aside class="menu mr-6">
                            <p class="menu-label" i18n="reports"></p>
                            <div class="menu-list">
                                <a class="is-active">Dashboard</a>
                                <a>Customers</a>
                            </div>
                            <p class="menu-label" i18n="data-quality"></p>
                            <div class="menu-list">
                                <a>Dashboard</a>
                                <a>Customers</a>
                            </div>
                        </aside>
                        <div class="buttons mt-5">
                            <button class="button is-link is-light is-small" i18n="add"></button>
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
