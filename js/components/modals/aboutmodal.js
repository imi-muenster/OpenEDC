class AboutModal extends HTMLElement {
    connectedCallback() {
        const name = "Leonard Greulich";
        const phone = "+49 (251) 83-54730";
        const mail = "leonard.greulich@uni-muenster.de";

        this.innerHTML = `
            <div class="modal is-active" id="about-modal">
                <div class="modal-background" onclick="hideAboutModal()"></div>
                <div class="modal-content is-medium">
                <div class="is-pulled-right">
                    <button class="delete is-close-button is-large" onclick="hideAboutModal()"></button>
                </div>
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <div class="openedc-title">
                                <figure class="image is-64x64 mr-2">
                                    <img src="./img/title-logo.png">
                                </figure>
                                <div>
                                    <h1 class="title">OpenEDC</h1>
                                    <h2 class="subtitle"></h2>
                                </div>
                            </div>
                            <hr>
                            <p class="mb-5" i18n-html="about-text-1"></p>
                            <p class="mb-5" i18n-html="about-text-2"></p>
                            <div class="notification">
                                <p>${name}</p>
                                <p>${phone}</p>
                                <p class="mb-5"><a href="mailto:${mail}">${mail}</a></p>
                                <p><strong i18n="address_1"></strong></p>
                                <p i18n="address_2"></p>
                                <p i18n="address_3"></p>
                                <p i18n="address_4"></p>
                            </div>
                            <div class="buttons mb-1">
                                <a class="button is-link is-small is-rounded" target="_blank" i18n-href="privacy-policy-url">
                                    <span class="icon">
                                        <i class="far fa-arrow-right"></i>
                                    </span>
                                    <span i18n="privacy-policy"></span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("about-modal", AboutModal);
