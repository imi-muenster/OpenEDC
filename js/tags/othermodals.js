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

class LoginModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="login-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <div class="width-is-two-thirds">
                            <h2 class="subtitle" id="login-title"></h2>
                            <p class="mb-5" id="login-text"></p>
                            <article class="message is-danger mb-5 is-hidden" id="login-incorrect-hint">
                                <div class="message-body"></div>
                            </article>
                            <form>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-username-input" type="text" autocomplete="username" i18n-ph="username">
                                        <span class="icon is-small is-left">
                                            <i class="far fa-user"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-password-input" type="password" autocomplete="current-password" i18n-ph="password">
                                        <span class="icon is-small is-left">
                                            <i class="far fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field is-hidden">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-confirm-password-input" type="password" autocomplete="current-password" i18n-ph="password-confirm">
                                        <span class="icon is-small is-left">
                                            <i class="far fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <button class="button is-link mt-3" id="open-button" type="submit" i18n="open"></button>
                            </form>
                            <div class="buttons is-centered mt-3">
                                <button class="button is-text is-small" onclick="showForgotPasswordModal()" i18n="forgot-password-question"></button>
                                <button class="button is-text is-small is-hidden" id="remove-data-button" onclick="showRemoveDataModal(true)" i18n="remove-data-question"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class AboutModal extends HTMLElement {
    connectedCallback() {
        const name = "Leonard Greulich";
        const phone = "+49 (251) 83-54730";
        const mail = "leonard.greulich@uni-muenster.de";

        this.innerHTML = `
            <div class="modal" id="about-modal">
                <div class="modal-background" onclick="hideAboutModal()"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
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
                            <div class="buttons">
                                <a class="button is-link is-small is-rounded" target="_blank" i18n-href="privacy-policy-url">
                                    <span class="icon">
                                        <i class="far fa-arrow-right"></i>
                                    </span>
                                    <span i18n="privacy-policy"></span>
                                </a>
                            </div>
                            <button class="button" onclick="hideAboutModal()" i18n="close"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class SubjectModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="subject-modal">
                <div class="modal-background" onclick="hideSubjectInfo()"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="options-and-audit-trail"></h1>
                            <h2 class="subtitle"><span i18n="for-subject"></span>: <strong></strong></h2>
                            <hr>
                            <div class="field">
                                <label class="label" i18n="key"></label>
                                <div class="control">
                                    <input class="input" id="subject-key-input" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label" i18n="site"></label>
                                <div class="control" id="subject-site-control"></div>
                            </div>
                            <div class="buttons">
                                <button class="button is-danger is-small" id="save-subject-info-button" onclick="saveSubjectInfo()" i18n="save-changes"></button>
                                <button class="button is-small" onclick="hideSubjectInfo()" i18n="cancel"></button>
                            </div>
                            <div class="text-divider has-text-6 mb-5" i18n="audit-trail"></div>
                            <div id="audit-records"></div>
                            <button class="button is-danger is-small" onclick="removeSubject()" i18n="remove-subject"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class SurveyCodeModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="survey-code-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box has-text-centered">
                        <h2 class="subtitle" i18n="survey-finished"></h2>
                        <p i18n="survey-finished-text"></p>
                        <p class="mb-5" i18n="survey-finished-code-text"></p>
                        <div class="numpad has-text-centered mb-5">
                            <hr>
                            <div class="status mb-5"></div>
                            <div class="buttons is-centered"></div>
                        </div>
                        <p class="has-text-danger is-hidden" id="wrong-survey-code-hint" i18n="wrong-survey-code-hint"></p>
                    </div>
                </div>
            </div>
        `;
    }
}

// TODO: Move in own component .js file
class MessageModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setMessage(message) { this.message = message; }
    setCallbacks(callbacks) { this.callbacks = callbacks; }
    setCallbackType(callbackType) { this.callbackType = callbackType; }
    setCloseText(closeText) { this.closeText = closeText; }
    setCloseCallback(closeCallback) { this.closeCallback = closeCallback; }
    setSize(size) { this.size = size; }

    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="message-modal">
                <div class="modal-background"></div>
                <div class="modal-content ${this.size}">
                    <div class="box has-text-centered">
                        <h2 class="subtitle">${this.heading}</h2>
                        <div class="mb-5">${this.message}</div>
                        <div class="buttons is-centered"></div>
                    </div>
                </div>
            </div>
        `;

        // Add buttons for callbacks
        if (this.callbacks) {
            for (const [text, callback] of Object.entries(this.callbacks)) {
                let button = document.createElement("button");
                button.classList = `button ${this.callbackType} is-small`;
                button.textContent = text;
                button.onclick = () => {
                    this.remove();
                    callback();
                };
                this.querySelector(".buttons").insertAdjacentElement("beforeend", button);
            }
        }
        
        // Add close button
        let button = document.createElement("button");
        button.classList = this.callbacks ? "button is-small" : "button is-link is-small";
        button.textContent = this.closeText;
        button.onclick = () => {
            this.remove();
            if (this.closeCallback) this.closeCallback();
        };
        this.querySelector(".buttons").insertAdjacentElement("beforeend", button);

        // Add event handler for clicking on the modal background
        this.querySelector(".modal-background").onclick = () => {
            this.remove();
            if (this.closeCallback) this.closeCallback(); 
        };
    }
}

window.customElements.define("start-modal", StartModal);
window.customElements.define("login-modal", LoginModal);
window.customElements.define("about-modal", AboutModal);
window.customElements.define("subject-modal", SubjectModal);
window.customElements.define("survey-code-modal", SurveyCodeModal);
window.customElements.define("message-modal", MessageModal);
