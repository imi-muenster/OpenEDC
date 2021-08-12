class NavigationBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar is-fixed-top has-shadow is-hidden">
                <div class="navbar-brand">
                    <div class="navbar-item">
                        <h1 class="subtitle" id="study-title"></h1>
                    </div>
                    <a class="navbar-item is-hidden" id="mobile-back-button" onclick="backOnMobile()">
                        <span class="icon">
                            <i class="fas fa-chevron-left"></i>
                        </span>
                        <span i18n="back"></span>
                    </a>
                    <a class="navbar-burger">
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                    </a>
                </div>
                <div class="navbar-menu">
                    <div class="navbar-start">
                        <div class="navbar-item has-dropdown" id="language-navbar-item">
                            <a class="navbar-link" id="current-language"></a>
                            <div class="navbar-dropdown is-hidden-touch" id="language-dropdown"></div>
                        </div>
                        <a class="navbar-item" onclick="showAboutModal()" i18n="about"></a>
                    </div>
                    <div class="navbar-end">
                        <div class="navbar-item">
                            <div class="buttons">
                                <button class="button is-hidden" id="store-metadata-async-button" onclick="storeMetadataAsync()" i18n="save-forms"></button>
                                <button class="button is-light is-hidden" id="close-example-button" onclick="removeAllData()" i18n="close-example"></button>
                                <button class="button mr-5" id="project-modal-button" onclick="showProjectModal()" i18n="project-options"></button>
                                <button class="button" id="reports-toggle-button" i18n="reports"></button>
                                <button class="button" id="clinicaldata-toggle-button" i18n="capture-data"></button>
                                <button class="button" id="metadata-toggle-button" i18n="design-forms"></button>
                                <button class="button is-link is-light ml-5" id="logout-button" onclick="showLogoutMessage()">
                                    <span class="icon">
                                        <i class="fas fa-user"></i>
                                    </span>
                                    <span id="logout-button-name"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
}

window.customElements.define("navigation-bar", NavigationBar);
