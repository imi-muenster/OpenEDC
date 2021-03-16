import * as metadataModule from "./metadatamodule.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as admindataModule from "./admindatamodule.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as odmValidation from "./helper/odmvalidation.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";

const appVersion = "0.2.2";

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

    // Register serviceworker for offline capabilities
    if ("serviceWorker" in window.navigator) {
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
    await languageHelper.init();
    languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
    languageHelper.internationalize();
    
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

    // For performance purposes, add the remaining modals to the DOM only after the main app has been rendered
    addModalsToDOM();

    // After all, check the app version or whether the app is currently offline
    checkAppVersion();
}

const setTitles = () => {
    const studyName =  ioHelper.shortenText(metadataHelper.getStudyName(), 25);
    $("#study-title").textContent = studyName;
    $("head title").textContent = "OpenEDC – " + studyName;
}

function showStartModal() {
    metadataModule.removeArrowKeyListener();
    $("#start-modal").classList.add("is-active");
}

function hideStartModal() {
    $("#start-modal").classList.remove("is-active");
    metadataModule.setArrowKeyListener();
}

function showNavbar() {
    $(".navbar").classList.remove("is-hidden");
}

function showDecryptionKeyModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-username-input").parentNode.parentNode.classList.add("is-hidden");
    $("#remove-data-button").classList.remove("is-hidden");
    $("#login-title").textContent = "Data is encrypted";
    $("#login-text").textContent = "Please enter the password that you used for the data encryption.";
    $("#login-incorrect-hint .message-body").textContent = "The password is incorrect. Please try again.";

    // Set the click handler when clicking on the Open button
    $("#login-modal #open-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        const decryptionKey = $("#login-password-input").value;
        ioHelper.setDecryptionKey(decryptionKey)
            .then(() => loginSuccessful())
            .catch(error => loginNotSuccessful(error));
    };

    $("#login-modal").classList.add("is-active");
}

function showCloseExampleButton() {
    if (metadataHelper.getStudyName() == "Exemplary Project") $("#close-example-button").classList.remove("is-hidden"); 
}

function showLoginModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-title").textContent = "Please login";
    $("#login-text").textContent = "You are connected to an OpenEDC Server. Please login with your credentials.";
    $("#login-incorrect-hint .message-body").textContent = "The username or password is incorrect. Please try again.";

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
                ioHelper.showMessage("Password not set", credentials.error);
                return;
            }
            ioHelper.setOwnPassword(credentials)
                .then(loginSuccessful)
                .catch(error => ioHelper.showMessage("Password not set", error));
        }
    };

    $("#login-modal").classList.add("is-active");
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
            $("#login-confirm-password-input").parentNode.parentNode.classList.remove("is-hidden");
            $("#login-username-input").disabled = true;
            break;
        default:
            $("#login-incorrect-hint").classList.remove("is-hidden");
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
            $("#form-validate-level").classList.add("is-hidden");
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

    if (ioHelper.hasDecryptionKey()) $("#logout-button").classList.remove("is-hidden");
}

function showUninitializedHint() {
    ioHelper.showMessage("Server uninitialized", `This OpenEDC Server has not yet been initialized.<br><br>You can either go to <a target="_blank" href="https://openedc.org">openedc.org</a> to initialize this server with data that you have already locally captured there, or, alternatively, close this hint, start a new local project here, and initialize the server from here as well.<br><br>In both cases, use the <i>Project Options</i> button in the top right corner of the app and follow the instructions to initialize this server.`);
}

window.showForgotPasswordModal = function() {
    if (ioHelper.hasServerURL()) {
        ioHelper.showMessage("Forgot password", "All data within OpenEDC is stored and transferred end-to-end encrypted. Therefore, it is currently not possible to automatically reset a forgotten password, unfortunately.<br><br>If you forgot your password, please contact the person that gave you your login credentials. This person is able to reset your password with a new initial password.");
    } else {
        ioHelper.showMessage("Forgot password", "You encrypted all data within OpenEDC. Therefore, the stored data cannot be viewed or edited without your password.<br><br>If you forgot your password, you have to remove all data to use OpenEDC again, unfortunately.");
    }
}

window.newProject = function() {
    metadataHelper.loadEmptyProject();
    admindataHelper.loadEmptyProject(metadataHelper.getStudyOID());
    startApp();

    // Show the new project help message
    setTimeout(() => ioHelper.showMessage(languageHelper.getTranslation("new-project-title"), languageHelper.getTranslation("new-project-text")), 1000);
}

window.uploadODM = async function() {
    const file = $("#odm-upload .file-input");
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
        ioHelper.showMessage("Error", error);
        return;
    }
}

