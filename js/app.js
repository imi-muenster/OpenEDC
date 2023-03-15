import * as metadataModule from "./metadatamodule.js";
import * as metadataWrapper from "./odmwrapper/metadatawrapper.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataWrapper from "./odmwrapper/clinicaldatawrapper.js";
import * as reportsModule from "./reportsmodule.js";
import * as admindataModule from "./admindatamodule.js";
import * as admindataWrapper from "./odmwrapper/admindatawrapper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as odmConverter from "./converter/odmconverter.js";
import * as csvConverter from "./converter/csvconverter.js";
import * as pluginRegistrar from "../plugins/registrar.js";
import * as manifestHelper from "./helper/manifesthelper.js";
import * as repositoryHelper from "./helper/repositoryhelper.js";

const appVersion = "0.8.1";

export const appModes = {
    METADATA: "metadata",
    CLINICALDATA: "clinicaldata",
    REPORTS: "reports"
};

const appStates = {
    EMPTY: "empty",
    LOCKED: "locked",
    UNLOCKED: "unlocked"
}

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

ioHelper.addGlobalEventListener("DOMContentLoaded", async () => {
    // If index.html is requested, redirect to the base url
    if (window.location.pathname.includes("/index.html")) {
        window.location.replace(ioHelper.getBaseURL().replace("/index.html", ""));
    }

    // Insert dynamic manifest link to address subfolders
    manifestHelper.addManifest();

    // Initialize the language helper and localize the application
    await languageHelper.init();
    languageHelper.localize();

    metadataWrapper.loadPossibleOpenEDCSettings();

    // Check if this app might be served from an OpenEDC Server instance and then show the login modal accordingly
    await ioHelper.init()
        .then(serverStatus => {
            if (serverStatus == ioHelper.serverStatus.SERVERINITIALIZED) showLoginModal();
            else if (serverStatus == ioHelper.serverStatus.SERVERNOTINITIALIZED) showUninitializedHint();
            else if (serverStatus == ioHelper.serverStatus.SERVERNOTFOUND) console.log("No OpenEDC Server found. It seems that this is a standalone OpenEDC App.");
        });

    // Initialize the application
    await metadataWrapper.loadStoredMetadata()
    .then(async () => {
        await startApp();
        handleURLSearchParameters();
    })
    .catch(error => {
        console.log(error);
        if (error.code == ioHelper.loadXMLExceptionCodes.NODATAFOUND && !ioHelper.hasServerURL()) showStartModal();
        else if (error.code == ioHelper.loadXMLExceptionCodes.DATAENCRYPTED) showDecryptionKeyModal();
    });


    // Register service worker for offline capabilities
    const developmentOrigins = ["localhost", "127.0.0.1", "dev.openedc.org"];
    const enableServiceWorker = !developmentOrigins.some(origin => window.location.origin.includes(origin));
    if (enableServiceWorker && window.navigator.serviceWorker) {
        window.navigator.serviceWorker.register("./serviceworker.js");
    }
});

ioHelper.addGlobalEventListener("LanguageChanged", () => {
    reloadApp({ cacheFormData: true });
    ioHelper.hideMenu();
});

ioHelper.addGlobalEventListener("CurrentSubjectEdited", () => {    
    reloadApp();
});

ioHelper.addGlobalEventListener("CurrentUserEdited", () => {    
    adjustUIToUser();
});

const startApp = async () => {
    await ioHelper.loadSettings();
    languageHelper.populatePresentLanguages(metadataWrapper.getMetadata());
    await languageHelper.setInitialLocale();
    
    await metadataModule.init();
    await admindataModule.init();
    await clinicaldataModule.init();
    // Last UI adjustments
    setTitles();
    hideStartModal();
    showNavbar();
    showCloseExampleButton();
    showSubjectKeyModeElement();
    adjustUIToUser();
    setIOListeners();

    // If there is at least one study event, automatically open the clinicaldata module
    enableMode(metadataWrapper.getStudyEvents().length ? appModes.CLINICALDATA : appModes.METADATA);

    // For performance purposes, add remaining modals to DOM after main app has been rendered
    addModalsToDOM();

    // Localize application after remaining modals were added to DOM
    languageHelper.localize();

    // Only required because of a bug in Safari (selects without a value show a value if the textContent of their option elements is changed -- which happens during localize())
    if (getCurrentMode() == appModes.METADATA) metadataModule.reloadDetailsPanel();

    // After all, check app version, subscribe to server updates, and enable plugins
    checkAppVersion();
    subscribeToServerUpdates();
    reportsModule.init();
    pluginRegistrar.enablePlugins(metadataWrapper.loadSettings);
}

