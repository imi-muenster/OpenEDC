import * as metadataHelper from "./metadatahelper.js";
import * as clinicaldataHelper from "./clinicaldatahelper.js";
import * as admindataTemplates from "./admindatatemplates.js";
import * as ioHelper from "./iohelper.js";

const $ = query => admindata.querySelector(query);
const $$ = query => admindata.querySelectorAll(query);

const admindataFileName = "admindata";

export const errors = {
    SITEHASSUBJECTS: 0
}

let admindata = null;

export function loadEmptyProject(studyOID) {
    admindata = admindataTemplates.getAdminData(studyOID);
    // TODO: It is probably better this way -- meaning that the helper itself stores the file on change
    storeAdmindata();
}

export function importAdmindata(odmXMLString) {
    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    if (odm.querySelector("AdminData")) {
        admindata = odm.querySelector("AdminData");
        storeAdmindata();
    } else {
        loadEmptyProject();
    }
}

export function getAdmindata() {
    return admindata;
}

export function storeAdmindata() {
    ioHelper.storeXMLData(admindataFileName, admindata);
}

export function loadStoredAdmindata() {
    admindata = ioHelper.getStoredXMLData(admindataFileName).documentElement;
    if (!admindata) loadEmptyProject();
}

export function getUser(userOID) {
    return $(`User[OID="${userOID}"]`);
}

export function getUsers() {
    return $$("User");
}

export function addUser() {
    const newUserOID = generateUniqueOID("U.");
    const newUser = admindataTemplates.getUser(newUserOID);
    
    const lastUser = getLastElement(getUsers());
    if (lastUser) {
        lastUser.insertAdjacentElement("afterend", newUser);
    } else {
        admindata.appendChild(newUser);
    }

    // TODO: It is probably better this way -- meaning that the helper itself stores the file on change
    storeAdmindata();

    return newUserOID;
}

export function setUserInfo(userOID, firstName, lastName, locationOID) {
    let user = getUser(userOID);
    if (!user) return;

    user.querySelector("FirstName").textContent = firstName;
    user.querySelector("LastName").textContent = lastName;

    let locationRef = user.querySelector("LocationRef");
    if (locationOID) {
        if (locationRef) locationRef.setAttribute("LocationOID", locationOID);
        else user.appendChild(admindataTemplates.getLocationRef(locationOID));
    } else {
        if (locationRef) locationRef.remove();
    }

    storeAdmindata();
}

export function removeUser(userOID) {
    const user = getUser(userOID);
    if (user) user.remove();
    storeAdmindata();
}

export function getSite(siteOID) {
    return $(`Location[OID="${siteOID}"][LocationType="Site"]`);
}

export function getSiteOIDByName(siteName) {
    const site = $(`Location[Name="${siteName}"][LocationType="Site"]`);
    return site ? site.getAttribute("OID") : null;
}

export function getSiteNameByOID(siteOID) {
    const site = getSite(siteOID);
    return site ? site.getAttribute("Name") : null;
}

export function getSites() {
    return $$("Location[LocationType='Site']");
}

export function addSite() {
    const newSiteOID = generateUniqueOID("L.");
    const newSite = admindataTemplates.getSite(newSiteOID, metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID(), new Date().toISOString().split("T")[0]);
    
    const lastSite = getLastElement(getSites());
    if (lastSite) {
        lastSite.insertAdjacentElement("afterend", newSite);
    } else {
        admindata.appendChild(newSite);
    }

    // TODO: It is probably better this way -- meaning that the helper itself stores the file on change
    storeAdmindata();

    return newSiteOID;
}

export function setSiteName(siteOID, name) {
    const site = getSite(siteOID);
    if (site) site.setAttribute("Name", name);
    storeAdmindata();
}

export function removeSite(siteOID) {
    if (clinicaldataHelper.getSubjectKeys(siteOID).length > 0) return Promise.reject(errors.SITEHASSUBJECTS);

    const site = getSite(siteOID);
    if (site) site.remove();
    storeAdmindata();

    return Promise.resolve();
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
