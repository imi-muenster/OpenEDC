class MoreModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="more-modal">
                <div class="modal-background" onclick="hideMoreModal()"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="tabs is-centered" id="more-tabs">
                            <ul>
                                <li class="is-active" id="element-options-tab" onclick="moreTabClicked(event)"><a>Element Options</a></li>
                                <li id="element-description-tab" onclick="moreTabClicked(event)"><a>Description</a></li>
                                <li id="conditions-tab" onclick="moreTabClicked(event)"><a>Conditions</a></li>
                                <li id="measurement-units-tab" onclick="moreTabClicked(event)"><a>Measurement Units</a></li>
                            </ul>
                        </div>
                        <div class="width-is-three-quarters" id="element-options">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Element Options</h1>
                                <p>The following panel lets you configure further options for the currently selected element. New collection exception conditions and measurement units can be added via the tabs above.</p>
                            </div>
                            <div class="field">
                                <label class="label" id="condition-label">Collection Exception Condition</label>
                            </div>
                            <div class="field">
                                <label class="label" id="measurement-unit-label">Measurement Unit</label>
                            </div>
                            <label class="label" id="range-check-label">Range Check</label>
                            <button class="button is-small is-pulled-right" id="add-range-check-button" onclick="addRangeCheckInput()">+</button>
                            <br>
                            <label class="label" id="alias-label">Alias</label>
                            <div class="buttons is-pulled-right are-small">
                                <button class="button" onclick="addAliasInput()">+</button>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="element-description">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Description</h1>
                                <p>This system is built for good usability while also encouraging best practices. Therefore, the main details panel does not show the description of an item but its question instead. If required, the description of an item can be edited here.</p>
                            </div>
                            <label class="label" id="element-description-label">Description</label>
                            <textarea class="textarea" id="element-description-textarea"></textarea>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="conditions">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Conditions</h1>
                                <p>Conditions are used to define a collection exception for an item. The system automatically hides an item if the specified condition evaluates to true. <strong>Example:</strong> To hide an item with the OID <i>diabetes_therapy</i> if the value of the item with the OID <i>diagnosis</i> is not set to <i>diabetes</i>, enter <i><u>diagnosis != "diabetes"</u></i> and reference it in the <i>diabetes_therapy</i> item.</p>
                            </div>
                            <label class="label" id="conditions-label">Collection Exception Conditions</label>
                            <button class="button is-small is-pulled-right" onclick="addConditionInput()">+</button>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="measurement-units">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Measurement Units</h1>
                                <p>Measurement units defined here are available for every item in every event. The symbol is a translated text and corresponds to the current selected language.</p>
                            </div>
                            <label class="label" id="measurement-units-label">Measurement Units</label>
                            <button class="button is-small is-pulled-right" onclick="addMeasurementUnitInput()">+</button>
                        </div>
                        <div class="width-is-three-quarters mt-6">
                            <div class="buttons">
                                <button class="button is-link" id="save-more-button" onclick="saveMoreModal()">Save Changes</button>
                                <button class="button" id="cancel-more-button" onclick="hideMoreModal()">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("more-modal", MoreModal);
