class LoadXMLException {
    constructor(code, message) {
        this.code = code;
        this.message = message;
    }
}

export const loadXMLExceptionCodes = {
    NODATAFOUND: 0,
    DATAENCRYPTED: 1,
    NOTDECRYPTABLE: 2
}

const $ = query => document.querySelector(query);

const globalOptionsFileName = "globaloptions";

let encryptionPassword = null;

// Keeps app options that are equal for all users of the app -- options may have default values assigned
let globalOptions = {
    surveyCode: "0000"
};

export function getStoredXMLData(fileName) {
    let xmlString = localStorage.getItem(fileName);
    if (!xmlString) {
        throw new LoadXMLException(loadXMLExceptionCodes.NODATAFOUND, "The XML data could not be loaded. It seems that no data has been stored yet.");
    }

    if (encryptionPassword) {
        try {
            xmlString = CryptoJS.AES.decrypt(xmlString, encryptionPassword).toString(CryptoJS.enc.Utf8);
        } catch (error) {
            throw new LoadXMLException(loadXMLExceptionCodes.NOTDECRYPTABLE, "The XML data could not be decrypted.");
        }
    }

    const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
    if (xmlDocument.querySelector("parsererror")) {
        if (!encryptionPassword) {
            throw new LoadXMLException(loadXMLExceptionCodes.DATAENCRYPTED, "The XML data could not be loaded. It seems that the data is encrypted.");
        } else {
            throw new LoadXMLException(loadXMLExceptionCodes.NOTDECRYPTABLE, "The XML data could not be decrypted.");
        }
    } else {
        return xmlDocument;
    }
}

export function storeXMLData(fileName, xmlDocument) {
    let xmlString = new XMLSerializer().serializeToString(xmlDocument);
    if (encryptionPassword) {
        xmlString = CryptoJS.AES.encrypt(xmlString, encryptionPassword).toString();
    }

    localStorage.setItem(fileName, xmlString);
}

export function encryptXMLData(password) {
    if (password.length < 8) return Promise.reject();

    encryptionPassword = password;
    for (const fileName of Object.keys(localStorage)) {
        if (fileName == globalOptionsFileName) continue;

        let xmlString = localStorage.getItem(fileName);
        const xmlDocument = new DOMParser().parseFromString(xmlString, "text/xml");
        if (!xmlDocument.querySelector("parsererror")) {
            xmlString = new XMLSerializer().serializeToString(xmlDocument);
            xmlString = CryptoJS.AES.encrypt(xmlString, encryptionPassword).toString();
            localStorage.setItem(fileName, xmlString);
        }
    }

    return Promise.resolve();
}

export function loadGlobalOptions() {
    const globalOptionsString = localStorage.getItem(globalOptionsFileName);
    if (globalOptionsString) globalOptions = JSON.parse(globalOptionsString);
}

function storeGlobalOptions() {
    localStorage.setItem(globalOptionsFileName, JSON.stringify(globalOptions));
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

export function setDecryptionPassword() {
    const decryptionPassword = $("#login-modal #password-input").value;
    const xmlString = localStorage.getItem("metadata");

    try {
        CryptoJS.AES.decrypt(xmlString, decryptionPassword).toString(CryptoJS.enc.Utf8);
        encryptionPassword = decryptionPassword;
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
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