const setTitles = () => {
    $("#study-title").textContent = metadataWrapper.getStudyName();
    $("head title").textContent = "OpenEDC – " + metadataWrapper.getStudyName();
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
    $("#login-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        clickEvent.target.showLoading();
        const password = $("#login-password-input").value;
        ioHelper.setDecryptionKey(password)
            .then(() => loginSuccessful())
            .catch(error => loginNotSuccessful(error));
    };

    $("#login-modal").activate();
}

function showCloseExampleButton() {
    if (metadataWrapper.getStudyName() == languageHelper.getTranslation("exemplary-project")) $("#close-example-button").show(); 
}

function showLoginModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-title").textContent = languageHelper.getTranslation("please-login");
    $("#login-text").textContent = languageHelper.getTranslation("please-login-text");
    $("#login-incorrect-hint .message-body").textContent = languageHelper.getTranslation("username-password-incorrect-error");

    // Set the click handler when clicking on the open button
    $("#login-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        clickEvent.target.showLoading();
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
                clickEvent.target.hideLoading();
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
    $("login-modal").remove();

    await metadataWrapper.loadStoredMetadata();
    await startApp();
}

function loginNotSuccessful(error) {
    $("#login-password-input").value = "";
    $("#login-button").hideLoading();

    switch (error) {
        case ioHelper.loginStatus.USERHASINITIALPASSWORD:
            $("#login-text").textContent = languageHelper.getTranslation("first-login-text");
            $("#login-confirm-password-input").parentNode.parentNode.show();
            $("#login-username-input").disabled = true;
            break;
        default:
            $("#login-incorrect-hint").show();
    }
}

function adjustUIToUser() {
    // TODO: Refactor with new User class from admindataWrapper / ioHelper
    if (ioHelper.hasServerURL()) {
        if (!ioHelper.userHasRight(ioHelper.userRights.PROJECTOPTIONS)) {
            $("#project-modal-button").hide();
        }
        if (!ioHelper.userHasRight(ioHelper.userRights.EDITMETADATA)) {
            if (getCurrentMode() == appModes.METADATA) metadataModule.hide();
            $("#metadata-mode-button").hide();
        }
        if (!ioHelper.userHasRight(ioHelper.userRights.MANAGESUBJECTS)) {
            $("#subject-info-button").hide();
        }
        if (!ioHelper.userHasRight(ioHelper.userRights.VALIDATEFORMS)) {
            $("#form-validate-level").hide();
        }
        if (!ioHelper.userHasRight(ioHelper.userRights.ADDSUBJECTDATA)) {
            $("#add-subject-input").disabled = true;
            $$(".subject-key-mode-element .button").forEach(button => button.disabled = true);
        }
        if (!ioHelper.userHasRight(ioHelper.userRights.EXPORTDATA) && !ioHelper.userHasRight(ioHelper.userRights.PROJECTOPTIONS)) {
            $("#export-modal-button").hide();
        }
        if (ioHelper.getLoggedInUser().site) {
            $("#filter-site-select-inner").value = admindataWrapper.getSiteNameByOID(ioHelper.getLoggedInUser().site);
            $("#filter-site-select-inner").disabled = true;
        }
        $("#logout-button-name").textContent = admindataWrapper.getUserFullName(ioHelper.getLoggedInUser().oid);
    } else {      
        const siteOID = admindataWrapper.getCurrentUserSiteOID();
        if (siteOID) $("#filter-site-select-inner").value = admindataWrapper.getSiteNameByOID(siteOID);
        $("#logout-button-name").textContent = admindataWrapper.getUserFullName(admindataWrapper.getCurrentUserOID());
    }

    if (ioHelper.hasDecryptionKey()) $("#logout-button").show();
}

function showUninitializedHint() {
    ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("server-uninitialized-hint"));
}

window.showForgotPasswordModal = function() {
    if (ioHelper.hasServerURL()) ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("forgot-password-server-hint"));
    else ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("forgot-password-encrypted-hint"));
}

window.newProject = function() {
    metadataWrapper.loadEmptyProject();
    startApp();

    // Show the new project help message
    if (!ioHelper.isMobile()) ioHelper.showToast(languageHelper.getTranslation("new-project-hint"));
}

