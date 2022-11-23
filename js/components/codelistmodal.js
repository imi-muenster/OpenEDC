import ODMPath from "../odmwrapper/odmpath.js";
import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";
import * as languageHelper from "../helper/languagehelper.js";
import * as autocompleteHelper from "../helper/autocompletehelper.js";
import * as ioHelper from "../helper/iohelper.js";

class CodelistModal extends HTMLElement {
    setPath(path) {
        this.path = path;
    }
    
    connectedCallback() {
        this.render();
        this.fillValues();
        this.setIOListeners();
    }

    render() {
        this.innerHTML = `
            <div class="modal is-active" id="codelist-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="is-pulled-right">
                        <button class="delete is-close-button is-large"></button>
                    </div>
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="choices-for-element"></h1>
                            <h2 class="subtitle"></h2>
                            <hr>
                            <div class="notification is-link is-light is-hidden">
                                <p i18n="choices-multiple-references-hint"></p>
                                <p class="has-text-weight-bold mt-3" id="codelist-references-list">
                                </p>
                                <button class="button is-link is-small is-outlined mt-5" id="unreference-codelist-button" i18n="cancel-reference-option"></button>
                            </div>
                            <div class="field">
                                <label class="label" i18n="textitems-hint"></label>
                                <textarea class="textarea" id="textitems-textarea" rows="8" i18n-ph="coded-value-translated-choice"></textarea>
                            </div>
                            <div id="codelist-reference-field">
                                <div class="text-divider mt-5 mb-3" i18n="or"></div>
                                <label class="label" i18n="choices-reference-hint"></label>
                                <div class="field is-grouped is-fullwidth">
                                    <div class="control is-expanded has-autocomplete-top">
                                        <input class="input" id="codelist-reference-input" type="text" autocomplete="off" i18n-ph="item-with-choices">
                                    </div>
                                    <div class="control">
                                        <button class="button" id="reference-codelist-button" i18n="use"></button>
                                    </div>
                                </div>
                            </div>
                            <div class="buttons mt-5">
                                <button class="button is-link" id="save-codelist-modal-button" i18n="save"></button>
                                <button class="button" id="hide-codelist-modal-button" i18n="cancel"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    fillValues() {
        // Add the item question and use the name as fallback
        let translatedText = metadataWrapper.getElementDefByOID(this.path.itemOID).getTranslatedQuestion(languageHelper.getCurrentLocale(), true);
        if(translatedText) {
            const splits = translatedText.split(/(!\[.*?\](?:\(data:image\/[a-z]+;base64,[a-zA-Z0-9\/+=]+\))?(?:\[(?:[a-z]+:[a-zA-Z0-9%]+?)+;\])?)/g);
            splits.forEach(split => {
                if(!split.startsWith('![')) return;
                const formImageData = metadataWrapper.extractImageInfo(split);
                translatedText = translatedText.replace(split, `<span class="has-text-link" style="pointer-events: auto;" data-image-id="${formImageData.identifier}" onmouseover="showFormImagePreview(event)" onmouseleave="hideFormImagePreview()">${formImageData.data.name??languageHelper.getTranslation("image")}</span>`);
            })
        }
        //translatedText = translatedText.replace(/(<img;type:[a-zA-Z0-9]+;format:[a-zA-Z0-9]*;(?:[a-zA-Z0-9]*;)*[^>]*>)/g, "<Image>");
        this.querySelector("h2").innerHTML = translatedText;

        // Render the notification when the codelist is used for more than one item
        const codeListReferences = metadataWrapper.getElementRefs(metadataWrapper.getCodeListOIDByItem(this.path.itemOID), ODMPath.elements.CODELISTITEM);
        if (codeListReferences.length > 1) {
            const translatedQuestions = codeListReferences.map(reference => reference.parentNode.getTranslatedQuestion(languageHelper.getCurrentLocale(), true));
            this.querySelector("#codelist-references-list").innerHTML = translatedQuestions.join("<br>");
            this.querySelector(".notification").show();
            this.querySelector("#codelist-reference-field").hide();
        } else {
            this.querySelector(".notification").hide();
            this.querySelector("#codelist-reference-field").show();
            autocompleteHelper.enableAutocomplete(this.querySelector("#codelist-reference-input"), autocompleteHelper.modes.ITEMWITHCODELIST);
        }

        // Generate the string containing all coded values and translated decodes
        this.querySelector("#textitems-textarea").value = metadataWrapper.getCodeListItemsByItem(this.path.itemOID).reduce((string, item) => {
            return string += `${item.getCodedValue()}, ${item.getTranslatedDecode(languageHelper.getCurrentLocale()) || ""}\n`;
        }, "");
    }

    setIOListeners() {
        this.querySelector(".modal-background").addEventListener("click", () => this.close());
        this.querySelector(".is-close-button").addEventListener("click", () => this.close());
        this.querySelector("#hide-codelist-modal-button").addEventListener("click", () => this.close());
        this.querySelector("#save-codelist-modal-button").addEventListener("click", () => this.save());
        this.querySelector("#reference-codelist-button").addEventListener("click", () => this.referenceCodelist());
        this.querySelector("#unreference-codelist-button").addEventListener("click", () => this.unreferenceCodelist());
    }

    save() {
        // Create a temporary element and move all code list items to that element
        const currentItems = document.createElement("current-items");
        metadataWrapper.getCodeListItemsByItem(this.path.itemOID).forEach(item => currentItems.appendChild(item));

        // Iterate over the text input and move existing items from the temporary element to the code list to preserve translations
        const codeListOID = metadataWrapper.getCodeListOIDByItem(this.path.itemOID);
        const lines = this.querySelector("#textitems-textarea").value.split("\n");
        for (const line of lines) {
            if (!line.length) continue;

            const parts = line.split(",");
            let codedValue = parts.length > 1 ? parts.shift().trim() : null;
            let translatedDecode = parts.join(",").trim();

            const currentItem = Array.from(currentItems.childNodes).find(item => item.getCodedValue() == codedValue);
            if (currentItem) metadataWrapper.insertCodeListItem(currentItem, codeListOID);
            else codedValue = metadataWrapper.addCodeListItem(codeListOID, codedValue);

            metadataWrapper.setCodeListItemDecodedText(codeListOID, codedValue, translatedDecode);
        }

        ioHelper.dispatchGlobalEvent("CodelistEdited");
        this.close();
    }

    referenceCodelist() {
        const externalItemOID = ODMPath.parseAbsolute(this.querySelector("#codelist-reference-input").value).itemOID;
        if (!externalItemOID) return;
    
        if (externalItemOID == this.path.itemOID) {
            ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("same-item-referenced-error"));
            return;
        }
    
        const externalCodeListOID = metadataWrapper.getCodeListOIDByItem(externalItemOID);
        if (!externalCodeListOID) {
            ioHelper.showMessage(languageHelper.getTranslation("error"), languageHelper.getTranslation("codelist-not-found-error"));
            return;
        };
    
        const currentCodeListOID = metadataWrapper.getCodeListOIDByItem(this.path.itemOID);
        metadataWrapper.removeCodeListRef(this.path.itemOID, currentCodeListOID);
        metadataWrapper.addCodeListRef(this.path.itemOID, externalCodeListOID);
        this.path.codeListItem = null;
    
        ioHelper.dispatchGlobalEvent("CodelistEdited");
        this.close();
    }
    
    unreferenceCodelist() {
        const currentCodeListOID = metadataWrapper.getCodeListOIDByItem(this.path.itemOID);
        const newCodeListOID = metadataWrapper.copyCodeList(currentCodeListOID);
        metadataWrapper.removeCodeListRef(this.path.itemOID, currentCodeListOID);
        metadataWrapper.addCodeListRef(this.path.itemOID, newCodeListOID);
        this.path.codeListItem = null;
    
        ioHelper.dispatchGlobalEvent("CodelistEdited");
        this.close();
    }

    close() {
        autocompleteHelper.disableAutocomplete(this.querySelector("#codelist-reference-input"));
        this.remove();
    }
}

window.customElements.define("codelist-modal", CodelistModal);
