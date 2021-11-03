import * as ioHelper from "../helper/iohelper.js";

class BarcodeModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setHelpText(helpText) { this.helpText = helpText; }
    setInputPlaceholder(inputPlaceholder) { this.inputPlaceholder = inputPlaceholder; }
    setButtonText(buttonText) { this.buttonText = buttonText; }

    // TODO: Use i18n approach
    async connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="barcode-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="is-pulled-right">
                        <button class="delete is-close-button is-large"></button>
                    </div>
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title">${this.heading}</h1>
                            <div class="notification">${this.helpText}</div>
                            <div id="barcode-video-stream" class="mb-4"></div>
                            <div class="field is-grouped is-fullwidth">
                                <div class="control is-expanded">
                                    <input class="input" id="barcode-fallback-input" type="text" placeholder="${this.inputPlaceholder}">
                                </div>
                                <div class="control">
                                    <button class="button" id="barcode-fallback-button">${this.buttonText}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize and start the barcode scan
        // TODO: Quagga was not developed for working with Web Components -- use the Barcode Detection API as soon as it is supported by iOS
        await import("../../lib/quagga.js?noCache=" + Math.random());
        Quagga.init(
            {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector("#barcode-video-stream")
                },
                decoder : {
                    readers: ["code_128_reader", "code_39_reader", "i2of5_reader", "2of5_reader"]
                }
            },
            error => {
                if (error) {
                    this.querySelector("#barcode-video-stream").remove();
                    return;
                }
                Quagga.start();
                Quagga.onDetected(result => this.processBarcodeResult(result.codeResult.code));
            }
        );

        // Allow the manual entry of a barcode value
        this.querySelector("#barcode-fallback-button").onclick = () => {
            const barcodeValue = this.querySelector("#barcode-fallback-input").value;
            this.dispatchResult(barcodeValue);
        }
        this.querySelector("#barcode-fallback-input").onkeydown = keyEvent => {
            if (keyEvent.code == "Enter") {
                const barcodeValue = this.querySelector("#barcode-fallback-input").value;
                this.dispatchResult(barcodeValue);
            }
        }

        // Stop the barcode scan whe clicking on the top right close button or the modal background
        this.querySelector(".delete").onclick = () => this.finish();
        this.querySelector(".modal-background").onclick = () => this.finish();
    }

    foundBarcode;
    foundBarcodeNumber;
    processBarcodeResult = barcode => {
        if (this.foundBarcode && barcode == this.foundBarcode) this.foundBarcodeNumber++;
        else this.foundBarcodeNumber = 0;
        this.foundBarcode = barcode;

        if (this.foundBarcodeNumber == 5) this.dispatchResult(this.foundBarcode);
    }

    dispatchResult = barcodeValue => {
        ioHelper.dispatchGlobalEvent("BarcodeFound", barcodeValue);
        this.finish();
    }

    finish = () => {
        Quagga.stop();
        delete window.Quagga;
        this.remove();
    }
}

window.customElements.define("barcode-modal", BarcodeModal);
