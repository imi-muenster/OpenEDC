import * as metadataModule from "./metadatamodule.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as admindataModule from "./admindatamodule.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as odmValidation from "./helper/odmvalidation.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";

const appVersion = "0.3.2";

const appModes = {
    METADATA: 1,
    CLINICALDATA: 2
};

const appStates = {
    EMPTY: 1,
    LOCKED: 2,
    UNLOCKED: 3
}

const $ = query => document.querySelector(query);

document.addEventListener("DOMContentLoaded", async () => {
    // If index.html is requested, redirect to the base url
    if (window.location.pathname.includes("/index.html")) {
        window.location.replace(ioHelper.getBaseURL().replace("/index.html", ""));
    }

    // Initialize the language helper and localize the application
    await languageHelper.init();
    await languageHelper.localize();

    // Check if this app might be served from an OpenEDC Server instance and then show the login modal accordingly
    await ioHelper.init()
        .then(serverStatus => {
            if (serverStatus == ioHelper.serverStatus.SERVERINITIALIZED) showLoginModal();
            else if (serverStatus == ioHelper.serverStatus.SERVERNOTINITIALIZED) showUninitializedHint();
        });

    // Initialize the application
    await metadataHelper.loadStoredMetadata()
        .then(() => {
            startApp();
        })
        .catch(error => {
            if (error.code == ioHelper.loadXMLExceptionCodes.NODATAFOUND && !ioHelper.hasServerURL()) showStartModal();
            else if (error.code == ioHelper.loadXMLExceptionCodes.DATAENCRYPTED) showDecryptionKeyModal();
        });

    // Handle URL search / query parameters (e.g., for metadata repository integration)
    handleURLSearchParameters();

    // Register service worker for offline capabilities
    const developmentOrigins = ["localhost", "127.0.0.1", "dev.openedc.org"];
    const enableServiceWorker = !developmentOrigins.some(origin => window.location.origin.includes(origin));
    if (enableServiceWorker && window.navigator.serviceWorker) {
        window.navigator.serviceWorker.register("./serviceworker.js");
    }
});

document.addEventListener("LanguageChanged", languageEvent => {
    metadataModule.setLanguage(languageEvent.detail);
    clinicaldataModule.setLanguage(languageEvent.detail);
    
    reloadApp();
    ioHelper.hideMenu();
});

const startApp = async () => {
    languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
    languageHelper.setInitialLocale();
    
    metadataModule.init();
    metadataModule.setLanguage(languageHelper.getCurrentLocale());

    await admindataModule.init();

    await clinicaldataModule.init();
    clinicaldataModule.setLanguage(languageHelper.getCurrentLocale());

    ioHelper.loadSettings();

    // Last UI adjustments
    setTitles();
    hideStartModal();
    showNavbar();
    showCloseExampleButton();
    adjustUIToUser();
    setIOListeners();

    // If there is at least one study event, automatically open the clinicaldata module
    metadataHelper.getStudyEvents().length > 0 ? metadataModule.hide() : metadataModule.show();

    // For performance purposes, add remaining modals to DOM after main app has been rendered
    addModalsToDOM();

    // Localize application after remaining modals were added to DOM
    await languageHelper.localize();

    // Only required because of a bug in Safari (selects without a value show a value if the textContent of their option elements is changed -- which happens during localize())
    if (getCurrentMode() == appModes.METADATA) metadataModule.reloadDetailsPanel();

    // After all, check app version or whether app is currently offline
    checkAppVersion();
}

const setTitles = () => {
    const studyName =  ioHelper.shortenText(metadataHelper.getStudyName(), 25);
    $("#study-title").textContent = studyName;
    $("head title").textContent = "OpenEDC – " + studyName;
}

function showStartModal() {
    $("#start-modal").activate();
}

function hideStartModal() {
    $("#start-modal").deactivate();
}

function showNavbar() {
    $(".navbar").show();
}

function showDecryptionKeyModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-username-input").parentNode.parentNode.hide();
    $("#remove-data-button").show();
    $("#login-title").textContent = languageHelper.getTranslation("login-encrypted-title");
    $("#login-text").textContent = languageHelper.getTranslation("login-encrypted-text");
    $("#login-incorrect-hint .message-body").textContent = languageHelper.getTranslation("password-incorrect-error");

    // Set the click handler when clicking on the Open button
    $("#login-modal #open-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        const decryptionKey = $("#login-password-input").value;
        ioHelper.setDecryptionKey(decryptionKey)
            .then(() => loginSuccessful())
            .catch(error => loginNotSuccessful(error));
    };

    $("#login-modal").activate();
}

