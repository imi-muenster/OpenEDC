import * as metadataWrapper from "./metadatawrapper.js";
import * as clinicaldataWrapper from "./clinicaldatawrapper.js";
import * as admindataTemplates from "../odmtemplates/admindatatemplates.js";
import * as languageHelper from "../helper/languagehelper.js";
import * as ioHelper from "../helper/iohelper.js";

class AdmindataFile {
    constructor(modifiedDate) {
        this.modifiedDate = modifiedDate || new Date();
    }

    static parse(fileName) {
        const modifiedDate = new Date(parseInt(fileName.split(ioHelper.fileNameSeparator)[1]));
        return new AdmindataFile(modifiedDate);
    }

    get fileName() {
        return ioHelper.odmFileNames.admindata + ioHelper.fileNameSeparator + this.modifiedDate.getTime();
    }
}

// TODO: Introduce User class continaing user name, first name, last name, site, and rights and refactor according parts in the code (admindatamodule.js and app.js)
// TODO: Maybe move User class to ioHelper and add hasRight function

const $ = query => admindata.querySelector(query);
const $$ = query => admindata.querySelectorAll(query);

export const errors = {
    SITEHASSUBJECTS: 0,
    SITEHASUSERS: 1
}

let admindata = null;
let admindataFile = null;

export function loadEmptyProject() {
    admindata = admindataTemplates.getAdminData();
    addUser();
    storeAdmindata();
}

export function importAdmindata(odmXMLString) {
    const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
    if (odm.querySelector("AdminData")) {
        admindata = odm.querySelector("AdminData");
        if (getUsers().length == 0) addUser();
        storeAdmindata();
    }
}

export function getAdmindata(studyOID) {
    admindata.setAttribute("StudyOID", studyOID);
    return admindata;
}

export async function loadStoredAdmindata() {
    admindataFile = AdmindataFile.parse(await ioHelper.getODMFileName(ioHelper.odmFileNames.admindata));
    const xmlData = await ioHelper.getODM(admindataFile.fileName);
    admindata = xmlData.documentElement;
}

export async function storeAdmindata() {
    const previousFileName = admindataFile?.fileName;

    admindataFile = new AdmindataFile();
    await ioHelper.setODM(admindataFile.fileName, admindata);

    if (previousFileName && previousFileName != admindataFile.fileName) ioHelper.removeODM(previousFileName);
    ioHelper.dispatchGlobalEvent('AdmindataStored');
}

export function getLastUpdate() {
    return admindataFile.modifiedDate.getTime();
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
    if (ioHelper.getLoggedInUser()) return ioHelper.getLoggedInUser().oid;
    else if (admindata) return getUsers()[0].getOID();
    else return "U.1";
}

export function getCurrentUserSiteOID() {
    const user = getUser(getCurrentUserOID());
    return user.querySelector("LocationRef")?.getAttribute("LocationOID");
}

export function addUser() {
    const newUserOID = generateUniqueOID("U.");
    const newUser = admindataTemplates.getUser(newUserOID, languageHelper.getTranslation("new"), languageHelper.getTranslation("user"));
    
    const lastUser = getUsers().getLastElement();
    if (lastUser) lastUser.insertAdjacentElement("afterend", newUser);
    else admindata.appendChild(newUser);

    storeAdmindata();
    return newUserOID;
}

export async function setUserInfo(userOID, firstName, lastName, locationOID) {
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
    
    await storeAdmindata();
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
    return site?.getOID();
}

export function getSiteNameByOID(siteOID) {
    const site = getSite(siteOID);
    return site?.getName();
}

export function getSites() {
    return $$("Location[LocationType='Site']");
}

export function addSite() {
    const newSiteOID = generateUniqueOID("L.");
    const newSite = admindataTemplates.getSite(newSiteOID, languageHelper.getTranslation("new-site"), metadataWrapper.getStudyOID(), metadataWrapper.getMetaDataVersionOID(), new Date().toISOString().split("T")[0]);
    
    const lastSite = getSites().getLastElement();
    if (lastSite) lastSite.insertAdjacentElement("afterend", newSite);
    else admindata.appendChild(newSite);

    storeAdmindata();
    return newSiteOID;
}

export function setSiteName(siteOID, name) {
    const site = getSite(siteOID);
    if (site) site.setAttribute("Name", name);

    storeAdmindata();
}

export function removeSite(siteOID) {
    if (clinicaldataWrapper.getSubjects(siteOID).length) return Promise.reject(errors.SITEHASSUBJECTS);
    if ($(`User LocationRef[LocationOID="${siteOID}"]`)) return Promise.reject(errors.SITEHASUSERS);

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
