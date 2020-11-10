class LoadXMLException {
    constructor(code) {
        this.code = code;
    }
}

export class Credentials {
    constructor(username, password, confirmPassword) {
        const errors = {
            NOTALLFIELDSENTERED: "Please enter all fields.",
            PASSWORDSNOTEQUAL: "The password and confirmation password are not equal.",
            PASSWORDPATTERNVIOLATION: "The password must be at least eight characters in length and have a number, lower case and upper case character."
        }

        // Do not throw error since validation is not desired in all instances (e.g., not when setting a new inital user password)
        if (!username || !password || confirmPassword === "") this.error = errors.NOTALLFIELDSENTERED;
        else if ((confirmPassword || confirmPassword === "") && password != confirmPassword) this.error = errors.PASSWORDSNOTEQUAL;
        else if (!new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/).test(password)) this.error = errors.PASSWORDPATTERNVIOLATION;

        this.username = username;
        this.password = password;
    }

    get hashedPassword() {
        return CryptoJS.SHA1(this.password).toString();
    }
}

export const loadXMLExceptionCodes = {
    NODATAFOUND: 0,
    DATAENCRYPTED: 1,
    NOTDECRYPTABLE: 2
}

export const serverStatus = {
    SERVERNOTFOUND: 0,
    SERVERINITIALIZED: 1,
    SERVERNOTINITIALIZED: 2
}

export const loginStatus = {
    WRONGCREDENTIALS: 0,
    USERHASINITIALPASSWORD: 1
}

const $ = query => document.querySelector(query);

const metadataFileName = "metadata";
const admindataFileName = "admindata";
const globalOptionsFileName = "globaloptions";

let user = null;
let decryptionKey = null;
let serverURL = null;

// Keeps app options that are equal for all users of the app -- options may have default values assigned
let globalOptions = {
    surveyCode: "0000",
    textAsTextarea: false,
    autoSurveyView: false
};

export async function init() {
    const globalOptionsString = localStorage.getItem(globalOptionsFileName);
    if (globalOptionsString) globalOptions = JSON.parse(globalOptionsString);

    setIOListeners();

    // Check if app is served by an OpenEDC Server instance
    // For development purposes, check for an ?server= query string parameter and use it instead of the current url
    const devServer = new URLSearchParams(window.location.search).get("server");
    return await getServerStatus(devServer ? devServer : getBaseURL()).catch(() => console.log("No OpenEDC Server found. It seems that this is a standalone OpenEDC App."));
}

