import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as htmlElements from "./helper/htmlelements.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export function init() {
    admindataHelper.loadStoredAdmindata();
}

export function loadUsers() {
    ioHelper.removeElements($$("#users-options .panel a"));
    ioHelper.safeRemoveElement($("#user-site-select-outer"));

    $("#user-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("user-site-select", true, true, [], null));
    $("#user-first-name-input").value = "";
    $("#user-last-name-input").value = "";
    $("#user-site-select-inner").disabled = true;
    $("#user-first-name-input").disabled = true;
    $("#user-last-name-input").disabled = true;
    $("#user-save-button").disabled = true;
    $("#user-remove-button").disabled = true;

    const users = admindataHelper.getUsers();
    if (users.length > 0) $("#no-users-hint").classList.add("is-hidden");
    else $("#no-users-hint").classList.remove("is-hidden");

    for (let user of users) {
        const panelBlock = document.createElement("a");
        panelBlock.className = "panel-block has-no-border-left";
        panelBlock.textContent = user.querySelector("FirstName").textContent + " " + user.querySelector("LastName").textContent;
        panelBlock.setAttribute("oid", user.getAttribute("OID"));
        panelBlock.onclick = () => loadUser(user.getAttribute("OID"));
        $("#add-user-button").insertAdjacentElement("beforebegin", panelBlock);
    }
}

function loadUser(userOID) {
    const user = admindataHelper.getUser(userOID);
    if (!user) return;

    ioHelper.removeIsActiveFromElement($("#users-options .panel a.is-active"));
    $(`#users-options .panel a[oid="${userOID}"]`).classList.add("is-active");

    // Create site select
    let sites = ["No Site"];
    admindataHelper.getSites().forEach(site => sites.push(site.getAttribute("Name")));
    ioHelper.safeRemoveElement($("#user-site-select-outer"));
    let currentSiteName = null;
    const locationRef = user.querySelector("LocationRef");
    if (locationRef) currentSiteName = admindataHelper.getSiteNameByOID(locationRef.getAttribute("LocationOID"));
    $("#user-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("user-site-select", true, true, sites, currentSiteName));

    // Fill other inputs and adjust enable status
    $("#user-first-name-input").value = user.querySelector("FirstName").textContent;
    $("#user-last-name-input").value = user.querySelector("LastName").textContent;
    $("#user-site-select-inner").disabled = false;
    $("#user-first-name-input").disabled = false;
    $("#user-last-name-input").disabled = false;
    $("#user-save-button").disabled = false;
    $("#user-remove-button").disabled = false;
}

window.addUser = function() {
    const userOID = admindataHelper.addUser();

    loadUsers();
    loadUser(userOID);
}

window.saveUser = function() {
    const userOID = $("#users-options .panel a.is-active").getAttribute("oid");
    if (!userOID) return;

    admindataHelper.setUserInfo(userOID, $("#user-first-name-input").value, $("#user-last-name-input").value, admindataHelper.getSiteOIDByName($("#user-site-select-inner").value));
    loadUsers();
}

window.removeUser = function() {
    const userOID = $("#users-options .panel a.is-active").getAttribute("oid");
    if (!userOID) return;

    admindataHelper.removeUser(userOID);
    loadUsers();
}

export function loadSites() {
    ioHelper.removeElements($$("#sites-options .panel a"));

    $("#site-name-input").value = "";
    $("#site-name-input").disabled = true;
    $("#site-save-button").disabled = true;
    $("#site-remove-button").disabled = true;

    const sites = admindataHelper.getSites();
    if (sites.length > 0) $("#no-sites-hint").classList.add("is-hidden");
    else $("#no-sites-hint").classList.remove("is-hidden");

    for (let site of sites) {
        const panelBlock = document.createElement("a");
        panelBlock.className = "panel-block has-no-border-left";
        panelBlock.textContent = site.getAttribute("Name");
        panelBlock.setAttribute("oid", site.getAttribute("OID"));
        panelBlock.onclick = () => loadSite(site.getAttribute("OID"));
        $("#add-site-button").insertAdjacentElement("beforebegin", panelBlock);
    }
}

function loadSite(siteOID) {
    const site = admindataHelper.getSite(siteOID);
    if (!site) return;

    ioHelper.removeIsActiveFromElement($("#sites-options .panel a.is-active"));
    $(`#sites-options .panel a[oid="${siteOID}"]`).classList.add("is-active");

    $("#site-name-input").value = site.getAttribute("Name");
    $("#site-name-input").disabled = false;
    $("#site-save-button").disabled = false;
    $("#site-remove-button").disabled = false;
}

window.addSite = function() {
    const siteOID = admindataHelper.addSite();

    loadSites();
    loadSite(siteOID);

    clinicaldataModule.createSiteFilterSelect();
}

window.saveSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getAttribute("oid");
    if (!siteOID) return;

    admindataHelper.setSiteName(siteOID, $("#site-name-input").value);
    loadSites();

    clinicaldataModule.createSiteFilterSelect();
}

window.removeSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getAttribute("oid");
    if (!siteOID) return;

    admindataHelper.removeSite(siteOID)
        .then(() => {
            loadSites();
            clinicaldataModule.createSiteFilterSelect();
            clinicaldataModule.loadSubjectKeys();
        })
        .catch(error => {
            switch (error) {
                case admindataHelper.errors.SITEHASSUBJECTS:
                    ioHelper.showWarning("Site not removed", "The site could not be removed since there is at least one subject assigned to it. To remove a site, you have to remove all subjects assigned to this site first.");
            }
        });
}
