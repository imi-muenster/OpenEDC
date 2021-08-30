class SurveyCodeModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="survey-code-modal">
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

window.customElements.define("survey-code-modal", SurveyCodeModal);
