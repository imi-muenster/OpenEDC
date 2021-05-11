class MoreModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="more-modal">
                <div class="modal-background" onclick="hideMoreModal()"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="tabs is-centered" id="more-tabs">
                            <ul>
                                <li class="is-active" id="element-options-tab" onclick="moreTabClicked(event)"><a i18n="element-options"></a></li>
                                <li id="conditions-tab" onclick="moreTabClicked(event)"><a i18n="conditions"></a></li>
                                <li id="measurement-units-tab" onclick="moreTabClicked(event)"><a i18n="measurement-units"></a></li>
                            </ul>
                        </div>
                        <div class="width-is-three-quarters" id="element-options">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="element-options"></h1>
                                <p i18n="element-options-hint"></p>
                            </div>
                            <div class="field">
                                <label class="label" id="condition-label" i18n="collection-exception-condition"></label>
                            </div>
                            <div class="field">
                                <label class="label" id="measurement-unit-label" i18n="measurement-unit"></label>
                            </div>
                            <label class="label" id="range-check-label" i18n="range-check"></label>
                            <button class="button is-small is-pulled-right" id="add-range-check-button" onclick="addRangeCheckInput()">+</button>
                            <br>
                            <label class="label" id="alias-label" i18n="alias"></label>
                            <div class="buttons is-pulled-right are-small">
                                <button class="button" onclick="addAliasInput()">+</button>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="conditions">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="conditions"></h1>
                                <p i18n-html="conditions-hint"></p>
                            </div>
                            <label class="label" id="conditions-label" i18n="conditions"></label>
                            <button class="button is-small is-pulled-right" onclick="addConditionInput()">+</button>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="measurement-units">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="measurement-units"></h1>
                                <p i18n="measurement-units-hint"></p>
                            </div>
                            <label class="label" id="measurement-units-label" i18n="measurement-units"></label>
                            <button class="button is-small is-pulled-right" onclick="addMeasurementUnitInput()">+</button>
                        </div>
                        <div class="width-is-three-quarters mt-6">
                            <div class="buttons">
                                <button class="button is-link" id="save-more-button" onclick="saveMoreModal()" i18n="save-changes"></button>
                                <button class="button" id="cancel-more-button" onclick="hideMoreModal()" i18n="cancel"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("more-modal", MoreModal);
