import * as clinicaldataModule from "./clinicaldatamodule.js";
import * as admindataHelper from "./helper/admindatahelper.js";
import * as ioHelper from "./helper/iohelper.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

export function loadSites() {
    ioHelper.removeElements($$("#sites-options .panel a"));

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
    $(`#sites-options .panel a[oid="${site.getAttribute("OID")}"]`).classList.add("is-active");

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
    $("#site-name-input").value = "";
    loadSites();

    clinicaldataModule.createSiteFilterSelect();
}

window.removeSite = function() {
    const siteOID = $("#sites-options .panel a.is-active").getAttribute("oid");
    if (!siteOID) return;

    admindataHelper.removeSite(siteOID)
        .then(() => {
            $("#site-name-input").value = "";
            loadSites();
            clinicaldataModule.createSiteFilterSelect();
        })
        .catch(error => {
            switch (error) {
                case admindataHelper.errors.SITEHASSUBJECTS:
                    ioHelper.showWarning("Site not removed", "The site could not be removed since there is at least one subject assigned to it. To remove a site, you have to remove all subjects assigned to this site first.");
            }
        });
}
