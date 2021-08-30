class SubjectModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="subject-modal">
                <div class="modal-background" onclick="hideSubjectInfo()"></div>
                <div class="modal-content is-large">
                    <div class="is-pulled-right">
                        <button class="delete is-close-button is-large" onclick="hideSubjectInfo()"></button>
                    </div>
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

window.customElements.define("subject-modal", SubjectModal);
