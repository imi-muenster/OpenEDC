import * as indexedDBHelper from "./indexeddbhelper.js";
import * as cryptoHelper from "./cryptohelper.js";
import * as languageHelper from "./languagehelper.js";

class LoadXMLException {
    constructor(code) {
        this.code = code;
    }
}

export class Credentials {
    static errors = {
        NOTALLFIELDSENTERED: "enter-all-fields",
        PASSWORDSNOTEQUAL: "passwords-not-equal",
        PASSWORDPATTERNVIOLATION: "password-not-secure"
    };
    
    constructor(username, password, confirmPassword) {
        // Do not throw error since validation is not desired in all instances (e.g., not when setting a new inital user password)
        if (!username || !password || confirmPassword === "") this.error = Credentials.errors.NOTALLFIELDSENTERED;
        else if ((confirmPassword || confirmPassword === "") && password != confirmPassword) this.error = Credentials.errors.PASSWORDSNOTEQUAL;
        else if (!new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/).test(password)) this.error = Credentials.errors.PASSWORDPATTERNVIOLATION;

        this._username = username;
        this._password = password;
    }

    get username() {
        return this._username.toLowerCase();
    }

    get password() {
        return this._password;
    }
}

export const loadXMLExceptionCodes = {
    NODATAFOUND: 1,
    DATAENCRYPTED: 2,
    NOTDECRYPTABLE: 3
}

export const serverStatus = {
    SERVERNOTFOUND: 1,
    SERVERINITIALIZED: 2,
    SERVERNOTINITIALIZED: 3
}

export const loginStatus = {
    WRONGCREDENTIALS: 1,
    USERHASINITIALPASSWORD: 2
}

export const odmFileNames = {
    metadata: "metadata",
    admindata: "admindata",
    clinicaldata: "clinicaldata"
};

export const subjectKeyModes = {
    MANUAL: "subject-key-mode-manual",
    AUTO: "subject-key-mode-auto",
    BARCODE: "subject-key-mode-barcode"
}

export const interactionTypes = {
    PRIMARY: "is-link",
    SUCCESS: "is-success",
    WARNING: "is-warning",
    DANGER: "is-danger"
}

const fileTypes = {
    XML: "xml",
    JSON: "json"
}

export const userRights = {
    PROJECTOPTIONS: "project-options",
    EDITMETADATA: "edit-metadata",
    MANAGESUBJECTS: "manage-subjects",
    VALIDATEFORMS: "validate-forms",
    ADDSUBJECTDATA: "add-subject-data",
    EXPORTDATA: "allow-export-data"
};

const $ = query => document.querySelector(query);

let user = null;
let decryptionKey = null;
let serverURL = null;
let settings = null;
let eventListeners = [];
let jsZipLoaded = false;

export const fileNameSeparator = "__";

export async function init() {
    await indexedDBHelper.init(Object.values(fileTypes));

    // Check if app is served by an OpenEDC Server instance
    // For development purposes, check for an ?server= query string parameter and use it instead of the current url
    const devServer = new URLSearchParams(window.location.search).get("server");
    return await getServerStatus(devServer ? devServer : getBaseURL(), true).catch(() => Promise.resolve(serverStatus.SERVERNOTFOUND));
}

export async function getODM(fileName) {
    let xmlString = await getData(fileName, fileTypes.XML);
    if (!xmlString) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND)
    if (decryptionKey) {
        try {
            xmlString = await cryptoHelper.AES.decrypt.withKey(xmlString, decryptionKey);
        } catch (error) {
            throw new LoadXMLException(loadXMLExceptionCodes.NOTDECRYPTABLE);
        }
    }

    const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
    if (xmlDocument.querySelector("parsererror")) {
        if (decryptionKey) throw new LoadXMLException(loadXMLExceptionCodes.NOTDECRYPTABLE);
        else throw new LoadXMLException(loadXMLExceptionCodes.DATAENCRYPTED);
    } else {
        return xmlDocument;
    }
}

