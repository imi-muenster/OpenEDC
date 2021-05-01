class CodeListModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="codelist-modal">
                <div class="modal-background" onclick="hideCodeListModal()"></div>
                <div class="modal-content is-medium">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="choices-for-element"></h1>
                            <h2 class="subtitle"></h2>
                            <hr>
                            <div class="notification is-link is-light is-hidden">
                                <p i18n="choices-references-hint"></p>
                                <p class="mt-3">
                                    <strong id="codelist-references-list"></strong>
                                </p>
                                <button class="button is-link is-small is-outlined mt-5" onclick="unlinkCodeList()" i18n="cancel-link-option"></button>
                            </div>
                            <div class="field">
                                <label class="label" i18n="textitems-hint"></label>
                                <textarea class="textarea" id="textitems-textarea" i18n-ph="coded-value-translated-choice"></textarea>
                            </div>
                            <div id="codelist-reference-field">
                                <label class="label" i18n="choices-reference-hint"></label>
                                <div class="field is-grouped is-fullwidth">
                                    <div class="control is-expanded">
                                        <input class="input" id="codelist-reference-input" type="text" autocomplete="off" i18n-ph="item-with-choices">
                                    </div>
                                    <div class="control">
                                        <button class="button" i18n="use" onclick="linkCodeList()"></button>
                                    </div>
                                </div>
                            </div>
                            <div class="buttons mt-5">
                                <button class="button is-link" i18n="save" onclick="saveCodeListModal()"></button>
                                <button class="button" i18n="cancel" onclick="hideCodeListModal()"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("codelist-modal", CodeListModal);
