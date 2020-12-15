class StartModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="start-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title">OpenEDC – Start</h1>
                            <h2 class="subtitle">Please choose a starting point</h2>
                            <hr>
                            <p class="mb-5">This free and <a target="_blank" href="#">open-source</a> electronic data capture (EDC) system lets you create and conduct secure medical research studies based on the <a target="_blank" href="https://www.cdisc.org/standards/data-exchange/odm">CDISC ODM-XML</a> format.</p>
                            <p class="mb-5">All data is entirely processed offline on your local device. You can optionally connect to your own <a target="_blank" href="#">OpenEDC Server</a> to create multi-centric research studies with multiple users and sites.</p>
                            <p class="mb-5">For an empty project, choose <strong>New Project</strong>. Click <strong>Open</strong> if you have an ODM-XML file on your computer. If you have not yet used this EDC system, choose <strong>Example</strong> to load an exemplary project and see how it all works.</p>
                            <div class="buttons is-centered">
                                <button class="button" onclick="newProject()">New Project</button>
                                <div class="file">
                                    <label class="file-label">
                                        <input class="file-input" type="file" name="resume" id="odm-upload" onchange="uploadODM()">
                                        <span class="file-cta">
                                            <span class="file-label">Open</span>
                                        </span>
                                    </label>
                                </div>
                                <button class="button" onclick="loadExample()">Example</button>
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
                                        <input class="input" id="username-input" type="text" autocomplete="username" placeholder="Username">
                                        <span class="icon is-small is-left">
                                            <i class="fas fa-user"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="password-input" type="password" autocomplete="current-password" placeholder="Password">
                                        <span class="icon is-small is-left">
                                            <i class="fas fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field is-hidden">
                                    <div class="control has-icons-left">
                                        <input class="input" id="confirm-password-input" type="password" autocomplete="current-password" placeholder="Password (confirm)">
                                        <span class="icon is-small is-left">
                                            <i class="fas fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <button class="button is-link mt-3" id="open-button" type="submit">Open</button>
                            </form>
                            <button class="button is-text is-small mt-3" onclick="forgotPassword()">Forgot password?</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class AboutModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="about-modal">
                <div class="modal-background" onclick="hideAboutModal()"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title">About OpenEDC</h1>
                            <h2 class="subtitle">Simple and secure data collection</h2>
                            <hr>
                            <p class="mb-5">This free and <a target="_blank" href="#">open-source</a> electronic data capture (EDC) system lets you create and conduct secure medical research studies based on the <a target="_blank" href="https://www.cdisc.org/standards/data-exchange/odm">CDISC ODM-XML</a> format.</p>
                            <p class="mb-5">All data is entirely processed offline on your local device. You can optionally connect to your own <a target="_blank" href="#">OpenEDC Server</a> to create multi-centric research studies with multiple users and sites.</p>
                            <p class="mb-5">This EDC system is currently in a beta, but yet stable state. For any questions, bug reports, or feature requests, please contact:</p>
                            <div class="notification">
                                <p>Leonard Greulich</p>
                                <p>+49 (251) 83-54730</p>
                                <p class="mb-5"><a href="mailto:leonard.greulich@ukmuenster.de">leonard.greulich@uni-muenster.de</a></p>
                                <p><strong>Institute for Medical Informatics</strong></p>
                                <p>Director: Prof. Dr. Martin Dugas</p>
                                <p>Albert-Schweitzer-Campus 1, A11</p>
                                <p>48149 Münster, Germany</p>
                            </div>
                            <a class="button is-rounded is-small is-link mb-5" target="_blank" href="https://medical-data-models.org/imprint?lang=en#data-privacy">
                                <span class="icon">
                                    <i class="fas fa-arrow-right"></i>
                                </span>
                                <span>Data Protection Policy</span>
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

class RemoveModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="remove-modal">
                <div class="modal-background" onclick="hideRemoveModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <h2 class="subtitle">Please confirm</h2>
                        <div class="notification is-danger is-hidden">You cannot currently remove this element since there is clinical data assigned to it for the following subjects: <strong></strong>.</div>
                        <p class="mb-5">The reference to the element will be removed. The element definition will be removed as well if there was no other reference to it.</p>
                        <div class="buttons is-centered">
                            <button class="button is-danger is-small" onclick="removeElement()">Remove</button>
                            <button class="button is-small" onclick="hideRemoveModal()">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class CloseClinicaldataModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="close-clinicaldata-modal">
                <div class="modal-background" onclick="hideCloseClinicalDataModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <h2 class="subtitle" id="close-form-title" i18n="close-form">Close form</h2>
                        <h2 class="subtitle" id="close-survey-title" i18n="close-survey">Close survey</h2>
                        <p class="mb-5" id="close-form-text" i18n="close-form-text">It seems that you just edited or entered new data. Do you really want to close the current form?</p>
                        <p class="mb-5" id="close-survey-text" i18n="close-survey-text">Do you really want to end the survey?</p>
                        <div class="buttons is-centered">
                            <button class="button is-small" onclick="closeFormData()" i18n="close-without-saving">Close without saving</button>
                            <button class="button is-small" onclick="closeFormData(true)" i18n="close-with-saving">Close with saving</button>
                            <button class="button is-link is-small" onclick="hideCloseClinicalDataModal()" i18n="continue">Continue</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class DuplicateModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="duplicate-modal">
                <div class="modal-background" onclick="hideDuplicateModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <h2 class="subtitle">Mode of duplication</h2>
                        <p class="mb-5">It possible to either duplicate the reference to the elements definition, to create a new shallow copy with the same children references, or to recursively deep copy the element and all its descendants.</p>
                        <p class="mb-5"><strong>Hint:</strong> If you create a reference, the original element and its descendants are updated if you make changes in the new element. A shallow or deep copy lets you make changes that do not affect the original element (shallow) and its descendants (deep). In a shallow copy you can still rearrange, remove, or add direct children references without affecting the original element.</p>
                        <div class="buttons is-centered">
                            <button class="button is-small is-link" onclick="duplicateReference()">Reference</button>
                            <button class="button is-small is-link" onclick="shallowOrDeepCopy(false)">Shallow copy</button>
                            <button class="button is-small is-link" onclick="shallowOrDeepCopy(true)">Deep copy</button>
                            <button class="button is-small" onclick="hideDuplicateModal()">Cancel</button>
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
                            <h2 class="subtitle">of Subject: <strong></strong></h2>
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
                        <h2 class="subtitle" i18n="survey-finished">Survey finished</h2>
                        <p i18n="survey-finished-text">Thank you for taking the survey.</p>
                        <p class="mb-5" i18n="survey-finished-code-text">Please enter the survey code to close this window.</p>
                        <div class="numpad has-text-centered mb-5">
                            <hr>
                            <div class="status mb-5"></div>
                            <div class="buttons is-centered"></div>
                        </div>
                        <p class="has-text-danger is-hidden" id="wrong-survey-code-hint" i18n="wrong-survey-code-hint">Wrong code entered. Please try again.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

class WarningModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="message-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <h2 class="subtitle" id="message-title"></h2>
                        <p class="mb-5" id="message-text"></p>
                        <button class="button is-small is-link">Okay</button>
                    </div>
                </div>
            </div>
        `;

        this.querySelector("button").addEventListener("click", () => this.remove());
    }
}

window.customElements.define("start-modal", StartModal);
window.customElements.define("login-modal", LoginModal);
window.customElements.define("about-modal", AboutModal);
window.customElements.define("remove-modal", RemoveModal);
window.customElements.define("close-clinicaldata-modal", CloseClinicaldataModal);
window.customElements.define("duplicate-modal", DuplicateModal);
window.customElements.define("subject-modal", SubjectModal);
window.customElements.define("survey-code-modal", SurveyCodeModal);
window.customElements.define("message-modal", WarningModal);
