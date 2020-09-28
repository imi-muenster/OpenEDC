import * as metadataModule from "./metadatamodule.js";
import * as metadataHelper from "./helper/metadatahelper.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as clinicaldataHelper from "./helper/clinicaldatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";

const $ = query => document.querySelector(query);

document.addEventListener("DOMContentLoaded", async () => {
    ioHelper.setTreeMaxHeight();
    setIOListeners();

    if (metadataHelper.loadStoredMetadata()) {
        startApp();
    } else {
        showStartModal();
    }
});

document.addEventListener("LanguageChanged", languageEvent => {
    metadataModule.setLanguage(languageEvent.detail);
    if (!$("#metadata-section").classList.contains("is-hidden")) {
        metadataModule.reloadTree();
        metadataModule.reloadDetailsPanel();
    }

    clinicaldataModule.setLanguage(languageEvent.detail);
    if (!$("#clinicaldata-section").classList.contains("is-hidden")) {
        clinicaldataModule.cacheFormData();
        clinicaldataModule.loadStudyEvents(true);
    }
    
    hideMenu();
});

const startApp = () => {
    languageHelper.init();
    languageHelper.populatePresentLanguages(metadataHelper.getMetadata());
    languageHelper.createLanguageSelect();
    languageHelper.internationalize();
    
    metadataModule.init();
    metadataModule.setLanguage(languageHelper.getCurrentLocale());
    metadataModule.loadStudyEvents();

    clinicaldataModule.init();
    clinicaldataModule.setLanguage(languageHelper.getCurrentLocale());

    setTitles();
    hideStartModal();
}

const setTitles = () => {
    const studyName =  ioHelper.shortenText(metadataHelper.getStudyName(), 20);
    $("#study-title").textContent = studyName;
    $("head title").textContent = "OpenEDC – " + studyName;
}

window.showMetadata = function() {
    metadataModule.show();
    metadataModule.setArrowKeyListener();
    clinicaldataModule.hide();
    ioHelper.setTreeMaxHeight();

    hideMenu();
}

window.showClinicaldata = function() {
    metadataModule.hide();
    metadataModule.removeArrowKeyListener();
    clinicaldataModule.show();
    ioHelper.setTreeMaxHeight();

    hideMenu();
}

window.newProject = function() {
    metadataHelper.loadEmptyProject();
    startApp();
}

window.uploadODM = async function() {
    let file = $("#odm-upload");
    let content = await ioHelper.getFileContent(file.files[0]);

    if (content) {
        metadataHelper.parseMetadata(content);
        clinicaldataHelper.importClinicalData(content);
        startApp();
    }
}

window.loadExample = async function() {
    await metadataHelper.loadExample();
    startApp();
}

window.saveProjectModal = function() {
    metadataHelper.setStudyName($("#study-name-input").value);
    metadataHelper.setStudyDescription($("#study-description-textarea").value);
    metadataHelper.setProtocolName($("#protocol-name-input").value);
    hideProjectModal();
    setTitles();
    metadataModule.setArrowKeyListener();
}

window.showStartModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#start-modal").classList.add("is-active");
}

window.hideStartModal = function() {
    $("#start-modal").classList.remove("is-active");
    metadataModule.setArrowKeyListener();
}

window.showProjectModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#project-modal").classList.add("is-active");
    $("#study-name-input").value = metadataHelper.getStudyName();
    $("#study-description-textarea").value = metadataHelper.getStudyDescription();
    $("#protocol-name-input").value = metadataHelper.getStudyName();

    hideMenu();
}

window.hideProjectModal = function() {
    $("#project-modal").classList.remove("is-active");
    metadataModule.setArrowKeyListener();
}

window.showAboutModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#about-modal").classList.add("is-active");

    hideMenu();
}

window.hideAboutModal = function() {
    $("#about-modal").classList.remove("is-active");
    metadataModule.setArrowKeyListener();
}

window.downloadODM = function() {
    metadataHelper.setCreationDateTimeNow();
    metadataHelper.setFileOID(metadataHelper.getStudyName());

    let odm = metadataHelper.getMetadata();
    let clinicaldata = clinicaldataHelper.getClinicalData(odm.querySelector("Study").getAttribute("OID"), odm.querySelector("MetaDataVersion").getAttribute("OID"));
    odm.querySelector("ODM").appendChild(clinicaldata);

    ioHelper.download(metadataHelper.getStudyName()+".xml", new XMLSerializer().serializeToString(odm));
}

window.downloadMetadata = function() {
    metadataHelper.setCreationDateTimeNow();
    metadataHelper.setFileOID(metadataHelper.getStudyName());

    ioHelper.download(metadataHelper.getStudyName()+"_metadata.xml", metadataHelper.getSerializedMetadata());
}

window.removeData = function() {
    metadataHelper.clearMetadata();
    clinicaldataHelper.clearSubject();
    localStorage.clear();
    location.reload();
}

const hideMenu = () => {
    $(".navbar-menu").classList.remove("is-active");
    $(".navbar-burger").classList.remove("is-active");
    $("#language-dropdown").classList.add("is-hidden-touch");
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
