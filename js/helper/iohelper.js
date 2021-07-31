import * as indexedDBHelper from "./indexeddbhelper.js";
import * as cryptoHelper from "./cryptohelper.js";
import * as languageHelper from "./languagehelper.js";

class LoadXMLException {
    constructor(code) {
        this.code = code;
    }
}

export class Credentials {
    constructor(username, password, confirmPassword) {
        const errors = {
            NOTALLFIELDSENTERED: "enter-all-fields",
            PASSWORDSNOTEQUAL: "passwords-not-equal",
            PASSWORDPATTERNVIOLATION: "password-not-secure"
        }

        // Do not throw error since validation is not desired in all instances (e.g., not when setting a new inital user password)
        if (!username || !password || confirmPassword === "") this.error = errors.NOTALLFIELDSENTERED;
        else if ((confirmPassword || confirmPassword === "") && password != confirmPassword) this.error = errors.PASSWORDSNOTEQUAL;
        else if (!new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/).test(password)) this.error = errors.PASSWORDPATTERNVIOLATION;

        this.username = username;
        this.password = password;
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

export const interactionTypes = {
    DEFAULT: 1,
    WARNING: 3,
    DANGER: 4
}

const $ = query => document.querySelector(query);

const fileNames = {
    metadata: "metadata",
    admindata: "admindata",
    settings: "settings",
    localkey: "localkey"
}

let user = null;
let decryptionKey = null;
let serverURL = null;

// Keeps app options that are equal for all users of the app
export const subjectKeyModes = {
    MANUAL: "subject-key-mode-manual",
    AUTO: "subject-key-mode-auto",
    BARCODE: "subject-key-mode-barcode"
}

let settings = {
    surveyCode: null,
    textAsTextarea: false,
    autoSurveyView: false,
    subjectKeyMode: subjectKeyModes.MANUAL
};

export async function init() {
    await indexedDBHelper.init();
    await loadSettings();

    // Check if app is served by an OpenEDC Server instance
    // For development purposes, check for an ?server= query string parameter and use it instead of the current url
    const devServer = new URLSearchParams(window.location.search).get("server");
    return await getServerStatus(devServer ? devServer : getBaseURL(), true).catch(() => console.log("No OpenEDC Server found. It seems that this is a standalone OpenEDC App."));
}

async function getStoredXMLData(fileName) {
    // TODO: Why is this function sometimes called twice for metadata and admindata? -> deactivate login button after pressing it once
    let xmlString = null;

    if (serverURL) {
        const xmlResponse = await fetch(getApiUrlFromFileName(fileName), { headers: await getHeaders(true) });
        if (!xmlResponse.ok) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND);
        xmlString = await xmlResponse.text();
    } else {
        xmlString = await indexedDBHelper.get(fileName);
        if (!xmlString) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND);
    }

    if (decryptionKey) {
        try {
            xmlString = await cryptoHelper.AES.decrypt.withKey(xmlString, decryptionKey);
        } catch (error) {
            throw new LoadXMLException(loadXMLExceptionCodes.NOTDECRYPTABLE);
        }
    }

    const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
    if (xmlDocument.querySelector("parsererror")) {
        if (!decryptionKey) {
            throw new LoadXMLException(loadXMLExceptionCodes.DATAENCRYPTED);
        } else {
            throw new LoadXMLException(loadXMLExceptionCodes.NOTDECRYPTABLE);
        }
    } else {
        return xmlDocument;
    }
}

async function storeXMLData(fileName, xmlDocument) {
    let xmlString = new XMLSerializer().serializeToString(xmlDocument);
    if (decryptionKey) xmlString = await cryptoHelper.AES.encrypt.withKey(xmlString, decryptionKey);

    if (serverURL) {
        // TODO: Error handling
        // TODO: Consider that this function is async -- adjust the callers when needed
        await fetch(getApiUrlFromFileName(fileName), {
            method: "PUT",
            headers: await getHeaders(true),
            body: xmlString
        });
    } else {
        await indexedDBHelper.put(fileName, xmlString);
    }
}

function getApiUrlFromFileName(fileName) {
    let apiUrl = serverURL + "/api/";

    if (Object.values(fileNames).includes(fileName)) apiUrl += fileName;
    else apiUrl += "clinicaldata/" + fileName;

    return apiUrl;
}

export async function getSubjectFileNames() {
    let subjectFileNames = [];

    if (serverURL) {
        const response = await fetch(serverURL + "/api/clinicaldata", { headers: await getHeaders(true) });
        subjectFileNames = await response.json();
    } else {
        for (let fileName of await indexedDBHelper.getKeys()) {
            if (!Object.values(fileNames).includes(fileName)) subjectFileNames.push(fileName);
        }
    }

    return subjectFileNames;
}