function showCloseExampleButton() {
    if (metadataHelper.getStudyName() == languageHelper.getTranslation("exemplary-project")) $("#close-example-button").show(); 
}

function showLoginModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-title").textContent = languageHelper.getTranslation("login-server-title");
    $("#login-text").textContent = languageHelper.getTranslation("login-server-text");
    $("#login-incorrect-hint .message-body").textContent = languageHelper.getTranslation("username-password-incorrect-error");

    // Set the click handler when clicking on the open button
    $("#login-modal #open-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        const username = $("#login-username-input").value;
        const password = $("#login-password-input").value;
        const confirmPassword = $("#login-confirm-password-input").value;

        // TODO: Code refactoring -- not very nice, clean code
        if (!$("#login-username-input").disabled) {
            const credentials = new ioHelper.Credentials(username, password);
            ioHelper.loginToServer(credentials)
                .then(() => loginSuccessful())
                .catch(error => loginNotSuccessful(error));
        } else {
            const credentials = new ioHelper.Credentials(username, password, confirmPassword);
            if (credentials.error) {
                // TODO: This could be improved in the future -- passing the error to the languageHelper is not very nice
                ioHelper.showMessage(languageHelper.getTranslation("password-not-set"), languageHelper.getTranslation(credentials.error));
                return;
            }
            ioHelper.setOwnPassword(credentials)
                .then(loginSuccessful)
                .catch(error => ioHelper.showMessage(languageHelper.getTranslation("password-not-set"), error));
        }
    };

    $("#login-modal").activate();
}

async function loginSuccessful() {
    $("#login-modal").remove();

    await metadataHelper.loadStoredMetadata();
    await startApp();
}

function loginNotSuccessful(error) {
    $("#login-password-input").value = "";

    switch (error) {
        case ioHelper.loginStatus.USERHASINITIALPASSWORD:
            $("#login-text").textContent = "This is the first time you log in to the OpenEDC Server. Please choose a new secure password.";
            $("#login-confirm-password-input").parentNode.parentNode.show();
            $("#login-username-input").disabled = true;
            break;
        default:
            $("#login-incorrect-hint").show();
    }
}

function adjustUIToUser() {
    if (ioHelper.hasServerURL()) {
        const user = ioHelper.getLoggedInUser();
        if (!user.rights.includes(admindataHelper.userRights.PROJECTOPTIONS)) {
            $("#project-modal-button").disabled = true;
        }
        if (!user.rights.includes(admindataHelper.userRights.EDITMETADATA)) {
            if (getCurrentMode() == appModes.METADATA) metadataModule.hide();
            $("#metadata-toggle-button").disabled = true;
        }
        if (!user.rights.includes(admindataHelper.userRights.MANAGESUBJECTS)) {
            $("#subject-info-button").disabled = true;
        }
        if (!user.rights.includes(admindataHelper.userRights.VALIDATEFORMS)) {
            $("#form-validate-level").hide();
        }
        if (!user.rights.includes(admindataHelper.userRights.ADDSUBJECTDATA)) {
            $("#add-subject-input").disabled = true;
            $("#add-subject-button").disabled = true;
        }
        if (user.site) {
            $("#filter-site-select-inner").value = admindataHelper.getSiteNameByOID(user.site);
            $("#filter-site-select-inner").disabled = true;
        }
    } else {
        const user = admindataHelper.getUser(admindataHelper.getCurrentUserOID());
        const locationRef = user.querySelector("LocationRef");
        if (locationRef) $("#filter-site-select-inner").value = admindataHelper.getSiteNameByOID(locationRef.getAttribute("LocationOID"));
    }

    if (ioHelper.hasDecryptionKey()) $("#logout-button").show();
}

function showUninitializedHint() {
    ioHelper.showMessage(languageHelper.getTranslation("server-uninitialized"), languageHelper.getTranslation("server-uninitialized-hint"));
}

window.showForgotPasswordModal = function() {
    if (ioHelper.hasServerURL()) ioHelper.showMessage(languageHelper.getTranslation("forgot-password"), languageHelper.getTranslation("forgot-password-server-hint"));
    else ioHelper.showMessage(languageHelper.getTranslation("forgot-password"), languageHelper.getTranslation("forgot-password-encrypted-hint"));
}

