import * as ioHelper from "./iohelper.js";
import * as languageHelper from "./languagehelper.js";

// This function is used to validate an imported ODM file and prepare it before it is further processed
// Preparing can include the removal of forgein namespaces, ordering metadata elements according to their order number, adjusting the ODM version, handling translated texts without lang attribute, etc.
export function process(odmXMLString) {
    let odm = new DOMParser().parseFromString(odmXMLString, "text/xml");

    // Basic file checks
    // A check against the ODM xsd schema is currently not implemented for flexibility purposes (e.g., for supporting REDCap ODM files)
    if (!odm.querySelector("ODM")) throw "No ODM file uploaded.";
    if (!odm.querySelector("Study")) throw "Empty ODM file uploaded.";
    if (!odm.querySelector("MetaDataVersion")) throw "ODM without metadata uploaded.";

    // TODO: Extend list of validation checks

    // Add a lang attribute to translated texts without one
    for (const translatedText of odm.querySelectorAll("TranslatedText")) {
        if (!translatedText.getAttribute("xml:lang")) translatedText.setAttribute("xml:lang", languageHelper.untranslatedLocale);
    }

    // Check if the uploaded ODM originates from REDCap and show a warning
    const sourceSystem = odm.querySelector("ODM").getAttribute("SourceSystem");
    if (sourceSystem && sourceSystem.toLowerCase() == "redcap") ioHelper.showMessage("REDCap ODM", "You uploaded a REDCap ODM file. Please note that REDCap currently does not fully adhere to the CDISC ODM standard. There might be hickups in using this file.");

    return new XMLSerializer().serializeToString(odm);
}
