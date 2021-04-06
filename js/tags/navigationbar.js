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
                                <button class="button is-hidden" id="logout-button" onclick="logout()" i18n="log-out"></button>
                                <button class="button is-hidden" id="close-example-button" onclick="removeAllData()" i18n="close-example"></button>
                                <button class="button" id="project-modal-button" onclick="showProjectModal()" i18n="project-options"></button>
                                <button class="button is-link is-light mr-0" id="clinicaldata-toggle-button">
                                    <span class="icon">
                                        <i class="fas fa-play"></i>
                                    </span>
                                    <span i18n="capture-data"></span>
                                </button>
                                <button class="button is-link is-light is-hidden mr-0" id="metadata-toggle-button">
                                    <span class="icon">
                                        <i class="fas fa-stop"></i>
                                    </span>
                                    <span i18n="design-forms"></span>
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