window.newProject = function() {
    metadataHelper.loadEmptyProject();
    startApp();

    // Show the new project help message
    setTimeout(() => ioHelper.showMessage(languageHelper.getTranslation("new-project-title"), languageHelper.getTranslation("new-project-text")), 1000);
}

window.openODM = async function() {
    const file = $("#odm-open .file-input");
    const content = await ioHelper.getFileContent(file.files[0]);
    if (!content) return;

    const odmXMLString = validateODM(content);
    if (!odmXMLString) return;

    metadataHelper.importMetadata(odmXMLString);
    admindataHelper.importAdmindata(odmXMLString);
    await clinicaldataHelper.importClinicaldata(odmXMLString);
    startApp();
}

function validateODM(content) {
    try {
        return odmValidation.process(content);
    } catch (error) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), error);
        return;
    }
}

// Currently only adds metadata elements to an existing project but could also be used in the future to add clinical data to an existing project
window.importODM = async function() {
    const file = $("#odm-import .file-input");
    const content = await ioHelper.getFileContent(file.files[0]);
    if (!content) return;

    const odmXMLString = validateODM(content);
    if (!odmXMLString) return;

    mergeMetadataModels([odmXMLString]);

    hideProjectModal();
}

window.loadExample = async function() {
    await metadataHelper.loadExample();
    startApp();
}

window.showProjectModal = function() {
    metadataModule.removeArrowKeyListener();

    if (ioHelper.hasDecryptionKey()) {
        $("#project-modal #encryption-password-input").parentNode.parentNode.hide();
        $("#project-modal #data-encryption-warning").hide();
        $("#project-modal #data-encrypted-hint").show();
    }
    if (ioHelper.hasServerURL()) {
        $("#project-modal #server-url-input").parentNode.parentNode.hide();
        $("#project-modal #server-connected-hint").show();
    }

    $("#survey-code-input").value = ioHelper.getSurveyCode();
    $("#text-as-textarea-checkbox").checked = ioHelper.isTextAsTextarea();
    $("#auto-survey-view-checkbox").checked = ioHelper.isAutoSurveyView();
    $("#study-name-input").value = metadataHelper.getStudyName();
    $("#study-description-textarea").value = metadataHelper.getStudyDescription();
    $("#protocol-name-input").value = metadataHelper.getProtocolName();
    admindataModule.loadUsers();
    admindataModule.loadSites();

    ioHelper.hideMenu();

    $("#project-modal").activate();
}

window.hideProjectModal = function() {
    ioHelper.removeIsActiveFromElement($("#project-tabs ul li.is-active"));
    $("#general-options-tab").activate();
    $("#general-options").show();
    $("#users-options").hide();
    $("#sites-options").hide();
    $("#name-description").hide();
    $("#project-modal").deactivate();
    if (getCurrentMode() == appModes.METADATA) metadataModule.setArrowKeyListener();
}

window.projectTabClicked = function(event) {
    ioHelper.removeIsActiveFromElement($("#project-tabs ul li.is-active"));
    event.target.parentNode.activate();

    switch(event.target.parentNode.id) {
        case "general-options-tab":
            $("#general-options").show();
            $("#users-options").hide();
            $("#sites-options").hide();
            $("#name-description").hide();
            break;
        case "users-options-tab":
            $("#general-options").hide();
            $("#users-options").show();
            $("#sites-options").hide();
            $("#name-description").hide();
            break;
        case "sites-options-tab":
            $("#general-options").hide();
            $("#users-options").hide();
            $("#sites-options").show();
            $("#name-description").hide();
            break;
        case "name-description-tab":
            $("#general-options").hide();
            $("#users-options").hide();
            $("#sites-options").hide();
            $("#name-description").show();
    }
}

window.connectToServer = function() {
    const serverURL = $("#server-url-input").value;
    ioHelper.getServerStatus(serverURL)
        .then(serverStatus => {
            switch (serverStatus) {
                case ioHelper.serverStatus.SERVERNOTINITIALIZED:
                    $("#initialize-server-form").show();
                    $("#server-url-input").parentNode.parentNode.hide();
                    break;
                case ioHelper.serverStatus.SERVERINITIALIZED:
                    ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("server-initialized-hint"),
                        {
                            [languageHelper.getTranslation("open-server")]: () => window.location.href = "https://" + serverURL
                        }
                    );
            }
        })
        .catch(() => ioHelper.showMessage(languageHelper.getTranslation("Error"), languageHelper.getTranslation("server-not-found-error")));
}

