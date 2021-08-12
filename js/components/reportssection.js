class ReportsSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="reports-section">
                <div class="columns is-desktop">
                    <div class="column is-one-fifth-desktop">
                        <aside class="menu">
                            <p class="menu-label" i18n="reports"></p>
                            <ul class="menu-list">
                                <li><a class="is-active">Dashboard</a></li>
                                <li><a>Customers</a></li>
                            </ul>
                            <p class="menu-label" i18n="data-quality"></p>
                            <ul class="menu-list">
                                <li><a>Dashboard</a></li>
                                <li><a>Customers</a></li>
                            </ul>
                        </aside>
                        <div class="buttons mt-5">
                            <button class="button is-link is-light" i18n="add"></button>
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