// Might be removed in the future for a more generic ODM import and merge function
window.uploadODMToServer = async function() {
    const file = $("#odm-upload-to-server .file-input");
    const content = await ioHelper.getFileContent(file.files[0]);
    if (!content) return;

    const odmXMLString = validateODM(content);
    if (!odmXMLString) return;

    await clinicaldataHelper.removeClinicaldata();

    metadataHelper.importMetadata(odmXMLString);
    await clinicaldataHelper.importClinicaldata(odmXMLString);
    reloadApp();
}

window.loadExample = async function() {
    await metadataHelper.loadExample();
    admindataHelper.loadEmptyProject(metadataHelper.getStudyOID());
    startApp();
}

window.showProjectModal = function() {
    metadataModule.removeArrowKeyListener();

    if (ioHelper.hasDecryptionKey()) {
        $("#project-modal #encryption-password-input").parentNode.parentNode.classList.add("is-hidden");
        $("#project-modal #data-encryption-warning").classList.add("is-hidden");
        $("#project-modal #data-encrypted-hint").classList.remove("is-hidden");
    }
    if (ioHelper.hasServerURL()) {
        $("#project-modal #server-url-input").parentNode.parentNode.classList.add("is-hidden");
        $("#project-modal #server-connected-hint").classList.remove("is-hidden");
        $("#odm-upload-to-server").classList.remove("is-hidden");
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

    $("#project-modal").classList.add("is-active");
}

window.hideProjectModal = function() {
    ioHelper.removeIsActiveFromElement($("#project-tabs ul li.is-active"));
    $("#general-options-tab").classList.add("is-active");
    $("#general-options").classList.remove("is-hidden");
    $("#users-options").classList.add("is-hidden");
    $("#sites-options").classList.add("is-hidden");
    $("#name-description").classList.add("is-hidden");
    $("#project-modal").classList.remove("is-active");
    if (getCurrentMode() == appModes.METADATA) metadataModule.setArrowKeyListener();
}

window.projectTabClicked = function(event) {
    ioHelper.removeIsActiveFromElement($("#project-tabs ul li.is-active"));
    event.target.parentNode.classList.add("is-active");

    switch(event.target.parentNode.id) {
        case "general-options-tab":
            $("#general-options").classList.remove("is-hidden");
            $("#users-options").classList.add("is-hidden");
            $("#sites-options").classList.add("is-hidden");
            $("#name-description").classList.add("is-hidden");
            break;
        case "users-options-tab":
            $("#general-options").classList.add("is-hidden");
            $("#users-options").classList.remove("is-hidden");
            $("#sites-options").classList.add("is-hidden");
            $("#name-description").classList.add("is-hidden");
            break;
        case "sites-options-tab":
            $("#general-options").classList.add("is-hidden");
            $("#users-options").classList.add("is-hidden");
            $("#sites-options").classList.remove("is-hidden");
            $("#name-description").classList.add("is-hidden");
            break;
        case "name-description-tab":
            $("#general-options").classList.add("is-hidden");
            $("#users-options").classList.add("is-hidden");
            $("#sites-options").classList.add("is-hidden");
            $("#name-description").classList.remove("is-hidden");
    }
}

window.connectToServer = function() {
    const serverURL = $("#server-url-input").value;
    ioHelper.getServerStatus(serverURL)
        .then(serverStatus => {
            switch (serverStatus) {
                case ioHelper.serverStatus.SERVERNOTINITIALIZED:
                    $("#initialize-server-form").classList.remove("is-hidden");
                    $("#server-url-input").parentNode.parentNode.classList.add("is-hidden");
                    break;
                case ioHelper.serverStatus.SERVERINITIALIZED:
                    ioHelper.showMessage("Server initialized", "The server has already been initialized.");
            }
        })
        .catch(() => ioHelper.showMessage("Server not found", "There could be no OpenEDC Server found for this URL."));
}

window.initializeServer = function(event) {
    event.preventDefault();

    const username = $("#owner-username-input").value;
    const password = $("#owner-password-input").value;
    const confirmPassword = $("#owner-confirm-password-input").value;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        ioHelper.showMessage("Account not created", credentials.error);
        return;
    }

    // Initialize the server, i.e., set the owner of the server with the entered data and transfer all data
    // The user account will be linked to the default/first user, which, in the most cases, is the only user since adding users is prohibited without a server connection
    const serverURL = $("#server-url-input").value;
    const userOID = admindataHelper.getCurrentUserOID();
    ioHelper.initializeServer(serverURL, userOID, credentials)
        .then(serverURL => window.location.replace(serverURL))
        .catch(error => ioHelper.showMessage("Account not created", error));
}

