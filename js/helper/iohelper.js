class LoadXMLException {
    constructor(code) {
        this.code = code;
    }
}

export const loadXMLExceptionCodes = {
    NODATAFOUND: 0,
    DATAENCRYPTED: 1,
    NOTDECRYPTABLE: 2,
    NOTLOGGEDIN: 3
}

export const serverConnectionStatus = {
    SERVERNOTFOUND: 0,
    SERVERINITIALIZED: 1,
    SERVERNOTINITIALIZED: 2
}

const $ = query => document.querySelector(query);

const metadataFileName = "metadata";
const admindataFileName = "admindata";
export const fileNameSeparator = "__";

const globalOptionsFileName = "globaloptions";
const localOptionsFileName = "localoptions";

let user = null;
let decryptionKey = null;

// Keeps app options that are equal for all users of the app -- options may have default values assigned
let globalOptions = {
    surveyCode: "0000"
};

// Keeps app options for the local user
let localOptions = {
    serverURL: null
};

export function init() {
    const globalOptionsString = localStorage.getItem(globalOptionsFileName);
    if (globalOptionsString) globalOptions = JSON.parse(globalOptionsString);

    const localOptionsString = localStorage.getItem(localOptionsFileName);
    if (localOptionsString) localOptions = JSON.parse(localOptionsString);

    setIOListeners();
}

async function getStoredXMLData(fileName) {
    let xmlString = null;

    if (localOptions.serverURL) {
        if (!user) throw new LoadXMLException(loadXMLExceptionCodes.NOTLOGGEDIN);
        // TODO: Not always load metadata!
        const xmlResponse = await fetch(localOptions.serverURL + "/api/metadata", {
            headers: getHeaders(true)
        });
        if (!xmlResponse.ok) throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND);
        xmlString = await xmlResponse.text();
    } else {
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

function storeXMLData(fileName, xmlDocument) {
    let xmlString = new XMLSerializer().serializeToString(xmlDocument);
    if (decryptionKey) xmlString = CryptoJS.AES.encrypt(xmlString, decryptionKey).toString();

    localStorage.setItem(fileName, xmlString);
}

export function encryptXMLData(key) {
    // TODO: Move to app.js or add this analogously to initializeServer
    if (key.length < 8) return Promise.reject();

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
    return Promise.resolve();
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

export function storeSubjectData(fileName, subjectData) {
    storeXMLData(fileName, subjectData);
}

export function removeSubjectData(fileName) {
    localStorage.removeItem(fileName);
}

export function getSubjectFileNames() {
    const subjectFileNames = [];

    for (let fileName of Object.keys(localStorage)) {
        if (fileName.split(fileNameSeparator).length > 1) subjectFileNames.push(fileName);
    }

    return subjectFileNames;
}

function storeOptions() {
    localStorage.setItem(globalOptionsFileName, JSON.stringify(globalOptions));
    localStorage.setItem(localOptionsFileName, JSON.stringify(localOptions));
}

export function setServerURL(serverURL) {
    localOptions.serverURL = serverURL;
    storeOptions();
}

export function getServerURL() {
    return localOptions.serverURL;
}

export function setSurveyCode(surveyCode) {
    if (parseInt(surveyCode) == surveyCode && surveyCode.length == 4) {
        globalOptions.surveyCode = surveyCode;
        storeOptions();
        return Promise.resolve();
    } else {
        return Promise.reject();
    }
}

export function getSurveyCode() {
    return globalOptions.surveyCode;
}

export async function getServerStatus(serverURL) {
    if (!serverURL.includes("http") && !serverURL.includes("https")) serverURL = "https://" + serverURL;
    
    const response = await fetch(serverURL + "/api/status").catch(() => Promise.reject(serverConnectionStatus.SERVERNOTFOUND));
    const serverStatus = await response.json();

    if (serverStatus.serverVersion && serverStatus.initialized) {
        return Promise.resolve(serverConnectionStatus.SERVERINITIALIZED);
    } else if (serverStatus.serverVersion && !serverStatus.initialized) {
        return Promise.resolve(serverConnectionStatus.SERVERNOTINITIALIZED);
    } else {
        return Promise.reject(serverConnectionStatus.SERVERNOTFOUND);
    }
}

export async function initializeServer(serverURL, username, password) {
    // Create a random key that is used for data encryption and encrypt it with the password of the user
    const decryptionKey = CryptoJS.lib.WordArray.random(32).toString();
    const encryptedDecryptionKey = CryptoJS.AES.encrypt(decryptionKey, password).toString();

    // Hash the user password before sending it to the server
    const hashedPassword = CryptoJS.SHA1(password).toString();
    const credentials = { username, hashedPassword, encryptedDecryptionKey };

    // Create the owner user on the server
    const userResponse = await fetch(serverURL + "/api/users/initialize", {
            method: "POST",
            headers: getHeaders(false, true),
            body: JSON.stringify(credentials)
        });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    // Send all existing data encrypted to the server
    let metadataString = new XMLSerializer().serializeToString(await getMetadata());
    metadataString = CryptoJS.AES.encrypt(metadataString, decryptionKey).toString();
    const metadataResponse = await fetch(serverURL + "/api/metadata", {
        method: "PUT",
        headers: getHeaders(true),
        body: metadataString
    });
    if (!metadataResponse.ok) return Promise.reject(await metadataResponse.text());

    localStorage.clear();

    localOptions.serverURL = serverURL;
    storeOptions();
    
    return Promise.resolve();
}

export async function loginToServer(username, password) {
    const hashedPassword = CryptoJS.SHA1(password).toString();
    const userResponse = await fetch(localOptions.serverURL + "/api/users/me", {
        headers: { "Authorization" : `Basic ${btoa(username + ":" + hashedPassword)}` }
    });
    if (!userResponse.ok) return Promise.reject(await userResponse.text());
    user = await userResponse.json();

    // Get the encryptedDecryptionKey of the user, decrypt it and store it in the decryptionKey variable
    try {
        decryptionKey = CryptoJS.AES.decrypt(user.encryptedDecryptionKey, password).toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.log(error);
    }

    return Promise.resolve();
}

function getHeaders(authorization, contentTypeJSON) {
    let headers = {};
    if (authorization) headers["Authorization"] = `Basic ${btoa(user.username + ":" + user.hashedPassword)}`;
    if (contentTypeJSON) headers["Content-Type"] = "application/json";

    return headers;
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
    return window.location.origin + window.location.pathname;
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
    const windowWidth = window.innerWidth;

    for (let treePanelBlock of document.querySelectorAll(".tree-panel-blocks")) {
        if (windowWidth < 1024) {
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

function setIOListeners() {
    $("#warning-modal button").addEventListener("click", () => $("#warning-modal").classList.remove("is-active"));
}
