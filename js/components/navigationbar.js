class NavigationBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar is-fixed-top has-shadow is-hidden">
                <div class="navbar-brand">
                    <div class="navbar-item">
                        <h1 class="subtitle" id="study-title"></h1>
                    </div>
                    <div class="navbar-item is-hidden-desktop" id="notification-item-mobile">
                        <div class="button-with-badge has-hover" onclick="showNotifications(event)" id="notification-icon-mobile">
                            <i class="fa-solid fa-bell fa-lg has-text-link"></i>
                            <span class="button-badge is-hidden" id="notification-badge-mobile">0</span>
                        </div>
                    </div>
                    <a class="navbar-item is-hidden" id="mobile-back-button" onclick="backOnMobile()">
                        <span class="icon">
                            <i class="fa-solid fa-chevron-left"></i>
                        </span>
                        <span class="has-text-weight-semibold" i18n="back"></span>
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
                            <div class="navbar-dropdown has-border-shadow is-hidden-touch" id="language-dropdown"></div>
                        </div>
                        <a class="navbar-item" id="about-button" onclick="showAboutModal()" i18n="about"></a>
                        <div class="navbar-item is-hidden-touch" id="notification-item">
                            <div class="button-with-badge has-hover" onclick="showNotifications(event)" id="notification-icon">
                                <i class="fa-solid fa-bell fa-lg has-text-link"></i>
                                <span class="button-badge is-hidden" id="notification-badge">0</span>
                            </div>
                        </div>
                    </div>
                    <div class="navbar-end">
                        <div class="navbar-item">
                            <div class="buttons">
                                <button class="button is-hidden" id="store-metadata-async-button" onclick="storeMetadataAsync()" i18n="save-forms"></button>
                                <button class="button is-light is-hidden" id="close-example-button" onclick="removeAllData()" i18n="close-example"></button>
                                <button class="button" id="export-modal-button" onclick="showExportDataModal()" i18n="export-data"></button>
                                <button class="button" id="project-modal-button" onclick="showProjectModal()" i18n="project-options"></button>
                                <div class="dropdown is-right" id="app-mode-button">
                                    <div class="dropdown-trigger">
                                        <button class="button is-link is-light">
                                            <span class="icon"><i></i>
                                            </span>
                                            <span id="current-app-mode"></span>
                                        </button>
                                    </div>
                                    <div class="dropdown-menu">
                                        <div class="dropdown-content has-border-shadow">
                                            <a class="dropdown-item" id="clinicaldata-mode-button">
                                                <span class="icon">
                                                    <i class="fa-solid fa-stethoscope"></i>
                                                </span>
                                                <span i18n="data-collection"></span>
                                            </a>
                                            <a class="dropdown-item" id="metadata-mode-button">
                                                <span class="icon">
                                                    <i class="fa-solid fa-drafting-compass"></i>
                                                </span>
                                                <span i18n="form-design"></span>
                                            </a>
                                            <a class="dropdown-item" id="reports-mode-button">
                                                <span class="icon">
                                                    <i class="fa-solid fa-chart-pie"></i>
                                                </span>
                                                <span i18n="report-view"></span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div class="dropdown is-right is-hoverable is-hidden ml-2" id="logout-button">
                                    <div class="dropdown-trigger">
                                        <button class="button is-link" onclick="showLogoutMessage()">
                                            <span class="icon">
                                                <i class="fa-solid fa-user"></i>
                                            </span>
                                            <span id="logout-button-name"></span>
                                        </button>
                                    </div>
                                    <div class="dropdown-menu is-hidden-mobile">
                                        <div class="dropdown-content has-border-shadow">
                                            <a class="dropdown-item" onclick="showLogoutMessage()" i18n="logout"></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
}

window.customElements.define("navigation-bar", NavigationBar);
