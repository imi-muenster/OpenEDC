import * as ioHelper from "./iohelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

const locales = {
    ENGLISH: "en",
    DUTCH: "nl",
    FRENCH: "fr",
    GERMAN: "de",
    ITALIAN: "it",
    PORTUGUESE: "pt",
    RUSSIAN: "ru",
    SPANISH: "es",
    SWEDISH: "sv",
    TURKISH: "tr"
}

const defaultLocale = locales.ENGLISH;

export const untranslatedLocale = "none";

let currentLocale = defaultLocale;
let currentLocaleSet = false;

let localesInODM = [];
let localesNotInODM = [];

let translations = {};
let defaultTranslations = {};

export async function init() {
    defaultTranslations = await loadTranslations(defaultLocale);
}

export async function internationalize() {
    if (currentLocale == defaultLocale) translations = defaultTranslations;
    else translations = await loadTranslations(currentLocale);
    
    document.querySelectorAll("[i18n]").forEach(element => element.textContent = getTranslation(element.getAttribute("i18n")));
    document.querySelectorAll("[i18n-html]").forEach(element => element.innerHTML = getTranslation(element.getAttribute("i18n-html")));
    document.querySelectorAll("[i18n-ph]").forEach(element => element.placeholder = getTranslation(element.getAttribute("i18n-ph")));
}

export function getTranslation(key) {
    return translations[key] || defaultTranslations[key] || key;
}

async function loadTranslations(locale) {
    const response = await fetch(ioHelper.getBaseURL() + "/internationalization/" + locale + ".json");
    return await response.json().catch(() => []);
}

export function populatePresentLanguages(odm) {
    localesInODM = [];
    localesNotInODM = [];

    for (const translatedText of odm.querySelectorAll("TranslatedText")) {
        const locale = translatedText.getAttribute("xml:lang");
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

export function getPresentLanguages() {
    return localesInODM;
}

export function getCurrentLocale() {
    return currentLocale;
}

export function createLanguageSelect(includeUnavailable) {
    ioHelper.removeElements($$("#language-dropdown a"));
    ioHelper.removeElements($$("#language-dropdown hr"));

    if (localesInODM.length > 0) {
        localesInODM.forEach(locale => addLanguageOptionNavbar(locale));
        if (includeUnavailable || localesInODM.includes(untranslatedLocale)) addDividerNavbar();
    }
    if (includeUnavailable || localesInODM.includes(untranslatedLocale)) localesNotInODM.forEach(locale => addLanguageOptionNavbar(locale));

    $("#current-language").textContent = getTranslation(currentLocale);
}

function addLanguageOptionNavbar(locale) {
    let option = document.createElement("a");
    option.className = "navbar-item";
    option.textContent = getTranslation(locale);
    option.onclick = () => changeLanguage(locale);
    $("#language-dropdown").appendChild(option);
}

function addDividerNavbar() {
    let divider = document.createElement("hr");
    divider.className = "navbar-divider";
    $("#language-dropdown").appendChild(divider);
}

async function changeLanguage(locale) {
    currentLocale = locale;
    currentLocaleSet = true;
    await internationalize();
    document.dispatchEvent(new CustomEvent("LanguageChanged", { detail: currentLocale }));
}
