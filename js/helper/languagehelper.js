import * as ioHelper from "./iohelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

const locales = {
    ENGLISH: "en",
    DUTCH: "nl",
    FINNISH: "fi",
    FRENCH: "fr",
    GERMAN: "de",
    GREEK: "el",
    ITALIAN: "it",
    POLISH: "pl",
    PORTUGUESE: "pt",
    RUSSIAN: "ru",
    SPANISH: "es",
    SWEDISH: "sv",
    TURKISH: "tr",
    KOREAN: "kr"
}

const defaultLocale = locales.ENGLISH;

let currentLocale = defaultLocale;
let browserLocale = null;

let translationFiles = [];
let localesInODM = [];
let localesNotInODM = [];

let translations = {};
let fallbackTranslations = {};

export async function init() {
    // Register default translation files
    for (const locale of Object.values(locales)) {
        await registerTranslationFile(locale, ioHelper.getBaseURL() + "/internationalization/" + locale + ".json");
    }

    // Set fallback translations (at this point translations correspond to default locale), browser locale, and the current locale
    fallbackTranslations = { ...translations };
    browserLocale = window.navigator.language.split("-")[0];
    if (Object.values(locales).includes(browserLocale)) await loadTranslations(browserLocale);
}

export async function registerTranslationFile(locale, url) {
    translationFiles.push({ locale, url });
    if (locale == currentLocale) Object.assign(translations, await getTranslations(url));
}

async function getTranslations(url) {
    const response = await fetch(url);
    return await response.json().catch(() => {});
}

async function loadTranslations(locale) {
    if (locale != currentLocale) {
        translations = {};
        for (const translationFile of translationFiles) {
            if (translationFile.locale == locale) Object.assign(translations, await getTranslations(translationFile.url));
        }
    }

    currentLocale = locale;
}

export function localize(node = document) {
    node.querySelectorAll("[i18n]").forEach(element => element.textContent = getTranslation(element.getAttribute("i18n")));
    node.querySelectorAll("[i18n-html]").forEach(element => element.innerHTML = getTranslation(element.getAttribute("i18n-html")));
    node.querySelectorAll("[i18n-ph]").forEach(element => element.placeholder = getTranslation(element.getAttribute("i18n-ph")));
    node.querySelectorAll("[i18n-href]").forEach(element => element.href = getTranslation(element.getAttribute("i18n-href")));
}

export function getTranslation(key) {
    return translations[key] || fallbackTranslations[key] || key;
}

export function populatePresentLanguages(odm) {
    localesInODM = [];
    localesNotInODM = [];

    for (const translatedText of odm.querySelectorAll("TranslatedText")) {
        const locale = translatedText.getAttribute("xml:lang");
        if (locale && !localesInODM.includes(locale)) localesInODM.push(locale);
    }

    for (let locale of Object.values(locales)) {
        if (!localesInODM.includes(locale)) localesNotInODM.push(locale);
    }
}

export async function setInitialLocale() {
    const initialLocale = localesInODM.includes(browserLocale) ? browserLocale : localesInODM[0];
    if (initialLocale) await loadTranslations(initialLocale);
}

export function getPresentLanguages() {
    return localesInODM;
}

export function getCurrentLocale() {
    return currentLocale;
}

export function createLanguageSelect(includeUnavailable) {
    $$("#language-dropdown a").removeElements();
    $$("#language-dropdown hr").removeElements();

    if (localesInODM.length) {
        localesInODM.forEach(locale => addLanguageOptionNavbar(locale));
        if (includeUnavailable) addDividerNavbar();
    }
    if (includeUnavailable) localesNotInODM.forEach(locale => addLanguageOptionNavbar(locale));

    setLanguageSelectText();
}

function addLanguageOptionNavbar(locale) {
    let option = document.createElement("a");
    option.className = "navbar-item";
    option.textContent = getTranslation(locale);
    option.setAttribute("i18n", locale);
    option.onclick = () => changeLanguage(locale);
    $("#language-dropdown").appendChild(option);
}

function addDividerNavbar() {
    let divider = document.createElement("hr");
    divider.className = "navbar-divider";
    $("#language-dropdown").appendChild(divider);
}

function setLanguageSelectText() {
    $("#current-language").textContent = getTranslation(currentLocale);
    $("#current-language").setAttribute("i18n", currentLocale);
}

async function changeLanguage(locale) {
    await loadTranslations(locale);
    localize();
    setLanguageSelectText();
    ioHelper.dispatchGlobalEvent("LanguageChanged");
}