window.openODM = async function() {
    // Animate loading process
    $("#open-odm-button .button").showLoading();

    const file = $("#open-odm-button .file-input");
    const content = await ioHelper.getFileContent(file.files[0]);
    const odmXMLString = validateODM(content);
    if (odmXMLString) {
        metadataWrapper.importMetadata(odmXMLString);
        admindataWrapper.importAdmindata(odmXMLString);
        await clinicaldataWrapper.importClinicaldata(odmXMLString);
        startApp();
    }

    // Remove loading animation
    $("#open-odm-button .button").hideLoading();
}

function validateODM(content) {
    try {
        return odmConverter.validateImport(content);
    } catch (error) {
        ioHelper.showMessage(languageHelper.getTranslation("error"), error);
        return;
    }
}

window.importODMMetadata = async function() {
    const files = Array.from($("#odm-import-metadata .file-input").files);
    const contents = await Promise.all(files.map(file => ioHelper.getFileContent(file)));
    if (!contents.length) return;

    mergeMetadataModels(contents);
    hideProjectModal();
}

window.importODMClinicaldata = async function() {
    const files = Array.from($("#odm-import-clinicaldata .file-input").files);
    const contents = await Promise.all(files.map(file => ioHelper.getFileContent(file)));
    if (!contents.length) return;

    mergeClinicaldataModels(contents);
    hideProjectModal();
}

window.loadExample = async function() {
    await metadataWrapper.loadExample();
    startApp();

    // Show the exemplary project help message
    if (!ioHelper.isMobile()) ioHelper.showToast(languageHelper.getTranslation("exemplary-project-hint"), 30000);
}

window.openMDMLoadDialog = async function(mergeStatus) {
    let mdmModal = document.createElement('mdm-modal');
    mdmModal.setMergeStatus(mergeStatus);
    if (!$("#mdm-modal")) document.body.appendChild(mdmModal);
    $('#mdm-modal').activate();
    languageHelper.localize();
}

window.importFromMDMPortal = async function(mergeStatus) {

    const id = $('#load-from-mdm-input').value;
    $('#mdm-modal').remove();
    let odmXMLString = await repositoryHelper.getModelbyId(id).catch((e) => {
        ioHelper.showToast(languageHelper.getTranslation(e), 5000, ioHelper.interactionTypes.DANGER)
    });
    
    odmXMLString = validateODM(odmXMLString);
    if (odmXMLString) {
        if(mergeStatus) {
            mergeMetadataModels([odmXMLString]);
            hideProjectModal();
        }
        else {
            metadataWrapper.importMetadata(odmXMLString);
            admindataWrapper.importAdmindata(odmXMLString);
            await clinicaldataWrapper.importClinicaldata(odmXMLString);
            startApp();
        }
    }
}

window.showExportDataModal = function() {
    $('#export-modal').activate();
}

window.hideExportModal = function() {
    $('#export-modal').deactivate();
}

window.showProjectModal = function() {
    const disabledEncryption = ioHelper.getSetting("disableEncryption");
    if (ioHelper.hasDecryptionKey() || ioHelper.hasServerURL()) {
        $("#project-modal #encryption-password-input").parentNode.parentNode.hide();
        $("#project-modal #data-encryption-warning").hide();
        $(`#project-modal #data-${disabledEncryption ? 'not-' : ''}encrypted-hint`).show();
    }
    if (ioHelper.hasServerURL()) {
        $("#project-modal #server-url-input").parentNode.parentNode.hide();
        $("#project-modal #server-connect-no-encryption").parentNode.hide();
        $("#project-modal #server-connected-hint").show();
    }

    if(disabledEncryption || !ioHelper.hasServerURL()) {
        $('#deactivate-encryption-button').parentNode.hide(); 
    }

    const subjectKeyModeRadio = $(`#${ioHelper.getSetting("subjectKeyMode")}`);
    if (subjectKeyModeRadio) subjectKeyModeRadio.checked = true;

    $("#survey-code-input").value = ioHelper.getSetting("surveyCode");
    $("#show-as-likert").checked = ioHelper.getSetting("showLikertScale");
    $("#likert-scale-limit-input").value = ioHelper.getSetting("likertScaleLimit")??'';
    $("#show-element-name").checked = ioHelper.getSetting("showElementName");
    $("#text-as-textarea-checkbox").checked = ioHelper.getSetting("textAsTextarea");
    $("#auto-survey-view-checkbox").checked = ioHelper.getSetting("autoSurveyView");
    $("#study-name-input").value = metadataWrapper.getStudyName();
    $("#study-description-textarea").value = metadataWrapper.getStudyDescription();
    $("#protocol-name-input").value = metadataWrapper.getProtocolName();
    admindataModule.loadUsers();
    admindataModule.loadSites();

    ioHelper.hideMenu();

    $("#project-modal").activate();
}

