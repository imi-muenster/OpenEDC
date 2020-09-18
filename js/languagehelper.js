import * as ioHelper from "./iohelper.js";

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

export function init() {
    currentLocale = defaultLocale;
    currentLocaleSet = false;
    localesInODM = [];
    localesNotInODM = [];
    populateNonPresentLanguages();
}

export async function internationalize() {
    let translationResponse = await fetch(ioHelper.getBaseURL() + "/internationalization/" + currentLocale + ".json");
    let translations = await translationResponse.json();

    let translatableElements = document.querySelectorAll("[internationalization]");
    for (let translatableElement of translatableElements) {
        let key = translatableElement.getAttribute("internationalization");
        translatableElement.textContent = translations[key] || translatableElement.textContent;
    }
}

export function populatePresentLanguages(odm) {
    localesInODM = [];
    localesNotInODM = [];

    let translatedTexts = odm.querySelectorAll("TranslatedText");

    for (let translatedText of translatedTexts) {
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

export function getLanguageNameByLocale(locale) {
    for (let [key, value] of Object.entries(locales)) {
        if (locale == value) {
            return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        }
    }
}

export function getPresentLanguages() {
    return localesInODM;
}

export function getNonPresentLanguages() {
    return localesNotInODM;
}

export function getCurrentLocale() {
    return currentLocale;
}

export function setCurrentLanguage(locale) {
    if (Object.values(locales).indexOf(locale) != -1) {
        currentLocale = locale;
        currentLocaleSet = true;
    }
}
