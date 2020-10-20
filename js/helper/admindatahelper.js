import * as admindataTemplates from "./admindatatemplates.js";

const $ = query => admindata.querySelector(query);

const admindataFileName = "admindata";

let admindata = null;

export function loadEmptyProject() {
    admindata = admindataTemplates.getAdminData();
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

function generateUniqueOID(oidPrefix) {
    let count = 1;
    while ($(`[OID="${oidPrefix+count}"]`)) {
        count += 1;
    }

    return oidPrefix+count;
}
