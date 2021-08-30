class MessageModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setMessage(message) { this.message = message; }
    setCallbacks(callbacks) { this.callbacks = callbacks; }
    setCallbackType(callbackType) { this.callbackType = callbackType; }
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
        this.querySelector(".modal-background").onclick = () => {
            this.remove();
            if (this.closeCallback) this.closeCallback(); 
        };
    }
}

window.customElements.define("message-modal", MessageModal);