window.hideProjectModal = function() {
    $("#project-tabs ul li.is-active")?.deactivate();
    $("#general-options-tab").activate();
    $("#general-options").show();
    $("#users-options").hide();
    $("#sites-options").hide();
    $("#name-description").hide();
    $("#project-modal").deactivate();
}

window.projectTabClicked = function(event) {
    $("#project-tabs ul li.is-active")?.deactivate();
    event.target.parentNode.activate();

    switch (event.target.parentNode.id) {
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
                            [languageHelper.getTranslation("open-server")]: () => window.location.href = serverURL
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
    const disableEncryption = $("#server-connect-no-encryption").checked;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        // TODO: This could be improved in the future -- passing the error to the languageHelper is not very nice
        ioHelper.showMessage(languageHelper.getTranslation("password-not-set"), languageHelper.getTranslation(credentials.error));
        return;
    }

    // Initialize the server, i.e., set the owner of the server with the entered data and transfer all data
    // The user account will be linked to the default/first user, which, in the most cases, is the only user since adding users is prohibited without a server connection
    const serverURL = $("#server-url-input").value;
    const userOID = admindataWrapper.getCurrentUserOID();
    event.target.showLoading();
    ioHelper.initializeServer(serverURL, userOID, credentials, disableEncryption)
        .then(serverURL => window.location.replace(serverURL))
        .catch(() => event.target.hideLoading());
}

window.encryptData = function(event) {
    if (!$("#confirm-encryption-password-input").parentNode.parentNode.isVisible()) {
        $("#confirm-encryption-password-input").parentNode.parentNode.show();
        return;
    }

    const username = admindataWrapper.getCurrentUserOID();
    const password = $("#encryption-password-input").value;
    const confirmPassword = $("#confirm-encryption-password-input").value;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        // TODO: This could be improved in the future -- passing the error to the languageHelper is not very nice
        ioHelper.showMessage(languageHelper.getTranslation("password-not-set"), languageHelper.getTranslation(credentials.error));
        return;
    }

    event.target.showLoading();
    ioHelper.encryptXMLData(credentials.password)
        .then(() => window.location.reload())
        .catch(() => event.target.hideLoading());
}

window.showDeactivateEncryptionDialog = () => {
    ioHelper.showMessage(languageHelper.getTranslation('deactivate-encryption'), languageHelper.getTranslation('deactivate-encryption-hint'), 
    {
        [languageHelper.getTranslation('deactivate')] : () => deactivateEncryption()
    })
}

const deactivateEncryption = async () => {
    
    await clinicaldataWrapper.deactivateEncryptionForSubjects();
    console.log("clinicaldata stored");
    await ioHelper.deactivateServerEncryption();
    await metadataWrapper.storeMetadata();
    console.log("metadata stored");
    await admindataWrapper.storeAdmindata();
    console.log("admindata stored");
    ioHelper.showToast(languageHelper.getTranslation('deactivate-encryption-successful'))
    $('#deactivate-encryption-button').parentNode.hide(); 
    $(`#project-modal #data-encrypted-hint`).hide();
    $(`#project-modal #data-not-encrypted-hint`).show();

}

window.setSurveyCode = function() {
    const surveyCode = $("#survey-code-input").value;
    if (surveyCode.length == 0 || (parseInt(surveyCode) == surveyCode && surveyCode.length == 4)) {
        ioHelper.setSetting("surveyCode", surveyCode);
        hideProjectModal();
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("survey-code-error"));
    }
}

window.setLikertScaleLimit = function() {
    const limit = $("#likert-scale-limit-input").value;
    if (limit.length == 0 || parseInt(limit) == limit) {
        ioHelper.setSetting("likertScaleLimit", limit);
        ioHelper.showToast(languageHelper.getTranslation('forms-saved-hint'), 4000, ioHelper.interactionTypes.SUCCESS);
        reloadApp();
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("likert-limit-error"));
    }
}

