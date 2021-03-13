import * as ioHelper from "./iohelper.js";
import * as languageHelper from "./languagehelper.js";

// This function is used to evaluate an imported ODM file and prepare it before it is further processed
// Preparing can include the removal of forgein namespaces, ordering metadata elements according to their order number, adjusting the ODM version, handling translated texts without lang attribute, etc.
export function process(odmXMLString) {
    let odm = new DOMParser().parseFromString(odmXMLString, "text/xml");

    if (!odm.querySelector("ODM")) throw "No ODM file uploaded.";

    // Add a lang attribute to translated texts without one
    for (const translatedText of odm.querySelectorAll("TranslatedText")) {
        if (!translatedText.getAttribute("xml:lang")) translatedText.setAttribute("xml:lang", languageHelper.untranslatedLocale);
    }

    return new XMLSerializer().serializeToString(odm);
}
