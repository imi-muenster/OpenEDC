import * as ioHelper from "./iohelper.js";
import * as languageHelper from "./languagehelper.js";
import * as metadataTemplates from "../odmtemplates/metadatatemplates.js";

// This function is used to validate an imported ODM file and prepare it before it is further processed
// Preparing can include the removal of forgein namespaces, ordering metadata elements according to their order number, adjusting the ODM version, handling translated texts without lang attribute, etc.
export function process(odmXMLString) {
    let odm = new DOMParser().parseFromString(odmXMLString, "text/xml");

    // Basic file checks
    // A check against the ODM xsd schema is currently not implemented for flexibility purposes (e.g., for supporting REDCap ODM files)
    if (!odm.querySelector("ODM")) throw languageHelper.getTranslation("upload-error-no-odm");
    if (!odm.querySelector("Study")) throw languageHelper.getTranslation("upload-error-empty-odm");
    if (!odm.querySelector("MetaDataVersion")) throw languageHelper.getTranslation("upload-error-no-metadata");

    // Add a protocol element if there is no one present (e.g., for supporting the CDISC eCRF Portal)
    // Moreover, add a study event and reference all forms within this event if there is no one available
    if (!odm.querySelector("Protocol")) {
        odm.querySelector("MetaDataVersion").insertAdjacentElement("afterbegin", metadataTemplates.getProtocol());

        if (!odm.querySelector("StudyEventDef")) {
            const studyEventDef = metadataTemplates.getStudyEventDef("SE.1", languageHelper.getTranslation("new-event"))
            odm.querySelectorAll("FormDef").forEach(formDef => studyEventDef.appendChild(metadataTemplates.getFormRef(formDef.getOID())));
            odm.querySelector("Protocol").insertAdjacentElement("afterend", studyEventDef);
        }

        odm.querySelectorAll("StudyEventDef").forEach(studyEventDef => odm.querySelector("Protocol").appendChild(metadataTemplates.getStudyEventRef(studyEventDef.getOID())));
    }

    // Add a lang attribute to translated texts without one
    for (const translatedText of odm.querySelectorAll("TranslatedText")) {
        if (!translatedText.getAttribute("xml:lang")) translatedText.setAttribute("xml:lang", languageHelper.untranslatedLocale);
    }

    // Check if the uploaded ODM originates from REDCap and show a warning
    const sourceSystem = odm.querySelector("ODM").getAttribute("SourceSystem");
    if (sourceSystem && sourceSystem.toLowerCase() == "redcap") ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("upload-note-redcap"));

    return new XMLSerializer().serializeToString(odm);
}
