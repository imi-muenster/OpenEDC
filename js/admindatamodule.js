import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as htmlElements from "./helper/htmlelements.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export async function init() {
    await admindataHelper.loadStoredAdmindata().catch(() => admindataHelper.loadEmptyProject());
}

export async function loadUsers() {
    $$("#users-options .panel a").removeElements();
    $$("#user-rights .checkbox").removeElements();
    ioHelper.safeRemoveElement($("#user-site-select-outer"));

    $("#user-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("user-site-select", true, true, [], null));
    [$("#user-first-name-input"), $("#user-last-name-input"), $("#user-username-input"), $("#user-password-input")].emptyInputs();
    [$("#user-site-select-inner"), $("#user-first-name-input"), $("#user-last-name-input"), $("#user-username-input"), $("#user-password-input"), $("#user-save-button"), $("#user-remove-button")].disableElements();

    const users = admindataHelper.getUsers();
    if (users.length) $("#no-users-hint").hide();
    else $("#no-users-hint").show();

    for (let user of users) {
        const userOID = user.getOID();
        const panelBlock = document.createElement("a");
        panelBlock.className = "panel-block has-no-border-left";
        panelBlock.textContent = admindataHelper.getUserFullName(userOID);
        panelBlock.setAttribute("oid", userOID);
        panelBlock.onclick = () => loadUser(userOID);
        $("#add-user-button").insertAdjacentElement("beforebegin", panelBlock);
    }

    for (let userRight of Object.values(admindataHelper.userRights)) {
        const translatedRight = languageHelper.getTranslation(userRight);
        $("#user-rights").insertAdjacentHTML("beforeend", `<label class="checkbox"><input type="checkbox" name="${userRight}" disabled> ${translatedRight}</label>`);
    }

    const localUserOID = admindataHelper.getCurrentUserOID();
    $(`#users-options [oid="${localUserOID}"]`).textContent += " (" + languageHelper.getTranslation("you") + ")";

    if (ioHelper.hasServerURL()) $("#add-user-button button").disabled = false;
}

function loadUser(userOID) {
    const user = admindataHelper.getUser(userOID);
    if (!user) return;

    ioHelper.removeIsActiveFromElement($("#users-options .panel a.is-active"));
    $(`#users-options .panel a[oid="${userOID}"]`).activate();

    // Create site select
    let sites = [languageHelper.getTranslation("no-site")];
    admindataHelper.getSites().forEach(site => sites.push(site.getName()));
    ioHelper.safeRemoveElement($("#user-site-select-outer"));
    let currentSiteName = null;
    const locationRef = user.querySelector("LocationRef");
    if (locationRef) currentSiteName = admindataHelper.getSiteNameByOID(locationRef.getAttribute("LocationOID"));
    $("#user-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("user-site-select", true, true, sites, currentSiteName));

    // Fill other inputs and adjust enable status
    $("#user-first-name-input").value = user.querySelector("FirstName").textContent;
    $("#user-last-name-input").value = user.querySelector("LastName").textContent;
    [$("#user-first-name-input"), $("#user-last-name-input"), $("#user-save-button")].enableElements();
    if (admindataHelper.getUsers().length > 1) $("#user-remove-button").disabled = false;

    if (ioHelper.hasServerURL()) {
        [$("#user-username-input"), $("#user-password-input")].emptyInputs();
        [$("#user-username-input"), $("#user-password-input")].enableElements();
        $("#user-password-input").placeholder = "";
        $$("#user-rights input").forEach(checkbox => {
            checkbox.disabled = false;
            checkbox.checked = false;
        });
        ioHelper.getUserOnServer(userOID)
            .then(user => {
                if (user.username) {
                    $("#user-username-input").value = user.username
                    $("#user-password-input").placeholder = languageHelper.getTranslation("reset-initial-password");
                }
                $$("#user-rights input").forEach(checkbox => {
                    if (user.rights && user.rights.includes(checkbox.name)) checkbox.checked = true;
                });
            })
            .catch(() => console.log("The selected user could not be loaded from the server (i.e., offline, no permission, or user not yet synced with the server)."));
    } else {
        // Local users have all rights
        $$("#user-rights input").forEach(checkbox => checkbox.checked = true);
    }
}

window.addUser = function() {
    const userOID = admindataHelper.addUser();

    loadUsers();
    loadUser(userOID);
}

window.saveUser = function() {
    const userOID = $("#users-options .panel a.is-active").getOID();
    if (!userOID) return;

    const firstName = $("#user-first-name-input").value;
    const lastName = $("#user-last-name-input").value
    const locationOID = admindataHelper.getSiteOIDByName($("#user-site-select-inner").value);
    admindataHelper.setUserInfo(userOID, firstName, lastName, locationOID);
    
    if (ioHelper.hasServerURL()) {
        const username = $("#user-username-input").value;
        const initialPassword = $("#user-password-input").value;
        const credentials = new ioHelper.Credentials(username, initialPassword);
        const rights = Array.from($$("#user-rights input:checked")).map(checkbox => checkbox.name);
        ioHelper.setUserOnServer(userOID, credentials, rights, locationOID).catch(error => console.log(error));
    }

    if (userOID == admindataHelper.getCurrentUserOID()) document.dispatchEvent(new CustomEvent("CurrentUserEdited"));
    
    loadUsers();
}

window.removeUser = function() {
    const userOID = $("#users-options .panel a.is-active").getOID();
    if (!userOID) return;

    if (ioHelper.hasServerURL()) {
        ioHelper.deleteUserOnServer(userOID)
            .then(() => {
                admindataHelper.removeUser(userOID);
                loadUsers();
            })
            .catch(() => ioHelper.showMessage(languageHelper.getTranslation("user-not-removed"), languageHelper.getTranslation("user-not-removed-hint")));
    } else {
        admindataHelper.removeUser(userOID);
        loadUsers();
    }
}

export function loadSites() {
    $$("#sites-options .panel a").removeElements();
    $("#site-name-input").value = "";
    [$("#site-name-input"), $("#site-save-button"), $("#site-remove-button")].disableElements();

    const sites = admindataHelper.getSites();
    if (sites.length) $("#no-sites-hint").hide();
    else $("#no-sites-hint").show();

    for (let site of sites) {
        const siteOID = site.getOID();
        const panelBlock = document.createElement("a");
        panelBlock.className = "panel-block has-no-border-left";
        panelBlock.textContent = site.getName();
        panelBlock.setAttribute("oid", siteOID);
        panelBlock.onclick = () => loadSite(siteOID);
        $("#add-site-button").insertAdjacentElement("beforebegin", panelBlock);
    }
}

function loadSite(siteOID) {
    const site = admindataHelper.getSite(siteOID);
    if (!site) return;

    ioHelper.removeIsActiveFromElement($("#sites-options .panel a.is-active"));
    $(`#sites-options .panel a[oid="${siteOID}"]`).activate();

    $("#site-name-input").value = site.getName();
    [$("#site-name-input"), $("#site-save-button"), $("#site-remove-button")].enableElements();
}

window.addSite = function() {
    const siteOID = admindataHelper.addSite();

    loadSites();
    loadSite(siteOID);

    clinicaldataModule.createSiteFilterSelect();
}

window.saveSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getOID();
    if (!siteOID) return;

    admindataHelper.setSiteName(siteOID, $("#site-name-input").value);
    loadSites();

    clinicaldataModule.createSiteFilterSelect();
}

window.removeSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getOID();
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
                    ioHelper.showMessage(languageHelper.getTranslation("site-not-removed"), languageHelper.getTranslation("site-not-removed-hint-subject"));
                    break;
                case admindataHelper.errors.SITEHASUSERS:
                    ioHelper.showMessage(languageHelper.getTranslation("site-not-removed"), languageHelper.getTranslation("site-not-removed-hint-user"));
            }
        });
}