export async function setODM(fileName, xmlDocument, disableEncryption) {
    let xmlString = new XMLSerializer().serializeToString(xmlDocument);
    if (decryptionKey && !disableEncryption) xmlString = await cryptoHelper.AES.encrypt.withKey(xmlString, decryptionKey);

    await setData(fileName, xmlString, fileTypes.XML);
}

export async function removeODM(fileName) {
    await removeData(fileName, fileTypes.XML);
}

// For performance reasons of IndexedDB, only used for local storage
export async function setODMBulk(fileNameList, dataList) {
    await indexedDBHelper.putBulk(fileNameList, dataList, fileTypes.XML);
}

export async function getJSON(fileName) {
    const data = await getData(fileName, fileTypes.JSON);

    try {
        return JSON.parse(data);
    } catch (error) {
        return data;
    }
}

export async function setJSON(fileName, object) {
    const jsonString = JSON.stringify(object);
    await setData(fileName, jsonString, fileTypes.JSON);
}

export async function removeJSON(fileName) {
    await removeData(fileName, fileTypes.JSON);
}

async function getData(fileName, fileType) {
    if (serverURL) {
        const response = await fetch(getURLForFileName(fileName, fileType), { headers: getHeaders(true) });
        if (!response.ok) return;
        return await response.text();
    } else {
        return await indexedDBHelper.get(fileName, fileType);
    }
}

async function setData(fileName, content, fileType) {
    if (serverURL) {
        await fetch(getURLForFileName(fileName, fileType), {
            method: "PUT",
            headers: getHeaders(true),
            body: content
        });
    } else {
        await indexedDBHelper.put(fileName, content, fileType);
    }
}

async function removeData(fileName, fileType) {
    if (serverURL) {
        await fetch(getURLForFileName(fileName, fileType), {
            method: "DELETE",
            headers: getHeaders(true)
        });
    } else {
        await indexedDBHelper.remove(fileName, fileType);
    }
}

function getURLForFileName(fileName, fileType) {
    let url = serverURL + "/api/";
    switch (fileType) {
        case fileTypes.XML:
            const odmType = Object.values(odmFileNames).find(entry => fileName.includes(entry));
            return url + (odmType ? odmType : odmFileNames.clinicaldata) + "/" + fileName;
        case fileTypes.JSON:
            return url + fileTypes.JSON + "/" + fileName;
    }
}

export async function getLastServerUpdate() {
    const lastUpdateResponse = await fetch(serverURL + "/api/lastupdate", { headers: getHeaders(true) });
    return await lastUpdateResponse.json();
}

export async function getODMFileName(fileName) {
    let odmFileName;

    if (serverURL) {
        const lastUpdate = await getLastServerUpdate();
        odmFileName = fileName + fileNameSeparator + lastUpdate[fileName];
    } else {
        for (const localFileName of await indexedDBHelper.getKeys(fileTypes.XML)) {
            if (localFileName.includes(fileName)) odmFileName = localFileName;
        }
    }

    if (!odmFileName) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND);
    return odmFileName;
}

export async function getSubjectFileNames() {
    let subjectFileNames = [];

    if (serverURL) {
        const response = await fetch(serverURL + "/api/clinicaldata", { headers: getHeaders(true) });
        subjectFileNames = await response.json();
    } else {
        for (const fileName of await indexedDBHelper.getKeys(fileTypes.XML)) {
            if (!fileName.includes(odmFileNames.metadata) && !fileName.includes(odmFileNames.admindata)) subjectFileNames.push(fileName);
        }
    }

    return subjectFileNames;
}

// Only for local encryption
export async function encryptXMLData(password) {
    // Generate new cryptoHelper.AES encryption/decryption key
    const decryptionKey = await cryptoHelper.AES.generateKey();

    // Encrypt all locally stored xml files
    for (const fileName of await indexedDBHelper.getKeys(fileTypes.XML)) {
        let xmlString = await indexedDBHelper.get(fileName, fileTypes.XML);
        const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
        if (!xmlDocument.querySelector("parsererror")) {
            xmlString = new XMLSerializer().serializeToString(xmlDocument);
            xmlString = await cryptoHelper.AES.encrypt.withKey(xmlString, decryptionKey);
            await indexedDBHelper.put(fileName, xmlString, fileTypes.XML);
        }
    }

    // Store encrypted decryption key
    const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, password);
    await indexedDBHelper.put("localKey", encryptedDecryptionKey, fileTypes.JSON)
}

