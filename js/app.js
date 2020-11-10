import * as metadataModule from "./metadatamodule.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as admindataModule from "./admindatamodule.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";

const $ = query => document.querySelector(query);

const appModes = {
    METADATA: "METADATA",
    CLINICALDATA: "CLINICALDATA"
};

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
    metadataHelper.loadStoredMetadata()
        .then(() => {
            startApp();
        })
        .catch(error => {
            if (error.code == ioHelper.loadXMLExceptionCodes.NODATAFOUND && !ioHelper.getServerURL()) showStartModal();
            else if (error.code == ioHelper.loadXMLExceptionCodes.DATAENCRYPTED) showDecryptionKeyModal();
        });

    // Register serviceworker for offline capabilities
    if ("serviceWorker" in window.navigator) {
        window.navigator.serviceWorker.register("/serviceworker.js");
    }
});

document.addEventListener("LanguageChanged", languageEvent => {
    metadataModule.setLanguage(languageEvent.detail);
    if (getCurrentMode() == appModes.METADATA) {
        metadataModule.reloadTree();
        metadataModule.reloadDetailsPanel();
    }

    clinicaldataModule.setLanguage(languageEvent.detail);
    if (getCurrentMode() == appModes.CLINICALDATA) {
        clinicaldataModule.cacheFormData();
        clinicaldataModule.reloadTree();
    }
    
    ioHelper.hideMenu();
});

const startApp = async () => {
    languageHelper.init();
    languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
    languageHelper.createLanguageSelect();
    languageHelper.internationalize();
    
    metadataModule.init();
    metadataModule.setLanguage(languageHelper.getCurrentLocale());

    await admindataHelper.loadStoredAdmindata();

    await clinicaldataModule.init();
    clinicaldataModule.setLanguage(languageHelper.getCurrentLocale());

    setTitles();
    hideStartModal();
    showNavbar();
    setIOListeners();

    // If there is at least one subject stored, automatically open the clinicaldata module
    clinicaldataHelper.getSubjects().length > 0 ? metadataModule.hide() : metadataModule.show();
}

const setTitles = () => {
    const studyName =  ioHelper.shortenText(metadataHelper.getStudyName(), 20);
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
    $("#login-modal #username-input").parentNode.parentNode.classList.add("is-hidden");
    $("#login-title").textContent = "Data is encrypted";
    $("#login-text").textContent = "Please enter the password that you used for the data encryption.";
    $("#login-incorrect-hint .message-body").textContent = "The password is incorrect. Please try again.";

    // Set the click handler when clicking on the Open button
    $("#login-modal #open-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        const decryptionKey = $("#login-modal #password-input").value;
        ioHelper.setDecryptionKey(decryptionKey)
            .then(loginSuccessful)
            .catch(loginNotSuccessful);
    };

    renderLoginModal();
}

function showLoginModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-title").textContent = "Please login";
    $("#login-text").textContent = "You are connected to an OpenEDC Server. Please login with your credentials.";
    $("#login-incorrect-hint .message-body").textContent = "The username or password is incorrect. Please try again.";

    // Adjust the project options modal accordingly
    $("#server-url-input").parentNode.parentNode.classList.add("is-hidden");
    $("#server-connected-hint").classList.remove("is-hidden");

    // Set the click handler when clicking on the Open button
    $("#login-modal #open-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        const username = $("#login-modal #username-input").value;
        const password = $("#login-modal #password-input").value;
        const confirmPassword = $("#login-modal #confirm-password-input").value;

        // TODO: Code refactoring -- not very nice, clean code
        if (!$("#login-modal #username-input").disabled) {
            const credentials = new ioHelper.Credentials(username, password);
            ioHelper.loginToServer(credentials)
                .then(loginSuccessful)
                .catch(loginNotSuccessful);
        } else {
            const credentials = new ioHelper.Credentials(username, password, confirmPassword);
            if (credentials.error) {
                ioHelper.showWarning("Password not set", credentials.error);
                return;
            }
            ioHelper.setOwnPassword(credentials)
                .then(loginSuccessful)
                .catch(error => ioHelper.showWarning("Password not set", error));
        }
    };

    renderLoginModal();
}

function renderLoginModal() {
    $("#project-modal #encryption-password-input").parentNode.parentNode.classList.add("is-hidden");
    $("#project-modal #data-encryption-warning").classList.add("is-hidden");
    $("#project-modal #data-encrypted-hint").classList.remove("is-hidden");

    $("#login-modal").classList.add("is-active");
}

