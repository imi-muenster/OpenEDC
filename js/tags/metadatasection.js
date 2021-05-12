class MetadataSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="metadata-section">
                <div class="notification is-link is-light is-hidden-desktop">
                    <h1 class="title is-4" i18n="mobile-metadata"></h1>
                    <p i18n="mobile-metadata-hint"></p>
                </div>
                <div class="columns is-desktop is-centered is-hidden" id="details-panel">
                    <div class="column is-one-fifth-desktop">
                        <div class="buttons is-hidden-touch">
                            <button class="button is-link" id="save-button" onclick="saveElement()" i18n="save-changes" disabled></button>
                            <button class="button is-danger" id="remove-button" onclick="showRemoveModal()" i18n="remove" disabled></button>
                        </div>
                    </div>
                    <div class="column is-one-fifth-desktop">
                        <div class="tags has-addons is-centered is-hidden" id="references-tag">
                            <span class="tag" i18n="multiple-references-hint"></span>
                            <span class="tag is-link" id="number-of-references"></span>
                        </div>
                    </div>
                    <div class="column is-one-fifth-desktop">
                        
                        <div class="buttons is-pulled-right is-hidden-touch">
                            <button class="button" id="duplicate-button" onclick="showDuplicateModal()" i18n="duplicate" disabled></button>
                        </div>
                    </div>
                    <div class="column is-hidden-desktop">
                        <div class="buttons">
                            <button class="button is-link" id="save-button-mobile" onclick="saveElement()" i18n="save-changes" disabled></button>
                            <button class="button is-danger" id="remove-button-mobile" onclick="showRemoveModal()" i18n="remove" disabled></button>
                            <button class="button" id="duplicate-button-mobile" onclick="showDuplicateModal()" i18n="duplicate" disabled></button>
                        </div>
                    </div>
                </div>
                <div class="columns is-desktop is-centered">
                    <div class="column is-half-desktop">
                        <div class="box has-sidebar">
                            <nav class="sidebar">
                                <ul class="sidebar-options">
                                    <li class="sidebar-option is-activable is-active">
                                        <i class="far fa-text"></i>
                                        <span i18n="basic"></span>
                                    </li>
                                    <li class="sidebar-option is-activable">
                                        <i class="far fa-ruler"></i>
                                        <span i18n="extended"></span>
                                    </li>
                                    <li class="sidebar-option">
                                        <i class="far fa-clone"></i>
                                        <span i18n="duplicate"></span>
                                    </li>
                                    <li class="sidebar-option">
                                        <i class="far fa-trash"></i>
                                        <span i18n="remove"></span>
                                    </li>
                                    <li class="sidebar-option">
                                        <i class="far fa-check"></i>
                                        <span i18n="save"></span>
                                    </li>
                                </ul>
                            </nav>
                            <div class="box-content">
                                <div class="columns">
                                    <div class="column is-half">
                                        <div class="field">
                                            <label class="label" id="element-oid-label"></label>
                                            <input class="input" type="text" id="oid-input" autocomplete="off" disabled>
                                        </div>
                                        <div class="field">
                                            <label class="label" id="datatype-label" i18n="data-type"></label>
                                        </div>
                                        <div class="field">
                                            <label class="label" id="mandatory-label" i18n="mandatory"></label>
                                        </div>
                                    </div>
                                    <div class="column is-half">
                                        <div class="field">
                                            <label class="label" id="element-long-label"></label>
                                            <textarea class="textarea" id="question-textarea" disabled></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="columns is-desktop">
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="events"></p>
                            <div class="tree-panel-blocks" id="study-event-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" onclick="addStudyEvent(event)" element-type="studyevent" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add"></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="forms"></p>
                            <div class="tree-panel-blocks" id="form-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" id="forms-add-button" onclick="addForm(event)" element-type="form" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add" disabled></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="groups"></p>
                            <div class="tree-panel-blocks" id="item-group-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" id="item-groups-add-button" onclick="addItemGroup(event)" element-type="itemgroup" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add" disabled></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="items"></p>
                            <div class="tree-panel-blocks" id="item-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" id="items-add-button" onclick="addItem(event)" element-type="item" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add" disabled></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="choices"></p>
                            <div class="tree-panel-blocks" id="code-list-item-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <div class="field is-grouped is-fullwidth" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)">
                                    <div class="control is-expanded">
                                        <button class="button is-link is-light is-fullwidth" id="code-list-items-add-button" onclick="addCodeListItem(event)" element-type="codelistitem" i18n="add" disabled></button>
                                    </div>
                                    <div class="control">
                                        <button class="button is-white" id="code-list-items-opt-button" onclick="showCodeListModal()" disabled>
                                            <span class="icon">
                                                <i class="far fa-bars"></i>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            </section>
        `;
    }
}

window.customElements.define("metadata-section", MetadataSection);
