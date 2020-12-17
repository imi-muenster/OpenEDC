class MetadataSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="metadata-section">
                <div class="notification is-link is-light is-hidden-desktop">
                    <h1 class="title is-4">Mobile Metadata</h1>
                    <p>You are currently using a small device while editing the metadata (i.e., the forms). While this is absolutely fine and doable, we still suggest switching to a device with a larger screen to benefit from a simplified editing workflow.</p>
                </div>
                <div class="columns is-desktop is-centered" id="details-panel">
                    <div class="column is-one-fifth-desktop">
                        <div class="field">
                            <label class="label" id="element-oid-label">OID</label>
                            <input class="input" type="text" id="oid-input" autocomplete="off" disabled>
                        </div>
                        <div class="field">
                            <label class="label" id="element-short-label">Name</label>
                            <input class="input" type="text" id="name-input" autocomplete="off" disabled>
                        </div>
                        <div class="buttons is-hidden-touch">
                            <button class="button is-link" id="save-button" onclick="saveElement()" disabled>Save Changes</button>
                            <button class="button is-danger" id="remove-button" onclick="showRemoveModal()" disabled>Remove</button>
                        </div>
                    </div>
                    <div class="column is-one-fifth-desktop">
                        <div class="field">
                            <label class="label" id="element-long-label">Description</label>
                            <textarea class="textarea" id="question-textarea" disabled></textarea>
                        </div>
                        <div class="tags has-addons is-centered is-hidden" id="references-tag">
                            <span class="tag">Multiple references of element</span>
                            <span class="tag is-link" id="number-of-references"></span>
                        </div>
                    </div>
                    <div class="column is-one-fifth-desktop">
                        <div class="field">
                            <label class="label" id="datatype-label">Data Type</label>
                        </div>
                        <div class="field">
                            <label class="label" id="mandatory-label">Mandatory</label>
                        </div>
                        <div class="buttons is-pulled-right is-hidden-touch">
                            <button class="button" id="duplicate-button" onclick="showDuplicateModal()" disabled>Duplicate</button>
                            <button class="button" id="more-button" onclick="showMoreModal()" disabled>
                                <span class="icon is-small">
                                    <i class="fas fa-wrench"></i>
                                </span>
                                <span>More</span>
                            </button>
                        </div>
                    </div>
                    <div class="column is-hidden-desktop">
                        <div class="buttons">
                            <button class="button is-link" id="save-button-mobile" onclick="saveElement()" disabled>Save Changes</button>
                            <button class="button is-danger" id="remove-button-mobile" onclick="showRemoveModal()" disabled>Remove</button>
                            <button class="button" id="duplicate-button-mobile" onclick="showDuplicateModal()" disabled>Duplicate</button>
                            <button class="button" id="more-button-mobile" onclick="showMoreModal()" disabled>
                                <span class="icon is-small">
                                    <i class="fas fa-wrench"></i>
                                </span>
                                <span>More</span>
                            </button>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="columns is-desktop">
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" element-type="studyevent" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)">Events</p>
                            <div class="tree-panel-blocks" id="study-event-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top" id="study-events-add-button">
                                <button class="button is-link is-light is-fullwidth" onclick="addStudyEvent(event)">Add</button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" element-type="form" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)">Forms</p>
                            <div class="tree-panel-blocks" id="form-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top" id="forms-add-button">
                                <button class="button is-link is-light is-fullwidth" onclick="addForm(event)" disabled>Add</button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" element-type="itemgroup" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)">Groups</p>
                            <div class="tree-panel-blocks" id="item-group-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top" id="item-groups-add-button">
                                <button class="button is-link is-light is-fullwidth" onclick="addItemGroup(event)" disabled>Add</button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" element-type="item" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)">Items</p>
                            <div class="tree-panel-blocks" id="item-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top" id="items-add-button">
                                <button class="button is-link is-light is-fullwidth" onclick="addItem(event)" disabled>Add</button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" element-type="codelistitem" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)">Choices</p>
                            <div class="tree-panel-blocks" id="code-list-item-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top" id="code-list-items-add-button">
                                <button class="button is-link is-light is-fullwidth" onclick="addCodeListItem(event)" disabled>Add</button>
                            </div>
                        </nav>
                    </div>
                </div>
            </section>
        `;
    }
}

window.customElements.define("metadata-section", MetadataSection);