// Only for local encryption
export async function setDecryptionKey(password) {
    const encryptedDecryptionKey = await indexedDBHelper.get("localKey", fileTypes.JSON);

    try {
        decryptionKey = await cryptoHelper.AES.decrypt.withPassword(encryptedDecryptionKey, password);
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

export const deactivateServerEncryption = async () => {
    decryptionKey = null;
    await setSetting('disableEncryption', true);
}

export async function removeAllLocalData() {
    await indexedDBHelper.clear(fileTypes.XML);
    await indexedDBHelper.clear(fileTypes.JSON);
}

export function hasDecryptionKey() {
    return decryptionKey ? true : false;
}

export function hasServerURL() {
    return serverURL ? true : false;
}

export function getLoggedInUser() {
    return user;
}

export function userHasRight(right) {
    return !serverURL || user.rights.includes(right);
}

export async function loadSettings() {
    const defaultSettings = {
        surveyCode: null,
        textAsTextarea: false,
        autoSurveyView: false,
        showElementName: false,
        subjectKeyMode: subjectKeyModes.MANUAL
    };

    settings = await getJSON("settings") || defaultSettings;
}

export function getSetting(key) {
    return settings[key];
}

export async function setSetting(key, value) {
    settings[key] = value;
    await setJSON("settings", settings);
}

export async function getServerStatus(url, storeServerURL) {
    if (!url.includes("http") && !url.includes("https")) url = "https://" + url;
    
    const response = await fetch(url + "/api/status").catch(() => Promise.reject(serverStatus.SERVERNOTFOUND));
    const status = await response.json();

    if (status.serverVersion && status.initialized) {
        if (storeServerURL) serverURL = url;
        return Promise.resolve(serverStatus.SERVERINITIALIZED);
    } else if (status.serverVersion && !status.initialized) {
        return Promise.resolve(serverStatus.SERVERNOTINITIALIZED);
    } else {
        return Promise.reject(serverStatus.SERVERNOTFOUND);
    }
}

export async function initializeServer(url, userOID, credentials, disableEncryption = false) {
    if (!url.includes("http") && !url.includes("https")) url = "https://" + url;
    
    // Create a random key that is used for data encryption and encrypt it with the password of the user
    const decryptionKey = await cryptoHelper.AES.generateKey();
    const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, credentials.password);
    const authenticationKey = await cryptoHelper.PBKDF2.generateAuthenticationKey(credentials.username, credentials.password);
    const userRequest = { username: credentials.username, authenticationKey, encryptedDecryptionKey };

    // Create the owner user on the server
    const userResponse = await fetch(url + "/api/users/initialize/" + userOID, {
            method: "PUT",
            headers: getHeaders(false, true),
            body: JSON.stringify(userRequest)
        });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    // TODO: Reduce code by reusing methods from above? (i.e., setODM and setJSON)
    // Send all existing metadata encrypted to the server
    const metadataFileName = await getODMFileName(odmFileNames.metadata);
    const metadataXMLData = await getODM(metadataFileName);
    let metadataString = new XMLSerializer().serializeToString(metadataXMLData);
    if(!disableEncryption) metadataString = await cryptoHelper.AES.encrypt.withKey(metadataString, decryptionKey);
    const metadataResponse = await fetch(url + "/api/metadata/" + metadataFileName, {
        method: "PUT",
        headers: getHeaders(true),
        body: metadataString
    });
    if (!metadataResponse.ok) return Promise.reject(await metadataResponse.text());

    // Send all existing admindata encrypted to the server
    const admindataFileName = await getODMFileName(odmFileNames.admindata);
    const admindataXMLData = await getODM(admindataFileName);
    let admindataString = new XMLSerializer().serializeToString(admindataXMLData.documentElement);
    if(disableEncryption) admindataString = await cryptoHelper.AES.encrypt.withKey(admindataString, decryptionKey);
    const admindataResponse = await fetch(url + "/api/admindata/" + admindataFileName, {
        method: "PUT",
        headers: getHeaders(true),
        body: admindataString
    });
    if (!admindataResponse.ok) return Promise.reject(await admindataResponse.text());

    // Send all existing clinicaldata encrypted to the server
    const subjectFileNames = await getSubjectFileNames();
    for (const subjectFileName of subjectFileNames) {
        const subjectDataXMLData = await getODM(subjectFileName);
        let subjectDataString = new XMLSerializer().serializeToString(subjectDataXMLData.documentElement);
        if(disableEncryption) subjectDataString = await cryptoHelper.AES.encrypt.withKey(subjectDataString, decryptionKey);
        const clinicaldataResponse = await fetch(url + "/api/clinicaldata/" + subjectFileName, {
            method: "PUT",
            headers: getHeaders(true),
            body: subjectDataString
        });
        if (!clinicaldataResponse.ok) return Promise.reject(await clinicaldataResponse.text());
    }

    // Send all JSONs to the server
    for (const jsonFileName of await indexedDBHelper.getKeys(fileTypes.JSON)) {
        const json = await getJSON(jsonFileName);
        const jsonResponse = await fetch(url + "/api/json/" + jsonFileName, {
            method: "PUT",
            headers: getHeaders(true),
            body: JSON.stringify(json)
        });
        if (!jsonResponse.ok) return Promise.reject(await jsonResponse.text());
    }

    serverURL = url;
    await setSetting('disableEncryption', disableEncryption);

    await removeAllLocalData();
    
    return Promise.resolve(url);
}

export async function loginToServer(credentials) {
    console.log("Login");
    const authenticationKey = await cryptoHelper.PBKDF2.generateAuthenticationKey(credentials.username, credentials.password);
    const userResponse = await fetch(serverURL + "/api/users/me", {
        headers: { "Authorization" : `Basic ${btoa(credentials.username + ":" + authenticationKey)}` }
    });
    if (!userResponse.ok) return Promise.reject(loginStatus.WRONGCREDENTIALS);
    user = await userResponse.json();
    await loadSettings();
    // Get the encryptedDecryptionKey of the user, decrypt it and store it in the decryptionKey variable
    let encryptionDisabled = await getSetting("disableEncryption");
    if(typeof encryptionDisabled == 'undefined' || encryptionDisabled === '') {
        encryptionDisabled = false;
        await setSetting('disableEncryption', encryptionDisabled);
    }
    if(!encryptionDisabled) {
        try {
            decryptionKey = await cryptoHelper.AES.decrypt.withPassword(user.encryptedDecryptionKey, credentials.password);
        } catch (error) {
            return Promise.reject(loginStatus.WRONGCREDENTIALS);
        }
    }
    // Test if the user has an initial password
    if (user.hasInitialPassword) return Promise.reject(loginStatus.USERHASINITIALPASSWORD);

    return Promise.resolve();
}

export async function setOwnPassword(credentials) {
    const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, credentials.password);
    const authenticationKey = await cryptoHelper.PBKDF2.generateAuthenticationKey(credentials.username, credentials.password);
    const userRequest = { username: credentials.username, authenticationKey, encryptedDecryptionKey };
    
    const userResponse = await fetch(serverURL + "/api/users/me", {
        method: "PUT",
        headers: getHeaders(true, true),
        body: JSON.stringify(userRequest)
    });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    return Promise.resolve();
}

