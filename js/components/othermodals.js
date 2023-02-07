class StartModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="start-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <div class="openedc-title">
                                <figure class="image is-64x64 mr-2">
                                    <img src="./img/title-logo.png">
                                </figure>
                                <div>
                                    <h1 class="title">OpenEDC</h1>
                                    <h2 class="subtitle" i18n="start-title"></h2>
                                </div>
                            </div>
                            <hr>
                            <p class="mb-5" i18n-html="about-text-1"></p>
                            <p class="mb-5" i18n-html="about-text-2"></p>
                            <p class="mb-5" i18n-html="start-text"></p>
                            <div class="columns is-centered is-multiline">
                                <div class="column is-6 p-1">
                                    <button class="button is-fullwidth" onclick="newProject()" i18n="new-project"></button>
                                </div>
                                <div class="column is-6 p-1">
                                    <div class="file is-fullwidth" id="open-odm-button">
                                        <label class="file-label">
                                            <input class="file-input" type="file" accept=".xml,text/xml" name="odm-xml" onchange="openODM()">
                                            <span class="file-cta button is-fullwidth" i18n="open"></span>
                                        </label>
                                    </div>
                                </div>
                                <div class="column is-6 p-1">
                                    <button class="button is-fullwidth" onclick="openMDMLoadDialog(false)" i18n="load-from-mdm"></button>
                                </div>
                                <div class="column is-6 p-1">
                                    <button class="button is-link is-fullwidth" onclick="loadExample()" i18n="example"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class LoginModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="login-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="box has-text-centered">
                        <div class="width-is-two-thirds">
                            <h2 class="subtitle" id="login-title"></h2>
                            <p class="mb-5" id="login-text"></p>
                            <article class="message is-danger mb-5 is-hidden" id="login-incorrect-hint">
                                <div class="message-body"></div>
                            </article>
                            <form>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-username-input" type="text" autocomplete="username" i18n-ph="username">
                                        <span class="icon is-small is-left">
                                            <i class="fa-solid fa-user"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-password-input" type="password" autocomplete="current-password" i18n-ph="password">
                                        <span class="icon is-small is-left">
                                            <i class="fa-solid fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field is-hidden">
                                    <div class="control has-icons-left">
                                        <input class="input" id="login-confirm-password-input" type="password" autocomplete="current-password" i18n-ph="password-confirm">
                                        <span class="icon is-small is-left">
                                            <i class="fa-solid fa-lock"></i>
                                        </span>
                                    </div>
                                </div>
                                <button class="button is-link mt-3" id="login-button" type="submit" i18n="open"></button>
                            </form>
                            <div class="buttons is-centered mt-3">
                                <button class="button is-text is-small" onclick="showForgotPasswordModal()" i18n="forgot-password-question"></button>
                                <button class="button is-text is-small is-hidden" id="remove-data-button" onclick="showRemoveDataModal(true)" i18n="remove-data-question"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class AboutModal extends HTMLElement {
    connectedCallback() {
        const name = "Leonard Greulich";
        const phone = "+49 (251) 83-54730";
        const mail = "leonard.greulich@uni-muenster.de";

        this.innerHTML = `
            <div class="modal" id="about-modal">
                <div class="modal-background" onclick="hideAboutModal()"></div>
                <div class="modal-content is-medium">
                <div class="is-pulled-right">
                    <button class="delete is-close-button is-large" onclick="hideAboutModal()"></button>
                </div>
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <div class="openedc-title">
                                <figure class="image is-64x64 mr-2">
                                    <img src="./img/title-logo.png">
                                </figure>
                                <div>
                                    <h1 class="title">OpenEDC</h1>
                                    <h2 class="subtitle"></h2>
                                </div>
                            </div>
                            <hr>
                            <p class="mb-5" i18n-html="about-text-1"></p>
                            <p class="mb-5" i18n-html="about-text-2"></p>
                            <div class="notification">
                                <p>${name}</p>
                                <p>${phone}</p>
                                <p class="mb-5"><a href="mailto:${mail}">${mail}</a></p>
                                <p><strong i18n="address_1"></strong></p>
                                <p i18n="address_2"></p>
                                <p i18n="address_3"></p>
                                <p i18n="address_4"></p>
                            </div>
                            <div class="buttons mb-1">
                                <a class="button is-link is-small is-rounded" target="_blank" i18n-href="privacy-policy-url">
                                    <span class="icon">
                                        <i class="fa-solid fa-arrow-right"></i>
                                    </span>
                                    <span i18n="privacy-policy"></span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class SubjectModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="subject-modal">
                <div class="modal-background" onclick="hideSubjectInfo()"></div>
                <div class="modal-content is-large">
                    <div class="is-pulled-right">
                        <button class="delete is-close-button is-large" onclick="hideSubjectInfo()"></button>
                    </div>
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title" i18n="options-and-audit-trail"></h1>
                            <h2 class="subtitle"><span i18n="for-subject"></span>: <strong></strong></h2>
                            <hr>
                            <div class="field">
                                <label class="label" i18n="key"></label>
                                <div class="control">
                                    <input class="input" id="subject-key-input" type="text">
                                </div>
                            </div>
                            <div class="field">
                                <label class="label" i18n="site"></label>
                                <div class="control" id="subject-site-control"></div>
                            </div>
                            <div class="buttons">
                                <button class="button is-danger is-small" id="save-subject-info-button" onclick="saveSubjectInfo()" i18n="save-changes"></button>
                                <button class="button is-small" onclick="hideSubjectInfo()" i18n="cancel"></button>
                            </div>
                            <div class="text-divider mb-5" i18n="audit-trail"></div>
                            <div id="audit-records"></div>
                            <button class="button is-danger is-small" onclick="showRemoveSubjectModal()" i18n="remove-subject"></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

class SurveyCodeModal extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="survey-code-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box has-text-centered">
                        <h2 class="subtitle" i18n="survey-finished"></h2>
                        <p i18n="survey-finished-text"></p>
                        <p class="mb-5" i18n="survey-finished-code-text"></p>
                        <div class="numpad has-text-centered mb-5">
                            <hr>
                            <div class="status mb-5"></div>
                            <div class="buttons is-centered"></div>
                        </div>
                        <p class="has-text-danger is-hidden" id="wrong-survey-code-hint" i18n="wrong-survey-code-hint"></p>
                    </div>
                </div>
            </div>
        `;
    }
}