// Only for local encryption
export async function encryptXMLData(password) {
    // Generate new cryptoHelper.AES encryption/decryption key
    const decryptionKey = await cryptoHelper.AES.generateKey();

    for (const fileName of await indexedDBHelper.getKeys()) {
        if (fileName == fileNames.settings) continue;

        // Encrypt all locally stored xml files
        let xmlString = await indexedDBHelper.get(fileName);
        const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
        if (!xmlDocument.querySelector("parsererror")) {
            xmlString = new XMLSerializer().serializeToString(xmlDocument);
            xmlString = await cryptoHelper.AES.encrypt.withKey(xmlString, decryptionKey);
            await indexedDBHelper.put(fileName, xmlString);
        }
    }

    // Store encrypted decryption key
    const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, password);
    await indexedDBHelper.put(fileNames.localkey, encryptedDecryptionKey)
}

// Only for local encryption
export async function setDecryptionKey(password) {
    const encryptedDecryptionKey = await indexedDBHelper.get(fileNames.localkey);

    try {
        decryptionKey = await cryptoHelper.AES.decrypt.withPassword(encryptedDecryptionKey, password);
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

export async function getMetadata() {
    return await getStoredXMLData(fileNames.metadata);
}

export async function storeMetadata(metadata) {
    await storeXMLData(fileNames.metadata, metadata);
}

export async function getAdmindata() {
    const admindata = await getStoredXMLData(fileNames.admindata);
    return admindata.documentElement;
}

export function storeAdmindata(admindata) {
    storeXMLData(fileNames.admindata, admindata);
}

export async function getSubjectData(fileName) {
    const subjectData = await getStoredXMLData(fileName);
    return subjectData.documentElement;
}

export async function storeSubjectData(fileName, subjectData) {
    await storeXMLData(fileName, subjectData);
}

// For performance reasons of IndexedDB, only used for local storage
export async function storeSubjectDataBulk(fileNameList, subjectDataList) {
    await indexedDBHelper.putBulk(fileNameList, subjectDataList);
}

export async function removeSubjectData(fileName) {
    if (serverURL) {
        await fetch(getApiUrlFromFileName(fileName), {
            method: "DELETE",
            headers: await getHeaders(true)
        });
    } else {
        await indexedDBHelper.remove(fileName);
    }
}

export async function removeAllData() {
    await indexedDBHelper.clear();
}

export async function loadSettings() {
    if (serverURL) {
        const settingsResponse = await fetch(getApiUrlFromFileName(fileNames.settings), { headers: await getHeaders(true) });
        if (settingsResponse.ok && settingsResponse.status != 204) settings = await settingsResponse.json();
    } else {
        const settingsString = await indexedDBHelper.get(fileNames.settings);
        if (settingsString) settings = JSON.parse(settingsString);
    }
}

async function storeSettings() {
    if (serverURL) {
        await fetch(getApiUrlFromFileName(fileNames.settings), {
            method: "PUT",
            headers: await getHeaders(true),
            body: JSON.stringify(settings)
        });
    } else {
        await indexedDBHelper.put(fileNames.settings, JSON.stringify(settings));
    }
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

// TODO: Setting and getting project settings should be more generic
export function setSurveyCode(surveyCode) {
    if (surveyCode.length == 0 || (parseInt(surveyCode) == surveyCode && surveyCode.length == 4)) {
        settings.surveyCode = surveyCode;
        storeSettings();
        return Promise.resolve();
    } else {
        return Promise.reject();
    }
}

export function getSurveyCode() {
    return settings.surveyCode;
}

export function setTextAsTextarea(enable) {
    settings.textAsTextarea = enable;
    storeSettings();
}

export function isTextAsTextarea() {
    return settings.textAsTextarea;
}

export function setAutoSurveyView(enable) {
    settings.autoSurveyView = enable;
    storeSettings();
}

export function isAutoSurveyView() {
    return settings.autoSurveyView;
}

export function setSubjectKeyMode(subjectKeyMode) {
    settings.subjectKeyMode = subjectKeyMode;
    storeSettings();
}

export function getSubjectKeyMode() {
    return settings.subjectKeyMode;
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

export async function initializeServer(url, userOID, credentials) {
    if (!url.includes("http") && !url.includes("https")) url = "https://" + url;
    
    // Create a random key that is used for data encryption and encrypt it with the password of the user
    const decryptionKey = await cryptoHelper.AES.generateKey();
    const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, credentials.password);
    const hashedPassword = await cryptoHelper.SHA.hash(credentials.password);
    const userRequest = { username: credentials.username, hashedPassword, encryptedDecryptionKey};

    // Create the owner user on the server
    const userResponse = await fetch(url + "/api/users/initialize/" + userOID, {
            method: "PUT",
            headers: await getHeaders(false, true),
            body: JSON.stringify(userRequest)
        });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    // Send all existing metadata encrypted to the server
    let metadataString = new XMLSerializer().serializeToString(await getMetadata());
    metadataString = await cryptoHelper.AES.encrypt.withKey(metadataString, decryptionKey);
    const metadataResponse = await fetch(url + "/api/metadata", {
        method: "PUT",
        headers: await getHeaders(true),
        body: metadataString
    });
    if (!metadataResponse.ok) return Promise.reject(await metadataResponse.text());

    // Send all existing metadata encrypted to the server
    let admindataString = new XMLSerializer().serializeToString(await getAdmindata());
    admindataString = await cryptoHelper.AES.encrypt.withKey(admindataString, decryptionKey);
    const admindataResponse = await fetch(url + "/api/admindata", {
        method: "PUT",
        headers: await getHeaders(true),
        body: admindataString
    });
    if (!admindataResponse.ok) return Promise.reject(await admindataResponse.text());

    // Send all existing clinicaldata encrypted to the server
    // TODO: Naming -- subjectData vs subjectdata?
    const subjectFileNames = await getSubjectFileNames();
    for (const subjectFileName of subjectFileNames) {
        let subjectDataString = new XMLSerializer().serializeToString(await getSubjectData(subjectFileName));
        subjectDataString = await cryptoHelper.AES.encrypt.withKey(subjectDataString, decryptionKey);
        const clinicaldataResponse = await fetch(url + "/api/clinicaldata/" + subjectFileName, {
            method: "PUT",
            headers: await getHeaders(true),
            body: subjectDataString
        });
        if (!clinicaldataResponse.ok) return Promise.reject(await admindataResponse.text());
    }
    await removeAllData();
    
    return Promise.resolve(url);
}

export async function loginToServer(credentials) {
    const hashedPassword = await cryptoHelper.SHA.hash(credentials.password);
    const userResponse = await fetch(serverURL + "/api/users/me", {
        headers: { "Authorization" : `Basic ${btoa(credentials.username + ":" + hashedPassword)}` }
    });
    if (!userResponse.ok) return Promise.reject(loginStatus.WRONGCREDENTIALS);
    user = await userResponse.json();

    // Get the encryptedDecryptionKey of the user, decrypt it and store it in the decryptionKey variable
    try {
        decryptionKey = await cryptoHelper.AES.decrypt.withPassword(user.encryptedDecryptionKey, credentials.password);
    } catch (error) {
        return Promise.reject(loginStatus.WRONGCREDENTIALS);
    }

    // Test if the user has an initial password
    if (user.hasInitialPassword) return Promise.reject(loginStatus.USERHASINITIALPASSWORD);

    return Promise.resolve();
}

export async function setOwnPassword(credentials) {
    const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, credentials.password);
    const hashedPassword = await cryptoHelper.SHA.hash(credentials.password);
    const userRequest = { username: credentials.username, hashedPassword, encryptedDecryptionKey };
    
    const userResponse = await fetch(serverURL + "/api/users/me", {
        method: "PUT",
        headers: await getHeaders(true, true),
        body: JSON.stringify(userRequest)
    });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    return Promise.resolve();
}

// TODO: Naming -- should I add a new serverhelper.js that handles all server communication?
export async function setUserOnServer(oid, credentials, rights, site) {
    let userRequest = null;
    if (credentials.username && credentials.password) {
        const encryptedDecryptionKey = await cryptoHelper.AES.encrypt.withPassword(decryptionKey, credentials.password);
        const hashedPassword = await cryptoHelper.SHA.hash(credentials.password);
        userRequest = { username: credentials.username, hashedPassword, encryptedDecryptionKey, rights, site };
    } else {
        userRequest = { rights, site };
    }

    const userResponse = await fetch(serverURL + "/api/users/" + oid, {
        method: "PUT",
        headers: await getHeaders(true, true),
        body: JSON.stringify(userRequest)
    });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
}

export async function getUserOnServer(oid) {
    const userResponse = await fetch(serverURL + "/api/users/" + oid, { headers: await getHeaders(true) });
    if (!userResponse.ok) return Promise.reject();

    const user = await userResponse.json();
    return Promise.resolve(user);
}

export async function deleteUserOnServer(oid) {
    await fetch(serverURL + "/api/users/" + oid, {
        method: "DELETE",
        headers: await getHeaders(true)
    }).catch(() => Promise.reject());

    return Promise.resolve();
}

async function getHeaders(authorization, contentTypeJSON) {
    let headers = {};
    if (authorization) headers["Authorization"] = `Basic ${btoa(user.username + ":" + user.hashedPassword)}`;
    if (contentTypeJSON) headers["Content-Type"] = "application/json";

    return headers;
}

export async function emptyMessageQueue() {
    const dynamicCache = await caches.open("dynamic-cache");
    const dynamicCacheEntries = await dynamicCache.keys();
    const messageQueue = await caches.open("message-queue");
    const messageQueueEntries = await messageQueue.keys();

    for (let messageQueueEntry of messageQueueEntries) {
        const cacheResponse = await messageQueue.match(messageQueueEntry);
        const requestBody = await cacheResponse.text();
        await fetch(messageQueueEntry.url, {
            method: "PUT",
            headers: await getHeaders(true),
            body: requestBody
        });

        // When cinical subject data from the message queue was sent to the server, a previous version might still be stored there which needs to be removed
        // While this works fine, it should be refactored
        if (!messageQueueEntry.url.includes("clinicaldata")) continue;
        const lastSlashPosition = messageQueueEntry.url.lastIndexOf("/");
        const fileName = messageQueueEntry.url.substring(lastSlashPosition + 1);
        const subjectKey = fileName.split("__")[0];
        for (let dynamicCacheEntry of dynamicCacheEntries) {
            if (dynamicCacheEntry.url.includes("/" + subjectKey + "__")) {
                await fetch(dynamicCacheEntry.url, {
                    method: "DELETE",
                    headers: await getHeaders(true)
                });
            }
        }
    }
}

export async function getAppVersion() {
    const request = new Request(getBaseURL() + "/version.json", { cache: "reload" });
    const versionReponse = await fetch(request);
    const versionObject = await versionReponse.json();
    
    return versionObject.version; 
}

// TODO: Should be removed and then replaced in the future by element?.remove();
export function safeRemoveElement(element) {
    if (element) element.remove();
}

// TODO: Should be removed and then replaced in the future by element?.deactivate();
export function removeIsActiveFromElement(element) {
    if (element) element.deactivate();
}

export function hideMenu() {
    $(".navbar-menu").deactivate();
    $(".navbar-burger").deactivate();
    $("#language-navbar-item").deactivate();
    $("#language-dropdown").classList.add("is-hidden-touch");
}

export function showMessage(heading, message, callbacks, callbackType, closeText, closeCallback, isExtended) {
    const messageModal = document.createElement("message-modal");
    messageModal.setHeading(heading);
    messageModal.setMessage(message);
    messageModal.setCallbacks(callbacks);
    messageModal.setCallbackType(callbackType == interactionTypes.DANGER ? "is-danger" : "is-link");
    messageModal.setCloseText(closeText ? closeText : (callbacks ? languageHelper.getTranslation("close") : languageHelper.getTranslation("okay")));
    messageModal.setCloseCallback(closeCallback);
    messageModal.setSize(isExtended ? "is-medium" : "is-small");
    
    if (!$("#message-modal")) document.body.appendChild(messageModal);
}

export function showToast(message, duration, toastType) {
    const toast = document.createElement("div");
    toast.className = "notification is-toast";
    toast.classList.add(toastType == interactionTypes.WARNING ? "is-warning" : "is-success");
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

export function getCSVString(csvHeaders, csvData) {
    let csvString = "";

    // First, transpose the csv headers and add them to the csv string
    for (let i = 0; i < csvHeaders[0].length; i++) {
        // Do not create a header for the oids
        if (i <= 3) continue;

        // Add a heading for the subject key
        if (i == 6) csvString += "Subject";
        csvString += ",";
        
        // Add the actual header
        for (let j = 0; j < csvHeaders.length; j++) {
            // += is the most efficient way for string concatenation in javascript
            if (j == 0 || csvHeaders[j][i] != csvHeaders[j-1][i]) csvString += csvHeaders[j][i].replace(/,/g, "");
            if (j < csvHeaders.length-1) csvString += ",";
        }
        csvString += "\n";
    }

    // Second, add the clinicaldata to it
    for (let i = 0; i < csvData.length; i++) {
        for (let j = 0; j < csvData[i].length; j++) {
            csvString += csvData[i][j];
            if (j < csvData[i].length-1) csvString += ",";
        }
        csvString += "\n";
    }

    return csvString;
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