// TODO: Naming -- should I add a new serverhelper.js that handles all server communication?
// TODO: Setting the currently logged in user in this location good approach?
export async function setUserOnServer(oid, credentials, rights, site) {
    let userRequest = null;
    if (credentials.username && credentials.password) {
        const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, credentials.password);
        const authenticationKey = await cryptoHelper.PBKDF2.generateAuthenticationKey(credentials.username, credentials.password);
        userRequest = { username: credentials.username, authenticationKey, encryptedDecryptionKey, rights, site };
    } else {
        userRequest = { rights, site };
    }

    const userResponse = await fetch(serverURL + "/api/users/" + oid, {
        method: "PUT",
        headers: getHeaders(true, true),
        body: JSON.stringify(userRequest)
    });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    if (user.oid == oid) user = await userResponse.json();
}

export async function getUserOnServer(oid) {
    const userResponse = await fetch(serverURL + "/api/users/" + oid, { headers: getHeaders(true) });
    if (!userResponse.ok) return Promise.reject();

    const user = await userResponse.json();
    return Promise.resolve(user);
}

export async function deleteUserOnServer(oid) {
    await fetch(serverURL + "/api/users/" + oid, {
        method: "DELETE",
        headers: getHeaders(true)
    }).catch(() => Promise.reject());

    return Promise.resolve();
}

