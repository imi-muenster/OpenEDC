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

let translations = null;

export function init() {
    currentLocale = defaultLocale;
    currentLocaleSet = false;
    localesInODM = [];
    localesNotInODM = [];
    translations = null;
    populateNonPresentLanguages();
}

export async function internationalize() {
    let translationResponse = await fetch(ioHelper.getBaseURL() + "internationalization/" + currentLocale + ".json");
    translations = await translationResponse.json();

    let translatableElements = document.querySelectorAll("[internationalization]");
    for (let translatableElement of translatableElements) {
        let key = translatableElement.getAttribute("internationalization");
        if (translations[key]) translatableElement.textContent = translations[key];
    }
}

export function getTranslation(key) {
    return translations[key];
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

export function createLanguageSelect() {
    ioHelper.removeElements($$("#language-dropdown a"));
    ioHelper.removeElements($$("#language-dropdown hr"));

    if (localesInODM.length > 0) {
        for (let locale of localesInODM) {
            let option = document.createElement("a");
            option.className = "navbar-item";
            option.textContent = getLanguageNameByLocale(locale);
            option.setAttribute("locale", locale);
            option.onclick = clickEvent => changeLanguage(clickEvent.target.getAttribute("locale"));
            if (locale == currentLocale) $("#current-language").textContent = getLanguageNameByLocale(locale);
            $("#language-dropdown").appendChild(option);
        }
    
        let divider = document.createElement("hr");
        divider.className = "navbar-divider";
        $("#language-dropdown").appendChild(divider);
    }

    for (let locale of localesNotInODM) {
        let option = document.createElement("a");
        option.className = "navbar-item";
        option.textContent = getLanguageNameByLocale(locale);
        option.setAttribute("locale", locale);
        option.onclick = clickEvent => changeLanguage(clickEvent.target.getAttribute("locale"));
        $("#language-dropdown").appendChild(option);
    }
}

function changeLanguage(locale) {
    if (!Object.values(locales).includes(locale)) return;

    currentLocale = locale;
    currentLocaleSet = true;
    internationalize();
    $("#current-language").textContent = getLanguageNameByLocale(currentLocale);
    document.dispatchEvent(new CustomEvent("LanguageChanged", { detail: currentLocale }));
}
