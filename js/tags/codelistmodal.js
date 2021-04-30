class CodelistModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="codelist-modal">
                <div class="modal-background" onclick="hideCodelistModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="choices-for-element"></h1>
                            <h2 class="subtitle"></h2>
                            <hr>
                            <div class="notification is-danger is-light is-hidden">
                                <p i18n="choices-references-hint"></p>
                                <p class="mt-3">
                                    <strong id="codelist-references-list"></strong>
                                </p>
                            </div>
                            <div class="field">
                                <label class="label" i18n="textitems-hint"></label>
                                <textarea class="textarea" id="textitems-textarea" i18n-ph="coded-value-translated-choice"></textarea>
                            </div>
                            <div id="codelist-reference-field">
                                <label class="label" i18n="choices-reference-hint"></label>
                                <div class="field is-grouped is-fullwidth">
                                    <div class="control is-expanded">
                                        <input class="input" id="codelist-reference-input" type="text" i18n-ph="item-with-choices">
                                    </div>
                                    <div class="control">
                                        <button class="button" i18n="use"></button>
                                    </div>
                                </div>
                            </div>
                            <div class="buttons mt-5">
                                <button class="button is-link" i18n="save" onclick="saveCodelistModal()"></button>
                                <button class="button" i18n="cancel" onclick="hideCodelistModal()"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("codelist-modal", CodelistModal);
