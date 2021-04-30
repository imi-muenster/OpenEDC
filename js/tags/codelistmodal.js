class CodelistModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="codelist-modal">
                <div class="modal-background" onclick="hideCodelistModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="choices"></h1>
                            <h2 class="subtitle"></h2>
                            <hr>
                            <div class="notification is-link is-light is-hidden">
                                <h1 class="title is-4" i18n="note"></h1>
                                <p class="mt-3" i18n="choices-references-hint"></p>
                                <p class="mt-3">
                                    <strong id="codelist-references-list"></strong>
                                </p>
                            </div>
                            <div class="field">
                                <label class="label" i18n="textitems-hint"></label>
                                <textarea class="textarea" id="textitems-textarea" i18n-ph="coded-value-translated-choice"></textarea>
                            </div>
                            <label class="label" i18n="choices-reuse-hint"></label>
                            <div class="field is-grouped is-fullwidth mb-5">
                                <div class="control is-expanded">
                                    <input class="input" id="codelist-reference-input" type="text" i18n-ph="item-with-codelist">
                                </div>
                                <div class="control">
                                    <button class="button" id="codelist-reference-button" i18n="reference"></button>
                                </div>
                            </div>
                            <div class="buttons">
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
