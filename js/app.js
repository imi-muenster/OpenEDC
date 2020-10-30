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

    // Initialize the application
    metadataHelper.loadStoredMetadata()
        .then(() => {
            startApp();
        })
        .catch(error => {
            if (error.code == ioHelper.loadXMLExceptionCodes.NODATAFOUND) showStartModal();
            else if (error.code == ioHelper.loadXMLExceptionCodes.DATAENCRYPTED) showDecryptionPasswordModal();
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

const startApp = () => {
    languageHelper.init();
    languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
    languageHelper.createLanguageSelect();
    languageHelper.internationalize();
    
    metadataModule.init();
    metadataModule.setLanguage(languageHelper.getCurrentLocale());

    admindataModule.init();

    clinicaldataModule.init();
    clinicaldataModule.setLanguage(languageHelper.getCurrentLocale());

    ioHelper.loadGlobalOptions();

    setTitles();
    hideStartModal();
    showNavbar();
    setIOListeners();

    // If there is at least one subject stored, automatically open the clinicaldata module
    clinicaldataHelper.getSubjectKeys().length > 0 ? metadataModule.hide() : metadataModule.show();
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

function showDecryptionPasswordModal() {
    // The login modal is used both for authenicating against an OpenEDC Server and for getting the local decryption password
    $("#login-modal #username-input").parentNode.parentNode.classList.add("is-hidden");
    $("#login-modal #password-input").parentNode.parentNode.classList.remove("is-hidden");
    $("#login-modal #password-incorrect-hint").classList.add("is-hidden");

    // Adjust the project options modal accordingly
    $("#encryption-password-input").parentNode.parentNode.classList.add("is-hidden");
    $("#data-encryption-warning").classList.add("is-hidden");
    $("#data-encrypted-hint").classList.remove("is-hidden");

    // Set the click handler when clicking on the Open button
    $("#login-modal #open-button").onclick = clickEvent => {
        clickEvent.preventDefault();
        ioHelper.setDecryptionPassword()
            .then(() => {
                $("#login-modal #password-input").value = "";
                $("#login-modal").classList.remove("is-active");
                metadataHelper.loadStoredMetadata().then(() => startApp());
            })
            .catch(() => {
                $("#login-modal #password-incorrect-hint").classList.remove("is-hidden");
            });
    };

    $("#login-modal").classList.add("is-active");
}

window.newProject = function() {
    // TODO: Store AdminData?
    metadataHelper.loadEmptyProject();
    admindataHelper.loadEmptyProject(metadataHelper.getStudyOID());
    startApp();
    metadataHelper.storeMetadata();
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
    // TODO: Store AdminData?
    await metadataHelper.loadExample();
    admindataHelper.loadEmptyProject(metadataHelper.getStudyOID());
    startApp();
    metadataHelper.storeMetadata();
}

window.showProjectModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#project-modal").classList.add("is-active");
    if (ioHelper.getSurveyCode() != "0000") $("#survey-code-input").value = ioHelper.getSurveyCode();
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

window.encryptData = function() {
    ioHelper.encryptXMLData($("#encryption-password-input").value)
        .then(() => window.location.reload())
        .catch(() => ioHelper.showWarning("Data not encrypted", "The data could not be encrypted. Enter a password with at least 8 characters."));
}

window.setSurveyCode = function() {
    ioHelper.setSurveyCode($("#survey-code-input").value)
        .then(() => hideProjectModal())
        .catch(() => ioHelper.showWarning("Survey code not set", "The survey code could not be set. Enter a 4-digit numerical code."));
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

window.downloadODM = function() {
    metadataHelper.setCreationDateTimeNow();
    metadataHelper.setFileOID(metadataHelper.getStudyName());
    let odm = new DOMParser().parseFromString(metadataHelper.getSerializedMetadata(), "text/xml");

    let clinicaldata = clinicaldataHelper.getClinicalData(metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID());
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

window.downloadCSV = function() {
    const csvHeaders = metadataHelper.getCSVHeaders();
    const csvData = clinicaldataHelper.getCSVData(csvHeaders);
    const csvString = ioHelper.getCSVString(csvHeaders, csvData);

    ioHelper.download(metadataHelper.getStudyName()+"_clinicaldata.csv", csvString);
}

window.removeData = function() {
    metadataHelper.clearMetadata();
    clinicaldataHelper.clearSubject();
    localStorage.clear();
    window.location.reload();
}

window.removeClinicaldata = function() {
    clinicaldataHelper.removeClinicaldata();
    window.location.reload();
}

// IO/Event listeners that are valid for the entire app and cannot be assigned to either the metadatamodule or clinicaldatamodule
// TODO: In the entire project, align onclick vs. addEventListener("click"), arrowfunctions, etc.
// TODO: Also: oninput/onclick in html file vs. in js file
// TODO: In a loop, there is no need to create a variable with the array first
// TODO: Sort the .css file
// TODO: Refactor metadatamodule to remove "[studyEvent]clicked" functions. Set currentElementOID and is-active in the, e.g., loadFormsByStudyEvent as well and also refactor arrowKeyListener etc.
// TODO: In metadatamodule, rename odm to metadata everywhere
// TODO: In XSLT processing, remove the de/en differenatiation and translate boolean questions with the languageHelper, also remove xsl-templates when possible
// TODO: Use let very frequently even it it could be declared as const
// TODO: Metadata -> MetaData, Clinicaldata -> ClinicalData
// TODO: In some secure cases the || operator may be used to set default values to reduce code compared to the ternary operator
// TODO: In templates.js files use only const instead of let
// TODO: Check if data has changed in clinicaldatamodule.js could be even more generalized
export function setIOListeners() {
    $("body").onresize = ioHelper.setTreeMaxHeight;
    // TODO: This style everywhere or onclick here
    $(".navbar-burger").addEventListener("click", () => {
        $(".navbar-menu").classList.toggle("is-active");
        $(".navbar-burger").classList.toggle("is-active");
        $("#language-dropdown").classList.add("is-hidden-touch");
    });
    $("#current-language").addEventListener("click", () => $("#language-dropdown").classList.toggle("is-hidden-touch"));
    $("#warning-modal button").addEventListener("click", () => $("#warning-modal").classList.remove("is-active"));
}

function getCurrentMode() {
    return $("#metadata-section").classList.contains("is-hidden") ? appModes.CLINICALDATA : appModes.METADATA;
}