// TODO: Make more generic by removing switch-statement and use checkbox ids as setting keys instead
window.miscOptionClicked = async function(event) {
    switch (event.target.id) {
        case "show-element-name":
            await ioHelper.setSetting("showElementName", event.target.checked);
            break;
        case "show-as-likert":
            await ioHelper.setSetting("showLikertScale", event.target.checked);
            break;
        case "text-as-textarea-checkbox":
            await ioHelper.setSetting("textAsTextarea", event.target.checked);
            break;
        case "auto-survey-view-checkbox":
            await ioHelper.setSetting("autoSurveyView", event.target.checked);
    }

    reloadApp();
}

window.subjectKeyModeClicked = function(event) {
    ioHelper.setSetting("subjectKeyMode", event.target.id);
    showSubjectKeyModeElement();
}

function showSubjectKeyModeElement() {
    $$(".subject-key-mode-element").forEach(button => button.hide());
    $(`#${ioHelper.getSetting("subjectKeyMode")}-element`)?.parentNode.show();
}

window.saveStudyNameDescription = function() {
    metadataWrapper.setStudyName($("#study-name-input").value);
    metadataWrapper.setStudyDescription($("#study-description-textarea").value);
    metadataWrapper.setProtocolName($("#protocol-name-input").value);
    metadataWrapper.storeMetadata();
    hideProjectModal();
    setTitles();
}

window.showRemoveDataModal = function(complete) {
    if (complete) {
        ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("remove-data-complete-warning"),
            {
                [languageHelper.getTranslation("remove")]: () => removeAllData()
            },
            ioHelper.interactionTypes.DANGER
        );
    } else {
        ioHelper.showMessage(languageHelper.getTranslation("please-confirm"), languageHelper.getTranslation("remove-data-clinicaldata-warning"),
            {
                [languageHelper.getTranslation("remove")]: () => removeClinicaldata()
            },
            ioHelper.interactionTypes.DANGER
        );
    }
}

window.showLogoutMessage = function() {
    ioHelper.showMessage(languageHelper.getTranslation("logout"), languageHelper.getTranslation("logout-question"), {
        [languageHelper.getTranslation("logout")]: () => window.location.reload()
    });
}

window.showAboutModal = function() {
    $("#about-modal h2").textContent = languageHelper.getTranslation("version") + " " + appVersion;
    $("#about-modal").activate();

    ioHelper.hideMenu();
}

window.hideAboutModal = function() {
    $("#about-modal").deactivate();
}

window.exportODM = async function() {
    
    if(! await checkDownloadIsAllowed()) return;

    let odm = metadataWrapper.prepareDownload(clinicaldataWrapper.dataStatusTypes);

    let admindata = admindataWrapper.getAdmindata(metadataWrapper.getStudyOID());
    if (admindata) odm.querySelector("ODM").appendChild(admindata);

    let clinicaldata = await clinicaldataWrapper.getClinicalData(metadataWrapper.getStudyOID(), metadataWrapper.getMetaDataVersionOID());
    if (clinicaldata) odm.querySelector("ODM").appendChild(clinicaldata);

    ioHelper.download(metadataWrapper.getStudyName(), "xml", new XMLSerializer().serializeToString(odm));
}

window.exportODMMetadata = async function() {
     if(! await checkDownloadIsAllowed()) return;
    const odm = metadataWrapper.prepareDownload();
    ioHelper.download(metadataWrapper.getStudyName()+"_metadata", "xml", new XMLSerializer().serializeToString(odm));
}

window.exportCSV = async function() {
    if(! await checkDownloadIsAllowed()) return;
    ioHelper.download(metadataWrapper.getStudyName()+"_clinicaldata", "csv", await csvConverter.getCSVString());
}

window.exportCSVZip = async function() {
    if(! await checkDownloadIsAllowed()) return;

    ioHelper.downloadAsZip(metadataWrapper.getStudyName()+"_clinicaldata", await csvConverter.getSeparatedCSVFiles())
}

async function checkDownloadIsAllowed() {
    const isAllowed = await ioHelper.userHasRight(ioHelper.userRights.EXPORTDATA);
    if(!isAllowed) {
        ioHelper.showToast(languageHelper.getTranslation('export-not-allowed'), 4000, ioHelper.interactionTypes.DANGER);
        return false;
    }
    return true;
}

