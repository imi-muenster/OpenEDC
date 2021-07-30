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
                                <p i18n="choices-multiple-references-hint"></p>
                                <p class="has-text-weight-bold mt-3" id="codelist-references-list">
                                </p>
                                <button class="button is-link is-small is-outlined mt-5" onclick="unreferenceCodeList()" i18n="cancel-reference-option"></button>
                            </div>
                            <div class="field">
                                <label class="label" i18n="textitems-hint"></label>
                                <textarea class="textarea" id="textitems-textarea" rows="8" i18n-ph="coded-value-translated-choice"></textarea>
                            </div>
                            <div id="codelist-reference-field">
                                <div class="text-divider is-size-6 mt-5 mb-3" i18n="or"></div>
                                <label class="label" i18n="choices-reference-hint"></label>
                                <div class="field is-grouped is-fullwidth">
                                    <div class="control is-expanded has-autocomplete-top">
                                        <input class="input" id="codelist-reference-input" type="text" autocomplete="off" i18n-ph="item-with-choices">
                                    </div>
                                    <div class="control">
                                        <button class="button" i18n="use" onclick="referenceCodeList()"></button>
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
