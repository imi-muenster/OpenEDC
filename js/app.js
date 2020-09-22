import * as metadataHelper from "./helper/metadatahelper.js";
import * as metadataModule from "./metadatamodule.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";

const $ = query => document.querySelector(query);

document.addEventListener("DOMContentLoaded", async () => {
    ioHelper.setTreeMaxHeight();
    ioHelper.setIOListeners();
});

document.addEventListener("LanguageChanged", languageEvent => {
    metadataModule.setLanguage(languageEvent.detail);
    metadataModule.reloadTree();
    metadataModule.reloadDetailsPanel();

    clinicaldataModule.setLanguage(languageEvent.detail);

    hideMenu();
});

const startApp = () => {
    languageHelper.init();
    languageHelper.populatePresentLanguages(metadataHelper.getODM());
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
    $("#study-title").textContent = metadataHelper.getStudyName();
    $("head title").textContent = "OpenEDC – " + metadataHelper.getStudyName();
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
        metadataHelper.parseODM(content);
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
    ioHelper.download(metadataHelper.getStudyName()+".xml", metadataHelper.getSerializedODM());
}

const hideMenu = () => {
    $(".navbar-menu").classList.remove("is-active");
    $(".navbar-burger").classList.remove("is-active");
    $("#language-dropdown").classList.add("is-hidden-mobile");
}