window.removeAllData = async function() {
    if (ioHelper.hasServerURL()) {
        await clinicaldataWrapper.removeClinicaldata();
        await metadataWrapper.loadEmptyProject();
    } else {
        await ioHelper.removeAllLocalData();
    }

    window.location.reload();
}

window.removeClinicaldata = async function() {
    await clinicaldataWrapper.removeClinicaldata();
    window.location.reload();
}

// IO or event listeners that are valid for the entire app and cannot be assigned to either the metadatamodule or clinicaldatamodule
export function setIOListeners() {
    // Toggle buttons between metadata, clinical data, and reports module
    $("#metadata-mode-button").onclick = () => enableMode(appModes.METADATA);
    $("#clinicaldata-mode-button").onclick = () => enableMode(appModes.CLINICALDATA);
    $("#reports-mode-button").onclick = () => enableMode(appModes.REPORTS);
    $("#app-mode-button .dropdown-trigger").addEventListener("click", () => $("#app-mode-button").classList.toggle("is-active"));
    $("#app-mode-button").addEventListener("mouseenter", () => $("#app-mode-button").activate());
    $("#app-mode-button").addEventListener("mouseleave", () => $("#app-mode-button").deactivate());

    // Further auxiliary input listeners
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
    $("#language-navbar-item").addEventListener("mouseenter", () => $("#language-navbar-item").activate());
    $("#language-navbar-item").addEventListener("mouseleave", () => $("#language-navbar-item").deactivate());
}

export function enableMode(mode) {
    if (clinicaldataModule.safeCloseClinicaldata(() => enableMode(mode))) return;

    $("#metadata-section").hide();
    $("#clinicaldata-section").hide();
    $("#reports-section").hide();
    $("#metadata-mode-button").show();
    $("#clinicaldata-mode-button").show();
    $("#reports-mode-button").show();

    switch (mode) {
        case appModes.METADATA:
            $("#current-app-mode").textContent = languageHelper.getTranslation("form-design");
            $("#current-app-mode").setAttribute("i18n", "form-design");
            $("#app-mode-button .icon i").className = "fa-solid fa-drafting-compass";
            $("#metadata-section").show();
            $("#metadata-mode-button").hide();
            clinicaldataModule.adjustMobileUI(true);
            metadataModule.show();
            break;
        case appModes.CLINICALDATA:
            $("#current-app-mode").textContent = languageHelper.getTranslation("data-collection");
            $("#current-app-mode").setAttribute("i18n", "data-collection");
            $("#app-mode-button .icon i").className = "fa-solid fa-stethoscope";
            $("#clinicaldata-section").show();
            $("#clinicaldata-mode-button").hide();
            clinicaldataModule.show();
            break;
        case appModes.REPORTS:
            $("#current-app-mode").textContent = languageHelper.getTranslation("report-view");
            $("#current-app-mode").setAttribute("i18n", "report-view");
            $("#app-mode-button .icon i").className = "fa-solid fa-chart-pie";
            $("#reports-section").show();
            $("#reports-mode-button").hide();
            clinicaldataModule.adjustMobileUI(true);
            reportsModule.show();
    }

    ioHelper.hideMenu();
    ioHelper.dispatchGlobalEvent("ModeEnabled", mode);
}

function addModalsToDOM() {
    // TODO: This could be improved in the future by importing the modal js module files dynamically in the respective files
    const modalNames = ["project", "about", "subject", "survey-code", "export"];
    for (let modalName of modalNames) {
        document.body.appendChild(document.createElement(modalName + "-modal"));
    }
}

function checkAppVersion() {
    ioHelper.getAppVersion()
        .then(version => {
            if (version != appVersion) ioHelper.showToast(languageHelper.getTranslation("app-outdated-hint"), 10000, ioHelper.interactionTypes.WARNING);
        })
        .catch(() => {
            if (ioHelper.hasServerURL()) ioHelper.showToast(languageHelper.getTranslation("app-offline-hint"), 10000, ioHelper.interactionTypes.WARNING);
        });
}

