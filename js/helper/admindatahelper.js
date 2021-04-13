import * as metadataHelper from "./metadatahelper.js";
import * as clinicaldataHelper from "./clinicaldatahelper.js";
import * as admindataTemplates from "../odmtemplates/admindatatemplates.js";
import * as languageHelper from "./languagehelper.js";
import * as ioHelper from "./iohelper.js";

const $ = query => admindata.querySelector(query);
const $$ = query => admindata.querySelectorAll(query);

export const userRights = {
    PROJECTOPTIONS: "project-options",
    EDITMETADATA: "edit-metadata",
    MANAGESUBJECTS: "manage-subjects",
    VALIDATEFORMS: "validate-forms",
    ADDSUBJECTDATA: "add-subject-data"
};

export const errors = {
    SITEHASSUBJECTS: 0,
    SITEHASUSERS: 1
}

let admindata = null;

export function loadEmptyProject() {
    admindata = admindataTemplates.getAdminData();
    addUser();
    ioHelper.storeAdmindata(admindata);
}

export function importAdmindata(odmXMLString) {
    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    if (odm.querySelector("AdminData")) {
        admindata = odm.querySelector("AdminData");
        if (getUsers().length == 0) addUser();
        ioHelper.storeAdmindata(admindata);
    }
}

export function getAdmindata(studyOID) {
    admindata.setAttribute("StudyOID", studyOID);
    return admindata;
}

export async function loadStoredAdmindata() {
    admindata = await ioHelper.getAdmindata();
}

export function getUsers() {
    return $$("User");
}

export function getUser(userOID) {
    return $(`User[OID="${userOID}"]`);
}

export function getUserFullName(userOID) {
    const user = getUser(userOID);
    return user.querySelector("FirstName").textContent + " " + user.querySelector("LastName").textContent;
}

export function getCurrentUserOID() {
    if (ioHelper.getLoggedInUser()) {
        return ioHelper.getLoggedInUser().oid;
    } else {
        return getUsers()[0].getOID();
    }
}

export function addUser() {
    const newUserOID = generateUniqueOID("U.");
    const newUser = admindataTemplates.getUser(newUserOID, languageHelper.getTranslation("new"), languageHelper.getTranslation("user"));
    
    const lastUser = getUsers().getLastElement();
    if (lastUser) {
        lastUser.insertAdjacentElement("afterend", newUser);
    } else {
        admindata.appendChild(newUser);
    }

    ioHelper.storeAdmindata(admindata);

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
    
    ioHelper.storeAdmindata(admindata);
}

export function removeUser(userOID) {
    const user = getUser(userOID);
    if (user) user.remove();
    ioHelper.storeAdmindata(admindata);
}

export function getSite(siteOID) {
    return $(`Location[OID="${siteOID}"][LocationType="Site"]`);
}

export function getSiteOIDByName(siteName) {
    const site = $(`Location[Name="${siteName}"][LocationType="Site"]`);
    return site ? site.getOID() : null;
}

export function getSiteNameByOID(siteOID) {
    const site = getSite(siteOID);
    return site ? site.getName() : null;
}

export function getSites() {
    return $$("Location[LocationType='Site']");
}

export function addSite() {
    const newSiteOID = generateUniqueOID("L.");
    const newSite = admindataTemplates.getSite(newSiteOID, languageHelper.getTranslation("new-site"), metadataHelper.getStudyOID(), metadataHelper.getMetaDataVersionOID(), new Date().toISOString().split("T")[0]);
    
    const lastSite = getSites().getLastElement();
    if (lastSite) {
        lastSite.insertAdjacentElement("afterend", newSite);
    } else {
        admindata.appendChild(newSite);
    }

    ioHelper.storeAdmindata(admindata);

    return newSiteOID;
}

export function setSiteName(siteOID, name) {
    const site = getSite(siteOID);
    if (site) site.setAttribute("Name", name);
    ioHelper.storeAdmindata(admindata);
}

export function removeSite(siteOID) {
    if (clinicaldataHelper.getSubjects(siteOID).length > 0) return Promise.reject(errors.SITEHASSUBJECTS);
    if ($(`User LocationRef[LocationOID="${siteOID}"]`)) return Promise.reject(errors.SITEHASUSERS);

    const site = getSite(siteOID);
    if (site) site.remove();
    ioHelper.storeAdmindata(admindata);

    return Promise.resolve();
}

function generateUniqueOID(oidPrefix) {
    let count = 1;
    while ($(`[OID="${oidPrefix+count}"]`)) {
        count += 1;
    }

    return oidPrefix+count;
}
