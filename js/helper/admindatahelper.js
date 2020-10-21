import * as metadataHelper from "./metadatahelper.js"; 
import * as admindataTemplates from "./admindatatemplates.js";
import * as ioHelper from "./iohelper.js";

const $ = query => admindata.querySelector(query);
const $$ = query => admindata.querySelectorAll(query);

const admindataFileName = "admindata";

let admindata = null;

export function loadEmptyProject(studyOID) {
    admindata = admindataTemplates.getAdminData(studyOID);
    // TODO: It is probably better this way -- meaning that the helper itself stores the file on change
    storeAdmindata();
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
}

export function getSite(siteOID) {
    return $(`Location[OID="${siteOID}"][LocationType="Site"]`);
}

export function getSites() {
    return $$("Location[LocationType='Site']");
}

export function addSite() {
    const lastSite = getLastElement(getSites());
    const newSite = admindataTemplates.getSite(generateUniqueOID("Site."), metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID(), new Date().toISOString().split("T")[0]);

    if (lastSite) {
        lastSite.insertAdjacentElement("afterend", newSite);
    } else {
        admindata.appendChild(newSite);
    }

    // TODO: It is probably better this way -- meaning that the helper itself stores the file on change
    storeAdmindata();

    return newSite.getAttribute("OID");
}

export function setSiteName(siteOID, name) {
    $(`Location[OID="${siteOID}"][LocationType="Site"]`).setAttribute("Name", name);
    storeAdmindata();
}

export function removeSite(siteOID) {
    ioHelper.safeRemoveElement($(`Location[OID="${siteOID}"][LocationType="Site"]`));
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
