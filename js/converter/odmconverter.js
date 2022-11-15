import * as admindataWrapper from "../odmwrapper/admindatawrapper.js";
import * as metadataTemplates from "../odmtemplates/metadatatemplates.js";
import * as clinicaldataTemplates from "../odmtemplates/clinicaldatatemplates.js";
import * as languageHelper from "../helper/languagehelper.js";
import * as ioHelper from "../helper/iohelper.js";

// This function is used to validate an imported ODM file and prepare it before it is further processed
// Preparing can include the removal of forgein namespaces, ordering metadata elements according to their order number, adjusting the ODM version, handling translated texts without lang attribute, etc.
export function validateImport(odmXMLString) {
    let odm = new DOMParser().parseFromString(odmXMLString, "text/xml");

    // Basic file checks
    // A check against the ODM xsd schema is currently not implemented for flexibility purposes (e.g., for supporting REDCap ODM files)
    if (!odm.querySelector("ODM")) throw languageHelper.getTranslation("upload-error-no-odm");

    // Add a protocol element if there is no one present (e.g., for supporting the CDISC eCRF Portal)
    // Moreover, add a study event and reference all forms within this event if there is no one available
    if (odm.querySelector("MetaDataVersion") && !odm.querySelector("Protocol")) {
        odm.querySelector("MetaDataVersion").insertAdjacentElement("afterbegin", metadataTemplates.getProtocol());

        if (!odm.querySelector("StudyEventDef")) {
            const studyEventDef = metadataTemplates.getStudyEventDef("SE.1", languageHelper.getTranslation("new-event"))
            odm.querySelectorAll("FormDef").forEach(formDef => studyEventDef.appendChild(metadataTemplates.getFormRef(formDef.getOID())));
            odm.querySelector("Protocol").insertAdjacentElement("afterend", studyEventDef);
        }

        odm.querySelectorAll("StudyEventDef").forEach(studyEventDef => odm.querySelector("Protocol").appendChild(metadataTemplates.getStudyEventRef(studyEventDef.getOID())));
    }

    // Remove the region part of locales (i.e., only keep the language part)
    for (const translatedText of odm.querySelectorAll("TranslatedText")) {
        const locale = translatedText.getAttribute("xml:lang");
        if (locale) translatedText.setAttribute("xml:lang", locale.split("-")[0]);
    }

    // Replace ItemData values having true or false with 1 or 0
    odm.querySelectorAll("ItemData[Value='true']").forEach(itemData => itemData.setAttribute("Value", "1"));
    odm.querySelectorAll("ItemData[Value='false']").forEach(itemData => itemData.setAttribute("Value", "0"));

    // Replace hyphens with underscores in element OIDs and its references including formal expressions and prefix an OID that starts with a number
    const oidAttributes = ["OID", "StudyEventOID", "FormOID", "ItemGroupOID", "ItemOID", "CodeListOID", "CollectionExceptionConditionOID", "MethodOID"];
    oidAttributes.forEach(attribute => odm.querySelectorAll(`[${attribute}]`).forEach(element => {
        let attributeValue = element.getAttribute(attribute);
        if (attributeValue.match(/^\d/)) attributeValue = "E" + attributeValue;
        element.setAttribute(attribute, attributeValue.replace(/(\w)-(?=\w)/g, "$1_"));
    }));

    let oidList = {};
    [...odm.querySelectorAll('[OID]')].forEach(element => oidList[element.getAttribute('OID')] = element.getAttribute('OID').replace(/(\w)-(?=\w)/g, "$1_"));
    Object.keys(oidList).forEach(oldOID => {
        odm.querySelectorAll("FormalExpression").forEach(expression => {
            let expressionValue = expression.textContent;
            if (expressionValue.match(/^\d/)) expressionValue = "E" + expressionValue;
            expression.textContent = expressionValue.replace(new RegExp(`${oldOID}([\\s*\\/+^=?:<>()-]|$)`, "g"), `${oidList[oldOID]}$1`);
        });
    });
    // Add an audit record if no one is present
    const creationDate = new Date();
    const userOID = admindataWrapper.getCurrentUserOID();
    odm.querySelectorAll("SubjectData").forEach(subjectData => {
        if (!subjectData.querySelector("AuditRecord")) subjectData.appendChild(clinicaldataTemplates.getAuditRecord(userOID, null, creationDate.toISOString()));
    });

    // Check if the uploaded ODM originates from REDCap and show a warning
    const sourceSystem = odm.querySelector("ODM").getAttribute("SourceSystem");
    if (sourceSystem && sourceSystem.toLowerCase() == "redcap") ioHelper.showMessage(languageHelper.getTranslation("note"), languageHelper.getTranslation("upload-note-redcap"));

    return new XMLSerializer().serializeToString(odm);
}
