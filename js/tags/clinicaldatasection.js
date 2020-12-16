class ClinicaldataSection extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <section class="section is-hidden" id="clinicaldata-section">
                <div class="columns is-desktop">
                    <div class="column" id="subjects-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered">Subjects</p>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="field is-grouped is-fullwidth">
                                    <div class="control is-expanded has-icons-left">
                                        <input class="input" id="add-subject-input" type="text" placeholder="New Subject">
                                        <span class="icon is-left">
                                            <i class="fas fa-plus"></i>
                                        </span>
                                    </div>
                                    <div class="control">
                                        <button class="button is-link is-light" id="add-subject-button" onclick="addSubject()">Add</button>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="field is-fullwidth">
                                    <div class="control has-icons-left is-fullwidth" id="filter-site-control">
                                        <div class="icon">
                                            <i class="fas fa-map-marker-alt"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="field is-fullwidth">
                                    <div class="control has-icons-left is-fullwidth" id="sort-subject-control">
                                        <div class="icon">
                                            <i class="fas fa-sort-alpha-down"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-block has-no-padding-bottom has-no-border-bottom">
                                <div class="control has-icons-left">
                                    <input class="input" id="search-subject-input" type="text" placeholder="Search">
                                    <span class="icon is-left">
                                        <i class="fas fa-search"></i>
                                    </span>
                                </div>
                            </div>
                            <div class="panel-block">
                                <button class="button is-small is-fullwidth" id="subject-info-button" onclick="showSubjectInfo()" disabled>Options and Audit Trail</button>
                            </div>
                            <div class="tree-panel-blocks" id="subject-panel-blocks">
                                <div class="panel-block has-text-centered has-text-grey-light" id="no-subjects-hint">
                                    <p>No subjects available. Please add a new subject with the button above.</p>
                                </div>
                            </div>
                        </nav>
                    </div>
                    <div class="column is-hidden-touch" id="clinicaldata-study-events-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered">Events</p>
                            <div class="tree-panel-blocks" id="clinicaldata-study-event-panel-blocks">
                            </div>
                        </nav>
                    </div>
                    <div class="column is-hidden-touch" id="clinicaldata-forms-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered">Forms</p>
                            <div class="tree-panel-blocks" id="clinicaldata-form-panel-blocks">
                            </div>
                        </nav>
                    </div>
                    <div class="column is-two-fifths-desktop is-hidden-touch" id="clinicaldata-column">
                        <nav class="panel is-link">
                            <p class="panel-heading has-text-centered">Data</p>
                            <div class="tree-panel-blocks">
                                <div class="is-hidden" id="clinicaldata-form-data">
                                    <article class="message is-danger is-hidden" id="no-subject-selected-hint">
                                        <div class="message-body" i18n="no-subject-selected-hint">No subject selected. You can still view and test the form but entered data will not be stored.</div>
                                    </article>
                                    <article class="message is-link is-hidden" id="audit-record-data-hint">
                                        <div class="message-body">
                                            <p i18n="audit-record-data-hint">You are currently viewing data from the audit trail.</p>
                                            <p id="audit-record-most-current-hint" i18n="audit-record-most-current-hint">This is the most current data or equivalent to the most current data.</p>
                                        </div>
                                    </article>
                                    <nav class="level">
                                        <div class="level-left" id="clinicaldata-form-title">
                                            <div class="level-item">
                                                <h1 class="subtitle is-3"></h1>
                                            </div>
                                        </div>
                                        <div class="level-right" id="survey-view-button">
                                            <div class="level-item">
                                                <button class="button is-small is-link is-light" onclick="showSurveyView()">
                                                    <span class="icon">
                                                        <i class="fas fa-expand"></i>
                                                    </span>
                                                    <span i18n="survey-view">Survey View</span>
                                                </button>
                                            </div>
                                        </div>
                                    </nav>
                                    <hr>
                                    <div id="clinicaldata-content"></div>
                                    <button class="button" id="clinicaldata-close-button" onclick="cancelFormOrSurveyEntry()" i18n="close">Close</button>
                                    <div class="field has-addons is-pulled-right" id="clinicaldata-navigate-buttons">
                                        <div class="control">
                                            <button class="button" id="clinicaldata-previous-button" onclick="loadPreviousFormData()" i18n="back">Back</button>
                                        </div>
                                        <div class="control">
                                            <button class="button is-link" id="clinicaldata-next-button" onclick="loadNextFormData()">Continue</button>
                                        </div>
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

window.customElements.define("clinicaldata-section", ClinicaldataSection);
