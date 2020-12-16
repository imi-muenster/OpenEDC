import * as ioHelper from "./iohelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export const locales = {
    "ENGLISH": "en",
    "DUTCH": "nl",
    "FRENCH": "fr",
    "GERMAN": "de",
    "ITALIAN": "it",
    "PORTUGUESE": "pt",
    "RUSSIAN": "ru",
    "SPANISH": "es",
    "SWEDISH": "sv",
    "TURKISH": "tr"
}

const defaultLocale = locales.ENGLISH;

let currentLocale = defaultLocale;
let currentLocaleSet = false;

let localesInODM = [];
let localesNotInODM = [];

let translations = {};
let defaultTranslations = {};

export async function init() {
    defaultTranslations = await loadTranslations(defaultLocale);
    populateNonPresentLanguages();
}

export async function internationalize() {
    translations = await loadTranslations(currentLocale);
    document.querySelectorAll("[i18n]").forEach(element => element.textContent = getTranslation(element.getAttribute("i18n")));
}

export function getTranslation(key) {
    return translations[key] || defaultTranslations[key];
}

async function loadTranslations(locale) {
    const response = await fetch(ioHelper.getBaseURL() + "/internationalization/" + locale + ".json");
    return await response.json();
}

export function populatePresentLanguages(odm) {
    localesInODM = [];
    localesNotInODM = [];

    for (let translatedText of odm.querySelectorAll("TranslatedText")) {
        let locale = translatedText.getAttribute("xml:lang");
        if (!localesInODM.includes(locale)) {
            localesInODM.push(locale);
        }
        if (!currentLocaleSet) {
            currentLocale = locale;
            currentLocaleSet = true;
        }
    }

    populateNonPresentLanguages();
}

function populateNonPresentLanguages() {
    for (let locale of Object.values(locales)) {
        if (!localesInODM.includes(locale)) {
            localesNotInODM.push(locale);
        }
    }
}

function getLanguageNameByLocale(locale) {
    for (let [key, value] of Object.entries(locales)) {
        if (locale == value) {
            return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        }
    }
}

export function getPresentLanguages() {
    return localesInODM;
}

export function getCurrentLocale() {
    return currentLocale;
}

export function createLanguageSelects() {
    ioHelper.removeElements($$("#language-dropdown a"));
    ioHelper.removeElements($$("#language-dropdown hr"));

    if (localesInODM.length > 0) {
        localesInODM.forEach(locale => addLanguageOptionNavbar(locale));
        addDividerNavbar();
    }
    localesNotInODM.forEach(locale => addLanguageOptionNavbar(locale));

    $("#current-language").textContent = getLanguageNameByLocale(currentLocale);
}

function addLanguageOptionNavbar(locale) {
    let option = document.createElement("a");
    option.className = "navbar-item";
    option.textContent = getLanguageNameByLocale(locale);
    option.onclick = () => changeLanguage(locale);
    $("#language-dropdown").appendChild(option);
}

function addDividerNavbar() {
    let divider = document.createElement("hr");
    divider.className = "navbar-divider";
    $("#language-dropdown").appendChild(divider);
}

function changeLanguage(locale) {
    if (!Object.values(locales).includes(locale)) return;

    currentLocale = locale;
    currentLocaleSet = true;
    internationalize();
    $("#current-language").textContent = getLanguageNameByLocale(currentLocale);
    document.dispatchEvent(new CustomEvent("LanguageChanged", { detail: currentLocale }));
}
