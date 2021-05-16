class MetadataSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="metadata-section">
                <div class="notification is-link is-light is-hidden-desktop">
                    <h1 class="title is-4" i18n="mobile-metadata"></h1>
                    <p i18n="mobile-metadata-hint"></p>
                </div>
                <div class="columns is-desktop is-centered" id="details-panel">
                    <div class="column is-half-desktop">
                        <div class="box has-sidebar">
                            <nav class="sidebar">
                                <ul class="sidebar-options">
                                    <li class="sidebar-option is-activable is-active" id="essential-option" onclick="sidebarOptionClicked(event)">
                                        <i class="far fa-text"></i>
                                        <span i18n="essential"></span>
                                    </li>
                                    <li class="sidebar-option is-activable" id="extended-option" onclick="sidebarOptionClicked(event)">
                                        <i class="far fa-ruler"></i>
                                        <span i18n="extended"></span>
                                    </li>
                                    <li class="sidebar-option" id="duplicate-button" onclick="showDuplicateModal()">
                                        <i class="far fa-clone"></i>
                                        <span i18n="duplicate"></span>
                                    </li>
                                    <li class="sidebar-option" id="remove-button" onclick="showRemoveModal()">
                                        <i class="far fa-trash"></i>
                                        <span i18n="remove"></span>
                                    </li>
                                    <li class="sidebar-option" id="save-button" onclick="saveElement()">
                                        <i class="far fa-check"></i>
                                        <span i18n="save"></span>
                                    </li>
                                </ul>
                            </nav>
                            <div class="box-content" id="essential-options">
                                <div class="columns">
                                    <div class="column">
                                        <div class="field">
                                            <label class="label" id="element-oid-label"></label>
                                            <input class="input" type="text" id="oid-input" autocomplete="off">
                                        </div>
                                        <div class="field">
                                            <label class="label" id="datatype-label" i18n="data-type"></label>
                                        </div>
                                        <div class="field">
                                            <label class="label" id="mandatory-label" i18n="mandatory"></label>
                                        </div>
                                    </div>
                                    <div class="column">
                                        <div class="field">
                                            <label class="label" id="element-long-label"></label>
                                            <textarea class="textarea" id="question-textarea"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="box-content is-hidden" id="extended-options">
                                <div class="columns">
                                    <div class="column">
                                        <div class="field">
                                            <label class="label" i18n="collection-exception-condition"></label>
                                            <input class="input" type="text" id="collection-exception-condition" autocomplete="off">
                                        </div>
                                        <div class="field">
                                            <label class="label" i18n="alias"></label>
                                            <div id="alias-inputs"></div>
                                            <button class="button is-small is-pulled-right mt-2" id="add-alias-button" onclick="addEmptyAliasInput()" i18n="add"></button>
                                        </div>
                                    </div>
                                    <div class="column">
                                        <div class="field">
                                            <label class="label" i18n="measurement-unit"></label>
                                            <input class="input" type="text" id="measurement-unit" autocomplete="off">
                                        </div>
                                        <div class="field">
                                            <label class="label" i18n="range-check"></label>
                                            <div id="range-check-inputs"></div>
                                            <button class="button is-small is-pulled-right mt-2" id="add-range-check-button" onclick="addEmptyRangeCheckInput()" i18n="add"></button>
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