// TODO: Move in own component .js file
class MessageModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setMessage(message) { this.message = message; }
    setCallbacks(callbacks) { this.callbacks = callbacks; }
    setCallbackType(callbackType) { this.callbackType = callbackType; }
    setCloseText(closeText) { this.closeText = closeText; }
    setCloseCallback(closeCallback) { this.closeCallback = closeCallback; }
    setSize(size) { this.size = size; }
    setIsSticky(isSticky) {this.isSticky = isSticky}

    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="message-modal">
                <div class="modal-background"></div>
                <div class="modal-content ${this.size}">
                    <div class="box has-text-centered">
                        <h2 class="subtitle">${this.heading}</h2>
                        <div class="mb-5">${this.message}</div>
                        <div class="buttons is-centered"></div>
                    </div>
                </div>
            </div>
        `;

        // Add buttons for callbacks
        if (this.callbacks) {
            for (const [text, callback] of Object.entries(this.callbacks)) {
                let button = document.createElement("button");
                button.classList = `button ${this.callbackType} is-small`;
                button.textContent = text;
                button.onclick = () => {
                    this.remove();
                    callback();
                };
                this.querySelector(".buttons").insertAdjacentElement("beforeend", button);
            }
        }
        
        // Add close button
        let button = document.createElement("button");
        button.classList = this.callbacks ? "button is-small" : "button is-link is-small";
        button.textContent = this.closeText;
        button.onclick = () => {
            this.remove();
            if (this.closeCallback) this.closeCallback();
        };
        this.querySelector(".buttons").insertAdjacentElement("beforeend", button);

        // Add event handler for clicking on the modal background
        if(!this.isSticky) {
            this.querySelector(".modal-background").onclick = () => {
                this.remove();
                if (this.closeCallback) this.closeCallback(); 
            };
        }
    }
}
class SettingsModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setMessage(message) { this.message = message; }
    setPossibleSettings(settings) { this.settings = settings; }
    setCurrentElementType(elementType) { this.elementType = elementType; }
    setCurrentElementOID(currentOID) { this.currentOID = currentOID; }
    setCurrentSettings(currentSettings) { this.currentSettings = currentSettings }
    setCloseText(closeText) { this.closeText = closeText; }
    setCloseCallback(closeCallback) { this.closeCallback = closeCallback; }
    setSize(size) { this.size = size; }

    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="message-modal">
                <div class="modal-background"></div>
                <div class="modal-content ${this.size}">
                    <div class="box has-text-centered">
                        <h2 class="subtitle">${this.heading}</h2>
                        <div class="mb-5">${this.message}</div>
                        <div class="box has-text-left" id="element-settings">
                        </div>
                        <div class="buttons is-centered"></div>
                    </div>
                </div>
            </div>
        `;
        const elementSettings = this.querySelector('#element-settings');
        this.settings.forEach((settingsArray, name) => {
            const settingsToBeShown = settingsArray.filter(setting => setting.isInScope(this.elementType));
            if(settingsToBeShown.length > 0) {
                if(!this.currentSettings[name]) this.currentSettings[name] = {};
                let contextDiv = document.createElement('div');
                contextDiv.classList = 'is-link is-light notification';
                let h = document.createElement("h1");
                h.classList = 'title is-4';
                h.innerText = name;
                contextDiv.appendChild(h);

                settingsToBeShown.forEach(setting => {
                    let settingDiv = document.createElement('div');
                    settingDiv.classList = 'field';
                    let label = document.createElement('label');
                    label.classList = 'label'
                    if(typeof setting.i18n != 'undefined') label.setAttribute('i18n', setting.i18n);
                    else label.innerText = setting.key;
                    settingDiv.appendChild(label);

                    const currentValue = this.currentSettings[name][setting.key];
                    switch(setting.type) {
                        case 'boolean': {
                            let checkBoxLabel = document.createElement('label');
                            checkBoxLabel.classList = 'checkbox is-block';
                            let input = document.createElement('input');
                            input.type = 'checkbox';
                            input.classList = 'mr-2'
                            if(currentValue) input.checked = true;
                            input.onchange = () => {this.currentSettings[name][setting.key] = input.checked}
                            let span = document.createElement('span');
                            span.setAttribute('i18n', typeof setting.description != 'undefined' ? setting.description : 'no-description')
                            checkBoxLabel.appendChild(input);
                            checkBoxLabel.appendChild(span);
                            settingDiv.appendChild(checkBoxLabel);
                            break;
                        }
                        case 'string': 
                        case 'number': {
                            let fieldDiv = document.createElement('div');
                            fieldDiv.classList = 'field has-addons';
                            let div = document.createElement('div');
                            div.classList = 'control is-expanded';
                            fieldDiv.appendChild(div);
                            if(typeof setting.description != 'undefined') {
                                let span = document.createElement('span');
                                span.setAttribute('i18n', setting.description)
                                div.appendChild(span)
                            }
                            let input = document.createElement('input');
                            input.type = 'text';
                            input.classList = 'input is-small'
                            if(currentValue) input.value = currentValue;
                            input.oninput = () => {this.currentSettings[name][setting.key] = input.value}
                            input.setAttribute('i18n-ph', typeof setting.i18n != 'undefined' ? setting.i18n : 'no-name')
                            div.appendChild(input);
                            settingDiv.appendChild(fieldDiv);
                            break;
                        } 
                        case 'options': {
                            (async () => {
                               const htmlElements = await import("../helper/htmlelements.js");
                               const languageHelper = await import("../helper/languagehelper.js");

                            let fieldDiv = document.createElement('div');
                            fieldDiv.classList = 'field has-addons';
                            let div = document.createElement('div');
                            div.classList = 'control is-expanded';
                            fieldDiv.appendChild(div);
                            if(typeof setting.description != 'undefined') {
                                let span = document.createElement('span');
                                span.setAttribute('i18n', setting.description)
                                div.appendChild(span)
                            }
                            let selectDiv = document.createElement('div');
                            selectDiv.classList = 'select is-fullwidth'
                            let select = htmlElements.getSelect(`${setting.key}-select`, true, true, setting.options, currentValue, setting.options.map(option => languageHelper.getTranslation(option)), true);
                            selectDiv.appendChild(select)

                            select.querySelector(`#${setting.key}-select-inner`).oninput = (event) => {this.currentSettings[name][setting.key] = event.target.value}
                            //input.setAttribute('i18n-ph', typeof setting.i18n != 'undefined' ? setting.i18n : 'no-name')
                            div.appendChild(selectDiv);
                            settingDiv.appendChild(fieldDiv);
                            })();
                            
                            break;
                        } 
                        case 'callback': {
                            let fieldDiv = document.createElement('div');
                            fieldDiv.classList = 'field has-addons';
                            let div = document.createElement('div');
                            div.classList = 'control is-expanded';
                            fieldDiv.appendChild(div);
                            let input = document.createElement('input');
                            input.type = 'text';
                            input.classList = 'input is-small'
                            if(currentValue) input.value = currentValue;
                            input.setAttribute('i18n-ph', typeof setting.i18n != 'undefined' ? setting.i18n : 'no-name')
                            input.disabled = true;
                            div.appendChild(input);
                            let controlDiv = document.createElement('div');
                            controlDiv.classList = 'control';
                            fieldDiv.appendChild(controlDiv)
                            let a = document.createElement('a');
                            a.classList = 'button is-small is-link';
                            a.setAttribute('i18n', 'assign-value');
                            a.onclick = () => window[setting.callback].apply(window, [this.currentOID, (newValue) => { 
                                input.value = newValue; 
                                this.currentSettings[name][setting.key] = newValue; 
                            }]);
                            input.onchange = () => this.currentSettings[name][setting.key] = input.value;
                            controlDiv.appendChild(a);
                            settingDiv.appendChild(fieldDiv);
                            break;
                        }  
                    }
                    contextDiv.appendChild(settingDiv);
                });
                elementSettings.appendChild(contextDiv);
            }
        });
        
        // Add close button
        let button = document.createElement("button");
        button.classList = this.callbacks ? "button is-small" : "button is-link is-small";
        button.textContent = this.closeText;
        button.onclick = () => {
            this.remove();
            if (this.closeCallback) this.closeCallback(this.currentSettings);
        };
        this.querySelector(".buttons").insertAdjacentElement("beforeend", button);

        // Add event handler for clicking on the modal background
        this.querySelector(".modal-background").onclick = () => {
            this.remove();
        };
    }
}

