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
                                    <li class="sidebar-option is-activable is-active" id="foundational-option" onclick="sidebarOptionClicked(event)">
                                        <i class="fa-solid fa-pen"></i>
                                        <span i18n="foundational"></span>
                                    </li>
                                    <li class="sidebar-option is-activable" id="extended-option" onclick="sidebarOptionClicked(event)">
                                        <i class="fa-solid fa-gear"></i>
                                        <span i18n="extended"></span>
                                    </li>
                                    <li class="sidebar-option is-activable" id="duplicate-option" onclick="sidebarOptionClicked(event)">
                                        <i class="fa-solid fa-clone"></i>
                                        <span i18n="duplicate"></span>
                                    </li>
                                    <li class="sidebar-option" id="remove-button" onclick="showRemoveModal()">
                                        <i class="fa-solid fa-trash"></i>
                                        <span i18n="remove"></span>
                                    </li>
                                    <li class="sidebar-option" id="save-button" onclick="saveElement()">
                                        <i class="fa-solid fa-check"></i>
                                        <span i18n="save"></span>
                                    </li>
                                </ul>
                            </nav>
                            <div class="box-content" id="foundational-options">
                                <div class="columns">
                                    <div class="column">
                                        <div class="field">
                                            <label class="label" id="element-oid-label"></label>
                                            <input class="input" type="text" id="id-input" autocomplete="off">
                                        </div>
                                        <div class="field">
                                            <label class="label" id="datatype-label" i18n="data-type"></label>
                                        </div>
                                        <div class="field">
                                            <label class="label" id="mandatory-label" i18n="mandatory"></label>
                                        </div>
                                    </div>
                                    <div class="column is-flex is-flex-direction-column">
                                        <div class="field">
                                            <label class="label" id="element-name-label" i18n="name"></label>
                                            <input class="input" type="text" id="name-input" autocomplete="off">
                                        </div>
                                        <div class="field is-flex is-flex-direction-column is-flex-grow-1">
                                            <div class="is-flex is-justify-content-space-between">
                                                <label class="label" id="element-long-label"></label>
                                                <div class="tabs is-small mb-0" id="translation-area-tabs">
                                                    <ul>
                                                        <li id="translation-textarea-link" class="is-active"><a onclick="switchTab(event, 'translation-textarea-formatted-container', 'translation-textarea-container', false)" i18n="raw"></a></li>
                                                        <li id="translation-textarea-formatted-link"><a onclick="switchTab(event, 'translation-textarea-container', 'translation-textarea-formatted-container', true)" i18n="formatted"></a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div id='translation-text-sections-container' class="is-flex-grow-1 is-flex">
                                                <section class="tab-content is-flex-grow-1 is-flex is-flex-direction-column is-hidden" id="translation-textarea-container">
                                                    <textarea class="textarea is-flex-grow-1" id="translation-textarea" contenteditable="true"></textarea>
                                                </section>
                                                <section class="tab-content is-flex-grow-1 is-flex is-flex-direction-column" id="translation-textarea-formatted-container">
                                                    <div class="textarea is-flex-grow-1" id="translation-textarea-formatted" contenteditable="true"></div>
                                                </section>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="box-content is-relative is-hidden" id="extended-options">
                                <button class="button is-link is-outlined is-rounded is-small is-hidden-touch" id="extended-options-button" onclick="toggleMoreExtendedOptions()">
                                    <span class="icon is-hidden">
                                        <i class="fa-solid fa-arrow-left"></i>
                                    </span>
                                    <span class="button-text is-hidden" i18n="back"></span>
                                    <span class="button-text" i18n="more"></span>
                                    <span class="icon">
                                        <i class="fa-solid fa-arrow-right"></i>
                                    </span>
                                </button>
                                <div class="columns">
                                    <div class="column" id="condition-alias-column">
                                        <div class="field">
                                            <label class="label" i18n="collection-condition"></label>
                                            <div class="control has-autocomplete-bottom">
                                                <input class="input" type="text" id="collection-condition" autocomplete="off" i18n-ph="formal-expression">
                                            </div>
                                        </div>
                                        <div class="field">
                                            <label class="label is-inline-block" i18n="alias-names"></label>
                                            <div class="dropdown is-hoverable is-pulled-right">
                                                <div class="dropdown-trigger">
                                                    <button class="button is-small is-link" aria-haspopup="true" aria-controls="alias-dropdown-menu">
                                                    <span i18n="options"></span>
                                                    <span class="icon is-small">
                                                        <i class="fas fa-angle-down" aria-hidden="true"></i>
                                                    </span>
                                                    </button>
                                                </div>
                                                <div class="dropdown-menu" id="alias-dropdown-menu" role="menu">
                                                    <div class="dropdown-content" id="alias-dropdown-menu-content">
                                                    <a class="dropdown-item" i18n="edit-settings" onclick="showSettingsEditor()">
                                                    </a>
                                                </div>
                                                </div>
                                            </div>
                                            <div id="alias-inputs"></div>
                                            <button class="button is-small is-pulled-right mt-2" id="add-alias-button" onclick="addEmptyAliasInput()" i18n="add"></button>
                                        </div>
                                    </div>
                                    <div class="column" id="unit-range-column">
                                        <div class="field">
                                            <label class="label" i18n="measurement-unit"></label>
                                            <div class="control has-autocomplete-bottom">
                                                <input class="input" type="text" id="measurement-unit" autocomplete="off" i18n-ph="symbol">
                                            </div>
                                        </div>
                                        <div class="field">
                                            <label class="label" i18n="range-checks"></label>
                                            <div id="range-check-inputs"></div>
                                            <button class="button is-small is-pulled-right mt-2" id="add-range-check-button" onclick="addEmptyRangeCheckInput()" i18n="add"></button>
                                        </div>
                                    </div>
                                    <div class="column is-hidden-desktop" id="calculation-column">
                                        <div class="field">
                                            <label class="label" i18n="calculation"></label>
                                            <div class="control has-autocomplete-bottom">
                                                <input class="input" type="text" id="item-method" autocomplete="off" i18n-ph="formal-expression">
                                            </div>
                                        </div>
                                        <div class="field">
                                            <label class="label" id="repeating-label" i18n="repeating"></label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="box-content is-hidden" id="duplicate-options">
                                <div class="field">
                                    <label class="label" i18n="existing-references"></label>
                                    <div class="notification">
                                        <p id="element-references-hint"></p>
                                        <p class="has-text-weight-bold is-hidden mt-3" id="element-references-list"></p>
                                    </div>
                                </div>
                                <div class="field">
                                    <label class="label" i18n="new-duplication"></label>
                                    <div class="buttons">
                                        <button class="button is-small" id="reference-button" i18n="reference" onclick="duplicateReference()"></button>
                                        <button class="button is-small" id="shallow-copy-button" i18n="shallow-copy" onclick="copyElement(false)"></button>
                                        <button class="button is-small" id="deep-copy-button" i18n="deep-copy" onclick="copyElement(true)"></button>
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
                                <button class="button is-link is-light is-fullwidth" id="study-events-add-button" onclick="addStudyEvent(event)" element-type="studyevent" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add"></button>
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
                    <div class="column is-clipped">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="groups"></p>
                            <div class="tree-panel-blocks" id="item-group-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" id="item-groups-add-button" onclick="addItemGroup(event)" element-type="itemgroup" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add" disabled></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column is-clipped">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="items"></p>
                            <div class="tree-panel-blocks" id="item-panel-blocks" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)"></div>
                            <div class="panel-block has-light-border-top">
                                <button class="button is-link is-light is-fullwidth" id="items-add-button" onclick="addItem(event)" element-type="item" ondragenter="allowDrop(event)" ondragover="allowDrop(event)" ondrop="elementDrop(event)" i18n="add" disabled></button>
                            </div>
                        </nav>
                    </div>
                    <div class="column is-clipped">
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
                                                <i class="fa-solid fa-bars"></i>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
                <div class="is-hidden" id="image-preview-container" style="position: absolute; z-index:41;">
                    <img src="" style="max-width:300px; max-height: 300px;"/>
                </div>
            </section>
        `;
    }
}

window.customElements.define("metadata-section", MetadataSection);
