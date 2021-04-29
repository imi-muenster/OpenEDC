class CodelistModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="codelist-modal">
                <div class="modal-background" onclick="hideCodelistModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title">Choices</h1>
                            <h2 class="subtitle">for Item: ...</h2>
                            <div class="notification is-danger is-light">
                                <strong>Hint:</strong> These choices are also used in the following items: ...
                            </div>
                            <label class="label">Use choices from another item</label>
                            <div class="field is-grouped is-fullwidth">
                                <div class="control is-expanded">
                                    <input class="input" id="item-codelist-input" type="text" placeholder="Item with Codelist">
                                </div>
                                <div class="control">
                                    <button class="button" id="item-codelist-button" i18n="load"></button>
                                </div>
                            </div>
                            <div class="field">
                                <label class="label">Edit choices</label>
                                <textarea class="textarea" id="codelist-textlist"></textarea>
                            </div>
                            <div class="buttons">
                                <button class="button is-link" i18n="save-changes"></button>
                                <button class="button" i18n="cancel"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("codelist-modal", CodelistModal);