class MDMModal extends HTMLElement {
    setMergeStatus(mergeStatus) { this.mergeStatus = mergeStatus; }
    connectedCallback() {
        this.innerHTML = `
            <div class="modal" id="mdm-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box has-text-centered">
                        <h2 class="subtitle" i18n="load-from-mdm-heading"></h2>
                        <p i18n="load-from-mdm-text"></p>
                        <label class="label has-text-left mt-3" i18n="load-from-mdm-label"></label>
                        <div class="field has-addons">
                            <div class="control is-expanded">
                                <input class="input is-link" type="text" autocomplete="off" i18n-ph="load-from-mdm-input" term" autocomplete-mode="1" id="load-from-mdm-input">
                            </div>
                            <div class="control">
                                <a class="button is-link" id="load-from-mdm-confirm" i18n="confirm" onclick="importFromMDMPortal(${this.mergeStatus})"></a>
                            </div>
                        </div>
                        <p class="has-text-danger is-hidden" id="wrong-survey-code-hint" i18n="wrong-survey-code-hint"></p>
                    </div>
                </div>
            </div>
        `;
        this.querySelector(".modal-background").onclick = () => {
            this.remove();
        };
    }  
}

class FormImageModal extends HTMLElement {
    setFormImageData(formImageData) { this.formImageData = formImageData; }
    setSaveCallback(callback) {this.callback = callback; }
    connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="form-image-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box" id="form-image-modal-elements">
                        <h2 class="subtitle" i18n="edit-image-heading"></h2>
                    </div>
                </div>
            </div>
        `;
        this.querySelector(".modal-background").onclick = () => {
            this.callback(this.formImageData);
            this.remove();
        };
        
        if(!this.formImageData.format) this.formImageData.format = 'png';

        let elementsDiv = this.querySelector('#form-image-modal-elements');
        let img = document.createElement('img');
        Object.entries(this.formImageData).forEach(([key, value]) => {
            let field = document.createElement('div');
            field.classList = "field";
            let label = document.createElement("label");
            label.classList = "label";
            label.setAttribute("i18n", key);
            let inputElement;
            if(key == 'base64Data'){
                inputElement = document.createElement('textarea')
                inputElement.classList = 'textarea';
            }
            else {
                inputElement = document.createElement('input')
                inputElement.classList = "input";
                inputElement.type = "text";  
            }
            inputElement.placeholder = key;
            inputElement.value = value??'';
            inputElement.onblur = () => {this.formImageData[key] = inputElement.value; this.setFormImageDataToImage(img)};
            field.appendChild(label);
            field.appendChild(inputElement)
            elementsDiv.appendChild(field);
        })
        this.setFormImageDataToImage(img);
        elementsDiv.appendChild(img);
    }  

    setFormImageDataToImage(img) {
        img.src = `data:image/${this.formImageData.format};${this.formImageData.type},${this.formImageData.base64Data}`;
        img.style = `width: ${this.formImageData.width}`
    }
}

window.customElements.define("start-modal", StartModal);
window.customElements.define("login-modal", LoginModal);
window.customElements.define("about-modal", AboutModal);
window.customElements.define("subject-modal", SubjectModal);
window.customElements.define("survey-code-modal", SurveyCodeModal);
window.customElements.define("message-modal", MessageModal);
window.customElements.define("settings-modal", SettingsModal);
window.customElements.define("mdm-modal", MDMModal);
window.customElements.define("form-image-modal", FormImageModal);