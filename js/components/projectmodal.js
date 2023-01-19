// TODO: Make more modular by utilzing Web Component functionality
class ProjectModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="project-modal">
                <div class="modal-background" onclick="hideProjectModal()"></div>
                <div class="modal-content is-large">
                    <div class="is-pulled-right">
                        <button class="delete is-close-button is-large" onclick="hideProjectModal()"></button>
                    </div>
                    <div class="box">
                        <div class="tabs is-centered" id="project-tabs">
                            <ul>
                                <li class="is-active" id="general-options-tab" onclick="projectTabClicked(event)"><a i18n="general-options"></a></li>
                                <li id="users-options-tab" onclick="projectTabClicked(event)"><a i18n="users"></a></li>
                                <li id="sites-options-tab" onclick="projectTabClicked(event)"><a i18n="sites"></a></li>
                                <li id="name-description-tab" onclick="projectTabClicked(event)"><a i18n="name-and-description"></a></li>
                            </ul>
                        </div>
                        <div class="width-is-three-quarters" id="general-options">
                            <div class="notification is-link is-light" id="connect-to-server-option">
                                <h1 class="title is-4" i18n="connect-to-server"></h1>
                                <p class="has-text-weight-bold mb-5 is-hidden" id="server-connected-hint" i18n="connected-hint"></p>
                                <p i18n="connection-hint"></p>
                                <label class="checkbox is-block mt-5">
                                        <input type="checkbox" id="server-connect-no-encryption">
                                        <span i18n="deactivate-encryption"></span>
                                </label>
                                <div class="field has-addons mt-2 mb-0">
                                    <div class="control is-expanded">
                                        <input class="input is-small" id="server-url-input" type="text" i18n-ph="server-url">
                                    </div>
                                    <div class="control">
                                        <a class="button is-link is-small" onclick="connectToServer()" i18n="connect"></a>
                                    </div>
                                </div>
                                <form class="is-hidden" id="initialize-server-form">
                                    <p class="has-text-weight-bold mt-5 mb-5" i18n="new-account-hint"></p>
                                    <input class="input is-small mb-3" id="owner-username-input" type="text" autocomplete="username" i18n-ph="username">
                                    <input class="input is-small mb-3" id="owner-password-input" type="password" autocomplete="new-password" i18n-ph="password">
                                    <input class="input is-small mb-5" id="owner-confirm-password-input" type="password" autocomplete="new-password" i18n-ph="password-confirm">
                                    <button class="button is-link is-small" onclick="initializeServer(event)" i18n="create-user"></button>
                                </form>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="encrypt-data"></h1>
                                <p class="has-text-weight-bold mb-5 is-hidden" id="data-encrypted-hint" i18n="encrypted-hint"></p>
                                <p class="has-text-weight-bold mb-5 is-hidden" id="data-not-encrypted-hint" i18n="not-encrypted-hint"></p>
                                <p class="mb-5" i18n="encryption-hint"></p>
                                <p class="has-text-weight-bold mb-5" id="data-encryption-warning" i18n="encryption-warning"></p>
                                <form>
                                    <input class="is-hidden" autocomplete="username">
                                    <div class="field has-addons mt-5 mb-0">
                                        <div class="control is-expanded">
                                            <input class="input is-small" id="encryption-password-input" type="password" autocomplete="new-password" i18n-ph="password">
                                        </div>
                                        <div class="control">
                                            <a class="button is-link is-small" onclick="encryptData()" i18n="encrypt"></a>
                                        </div>
                                    </div>
                                    <div class="field has-addons mt-3 is-hidden">
                                        <div class="control is-expanded">
                                            <input class="input is-small" id="confirm-encryption-password-input" type="password" autocomplete="new-password" i18n-ph="password-confirm">
                                        </div>
                                        <div class="control">
                                            <a class="button is-link is-small" onclick="encryptData(event)" i18n="confirm"></a>
                                        </div>
                                    </div>
                                </form>
                                <div class="columns">
                                    <button class="button is-link column p-1 is-small" onclick="showDeactivateEncryptionDialog()" i18n="deactivate-encryption"  id="deactivate-encryption-button"></button>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="subject-key"></h1>
                                <p class="mb-5" i18n="subject-key-hint"></p>
                                <div class="field">
                                    <label class="radio">
                                        <input type="radio" name="subject-key-mode" id="subject-key-mode-manual" oninput="subjectKeyModeClicked(event)">
                                        <span i18n="subject-key-mode-manual"></span>
                                    </label><br>
                                    <label class="radio">
                                        <input type="radio" name="subject-key-mode" id="subject-key-mode-auto" oninput="subjectKeyModeClicked(event)">
                                        <span i18n="subject-key-mode-auto"></span>
                                    </label><br>
                                    <label class="radio">
                                        <input type="radio" name="subject-key-mode" id="subject-key-mode-barcode" oninput="subjectKeyModeClicked(event)">
                                        <span i18n="subject-key-mode-barcode"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="survey-code"></h1>
                                <p class="mb-5" i18n-html="survey-code-hint"></p>
                                <div class="field has-addons">
                                    <div class="control is-expanded">
                                        <input class="input is-small" id="survey-code-input" type="text" i18n-ph="survey-code">
                                    </div>
                                    <div class="control">
                                        <a class="button is-link is-small" onclick="setSurveyCode()" i18n="confirm"></a>
                                    </div>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="miscellaneous-options"></h1>
                                <p class="mb-5" i18n="miscellaneous-options-hint"></p>
                                <div class="field">
                                    <label class="checkbox is-block">
                                        <input type="checkbox" id="show-element-name" oninput="miscOptionClicked(event)">
                                        <span i18n="element-name-hint"></span>
                                    </label>
                                    <label class="checkbox is-block">
                                        <input type="checkbox" id="show-as-likert" oninput="miscOptionClicked(event)">
                                        <span i18n="show-as-likert-hint"></span>
                                    </label>
                                    <div class="field has-addons">
                                        <div class="control is-expanded">
                                            <input class="input is-small" id="likert-scale-limit-input" type="text" i18n-ph="likert-scale-limit">
                                        </div>
                                        <div class="control">
                                            <a class="button is-link is-small" onclick="setLikertScaleLimit()" i18n="confirm"></a>
                                        </div>
                                    </div>
                                    <label class="checkbox is-block">
                                        <input type="checkbox" id="text-as-textarea-checkbox" oninput="miscOptionClicked(event)">
                                        <span i18n="textarea-hint"></span>
                                    </label>
                                    <label class="checkbox is-block">
                                        <input type="checkbox" id="auto-survey-view-checkbox" oninput="miscOptionClicked(event)">
                                        <span i18n="survey-view-hint"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="export-data"></h1>
                                <p class="mb-5" i18n="export-data-hint"></p>
                                <div class="columns is-centered is-multiline">
                                    <button class="button is-link column is-6 p-1 is-small" onclick="exportODM()" i18n="export-project"></button>
                                    <button class="button column is-6 p-1 is-small" onclick="exportODMMetadata()" i18n="export-metadata"></button>
                                    <button class="button column is-6 p-1 is-small" onclick="exportCSV()" i18n="export-clinicaldata"></button>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="import-data"></h1>
                                <p class="mb-5" i18n="import-data-hint"></p>
                                <div class="columns is-centered is-multiline">
                                    <div class="column is-6 p-1">
                                        <div class="file" id="odm-import-metadata">
                                            <label class="file-label">
                                                <input class="file-input" type="file" accept=".xml,text/xml" onchange="importODMMetadata()" multiple>
                                                <span class="file-cta button is-link is-small" i18n="import-metadata"></span>
                                            </label>
                                        </div>
                                    </div>
                                    <div class="column is-6 p-1">
                                        <button class="button is-fullwidth is-small is-link" onclick="openMDMLoadDialog(true)" i18n="load-from-mdm"></button>
                                    </div>
                                    <div class="column is-6 p-1">
                                        <div class="file is-hidden" id="odm-import-clinicaldata">
                                            <label class="file-label">
                                                <input class="file-input" type="file" accept=".xml,text/xml" onchange="importODMClinicaldata()" multiple>
                                                <span class="file-cta button is-link is-small" i18n="import-clinicaldata"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="example-data"></h1>
                                <p class="mb-5" i18n="example-data-hint"></p>
                                <div class="field has-addons">
                                    <div class="control is-expanded">
                                        <input class="input is-link" type="text" autocomplete="off" i18n-ph="amount" autocomplete-mode="1" id="example-data-input">
                                    </div>
                                    <div class="control">
                                        <a class="button is-link" id="example-data-create-button" i18n="create" onclick="createRandomSubjects()"></a>
                                    </div>
                                </div>
                            </div>
                            <div class="notification is-danger is-light">
                                <h1 class="title is-4" i18n="remove-data"></h1>
                                <p class="mb-5" i18n="remove-data-hint"></p>
                                <div class="buttons are-small">
                                    <button class="button is-danger" onclick="showRemoveDataModal(true)" i18n="remove-project"></button>
                                    <button class="button is-danger" onclick="showRemoveDataModal()" i18n="remove-clinicaldata"></button>
                                </div>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="users-options">
                        <div class="notification is-link is-light">
                            <div class="is-flex">
                            <h1 class="title is-4" i18n="users"></h1>
                            <button style="height: 25px" class="button is-link is-rounded is-small has-background-link-light has-text-link has-focus-none" onclick="reloadUsers()">
                                <span class="icon">
                                    <i class="fas fa-sync-alt"></i>
                                </span>
                            </button>
                            </div>
                            <p i18n="users-hint"></p>
                        </div>
                            <div class="columns">
                                <div class="column">
                                    <nav class="panel">
                                        <div class="panel-block has-text-centered has-text-grey-light" id="no-users-hint">
                                            <p i18n="no-users-hint"></p>
                                        </div>
                                        <div class="panel-block" id="add-user-button">
                                            <button class="button is-link is-light is-small is-fullwidth" onclick="addUser()" i18n="add-user" disabled></button>
                                        </div>
                                    </nav>
                                </div>
                                <div class="column">
                                    <div class="field">
                                        <label class="label" i18n="first-name"></label>
                                        <input class="input" id="user-first-name-input" type="text">
                                    </div>
                                    <div class="field">
                                        <label class="label" i18n="last-name"></label>
                                        <input class="input" id="user-last-name-input" type="text">
                                    </div>
                                    <div class="field">
                                        <label class="label" i18n="site"></label>
                                        <div class="control" id="user-site-control"></div>
                                    </div>
                                    <div class="mt-5 is-hidden" id="user-login-inputs">
                                        <hr>
                                        <div class="field">
                                            <label class="label" i18n="username"></label>
                                            <input class="input" id="user-username-input" type="text">
                                        </div>
                                        <div class="field">
                                            <label class="label" i18n="initial-password"></label>
                                            <input class="input" id="user-password-input" type="text">
                                        </div>
                                    </div>
                                    <div class="mt-5" id="user-rights-inputs">
                                        <hr>
                                        <div class="field" id="user-rights">
                                            <label class="label" i18n="user-rights"></label>
                                        </div>
                                    </div>
                                    <div class="buttons are-small mt-5">
                                        <button class="button is-link" id="user-save-button" onclick="saveUser()" i18n="save"></button>
                                        <button class="button is-danger" id="user-remove-button" onclick="showRemoveUserModal()" i18n="remove"></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="sites-options">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="sites"></h1>
                                <p i18n="sites-hint"></p>
                            </div>
                            <div class="columns">
                                <div class="column">
                                    <nav class="panel">
                                        <div class="panel-block has-text-centered has-text-grey-light" id="no-sites-hint">
                                            <p i18n="no-sites-hint"></p>
                                        </div>
                                        <div class="panel-block" id="add-site-button">
                                            <button class="button is-link is-light is-small is-fullwidth" onclick="addSite()" i18n="add-site"></button>
                                        </div>
                                    </nav>
                                </div>
                                <div class="column">
                                    <div class="field">
                                        <label class="label" i18n="name"></label>
                                        <input class="input" id="site-name-input" type="text">
                                    </div>
                                    <div class="buttons are-small">
                                        <button class="button is-link" id="site-save-button" onclick="saveSite()" i18n="save"></button>
                                        <button class="button is-danger" id="site-remove-button" onclick="removeSite()" i18n="remove"></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="name-description">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4" i18n="name-and-description"></h1>
                                <p i18n="name-and-description-hint"></p>
                            </div>
                            <div class="field">
                                <label class="label" i18n="study-name"></label>
                                <input class="input" id="study-name-input" type="text">
                            </div>
                            <div class="field">
                                <label class="label" i18n="study-description"></label>
                                <textarea class="textarea" id="study-description-textarea"></textarea>
                            </div>
                            <div class="field">
                                <label class="label" i18n="protocol-name"></label>
                                <input class="input" id="protocol-name-input" type="text">
                            </div>
                            <div class="buttons are-small">
                                <button class="button is-link" id="save-global-variables-button" onclick="saveStudyNameDescription()" i18n="save-changes"></button>
                                <button class="button" id="cancel-global-variables-button" onclick="hideProjectModal()" i18n="cancel"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("project-modal", ProjectModal);
