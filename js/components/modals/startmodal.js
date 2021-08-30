class StartModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="start-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <div class="openedc-title">
                                <figure class="image is-64x64 mr-2">
                                    <img src="./img/title-logo.png">
                                </figure>
                                <div>
                                    <h1 class="title">OpenEDC</h1>
                                    <h2 class="subtitle" i18n="start-title"></h2>
                                </div>
                            </div>
                            <hr>
                            <p class="mb-5" i18n-html="about-text-1"></p>
                            <p class="mb-5" i18n-html="about-text-2"></p>
                            <p class="mb-5" i18n-html="start-text"></p>
                            <div class="buttons is-centered">
                                <button class="button" onclick="newProject()" i18n="new-project"></button>
                                <div class="file" id="open-odm-button">
                                    <label class="file-label">
                                        <input class="file-input" type="file" accept=".xml,text/xml" name="odm-xml" onchange="openODM()">
                                        <span class="file-cta button" i18n="open"></span>
                                    </label>
                                </div>
                                <button class="button is-link" onclick="loadExample()" i18n="example"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("start-modal", StartModal);