window.initializeServer = function(event) {
    event.preventDefault();

    const username = $("#owner-username-input").value;
    const password = $("#owner-password-input").value;
    const confirmPassword = $("#owner-confirm-password-input").value;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        // TODO: This could be improved in the future -- passing the error to the languageHelper is not very nice
        ioHelper.showMessage(languageHelper.getTranslation("password-not-set"), languageHelper.getTranslation(credentials.error));
        return;
    }

    // Initialize the server, i.e., set the owner of the server with the entered data and transfer all data
    // The user account will be linked to the default/first user, which, in the most cases, is the only user since adding users is prohibited without a server connection
    const serverURL = $("#server-url-input").value;
    const userOID = admindataHelper.getCurrentUserOID();
    ioHelper.initializeServer(serverURL, userOID, credentials)
        .then(serverURL => window.location.replace(serverURL))
        .catch(error => ioHelper.showMessage(languageHelper.getTranslation("Error"), error));
}

window.encryptData = function() {
    if ($("#confirm-encryption-password-input").parentNode.parentNode.classList.contains("is-hidden")) {
        $("#confirm-encryption-password-input").parentNode.parentNode.show();
        return;
    }

    const username = admindataHelper.getCurrentUserOID();
    const password = $("#encryption-password-input").value;
    const confirmPassword = $("#confirm-encryption-password-input").value;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        // TODO: This could be improved in the future -- passing the error to the languageHelper is not very nice
        ioHelper.showMessage(languageHelper.getTranslation("password-not-set"), languageHelper.getTranslation(credentials.error));
        return;
    }

    ioHelper.encryptXMLData(credentials.password);
    logout();
}

window.setSurveyCode = function() {
    ioHelper.setSurveyCode($("#survey-code-input").value)
        .then(() => hideProjectModal())
        .catch(() => ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("survey-code-error")));
}

window.miscOptionClicked = function(event) {
    switch (event.target.id) {
        case "text-as-textarea-checkbox":
            ioHelper.setTextAsTextarea(event.target.checked);
            return;
        case "auto-survey-view-checkbox":
            ioHelper.setAutoSurveyView(event.target.checked);
    }
}

window.saveStudyNameDescription = function() {
    metadataHelper.setStudyName($("#study-name-input").value);
    metadataHelper.setStudyDescription($("#study-description-textarea").value);
    metadataHelper.setProtocolName($("#protocol-name-input").value);
    metadataHelper.storeMetadata();
    hideProjectModal();
    setTitles();
    if (getCurrentMode() == appModes.METADATA) metadataModule.setArrowKeyListener();
}

window.showRemoveDataModal = function(complete) {
    if (complete) {
        ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("remove-data-complete-warning"),
            {
                [languageHelper.getTranslation("remove")]: () => removeAllData()
            },
            ioHelper.callbackTypes.DANGER
        );
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("remove-data-clinicaldata-warning"),
            {
                [languageHelper.getTranslation("remove")]: () => removeClinicaldata()
            },
            ioHelper.callbackTypes.DANGER
        );
    }
}

window.showAboutModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#about-modal h2").textContent = languageHelper.getTranslation("version") + " " + appVersion;
    $("#about-modal").activate();

    ioHelper.hideMenu();
}

window.hideAboutModal = function() {
    $("#about-modal").deactivate();
    if (getCurrentMode() == appModes.METADATA) metadataModule.setArrowKeyListener();
}

window.exportODM = async function() {
    let odm = metadataHelper.prepareDownload(clinicaldataHelper.dataStatusTypes);

    let admindata = admindataHelper.getAdmindata(metadataHelper.getStudyOID());
    if (admindata) odm.querySelector("ODM").appendChild(admindata);

    let clinicaldata = await clinicaldataHelper.getClinicalData(metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID());
    if (clinicaldata) odm.querySelector("ODM").appendChild(clinicaldata);

    ioHelper.download(metadataHelper.getStudyName(), "xml", new XMLSerializer().serializeToString(odm));
}

window.exportODMMetadata = function() {
    const odm = metadataHelper.prepareDownload();
    ioHelper.download(metadataHelper.getStudyName()+"_metadata", "xml", new XMLSerializer().serializeToString(odm));
}

window.exportCSV = async function() {
    const csvHeaders = metadataHelper.getCSVHeaders();
    const csvData = await clinicaldataHelper.getCSVData(csvHeaders);
    const csvString = ioHelper.getCSVString(csvHeaders, csvData);

    ioHelper.download(metadataHelper.getStudyName()+"_clinicaldata", "csv", csvString);
}

