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
                            <div class="notification is-danger is-light is-hidden">
                                <strong>Hint:</strong> These choices are also used in the following items: ...
                            </div>
                            <label class="label is-hidden">Use choices from another item</label>
                            <div class="field is-grouped is-fullwidth is-hidden">
                                <div class="control is-expanded">
                                    <input class="input" id="item-codelist-input" type="text" placeholder="Item with Codelist">
                                </div>
                                <div class="control">
                                    <button class="button" id="item-codelist-button" i18n="load"></button>
                                </div>
                            </div>
                            <div class="field">
                                <label class="label" i18n="textitems-hint"></label>
                                <textarea class="textarea" id="textitems-textarea" i18n-ph="coded-value-translated-choice"></textarea>
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
