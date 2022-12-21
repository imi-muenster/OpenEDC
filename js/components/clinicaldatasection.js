class ClinicaldataSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="clinicaldata-section">
                <div class="columns is-desktop">
                    <div class="column is-one-fifth-desktop" id="subjects-column">
                        <nav class="panel is-link">
                            <div class="panel-heading has-text-centered is-flex is-justify-content-center">
                                <p i18n="subjects"></p>
                                <button style="height: 25px" class="button is-link is-rounded is-small" onclick="reloadSubjectKeys()">
                                    <span class="icon">
                                        <i class="fas fa-sync-alt"></i>
                                    </span>
                                </button>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom subject-key-mode-element">
                                <div class="field is-grouped is-fullwidth" id="subject-key-mode-manual-element">
                                    <div class="control is-expanded has-icons-left">
                                        <input class="input" id="add-subject-input" type="text" i18n-ph="new-subject">
                                        <span class="icon is-left">
                                            <i class="fa-solid fa-plus"></i>
                                        </span>
                                    </div>
                                    <div class="control">
                                        <button class="button is-link is-light" onclick="addSubjectManual()" i18n="add"></button>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom subject-key-mode-element">
                                <button class="button is-link is-light is-fullwidth" id="subject-key-mode-auto-element" onclick="addSubjectAuto()">
                                    <span class="icon">
                                        <i class="fa-solid fa-plus"></i>
                                    </span>
                                    <span i18n="add"></span>
                                </button>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom subject-key-mode-element">
                                <button class="button is-link is-light is-fullwidth" id="subject-key-mode-barcode-element" onclick="addSubjectBarcode()">
                                    <span class="icon">
                                        <i class="fa-solid fa-barcode-read"></i>
                                    </span>
                                    <span i18n="barcode"></span>
                                </button>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="field is-fullwidth">
                                    <div class="control has-icons-left is-fullwidth" id="filter-site-control">
                                        <div class="icon">
                                            <i class="fa-solid fa-map-marker-alt"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="field is-fullwidth">
                                    <div class="control has-icons-left is-fullwidth" id="sort-subject-control">
                                        <div class="icon">
                                            <i class="fa-solid fa-sort-alpha-down"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="field is-fullwidth">
                                    <div class="control has-icons-left is-fullwidth" id="date-filter-subject-control">
                                        <div class="icon">
                                            <i class="fa-solid fa-filter"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="control has-icons-left">
                                    <input class="input" id="search-subject-input" type="text" i18n-ph="search">
                                    <span class="icon is-left">
                                        <i class="fa-solid fa-search"></i>
                                    </span>
                                </div>
                            </div>
                            <div class="panel-block">
                                <button class="button is-small is-fullwidth" id="subject-info-button" onclick="showSubjectInfo()" i18n="options-and-audit-trail" disabled></button>
                            </div>
                            <div class="tree-panel-blocks" id="subject-panel-blocks">
                                <div class="panel-block has-text-centered has-text-grey-light" id="no-subjects-hint">
                                    <p i18n="no-subjects-hint"></p>
                                </div>
                            </div>
                        </nav>
                    </div>
                    <div class="column is-one-fifth-desktop is-hidden-touch" id="clinicaldata-study-events-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="events"></p>
                            <div class="tree-panel-blocks" id="clinicaldata-study-event-panel-blocks"></div>
                        </nav>
                    </div>
                    <div class="column is-one-fifth-desktop is-hidden-touch" id="clinicaldata-forms-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="forms"></p>
                            <div class="tree-panel-blocks" id="clinicaldata-form-panel-blocks"></div>
                        </nav>
                    </div>
                    <div class="column is-hidden-touch" id="clinicaldata-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered" i18n="data"></p>
                            <div class="tree-panel-blocks">
                                <div class="is-hidden" id="clinicaldata-form-data">
                                    <article class="message is-hidden" id="form-hint">
                                        <div class="message-body"></div>
                                    </article>
                                    <nav class="level is-flex is-flex-direction-column">
                                        <div class="level-left" id="clinicaldata-form-title">
                                            <div class="level-item">
                                                <h1 class="subtitle is-3"></h1>
                                            </div>
                                        </div>
                                        <div class="level-right mt-2 ml-5 is-hidden-survey-view is-flex is-justify-content-space-end is-fullwidth" id="survey-view-button">
                                            <div class="level-item">
                                                <button class="button is-link is-light is-small" onclick="showSurveyView()" id="survey-button">
                                                    <span class="icon">
                                                        <i class="fa-solid fa-expand"></i>
                                                    </span>
                                                    <span i18n="survey-view"></span>
                                                </button>
                                            </div>
                                        </div>
                                    </nav>
                                    <hr>
                                    <div id="clinicaldata-content"></div>
                                    <nav class="level is-mobile mb-0" id="clinicaldata-navigate-level">
                                        <div class="level-left">
                                            <div class="level-item">
                                                <button class="button" id="clinicaldata-close-button" onclick="cancelFormOrSurveyEntry()" i18n="cancel"></button>
                                            </div>
                                        </div>
                                        <div class="level-right">
                                            <div class="level-item">
                                                <div class="buttons has-addons" id="clinicaldata-navigate-buttons">
                                                    <button class="button" id="clinicaldata-previous-button" onclick="loadPreviousFormData()" i18n="back"></button>
                                                    <button class="button is-link" id="clinicaldata-next-button" onclick="loadNextFormData()"></button>
                                                </div>
                                            </div>
                                        </div>
                                    </nav>
                                    <nav class="level is-mobile mt-3 is-hidden-survey-view" id="form-validate-level">
                                        <div class="level-left"></div>
                                        <div class="level-right">
                                            <div class="level-item">
                                                <button class="button is-small" id="form-validate-button" onclick="validateForm()">
                                                    <span class="icon">
                                                        <i class="fa-solid fa-check-circle"></i>
                                                    </span>
                                                    <span i18n="mark-form-validated"></span>
                                                </button>
                                            </div>
                                        </div>
                                    </nav>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            </section>
        `;
    }
}

window.customElements.define("clinicaldata-section", ClinicaldataSection);