async function loginSuccessful() {
    $("#login-modal #username-input").value = "";
    $("#login-modal #password-input").value = "";
    $("#login-modal").classList.remove("is-active");

    await metadataHelper.loadStoredMetadata();
    await startApp();

    // When connected to a server, adjust UI in accordance with the user rights (e.g., disable or enable buttons, select site of user)
    if (ioHelper.getServerURL()) adjustUIToUser();
}

function loginNotSuccessful(error) {
    $("#login-modal #password-input").value = "";

    switch (error) {
        case ioHelper.loginStatus.USERHASINITIALPASSWORD:
            $("#login-text").textContent = "This is the first time you log in to the OpenEDC Server. Please choose a new secure password.";
            $("#login-modal #confirm-password-input").parentNode.parentNode.classList.remove("is-hidden");
            $("#login-modal #username-input").disabled = true;
            break;
        default:
            $("#login-modal #login-incorrect-hint").classList.remove("is-hidden");
    }
}

function adjustUIToUser() {
    const user = ioHelper.getLocalUser();
    if (!user.rights.includes("Project options")) {
        $("#project-modal-button").disabled = true;
    } else {
        $("#add-user-button button").disabled = false;
    }
    if (!user.rights.includes("Edit metadata")) {
        if (getCurrentMode() == appModes.METADATA) metadataModule.hide();
        $("#metadata-toggle-button").disabled = true;
    }
    if (!user.rights.includes("Add subject data")) {
        $("#add-subject-input").disabled = true;
        $("#add-subject-button").disabled = true;
    }
    if (!user.rights.includes("Manage subjects")) {
        $("#subject-info-button").disabled = true;
    }
    if (user.site) {
        $("#filter-site-select-inner").value = admindataHelper.getSiteNameByOID(user.site);;
        $("#filter-site-select-inner").disabled = true;
        clinicaldataModule.loadSubjectKeys();
    }
}

function showUninitializedHint() {
    ioHelper.showWarning("Server uninitialized", `This OpenEDC Server has not yet been initialized.<br><br>You can either go to <a target="_blank" href="https://openedc.org">openedc.org</a> to initialize this server with data that you have already locally captured there, or, alternatively, close this hint, start a new local project here, and initialize the server from here as well.<br><br>In both cases, use the <i>Project Options</i> button in the top right corner of the app and follow the instructions to initialize this server.`);

    $("#connect-to-server-option .title").textContent = "Initialize Server";
    $("#connect-to-server-option .input").value = ioHelper.getBaseURL();
    $("#connect-to-server-option .button").textContent = "Initialize";
}

window.newProject = function() {
    metadataHelper.loadEmptyProject();
    admindataHelper.loadEmptyProject(metadataHelper.getStudyOID());
    startApp();
}

window.uploadODM = async function() {
    let file = $("#odm-upload");
    let content = await ioHelper.getFileContent(file.files[0]);

    if (content) {
        metadataHelper.importMetadata(content);
        admindataHelper.importAdmindata(content);
        clinicaldataHelper.importClinicaldata(content);
        startApp();
    }
}

window.loadExample = async function() {
    await metadataHelper.loadExample();
    admindataHelper.loadEmptyProject(metadataHelper.getStudyOID());
    startApp();
}

window.showProjectModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#project-modal").classList.add("is-active");
    if (ioHelper.getSurveyCode() != "0000") $("#survey-code-input").value = ioHelper.getSurveyCode();
    $("#text-as-textarea-checkbox").checked = ioHelper.isTextAsTextarea();
    $("#auto-survey-view-checkbox").checked = ioHelper.isAutoSurveyView();
    // TODO: Maybe something like metadataModule.loadStudyNameAndDescription(); for consistency?
    $("#study-name-input").value = metadataHelper.getStudyName();
    $("#study-description-textarea").value = metadataHelper.getStudyDescription();
    $("#protocol-name-input").value = metadataHelper.getStudyName();
    admindataModule.loadUsers();
    admindataModule.loadSites();

    ioHelper.hideMenu();
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
                    ioHelper.showWarning("Server initialized", "The server has already been initialized.");
            }
        })
        .catch(() => ioHelper.showWarning("Server not found", "There could be no OpenEDC Server found for this URL."));
}

window.initializeServer = function(event) {
    event.preventDefault();

    const username = $("#owner-username-input").value;
    const password = $("#owner-password-input").value;
    const confirmPassword = $("#owner-confirm-password-input").value;
    const credentials = new ioHelper.Credentials(username, password, confirmPassword);
    if (credentials.error) {
        ioHelper.showWarning("Account not created", credentials.error);
        return;
    }

    // Initialize the server, i.e., set the owner of the server with the entered data and transfer all data
    // The user account will be linked to the default/first user, which, in the most cases, is the only user since adding users is prohibited without a server connection
    const serverURL = $("#server-url-input").value;
    const userOID = admindataHelper.getCurrentUserOID();
    ioHelper.initializeServer(serverURL, userOID, credentials)
        .then(serverURL => window.location.replace(serverURL))
        .catch(error => ioHelper.showWarning("Account not created", error));
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
        ioHelper.showWarning("Data not encrypted", credentials.error);
        return;
    }

    ioHelper.encryptXMLData(credentials.password);
    window.location.reload();
}

