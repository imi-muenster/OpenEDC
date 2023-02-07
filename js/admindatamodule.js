import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as admindataWrapper from "./odmwrapper/admindatawrapper.js";
import * as languageHelper from "./helper/languagehelper.js";
import * as ioHelper from "./helper/iohelper.js";
import * as htmlElements from "./helper/htmlelements.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export async function init() {
    await admindataWrapper.loadStoredAdmindata().catch(() => admindataWrapper.loadEmptyProject());
}

window.reloadUsers = () => {
    loadUsers();
}

export async function loadUsers() {
    $$("#users-options .panel a").removeElements();
    $$("#user-rights .checkbox").removeElements();
    $("#user-site-select-outer")?.remove();

    $("#user-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("user-site-select", true, true, [], null));
    [$("#user-first-name-input"), $("#user-last-name-input"), $("#user-username-input"), $("#user-password-input")].emptyInputs();
    [$("#user-site-select-inner"), $("#user-first-name-input"), $("#user-last-name-input"), $("#user-username-input"), $("#user-password-input"), $("#user-save-button"), $("#user-remove-button")].disableElements();

    const users = admindataWrapper.getUsers();
    if (users.length) $("#no-users-hint").hide();
    else $("#no-users-hint").show();

    for (let user of users) {
        const userOID = user.getOID();
        const panelBlock = document.createElement("a");
        panelBlock.className = "panel-block has-no-border-left";
        panelBlock.textContent = admindataWrapper.getUserFullName(userOID);
        panelBlock.setAttribute("oid", userOID);
        panelBlock.onclick = () => loadUser(userOID);
        $("#add-user-button").insertAdjacentElement("beforebegin", panelBlock);
    }

    for (let userRight of Object.values(ioHelper.userRights)) {
        const checkboxWrapper = document.createElement("label");
        checkboxWrapper.className = "checkbox is-block";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = userRight;
        checkbox.disabled = true;

        checkboxWrapper.appendChild(checkbox);
        checkboxWrapper.appendChild(document.createTextNode(" " + languageHelper.getTranslation(userRight)));
        $("#user-rights").insertAdjacentElement("beforeend", checkboxWrapper);
    }

    const localUserOID = admindataWrapper.getCurrentUserOID();
    $(`#users-options [oid="${localUserOID}"]`).textContent += " (" + languageHelper.getTranslation("you") + ")";

    if (ioHelper.hasServerURL()) {
        $("#add-user-button button").disabled = false;
        $("#user-login-inputs").show();
    };
}

function loadUser(userOID) {
    const user = admindataWrapper.getUser(userOID);
    if (!user) return;

    $("#users-options .panel a.is-active")?.deactivate();
    $(`#users-options .panel a[oid="${userOID}"]`).activate();

    // Create site select
    let sites = [languageHelper.getTranslation("no-site")];
    admindataWrapper.getSites().forEach(site => sites.push(site.getName()));
    $("#user-site-select-outer")?.remove();
    let currentSiteName = null;
    const locationRef = user.querySelector("LocationRef");
    if (locationRef) currentSiteName = admindataWrapper.getSiteNameByOID(locationRef.getAttribute("LocationOID"));
    $("#user-site-control").insertAdjacentElement("afterbegin", htmlElements.getSelect("user-site-select", true, true, sites, currentSiteName));

    // Fill other inputs and adjust enable status
    $("#user-first-name-input").value = user.querySelector("FirstName").textContent;
    $("#user-last-name-input").value = user.querySelector("LastName").textContent;
    [$("#user-first-name-input"), $("#user-last-name-input"), $("#user-save-button")].enableElements();
    if (admindataWrapper.getUsers().length > 1) $("#user-remove-button").disabled = false;

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
    const userOID = admindataWrapper.addUser();

    loadUsers();
    loadUser(userOID);
}

window.saveUser = async function() {
    const userOID = $("#users-options .panel a.is-active").getOID();
    if (!userOID) return;

    const firstName = $("#user-first-name-input").value;
    const lastName = $("#user-last-name-input").value
    const locationOID = admindataWrapper.getSiteOIDByName($("#user-site-select-inner").value);
    await admindataWrapper.setUserInfo(userOID, firstName, lastName, locationOID);
    
    if (ioHelper.hasServerURL()) {
        const username = $("#user-username-input").value;
        const initialPassword = $("#user-password-input").value;
        const credentials = new ioHelper.Credentials(username, initialPassword);
        const rights = Array.from($$("#user-rights input:checked")).map(checkbox => checkbox.name);
        await ioHelper.setUserOnServer(userOID, credentials, rights, locationOID).catch(error => console.log(error));
    }

    if (userOID == admindataWrapper.getCurrentUserOID()) ioHelper.dispatchGlobalEvent("CurrentUserEdited");
    
    loadUsers();
}

window.showRemoveUserModal = function() {
    const userOID = $("#users-options .panel a.is-active").getOID();
    if(ioHelper.getLoggedInUser().oid === userOID) {
        ioHelper.showMessage(languageHelper.getTranslation("no-self-delete"), languageHelper.getTranslation("no-self-delete-text"));
        return;
    }
    ioHelper.showMessage(languageHelper.getTranslation('remove-user'), languageHelper.getTranslation("remove-user-hint"), {
        [languageHelper.getTranslation("yes")]: () => removeUser(),
    })
}

window.removeUser = function() {
    const userOID = $("#users-options .panel a.is-active").getOID();
    if (!userOID) return;

    if (ioHelper.hasServerURL()) {
        ioHelper.deleteUserOnServer(userOID)
            .then(() => {
                admindataWrapper.removeUser(userOID);
                loadUsers();
            })
            .catch(() => ioHelper.showMessage(languageHelper.getTranslation("user-not-removed"), languageHelper.getTranslation("user-not-removed-hint")));
    } else {
        admindataWrapper.removeUser(userOID);
        loadUsers();
    }
}

export function loadSites() {
    $$("#sites-options .panel a").removeElements();
    $("#site-name-input").value = "";
    [$("#site-name-input"), $("#site-save-button"), $("#site-remove-button")].disableElements();

    const sites = admindataWrapper.getSites();
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
    const site = admindataWrapper.getSite(siteOID);
    if (!site) return;

    $("#sites-options .panel a.is-active")?.deactivate();
    $(`#sites-options .panel a[oid="${siteOID}"]`).activate();

    $("#site-name-input").value = site.getName();
    [$("#site-name-input"), $("#site-save-button"), $("#site-remove-button")].enableElements();
}

window.addSite = function() {
    const siteOID = admindataWrapper.addSite();

    loadSites();
    loadSite(siteOID);

    clinicaldataModule.createSiteFilterSelect();
}

window.saveSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getOID();
    if (!siteOID) return;

    admindataWrapper.setSiteName(siteOID, $("#site-name-input").value);
    loadSites();

    clinicaldataModule.createSiteFilterSelect();
}

window.removeSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getOID();
    if (!siteOID) return;

    admindataWrapper.removeSite(siteOID)
        .then(() => {
            loadSites();
            clinicaldataModule.createSiteFilterSelect();
            clinicaldataModule.loadSubjectKeys();
        })
        .catch(error => {
            switch (error) {
                case admindataWrapper.errors.SITEHASSUBJECTS:
                    ioHelper.showMessage(languageHelper.getTranslation("site-not-removed"), languageHelper.getTranslation("site-not-removed-hint-subject"));
                    break;
                case admindataWrapper.errors.SITEHASUSERS:
                    ioHelper.showMessage(languageHelper.getTranslation("site-not-removed"), languageHelper.getTranslation("site-not-removed-hint-user"));
            }
        });
}