function getHeaders(authorization, contentTypeJSON) {
    let headers = {};
    if (authorization) headers["Authorization"] = `Basic ${btoa(user.username + ":" + user.authenticationKey)}`;
    if (contentTypeJSON) headers["Content-Type"] = "application/json";

    return headers;
}

export async function disposeExpiredCaches() {
    // Cleans expired cached ODM files that were updated remotely by another user
    // A file may be metadata, admindata, or a subject's clinical data
    const filesFound = [];

    caches.open("odm-cache").then(odmCache => {
        odmCache.keys().then(keys => {
            keys.reverse().forEach(key => {
                const file = key.url.substring(key.url.lastIndexOf("/") + 1).split(fileNameSeparator)[0];
                if (filesFound.includes(file)) odmCache.delete(key);
                else filesFound.push(file);
            });
        });
    });   
}

export async function emptyMessageQueue() {
    const messageQueue = await caches.open("message-queue");
    const messageQueueEntries = await messageQueue.keys();
    const odmCache = messageQueueEntries.length ? await caches.open("odm-cache") : null;
    const odmCacheEntries = odmCache ? await odmCache.keys() : [];

    for (let messageQueueEntry of messageQueueEntries) {
        const cacheResponse = await messageQueue.match(messageQueueEntry);
        const requestBody = await cacheResponse.text();
        await fetch(messageQueueEntry.url, {
            method: "PUT",
            headers: getHeaders(true),
            body: requestBody
        });

        // When cinical subject data from the message queue was sent to the server, a previous version might still be stored there which needs to be removed
        // TODO: While this works fine, it should be refactored
        if (!messageQueueEntry.url.includes("clinicaldata")) continue;
        const subjectKey = messageQueueEntry.url.substring(messageQueueEntry.url.lastIndexOf("/") + 1).split(fileNameSeparator)[0];
        for (let odmCacheEntry of odmCacheEntries) {
            if (odmCacheEntry.url.includes("/" + subjectKey + fileNameSeparator)) {
                await fetch(odmCacheEntry.url, {
                    method: "DELETE",
                    headers: getHeaders(true)
                });
            }
        }
    }
}

export async function getAppVersion() {
    const versionReponse = await fetch(getBaseURL() + "/version.json");
    const versionObject = await versionReponse.json();
    
    return versionObject.version; 
}

export function hideMenu() {
    $(".navbar-menu").deactivate();
    $(".navbar-burger").deactivate();
    $("#language-navbar-item").deactivate();
    $("#app-mode-button").deactivate();
    $("#language-dropdown").classList.add("is-hidden-touch");
}

export function showMessage(heading, message, callbacks, callbackType, closeText, closeCallback, isExtended, isSticky) {
    const messageModal = document.createElement("message-modal");
    messageModal.setHeading(heading);
    messageModal.setMessage(message);
    messageModal.setCallbacks(callbacks);
    messageModal.setCallbackType(callbackType ?? interactionTypes.PRIMARY);
    messageModal.setCloseText(closeText ? closeText : (callbacks ? languageHelper.getTranslation("close") : languageHelper.getTranslation("okay")));
    messageModal.setCloseCallback(closeCallback);
    messageModal.setSize(isExtended ? "is-medium" : "is-small");
    messageModal.setIsSticky(isSticky ?? false)
    
    if (!$("#message-modal")) document.body.appendChild(messageModal);
}