window.setSurveyCode = function() {
    ioHelper.setSurveyCode($("#survey-code-input").value)
        .then(() => hideProjectModal())
        .catch(() => ioHelper.showWarning("Survey code not set", "The survey code could not be set. Enter a 4-digit numerical code."));
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

window.showAboutModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#about-modal").classList.add("is-active");

    ioHelper.hideMenu();
}

window.hideAboutModal = function() {
    $("#about-modal").classList.remove("is-active");
    if (getCurrentMode() == appModes.METADATA) metadataModule.setArrowKeyListener();
}

window.downloadODM = async function() {
    metadataHelper.setCreationDateTimeNow();
    metadataHelper.setFileOID(metadataHelper.getStudyName());
    let odm = new DOMParser().parseFromString(metadataHelper.getSerializedMetadata(), "text/xml");

    let clinicaldata = await clinicaldataHelper.getClinicalData(metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID());
    if (clinicaldata) odm.querySelector("ODM").appendChild(clinicaldata);

    let admindata = admindataHelper.getAdmindata();
    if (admindata) odm.querySelector("ODM").appendChild(admindata);

    ioHelper.download(metadataHelper.getStudyName()+".xml", new XMLSerializer().serializeToString(odm));
}

window.downloadODMMetadata = function() {
    metadataHelper.setCreationDateTimeNow();
    metadataHelper.setFileOID(metadataHelper.getStudyName());

    ioHelper.download(metadataHelper.getStudyName()+"_metadata.xml", metadataHelper.getSerializedMetadata());
}

window.downloadCSV = async function() {
    const csvHeaders = metadataHelper.getCSVHeaders();
    const csvData = await clinicaldataHelper.getCSVData(csvHeaders);
    const csvString = ioHelper.getCSVString(csvHeaders, csvData);

    ioHelper.download(metadataHelper.getStudyName()+"_clinicaldata.csv", csvString);
}

window.removeData = function() {
    metadataHelper.clearMetadata();
    clinicaldataHelper.clearSubject();
    localStorage.clear();
    window.location.reload();
}

window.removeClinicaldata = async function() {
    await clinicaldataHelper.removeClinicaldata();
    window.location.reload();
}

// IO or event listeners that are valid for the entire app and cannot be assigned to either the metadatamodule or clinicaldatamodule
export function setIOListeners() {
    $("body").onresize = ioHelper.setTreeMaxHeight;
    // TODO: This style everywhere or onclick here
    $(".navbar-burger").addEventListener("click", () => {
        $(".navbar-menu").classList.toggle("is-active");
        $(".navbar-burger").classList.toggle("is-active");
        $("#language-dropdown").classList.add("is-hidden-touch");
    });
    $("#current-language").addEventListener("click", () => $("#language-dropdown").classList.toggle("is-hidden-touch"));
}

function getCurrentMode() {
    return $("#metadata-section").classList.contains("is-hidden") ? appModes.CLINICALDATA : appModes.METADATA;
}

// A list of generic todos that are not crucial but can be improved in the future
// TODO: In the entire project, align onclick vs. addEventListener("click"), arrowfunctions, etc.
// TODO: Also: oninput/onclick in html file vs. in js file
// TODO: Sort the .css file
// TODO: Refactor metadatamodule to remove "[studyEvent]clicked" functions. Set currentElementOID and is-active in the, e.g., loadFormsByStudyEvent as well and also refactor arrowKeyListener etc.
// TODO: In metadatamodule, rename odm to metadata everywhere
// TODO: In XSLT processing, remove the de/en differenatiation and translate boolean questions with the languageHelper, also remove xsl-templates when possible
// TODO: Use let very frequently even it it could be declared as const
// TODO: Metadata -> MetaData, Clinicaldata -> ClinicalData
// TODO: In some secure cases the || operator may be used to set default values to reduce code compared to the ternary operator
// TODO: In templates.js files use only const instead of let
// TODO: Check if data has changed in clinicaldatamodule.js could be even more generalized
// TODO: let abc = null; is usually not required, let abc; is sufficient -- replace occurences
// TODO: It seems that .name alaways works instead of .getAttribute("name") -- could be replaced for other occurrences
