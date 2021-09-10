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
    TURKISH: "tr"
}

const defaultLocale = locales.ENGLISH;

let currentLocale = defaultLocale;
let currentLocaleSet = false;
let browserLocale = null;

let localesInODM = [];
let localesNotInODM = [];

let translations = {};
let defaultTranslations = {};

export async function init() {
    defaultTranslations = await loadTranslations(defaultLocale);

    browserLocale = window.navigator.language.split("-")[0];
    if (Object.values(locales).includes(browserLocale)) await setCurrentLocale(browserLocale, false);
}

export function localize(node = document) {
    node.querySelectorAll("[i18n]").forEach(element => element.textContent = getTranslation(element.getAttribute("i18n")));
    node.querySelectorAll("[i18n-html]").forEach(element => element.innerHTML = getTranslation(element.getAttribute("i18n-html")));
    node.querySelectorAll("[i18n-ph]").forEach(element => element.placeholder = getTranslation(element.getAttribute("i18n-ph")));
    node.querySelectorAll("[i18n-href]").forEach(element => element.href = getTranslation(element.getAttribute("i18n-href")));
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
        if (locale && !localesInODM.includes(locale)) localesInODM.push(locale);
    }

    for (let locale of Object.values(locales)) {
        if (!localesInODM.includes(locale)) localesNotInODM.push(locale);
    }
}

export async function setInitialLocale() {
    for (const locale of localesInODM) {
        if (!currentLocaleSet || locale == browserLocale) await setCurrentLocale(locale, true);
    }
}

export function getPresentLanguages() {
    return localesInODM;
}

async function setCurrentLocale(locale, markCurrentLocaleSet) {
    if (locale == defaultLocale) translations = defaultTranslations;
    else if (locale != currentLocale) translations = await loadTranslations(locale);

    currentLocale = locale;
    currentLocaleSet = markCurrentLocaleSet ? true : false;
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
    await setCurrentLocale(locale, true);
    localize();
    setLanguageSelectText();
    document.dispatchEvent(new CustomEvent("LanguageChanged"));
}