export function showToast(message, duration, toastType) {
    const toast = document.createElement("div");
    toast.className = "notification is-toast";
    toast.classList.add(toastType ?? interactionTypes.SUCCESS);
    toast.innerHTML = message;

    const closeButton = document.createElement("button");
    closeButton.className = isMobile() ? "delete is-medium" : "delete";
    closeButton.onclick = () => fadeOutToast(toast);
    toast.insertAdjacentElement("afterbegin", closeButton);

    fadeInToast(toast);
    if (duration) setTimeout(() => fadeOutToast(toast), duration);
}

function fadeInToast(toast) {
    const currentToast = $(".is-toast");
    if (currentToast) fadeOutToast(currentToast);

    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = 1, currentToast ? 1000 : 500);
}

function fadeOutToast(toast) {
    toast.style.opacity = 0;
    setTimeout(() => toast.remove(), 500);
}

export function addGlobalEventListener(name, callback, options) {
    if (options && options.replace) eventListeners = eventListeners.reduce((listeners, listener) => {
        if (listener.name == name) document.removeEventListener(listener.name, listener.callback);
        else listeners.push(listener);
        return listeners;
    }, []);

    document.addEventListener(name, callback);
    eventListeners.push({ name, callback });
}

export function dispatchGlobalEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, detail ? { detail } : null));
}

export function download(filename, extension, content) {
    const prettifiedContent = prettifyContent(content);
    const element = document.createElement("a");

    element.href = "data:text/" + extension + ";charset=utf-8," + encodeURIComponent(prettifiedContent);
    element.download = filename + "." + extension;
    element.style.display = "none";

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

export async function downloadAsZip(filename, contentFiles) {
    if(!jsZipLoaded) {
        await import("../../lib/jszip.min.js");
        jsZipLoaded = true;
    }
    
    const zip = new JSZip();
    contentFiles.forEach(({filename, extension, content}) => {
        zip.file(`${filename}.${extension}`, content);
    });
    zip.generateAsync({type: 'blob'}).then(zipFile => {
        saveAs(zipFile, `${filename}.zip`);
      });
   
}

export async function getFileContent(file) {
    let data = await new Response(file).text();
    return data;
}

export function getBaseURL() {
    const url = window.location.origin + window.location.pathname;
    return url.slice(-1) == "/" ? url.slice(0, -1) : url;
}

export function prettifyContent(content) {
    let nsRemoved = content.replace(new RegExp(` xmlns=""`, "g"), "");

    let formatted = "";
    let indent= "";
    let tab = "    ";

    nsRemoved.split(/>\s*</).forEach(function(node) {
        if (node.match( /^\/\w/ )) indent = indent.substring(tab.length);
        formatted += indent + '<' + node + '>\r\n';
        if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;
    });

    return formatted.substring(1, formatted.length-3);
}

export function scrollParentToChild(child) {
    let parent = child.parentNode;
    let parentRect = parent.getBoundingClientRect();
    let childRect = child.getBoundingClientRect();
    let isVisibleTop = (childRect.top >= parentRect.top);
    let isVisibleBottom = (childRect.bottom <= parentRect.bottom);

    if (!isVisibleTop) {
        parent.scrollTop = (childRect.top + parent.scrollTop) - parentRect.top;
    } else if (!isVisibleBottom) {
        parent.scrollTop = (childRect.bottom + parent.scrollTop) - parentRect.bottom;
    }
}

export function setTreeMaxHeight() {
    const offset = 30;
    const minHeight = 250;
    const windowHeight = window.innerHeight;
    const isMobileDevice = isMobile();

    for (let treePanelBlock of document.querySelectorAll(".tree-panel-blocks")) {
        if (isMobileDevice) {
            treePanelBlock.style.maxHeight = null;
            continue;
        };

        let panelTop = treePanelBlock.getBoundingClientRect().top;
        let addButtonHeight = 0;
        if (treePanelBlock.nextElementSibling) addButtonHeight = treePanelBlock.nextElementSibling.getBoundingClientRect().height;

        let remainingSpace = windowHeight - panelTop - addButtonHeight - offset;
        if (remainingSpace < minHeight) remainingSpace = minHeight;

        treePanelBlock.style.maxHeight = `${remainingSpace}px`;
    }
}

export function isMobile() {
    return window.innerWidth < 1024;
}
