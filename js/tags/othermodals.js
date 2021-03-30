class StartModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="start-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <div id="openedc-title">
                                <figure class="image is-64x64 mr-2">
                                    <img src="./img/title-logo.png">
                                </figure>
                                <div>
                                    <h1 class="title">OpenEDC</h1>
                                    <h2 class="subtitle">Please choose a starting point</h2>
                                </div>
                            </div>
                            <hr>
                            <p class="mb-5">This free and <a target="_blank" href="https://github.com/imi-muenster/OpenEDC">open-source</a> electronic data capture (EDC) system lets you design and conduct secure medical research studies based on the <a target="_blank" href="https://www.cdisc.org/standards/data-exchange/odm">CDISC ODM-XML</a> format.</p>
                            <p class="mb-5">All data is entirely processed offline on your local device. You can optionally connect to your own <a target="_blank" href="https://github.com/imi-muenster/OpenEDC-Server">OpenEDC Server</a> to create research studies with multiple users and sites.</p>
                            <p class="mb-5">For an empty project, choose <strong>New Project</strong>. Click <strong>Open</strong> if you have an CDISC ODM-XML file on your computer. If you have not yet used this EDC system, choose <strong>Example</strong> to load an exemplary project and see how it all works.</p>
                            <div class="buttons is-centered">
                                <button class="button" onclick="newProject()">New Project</button>
                                <div class="file" id="odm-upload">
                                    <label class="file-label">
                                        <input class="file-input" type="file" name="resume" onchange="uploadODM()">
                                        <span class="file-cta button">
                                            <span class="file-label">Open</span>
                                        </span>
                                    </label>
                                </div>
                                <button class="button is-link" onclick="loadExample()">Example</button>
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
                <div class="modal-content is-large">
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
                                        <input class="input" id="login-username-input" type="text" autocomplete="username" placeholder="Username">
                                        <span class="icon is-small is-left">
                                            <i class="fas fa-user"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-password-input" type="password" autocomplete="current-password" placeholder="Password">
                                        <span class="icon is-small is-left">
                                            <i class="fas fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field is-hidden">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-confirm-password-input" type="password" autocomplete="current-password" placeholder="Password (confirm)">
                                        <span class="icon is-small is-left">
                                            <i class="fas fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <button class="button is-link mt-3" id="open-button" type="submit">Open</button>
                            </form>
                            <div class="buttons is-centered mt-3">
                                <button class="button is-text is-small" onclick="showForgotPasswordModal()">Forgot password?</button>
                                <button class="button is-text is-small is-hidden" id="remove-data-button" onclick="showRemoveDataModal(true)">Remove data?</button>
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
        const address_1 = "Institute for Medical Informatics";
        const address_2 = "Director: Prof. Dr. Martin Dugas";
        const address_3 = "Albert-Schweitzer-Campus 1, A11";
        const address_4 = "48149 Münster, Germany";
        const dataProtectionPolicy = "https://privacy.openedc.org";

        this.innerHTML = `
            <div class="modal" id="about-modal">
                <div class="modal-background" onclick="hideAboutModal()"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title">About OpenEDC</h1>
                            <h2 class="subtitle"></h2>
                            <hr>
                            <p class="mb-5">This free and <a target="_blank" href="https://github.com/imi-muenster/OpenEDC">open-source</a> electronic data capture (EDC) system lets you design and conduct secure medical research studies based on the <a target="_blank" href="https://www.cdisc.org/standards/data-exchange/odm">CDISC ODM-XML</a> format.</p>
                            <p class="mb-5">All data is entirely processed offline on your local device. You can optionally connect to your own <a target="_blank" href="https://github.com/imi-muenster/OpenEDC-Server">OpenEDC Server</a> to create research studies with multiple users and sites.</p>
                            <div class="notification">
                                <p>${name}</p>
                                <p>${phone}</p>
                                <p class="mb-5"><a href="mailto:${mail}">${mail}</a></p>
                                <p><strong>${address_1}</strong></p>
                                <p>${address_2}</p>
                                <p>${address_3}</p>
                                <p>${address_4}</p>
                            </div>
                            <a class="button is-rounded is-small is-link mb-5" target="_blank" href="${dataProtectionPolicy}">
                                <span class="icon">
                                    <i class="fas fa-arrow-right"></i>
                                </span>
                                <span>Privacy Policy</span>
                            </a>
                            <br>
                            <button class="button" onclick="hideAboutModal()">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// TODO: This could be removed and replaced by the MessageModal in the future
class CloseClinicaldataModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="close-clinicaldata-modal">
                <div class="modal-background" onclick="hideCloseClinicalDataModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <h2 class="subtitle" id="close-data-title"></h2>
                        <p class="mb-5" id="close-data-text"></p>
                        <div class="buttons is-centered">
                            <button class="button is-small" onclick="closeFormData()" i18n="close-without-saving"></button>
                            <button class="button is-small" onclick="closeFormData(true)" i18n="close-with-saving"></button>
                            <button class="button is-link is-small" onclick="hideCloseClinicalDataModal()" i18n="continue"></button>
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
                            <h1 class="title">Options and Audit Trail</h1>
                            <h2 class="subtitle">for Subject: <strong></strong></h2>
                            <hr>
                            <h2 class="subtitle">Subject Options</h2>
                            <div class="field">
                                <label class="label">Key</label>
                                <div class="control">
                                    <input class="input" id="subject-key-input" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Site</label>
                                <div class="control" id="subject-site-control"></div>
                            </div>
                            <div class="buttons">
                                <button class="button is-danger is-small" id="save-subject-info-button" onclick="saveSubjectInfo()">Save Changes</button>
                                <button class="button is-small" onclick="hideSubjectInfo()">Cancel</button>
                            </div>
                            <hr>
                            <h2 class="subtitle">Audit Trail</h2>
                            <div id="audit-records"></div>
                            <button class="button is-danger is-small" onclick="removeSubject()">Remove Subject</button>
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
                <div class="modal-content is-large">
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

class MessageModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setMessage(message) { this.message = message; }
    setCallbacks(callbacks) { this.callbacks = callbacks; }
    setCallbackType(callbackType) { this.callbackType = callbackType; }
    setCloseText(closeText) { this.closeText = closeText; }

    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="message-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
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
                button.classList = `button is-small ${this.callbackType}`;
                button.textContent = text;
                button.onclick = () => {
                    callback();
                    this.remove();
                };
                this.querySelector(".buttons").insertAdjacentElement("beforeend", button);
            }
        }
        
        // Add close button
        let button = document.createElement("button");
        button.classList = this.callbacks ? "button is-small" : "button is-small is-link";
        button.textContent = this.closeText;
        button.onclick = () => this.remove();
        this.querySelector(".buttons").insertAdjacentElement("beforeend", button);

        // Add event handler for clicking on the modal background
        this.querySelector(".modal-background").onclick = () => this.remove();
    }
}

window.customElements.define("start-modal", StartModal);
window.customElements.define("login-modal", LoginModal);
window.customElements.define("about-modal", AboutModal);
window.customElements.define("close-clinicaldata-modal", CloseClinicaldataModal);
window.customElements.define("subject-modal", SubjectModal);
window.customElements.define("survey-code-modal", SurveyCodeModal);
window.customElements.define("message-modal", MessageModal);