async function handleURLSearchParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.toString()) return;

    // Get models from metadata repositories and merge them
    const repositoryHelper = await import("./helper/repositoryhelper.js");
    await repositoryHelper.getModels(urlParams)
        .then(models => {
            if (!models) return;
             
            if (getCurrentState() == appStates.EMPTY) mergeMetadataModels(models);
            else if (getCurrentState() == appStates.UNLOCKED) {
                ioHelper.showMessage(languageHelper.getTranslation("import-forms"), languageHelper.getTranslation("import-forms-merge-hint"),
                    {
                        [languageHelper.getTranslation("append-forms")]: () => mergeMetadataModels(models),
                        [languageHelper.getTranslation("remove-current-data")]: () => {
                            metadataWrapper.removeMetadata();
                            clinicaldataWrapper.removeClinicaldata();
                            mergeMetadataModels(models);
                            setTitles();
                    }
                }, null, null, null, null, true);
            } else ioHelper.showMessage(languageHelper.getTranslation("Note"), languageHelper.getTranslation("forms-import-encrypted-hint"));
        })
        .catch(error => ioHelper.showMessage(languageHelper.getTranslation("Error"), languageHelper.getTranslation("forms-import-error")));
    repositoryHelper.preloadPage(urlParams);
    window.history.replaceState(null, appVersion, ioHelper.getBaseURL());
}

function mergeMetadataModels(models) {
    models.forEach(async model => {
        const odmXMLString = validateODM(model);
        if (odmXMLString) await metadataWrapper.mergeMetadata(odmXMLString);
    });

    if (getCurrentState() == appStates.UNLOCKED) {
        reloadApp();
        reloadLanguageSelect();
    }
    else if (getCurrentState() == appStates.EMPTY) startApp();
}

// Very rudimentary implementation. In the future, it should be possible to merge data for an existing patient
async function mergeClinicaldataModels(models) {
    models.forEach(async model => {
        const odmXMLString = validateODM(model);
        await clinicaldataWrapper.importClinicaldata(odmXMLString);
    });

    await clinicaldataWrapper.loadSubjects();
    reloadApp();
}

async function reloadApp(options) {
    if (options && options.reloadMetadata) await metadataWrapper.loadStoredMetadata();

    if (getCurrentMode() == appModes.METADATA) {
        metadataModule.reloadTree();
        metadataModule.reloadDetailsPanel();
    } else if (getCurrentMode() == appModes.CLINICALDATA) {
        if (options && options.cacheFormData) clinicaldataModule.cacheFormData();
        clinicaldataModule.loadSubjectKeys();
        clinicaldataModule.reloadTree();
    } else if (getCurrentMode() == appModes.REPORTS) {
        reportsModule.reload();
    }
}

function reloadLanguageSelect() {
    languageHelper.populatePresentLanguages(metadataWrapper.getMetadata());
    languageHelper.createLanguageSelect(getCurrentMode() == appModes.METADATA);
}

// Currently, updates are reloaded every 5 seconds -- this should be improved in the future by means of a websocket or server-sent events
async function subscribeToServerUpdates() {
    if (!ioHelper.hasServerURL()) return;
    const lastHintShowed = {};

    setInterval(async () => {
        if (clinicaldataModule.surveyViewIsActive()) return;
        const lastUpdate = await ioHelper.getLastServerUpdate();

        // Test whether the metadata was updated
        if (metadataWrapper.getLastUpdate() != lastUpdate.metadata && lastHintShowed.metadata != lastUpdate.metadata) {
            ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("metadata-reload-question"),
                {
                    [languageHelper.getTranslation("reload")]: () => reloadApp({ reloadMetadata: true })
                }
            );
            lastHintShowed.metadata = lastUpdate.metadata;
        };

        // Test whether the clinicaldata was updated
        if (clinicaldataWrapper.getLastUpdate() != lastUpdate.clinicaldata) {
            await clinicaldataWrapper.loadSubjects();
            clinicaldataModule.loadSubjectKeys();
        };

        // Also, empty the message queue
        await ioHelper.emptyMessageQueue();
    }, 5000);

    // Finally, remove expired ODM cache entries
    ioHelper.disposeExpiredCaches();
}

function getCurrentMode() {
    if ($("#metadata-section").isVisible()) return appModes.METADATA;
    else if ($("#clinicaldata-section").isVisible()) return appModes.CLINICALDATA;
    else if ($("#reports-section").isVisible()) return appModes.REPORTS;
}

function getCurrentState() {
    if ($("#start-modal").isActive()) return appStates.EMPTY;
    else if ($("#login-modal") && $("#login-modal").isActive()) return appStates.LOCKED;
    else return appStates.UNLOCKED;
}