window.removeAllData = async function() {
    if (ioHelper.hasServerURL()) {
        await clinicaldataHelper.removeClinicaldata();
        await metadataHelper.loadEmptyProject();
    } else {
        localStorage.clear();
    }

    logout();
}

window.removeClinicaldata = async function() {
    await clinicaldataHelper.removeClinicaldata();
    logout();
}

window.logout = function() {
    // Since the decryption key and the user's hashed password are only stored as a temporary variable, reloading the app equals a logout
    window.location.reload();
}

// IO or event listeners that are valid for the entire app and cannot be assigned to either the metadatamodule or clinicaldatamodule
export function setIOListeners() {
    $("body").onresize = ioHelper.setTreeMaxHeight;
    $(".navbar-burger").addEventListener("click", () => {
        $(".navbar-menu").classList.toggle("is-active");
        $(".navbar-burger").classList.toggle("is-active");
        $("#language-dropdown").classList.add("is-hidden-touch");
    });
    $("#current-language").addEventListener("click", () => {
        $("#language-navbar-item").classList.toggle("is-active");
        $("#language-dropdown").classList.toggle("is-hidden-touch");
    });
    $("#language-navbar-item").addEventListener("mouseenter", () => $("#language-navbar-item").classList.add("is-active"));
    $("#language-navbar-item").addEventListener("mouseleave", () => $("#language-navbar-item").classList.remove("is-active"));
}

function addModalsToDOM() {
    // TODO: This could be improved in the future by loading the modal js module files dynamically
    const modalNames = ["project", "more", "about", "close-clinicaldata", "subject", "survey-code"];
    for (let modalName of modalNames) {
        document.body.appendChild(document.createElement(modalName + "-modal"));
    }
}

function checkAppVersion() {
    // TODO: The following may used to show a reload prompt or offline message
    ioHelper.getAppVersion()
        .then(version => {
            if (version != appVersion) console.log("App is outdated.");
        })
        .catch(() => {
            if (ioHelper.hasServerURL()) console.log("App is offline.");
        });
}

async function handleURLSearchParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.toString()) return;

    // Get models from metadata repositories and merge them
    const repositoryHelper = await import("./helper/repositoryhelper.js");
    repositoryHelper.getModels(urlParams)
        .then(models => {
            if (!models) return;
            window.history.replaceState(null, appVersion, ioHelper.getBaseURL());
            
            if (getCurrentState() == appStates.EMPTY) mergeMetadataModels(models);
            else if (getCurrentState() == appStates.UNLOCKED) {
                ioHelper.showMessage(languageHelper.getTranslation("import-forms"), languageHelper.getTranslation("import-forms-merge-hint"),
                    {
                        [languageHelper.getTranslation("append-forms")]: () => mergeMetadataModels(models),
                        [languageHelper.getTranslation("remove-current-data")]: () => {
                            metadataHelper.removeMetadata();
                            clinicaldataHelper.removeClinicaldata();
                            mergeMetadataModels(models);
                    }
                });
            } else ioHelper.showMessage(languageHelper.getTranslation("Note"), languageHelper.getTranslation("forms-import-encrypted-hint"));
        })
        .catch(error => ioHelper.showMessage(languageHelper.getTranslation("Error"), languageHelper.getTranslation("forms-import-error")));
}

function mergeMetadataModels(models) {
    models.forEach(async model => {
        const odmXMLString = validateODM(model);
        if (odmXMLString) await metadataHelper.mergeMetadata(odmXMLString);
    });

    if (getCurrentState() == appStates.UNLOCKED) {
        reloadApp();
        reloadLanguageSelect();
    }
    else if (getCurrentState() == appStates.EMPTY) startApp();
}

function reloadApp() {
    if (getCurrentMode() == appModes.METADATA) {
        metadataModule.reloadTree();
        metadataModule.reloadDetailsPanel();
    } else if (getCurrentMode() == appModes.CLINICALDATA) {
        clinicaldataModule.cacheFormData();
        clinicaldataModule.reloadTree();
    }
}

function reloadLanguageSelect() {
    languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
    languageHelper.createLanguageSelect(getCurrentMode() == appModes.METADATA);
}

function getCurrentMode() {
    return $("#metadata-section").classList.contains("is-hidden") ? appModes.CLINICALDATA : appModes.METADATA;
}

function getCurrentState() {
    if ($("#start-modal").classList.contains("is-active")) return appStates.EMPTY;
    else if ($("#login-modal").classList.contains("is-active")) return appStates.LOCKED;
    else return appStates.UNLOCKED;
}
