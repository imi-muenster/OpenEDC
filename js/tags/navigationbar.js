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
                        <span>Back</span>
                    </a>
                    <a class="navbar-burger">
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                    </a>
                </div>
                <div class="navbar-menu">
                    <div class="navbar-start">
                        <div class="navbar-item has-dropdown is-hoverable">
                            <a class="navbar-link" id="current-language"></a>
                            <div class="navbar-dropdown is-hidden-touch" id="language-dropdown"></div>
                        </div>
                        <a class="navbar-item" onclick="showAboutModal()">About</a>
                    </div>
                    <div class="navbar-end">
                        <div class="navbar-item">
                            <div class="buttons">
                                <button class="button is-hidden" id="close-example-button" onclick="removeAllData()">Close Example</button>
                                <button class="button" id="project-modal-button" onclick="showProjectModal()">Project Options</button>
                                <button class="button is-link is-light" id="clinicaldata-toggle-button">
                                    <span class="icon">
                                        <i class="fas fa-play"></i>
                                    </span>
                                    <span>Capture Data</span>
                                </button>
                                <button class="button is-link is-light is-hidden" id="metadata-toggle-button">
                                    <span class="icon">
                                        <i class="fas fa-stop"></i>
                                    </span>
                                    <span>Model Forms</span>
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