window.encryptData = function() {
    if ($("#confirm-encryption-password-input").parentNode.parentNode.classList.contains("is-hidden")) {
        $("#confirm-encryption-password-input").parentNode.parentNode.classList.remove("is-hidden");
        return;
    }

    const username = admindataHelper.getCurrentUserOID();
    const password = $("#encryption-password-input").value;
    const confirmPassword = $("#confirm-encryption-password-input").value;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        ioHelper.showMessage("Data not encrypted", credentials.error);
        return;
    }

    ioHelper.encryptXMLData(credentials.password);
    logout();
}

window.setSurveyCode = function() {
    ioHelper.setSurveyCode($("#survey-code-input").value)
        .then(() => hideProjectModal())
        .catch(() => ioHelper.showMessage("Survey code not set", "The survey code could not be set. Enter a 4-digit numerical code."));
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
    metadataModule.setArrowKeyListener();
}

window.showRemoveDataModal = function(complete) {
    if (complete) {
        ioHelper.showMessage(
            "Remove all data",
            "Do you really want to remove all data? This cannot be undone.",
            { "Remove": () => removeAllData() },
            ioHelper.callbackTypes.DANGER
        );
    } else {
        ioHelper.showMessage(
            "Remove clinical data",
            "Do you really want to remove all clinical data? This cannot be undone.",
            { "Remove": () => removeClinicaldata() },
            ioHelper.callbackTypes.DANGER
        );
    }
}

window.showAboutModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#about-modal h2").textContent = "Version " + appVersion;
    $("#about-modal").classList.add("is-active");

    ioHelper.hideMenu();
}

window.hideAboutModal = function() {
    $("#about-modal").classList.remove("is-active");
    if (getCurrentMode() == appModes.METADATA) metadataModule.setArrowKeyListener();
}

window.downloadODM = async function() {
    let odm = metadataHelper.prepareDownload(clinicaldataHelper.dataStatusTypes);

    let admindata = admindataHelper.getAdmindata();
    if (admindata) odm.querySelector("ODM").appendChild(admindata);

    let clinicaldata = await clinicaldataHelper.getClinicalData(metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID());
    if (clinicaldata) odm.querySelector("ODM").appendChild(clinicaldata);

    ioHelper.download(metadataHelper.getStudyName()+".xml", new XMLSerializer().serializeToString(odm));
}

window.downloadODMMetadata = function() {
    const odm = metadataHelper.prepareDownload();
    ioHelper.download(metadataHelper.getStudyName()+"_metadata.xml", new XMLSerializer().serializeToString(odm));
}

window.downloadCSV = async function() {
    const csvHeaders = metadataHelper.getCSVHeaders();
    const csvData = await clinicaldataHelper.getCSVData(csvHeaders);
    const csvString = ioHelper.getCSVString(csvHeaders, csvData);

    ioHelper.download(metadataHelper.getStudyName()+"_clinicaldata.csv", csvString);
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

    languageHelper.internationalize();
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
            else if (getCurrentState() == appStates.EMPTY) mergeMetadataModels(models);
            else if (getCurrentState() == appStates.UNLOCKED) {
                ioHelper.showMessage("Note", "You want to load forms from a metadata repository but already have forms. Do you want to add the new forms, replace the current ones, or not load the new forms at all?", {
                    "Add": () => mergeMetadataModels(models),
                    "Replace": () => {
                        localStorage.clear();
                        mergeMetadataModels(models);
                    }
                });
            }
        })
        .catch(error => ioHelper.showMessage("Error", `Could not load model from external repository. The error was ${error}`));
}

function mergeMetadataModels(models) {
    models.forEach(model => {
        const odmXMLString = validateODM(model);
        if (odmXMLString) metadataHelper.mergeMetadata(odmXMLString);
    });
    reloadApp();
}

function reloadApp() {
    if (getCurrentMode() == appModes.METADATA) {
        metadataModule.reloadTree();
        metadataModule.reloadDetailsPanel();
    } else if (getCurrentMode() == appModes.CLINICALDATA) {
        clinicaldataModule.cacheFormData();
        clinicaldataModule.reloadTree();
    } else startApp();
}

function getCurrentMode() {
    return $("#metadata-section").classList.contains("is-hidden") ? appModes.CLINICALDATA : appModes.METADATA;
}

function getCurrentState() {
    if ($("#start-modal").classList.contains("is-active")) return appStates.EMPTY;
    else if ($("#login-modal").classList.contains("is-active")) return appStates.LOCKED;
    else return appStates.UNLOCKED;
}