async function getStoredXMLData(fileName) {
    // TODO: Why is this function sometimes called twice for metadata and admindata? -> deactivate login button after pressing it once
    let xmlString = null;

    if (serverURL) {
        console.log("Load stored xml data from server ...", fileName);
        const xmlResponse = await fetch(getApiUrlFromFileName(fileName), { headers: getHeaders(true) });
        if (!xmlResponse.ok) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND);
        xmlString = await xmlResponse.text();
    } else {
        console.log("Load stored xml data locally ...", fileName);
        xmlString = localStorage.getItem(fileName);
        if (!xmlString) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND);
    }

    if (decryptionKey) {
        try {
            xmlString = CryptoJS.AES.decrypt(xmlString, decryptionKey).toString(CryptoJS.enc.Utf8);
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
    if (decryptionKey) xmlString = CryptoJS.AES.encrypt(xmlString, decryptionKey).toString();

    if (serverURL) {
        // TODO: Error handling
        // TODO: Consider that this function is async -- adjust the callers when needed
        await fetch(getApiUrlFromFileName(fileName), {
            method: "PUT",
            headers: getHeaders(true),
            body: xmlString
        });
    } else {
        localStorage.setItem(fileName, xmlString);
    }
}

function getApiUrlFromFileName(fileName) {
    let apiUrl = serverURL + "/api/";

    if (fileName == metadataFileName || fileName == admindataFileName) apiUrl += fileName
    else apiUrl += "clinicaldata/" + fileName;

    return apiUrl;
}

export async function getSubjectFileNames() {
    let subjectFileNames = [];

    if (serverURL) {
        const response = await fetch(serverURL + "/api/clinicaldata", { headers: getHeaders(true) });
        subjectFileNames = await response.json();
    } else {
        for (let fileName of Object.keys(localStorage)) {
            if (fileName != metadataFileName && fileName != admindataFileName && fileName != globalOptionsFileName) subjectFileNames.push(fileName);
        }
    }

    return subjectFileNames;
}

export function encryptXMLData(key) {
    for (const fileName of Object.keys(localStorage)) {
        if (fileName == globalOptionsFileName) continue;

        let xmlString = localStorage.getItem(fileName);
        const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
        if (!xmlDocument.querySelector("parsererror")) {
            xmlString = new XMLSerializer().serializeToString(xmlDocument);
            xmlString = CryptoJS.AES.encrypt(xmlString, key).toString();
            localStorage.setItem(fileName, xmlString);
        }
    }

    decryptionKey = key;
}

// TODO: Have a look if this is okay -- only valid for local encryption
export function setDecryptionKey(key) {
    const xmlString = localStorage.getItem("metadata");

    try {
        CryptoJS.AES.decrypt(xmlString, key).toString(CryptoJS.enc.Utf8);
        decryptionKey = key;
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

export async function getMetadata() {
    return await getStoredXMLData(metadataFileName);
}

export function storeMetadata(metadata) {
    storeXMLData(metadataFileName, metadata);
}

export async function getAdmindata() {
    const admindata = await getStoredXMLData(admindataFileName);
    return admindata.documentElement;
}

export function storeAdmindata(admindata) {
    storeXMLData(admindataFileName, admindata);
}

export async function getSubjectData(fileName) {
    const subjectData = await getStoredXMLData(fileName);
    return subjectData.documentElement;
}

export async function storeSubjectData(subject, subjectData) {
    const previousFileName = subject.fileName;

    subject.modifiedDate = new Date();
    await storeXMLData(subject.fileName, subjectData);

    // This mechanism helps to prevent possible data loss when multiple users edit the same subject data at the same time (especially important for the offline mode)
    // If the previousFileName cannot be removed, the system keeps multiple current versions of the subject data and the user is notified that conflicting data exists
    if (previousFileName != subject.fileName) removeSubjectData(previousFileName);

    return subject;
}

export async function removeSubjectData(fileName) {
    if (serverURL) {
        await fetch(getApiUrlFromFileName(fileName), {
            method: "DELETE",
            headers: getHeaders(true)
        });
    } else {
        localStorage.removeItem(fileName);
    }
}

function storeGlobalOptions() {
    localStorage.setItem(globalOptionsFileName, JSON.stringify(globalOptions));
}

export function getServerURL() {
    return serverURL;
}

export function getLocalUser() {
    return user;
}

export function setSurveyCode(surveyCode) {
    if (parseInt(surveyCode) == surveyCode && surveyCode.length == 4) {
        globalOptions.surveyCode = surveyCode;
        storeGlobalOptions();
        return Promise.resolve();
    } else {
        return Promise.reject();
    }
}

export function getSurveyCode() {
    return globalOptions.surveyCode;
}

export function setTextAsTextarea(enable) {
    globalOptions.textAsTextarea = enable;
    storeGlobalOptions();
}

export function isTextAsTextarea() {
    return globalOptions.textAsTextarea;
}

export function setAutoSurveyView(enable) {
    globalOptions.autoSurveyView = enable;
    storeGlobalOptions();
}

export function isAutoSurveyView() {
    return globalOptions.autoSurveyView;
}

export async function getServerStatus(url) {
    if (!url.includes("http") && !url.includes("https")) url = "https://" + url;
    
    const response = await fetch(url + "/api/status").catch(() => Promise.reject(serverStatus.SERVERNOTFOUND));
    const status = await response.json();

    if (status.serverVersion && status.initialized) {
        serverURL = url;
        return Promise.resolve(serverStatus.SERVERINITIALIZED);
    } else if (status.serverVersion && !status.initialized) {
        return Promise.resolve(serverStatus.SERVERNOTINITIALIZED);
    } else {
        return Promise.reject(serverStatus.SERVERNOTFOUND);
    }
}

export async function initializeServer(url, userOID, credentials) {
    // Create a random key that is used for data encryption and encrypt it with the password of the user
    const decryptionKey = CryptoJS.lib.WordArray.random(32).toString();
    const encryptedDecryptionKey = CryptoJS.AES.encrypt(decryptionKey, credentials.password).toString();
    const userRequest = { username: credentials.username, hashedPassword: credentials.hashedPassword, encryptedDecryptionKey };

    // Create the owner user on the server
    const userResponse = await fetch(url + "/api/users/initialize/" + userOID, {
            method: "PUT",
            headers: getHeaders(false, true),
            body: JSON.stringify(userRequest)
        });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    // Send all existing metadata encrypted to the server
    let metadataString = new XMLSerializer().serializeToString(await getMetadata());
    metadataString = CryptoJS.AES.encrypt(metadataString, decryptionKey).toString();
    const metadataResponse = await fetch(url + "/api/metadata", {
        method: "PUT",
        headers: getHeaders(true),
        body: metadataString
    });
    if (!metadataResponse.ok) return Promise.reject(await metadataResponse.text());

    // Send all existing metadata encrypted to the server
    let admindataString = new XMLSerializer().serializeToString(await getAdmindata());
    admindataString = CryptoJS.AES.encrypt(admindataString, decryptionKey).toString();
    const admindataResponse = await fetch(url + "/api/admindata", {
        method: "PUT",
        headers: getHeaders(true),
        body: admindataString
    });
    if (!admindataResponse.ok) return Promise.reject(await admindataResponse.text());

    // Send all existing clinicaldata encrypted to the server
    // TODO: Naming -- subjectData vs subjectdata?
    const subjectFileNames = await getSubjectFileNames();
    for (const subjectFileName of subjectFileNames) {
        let subjectDataString = new XMLSerializer().serializeToString(await getSubjectData(subjectFileName));
        subjectDataString = CryptoJS.AES.encrypt(subjectDataString, decryptionKey).toString();
        const clinicaldataResponse = await fetch(url + "/api/clinicaldata/" + subjectFileName, {
            method: "PUT",
            headers: getHeaders(true),
            body: subjectDataString
        });
        if (!clinicaldataResponse.ok) return Promise.reject(await admindataResponse.text());
    }
    localStorage.clear();
    
    return Promise.resolve(url);
}

export async function loginToServer(credentials) {
    const userResponse = await fetch(serverURL + "/api/users/me", {
        headers: { "Authorization" : `Basic ${btoa(credentials.username + ":" + credentials.hashedPassword)}` }
    });
    if (!userResponse.ok) return Promise.reject(loginStatus.WRONGCREDENTIALS);
    user = await userResponse.json();

    // Get the encryptedDecryptionKey of the user, decrypt it and store it in the decryptionKey variable
    try {
        decryptionKey = CryptoJS.AES.decrypt(user.encryptedDecryptionKey, credentials.password).toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.log(error);
    }

    // Test if the user has an initial password
    if (user.hasInitialPassword) return Promise.reject(loginStatus.USERHASINITIALPASSWORD);

    return Promise.resolve();
}

export async function setOwnPassword(credentials) {
    const encryptedDecryptionKey = CryptoJS.AES.encrypt(decryptionKey, credentials.password).toString();
    const userRequest = { username: credentials.username, hashedPassword: credentials.hashedPassword, encryptedDecryptionKey };
    
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
export async function setUserOnServer(oid, credentials, rights, site) {
    let userRequest = null;
    if (credentials.username && credentials.password) {
        const encryptedDecryptionKey = CryptoJS.AES.encrypt(decryptionKey, credentials.password).toString();
        userRequest = { username: credentials.username, hashedPassword: credentials.hashedPassword, encryptedDecryptionKey, rights, site };
    } else {
        userRequest = { rights, site };
    }

    const userResponse = await fetch(serverURL + "/api/users/" + oid, {
        method: "PUT",
        headers: getHeaders(true, true),
        body: JSON.stringify(userRequest)
    });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
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
    if (authorization) headers["Authorization"] = `Basic ${btoa(user.username + ":" + user.hashedPassword)}`;
    if (contentTypeJSON) headers["Content-Type"] = "application/json";

    return headers;
}

export async function getUserRights() {
    const rightsResponse = await fetch(serverURL + "/api/users/rights");
    return await rightsResponse.json();
}

export function removeElements(elements) {
    for (let element of elements) {
        element.remove();
    }
}

export function safeRemoveElement(element) {
    if (element) element.remove();
}

export function removeIsActiveFromElement(element) {
    if (element) element.classList.remove("is-active");
}

export function hideMenu() {
    $(".navbar-menu").classList.remove("is-active");
    $(".navbar-burger").classList.remove("is-active");
    $("#language-dropdown").classList.add("is-hidden-touch");
}

export function showWarning(title, message) {
    $("#warning-modal h2").textContent = title;
    $("#warning-modal p").innerHTML = message;
    $("#warning-modal").classList.add("is-active");
}

export function download(filename, content) {
    let prettifiedContent = prettifyContent(content);

    let element = document.createElement("a");
    element.setAttribute("href", "data:text/xml;charset=utf-8," + encodeURIComponent(prettifiedContent));
    element.setAttribute("download", filename);

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
            if (j == 0 || csvHeaders[j][i] != csvHeaders[j-1][i]) csvString += csvHeaders[j][i].replaceAll(",", "");
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

export function shortenText(text, places) {
    return text.length > places ? text.substr(0, places) + " ..." :  text;
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
    console.log("Set tree max height ...");
    const offset = 30;
    const minHeight = 350;
    const windowHeight = window.innerHeight;
    const isMobile = isMobile();

    for (let treePanelBlock of document.querySelectorAll(".tree-panel-blocks")) {
        if (isMobile) {
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

function setIOListeners() {
    $("#warning-modal button").addEventListener("click", () => $("#warning-modal").classList.remove("is-active"));
}
