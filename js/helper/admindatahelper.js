import * as admindataTemplates from "./admindatatemplates.js";

const $ = query => admindata.querySelector(query);
const $$ = query => admindata.querySelectorAll(query);

const admindataFileName = "admindata";

let admindata = null;

export function loadEmptyProject(studyOID) {
    admindata = admindataTemplates.getAdminData(studyOID);
}

export function parseAdmindata(odmXMLString) {
    admindata = new DOMParser().parseFromString(odmXMLString, "text/xml").documentElement;
}

export function getSerializedAdmindata() {
    return new XMLSerializer().serializeToString(admindata);
}

export function getAdmindata() {
    return admindata;
}

export function storeAdmindata() {
    localStorage.setItem(admindataFileName, getSerializedAdmindata());
}

export function loadStoredAdmindata() {
    let admindataXMLString = localStorage.getItem(admindataFileName);
    if (admindataXMLString) parseAdmindata(admindataXMLString);

    if (getAdmindata()) return true;
}

export function addSite() {
    const lastSite = getLastElement($$("Location [LocationType='Site']"));
    const newSite = admindataTemplates.getSite(generateUniqueOID("Site."));

    if (lastSite) {
        lastSite.insertAdjacentElement("afterend", newSite);
    } else {
        admindata.appendChild(newSite);
    }

    // TODO: It is probably better this way -- meaning that the helper itself stores the file on change
    storeAdmindata();
}

function generateUniqueOID(oidPrefix) {
    let count = 1;
    while ($(`[OID="${oidPrefix+count}"]`)) {
        count += 1;
    }

    return oidPrefix+count;
}

function getLastElement(elements) {
    if (elements.length >= 1) {
        return elements[elements.length - 1];
    } else {
        return null;
    }
}
