import * as odmHelper from "./helper/odmhelper.js";
import * as metadataModule from "./metadatamodule.js";
import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as ioHelper from "./helper/iohelper.js";
import * as languageHelper from "./helper/languagehelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

let locale = null;

document.addEventListener("DOMContentLoaded", async () => {
    ioHelper.setTreeMaxHeight();
    ioHelper.setIOListeners();
});

document.addEventListener("LanguageChanged", languageEvent => {
    locale = languageEvent.detail;

    metadataModule.setLanguage(locale);
    metadataModule.reloadTree();
    metadataModule.reloadDetailsPanel();

    clinicaldataModule.setLanguage(locale);

    hideMenu();
});

const startApp = () => {
    languageHelper.init();
    languageHelper.populatePresentLanguages(odmHelper.getODM());
    languageHelper.createLanguageSelect();
    languageHelper.internationalize();
    locale = languageHelper.getCurrentLocale();
    
    metadataModule.init();
    metadataModule.setLanguage(locale);
    metadataModule.loadStudyEvents();

    clinicaldataModule.init();
    clinicaldataModule.setLanguage(locale);

    setTitles();
    hideStartModal();
}

const setTitles = () => {
    $("#study-title").textContent = odmHelper.getStudyName();
    $("head title").textContent = "OpenEDC – " + odmHelper.getStudyName();
}

window.showMetadata = function() {
    metadataModule.show();
    clinicaldataModule.hide();
}

window.showClinicaldata = function() {
    metadataModule.hide();
    clinicaldataModule.show();
}

window.newProject = function() {
    odmHelper.loadEmptyProject();
    startApp();
}

window.uploadODM = async function() {
    let file = $("#odm-upload");
    let content = await ioHelper.getFileContent(file.files[0]);

    if (content) {
        odmHelper.parseODM(content);
        startApp();
    }
}

window.loadExample = async function() {
    await odmHelper.loadExample();
    startApp();
}

window.saveProjectModal = function() {
    odmHelper.setStudyName($("#study-name-input").value);
    odmHelper.setStudyDescription($("#study-description-textarea").value);
    odmHelper.setProtocolName($("#protocol-name-input").value);
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
    $("#study-name-input").value = odmHelper.getStudyName();
    $("#study-description-textarea").value = odmHelper.getStudyDescription();
    $("#protocol-name-input").value = odmHelper.getStudyName();
}

window.hideProjectModal = function() {
    $("#project-modal").classList.remove("is-active");
    metadataModule.setArrowKeyListener();
}

window.showAboutModal = function() {
    metadataModule.removeArrowKeyListener();
    $("#about-modal").classList.add("is-active");
}

window.hideAboutModal = function() {
    $("#about-modal").classList.remove("is-active");
    metadataModule.setArrowKeyListener();
}

window.downloadODM = function() {
    odmHelper.setCreationDateTimeNow();
    odmHelper.setFileOID(odmHelper.getStudyName());
    ioHelper.download(odmHelper.getStudyName()+".xml", odmHelper.getSerializedODM());
}

const hideMenu = () => {
    $(".navbar-menu").classList.remove("is-active");
    $(".navbar-burger").classList.remove("is-active");
    $("#language-dropdown").classList.add("is-hidden-mobile");
}
