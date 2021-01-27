class ProjectModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="project-modal">
                <div class="modal-background" onclick="hideProjectModal()"></div>
                <div class="modal-content is-large">
                    <div class="box">
                        <div class="tabs is-centered" id="project-tabs">
                            <ul>
                                <li class="is-active" id="general-options-tab" onclick="projectTabClicked(event)"><a>General Options</a></li>
                                <li id="users-options-tab" onclick="projectTabClicked(event)"><a>Users</a></li>
                                <li id="sites-options-tab" onclick="projectTabClicked(event)"><a>Sites</a></li>
                                <li id="name-description-tab" onclick="projectTabClicked(event)"><a>Name and Description</a></li>
                            </ul>
                        </div>
                        <div class="width-is-three-quarters" id="general-options">
                            <div class="notification is-link is-light" id="connect-to-server-option">
                                <h1 class="title is-4">Connect to Server</h1>
                                <p class="mb-5 is-hidden" id="server-connected-hint"><strong>You are connected to an OpenEDC Server.</strong></p>
                                <p>With this option you can connect to an OpenEDC Server. This lets you create projects with multiple users. All currently existing data is synced to the server. Current and future data will be end-to-end encrypted by default.</p>
                                <div class="field has-addons mt-5">
                                    <div class="control is-expanded">
                                        <input class="input is-small" id="server-url-input" type="text" placeholder="Server URL">
                                    </div>
                                    <div class="control">
                                        <a class="button is-link is-small" onclick="connectToServer()">Connect</a>
                                    </div>
                                </div>
                                <form class="is-hidden" id="initialize-server-form">
                                    <p class="mt-5 mb-5"><strong>A new OpenEDC Server could be found. You can now create an account for the server.</strong></p>
                                    <input class="input is-small mb-3" id="owner-username-input" type="text" placeholder="Username" autocomplete="username">
                                    <input class="input is-small mb-3" id="owner-password-input" type="password" placeholder="Password" autocomplete="new-password">
                                    <input class="input is-small mb-5" id="owner-confirm-password-input" type="password" placeholder="Password (confirm)" autocomplete="new-password">
                                    <button class="button is-link is-small" onclick="initializeServer(event)">Create user</button>
                                </form>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Encrypt Data</h1>
                                <p class="mb-5 is-hidden" id="data-encrypted-hint"><strong>Data is encrypted.</strong></p>
                                <p>With this option you can fully encrypt all locally stored data. All currently stored and future data will then be encrypted. When you open the app again, you need to enter the password to decrypt the data.</p>
                                <p class="mt-5" id="data-encryption-warning"><strong>Warning: If you forget the password, all data will be permanently lost.</strong></p>
                                <form>
                                    <input class="is-hidden" autocomplete="username">
                                    <div class="field has-addons mt-5">
                                        <div class="control is-expanded">
                                            <input class="input is-small" id="encryption-password-input" type="password" placeholder="Encryption password" autocomplete="new-password">
                                        </div>
                                        <div class="control">
                                            <a class="button is-link is-small" onclick="encryptData()">Encrypt</a>
                                        </div>
                                    </div>
                                    <div class="field has-addons is-hidden">
                                        <div class="control is-expanded">
                                            <input class="input is-small" id="confirm-encryption-password-input" type="password" placeholder="Confirm encryption password" autocomplete="new-password">
                                        </div>
                                        <div class="control">
                                            <a class="button is-link is-small" onclick="encryptData()">Confirm</a>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Survey Code</h1>
                                <p class="mb-5">This option lets you set a four-digit numerical code that needs to be entered after a local survey (started with the <i>Survey View</i> button) is finished or canceled. This prevents study participants from seeing foreign data.</p>
                                <div class="field has-addons mb-3">
                                    <div class="control is-expanded">
                                        <input class="input is-small" id="survey-code-input" type="text" placeholder="Survey code">
                                    </div>
                                    <div class="control">
                                        <a class="button is-link is-small" onclick="setSurveyCode()">Set</a>
                                    </div>
                                </div>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Miscellaneous Options</h1>
                                <p class="mb-5">In the following, different miscellaneous options are listed that you can activate by clicking on it. If you are connected to a server, the options are valid for all users.</p>
                                <label class="checkbox mb-1">
                                    <input type="checkbox" id="text-as-textarea-checkbox" oninput="miscOptionClicked(event)">
                                    Render items with the datatype <i>string</i> as multi-line textareas instead of one-line inputs.
                                </label>
                                <label class="checkbox">
                                    <input type="checkbox" id="auto-survey-view-checkbox" oninput="miscOptionClicked(event)">
                                    Automatically open the survey view on mobile devices when clicking on a study event.
                                </label>
                            </div>
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Export Data</h1>
                                <p class="mb-5">These options lets you download the project in CDISC ODM-XML or CSV format. You can either download all data (including the metadata, admindata, and data from all subjects including the entire audit trail), or only the metadata or clinicaldata. Please note that only the first option creates a backup of your project.</p>
                                <div class="buttons">
                                    <button class="button is-link is-small" onclick="downloadODM()">Download ODM (complete)</button>
                                    <button class="button is-small" onclick="downloadODMMetadata()">Download ODM (only metadata)</button>
                                    <button class="button is-small" onclick="downloadCSV()">Download CSV (only clinicaldata)</button>
                                </div>
                            </div>
                            <div class="notification is-danger is-light">
                                <h1 class="title is-4">Remove Data</h1>
                                <p class="mb-5">The following option lets you remove all stored data and thereby reset the current project.</p>
                                <p class="mb-5"><strong>Warning: This cannot be undone.</strong></p>
                                <div class="buttons">
                                    <button class="button is-danger is-small" onclick="showRemoveAllDataModal()">Remove data (complete)</button>
                                    <button class="button is-danger is-small" onclick="removeClinicaldata()">Remove data (only clinicaldata)</button>
                                    <div class="file is-hidden" id="odm-upload-to-server">
                                        <label class="file-label">
                                            <input class="file-input" type="file" name="resume" onchange="uploadODMToServer()">
                                            <span class="file-cta button is-danger is-small">
                                                <span class="file-label">Upload ODM (removes all current data)</span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="users-options">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Users</h1>
                                <p>The following panel lets you add users to the current project. Please note that you can only add new users when you are connected to an OpenEDC Server.</p>
                            </div>
                            <div class="columns">
                                <div class="column">
                                    <nav class="panel">
                                        <div class="panel-block has-text-centered has-text-grey-light" id="no-users-hint">
                                            <p>No users available. Please add a new user with the button below.</p>
                                        </div>
                                        <div class="panel-block" id="add-user-button">
                                            <button class="button is-link is-light is-fullwidth" onclick="addUser()" disabled>Add User</button>
                                        </div>
                                    </nav>
                                </div>
                                <div class="column">
                                    <div class="field">
                                        <label class="label">First name</label>
                                        <input class="input" id="user-first-name-input" type="text">
                                    </div>
                                    <div class="field">
                                        <label class="label">Last name</label>
                                        <input class="input" id="user-last-name-input" type="text">
                                    </div>
                                    <div class="field">
                                        <label class="label">Site</label>
                                        <div class="control" id="user-site-control"></div>
                                    </div>
                                    <hr>
                                    <div class="field">
                                        <label class="label">Username</label>
                                        <input class="input" id="user-username-input" type="text">
                                    </div>
                                    <div class="field">
                                        <label class="label">Initial password</label>
                                        <input class="input" id="user-password-input" type="text">
                                    </div>
                                    <div class="field is-hidden" id="user-rights">
                                        <hr>
                                        <label class="label">User rights</label>
                                    </div>
                                    <div class="buttons">
                                        <button class="button is-link" id="user-save-button" onclick="saveUser()">Save</button>
                                        <button class="button is-danger" id="user-remove-button" onclick="removeUser()">Remove</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="sites-options">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Sites</h1>
                                <p>With the following panel you can add and edit sites. Subjects can be assigned to sites to conduct multi-centric research projects.</p>
                            </div>
                            <div class="columns">
                                <div class="column">
                                    <nav class="panel">
                                        <div class="panel-block has-text-centered has-text-grey-light" id="no-sites-hint">
                                            <p>No sites available. Please add a new site with the button below.</p>
                                        </div>
                                        <div class="panel-block" id="add-site-button">
                                            <button class="button is-link is-light is-fullwidth" onclick="addSite()">Add Site</button>
                                        </div>
                                    </nav>
                                </div>
                                <div class="column">
                                    <div class="field">
                                        <label class="label">Name</label>
                                        <input class="input" id="site-name-input" type="text">
                                    </div>
                                    <div class="buttons">
                                        <button class="button is-link" id="site-save-button" onclick="saveSite()">Save</button>
                                        <button class="button is-danger" id="site-remove-button" onclick="removeSite()">Remove</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="width-is-three-quarters is-hidden" id="name-description">
                            <div class="notification is-link is-light">
                                <h1 class="title is-4">Name and Description</h1>
                                <p>The following panel lets you edit the study name, study description, and protocol name. The study name will be displayed in the top navigation bar of this app.</p>
                            </div>
                            <div class="field">
                                <label class="label">Study name</label>
                                <input class="input" id="study-name-input" type="text">
                            </div>
                            <div class="field">
                                <label class="label">Study description</label>
                                <textarea class="textarea" id="study-description-textarea"></textarea>
                            </div>
                            <div class="field">
                                <label class="label">Protocol name</label>
                                <input class="input" id="protocol-name-input" type="text">
                            </div>
                            <div class="buttons">
                                <button class="button is-link" id="save-global-variables-button" onclick="saveStudyNameDescription()">Save Changes</button>
                                <button class="button" id="cancel-global-variables-button" onclick="hideProjectModal()">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

window.customElements.define("project-modal", ProjectModal);
