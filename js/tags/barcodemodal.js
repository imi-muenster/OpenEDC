class BarcodeModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }
    setHelpText(helpText) { this.helpText = helpText; }
    setInputPlaceholder(inputPlaceholder) { this.inputPlaceholder = inputPlaceholder; }
    setButtonText(buttonText) { this.buttonText = buttonText; }

    async connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="barcode-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium is-fullheight-mobile">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <div class="title-has-delete">
                                <h1 class="title mb-0">${this.heading}</h1>
                                <button class="delete is-large"></button>
                            </div>
                            <div class="notification">${this.helpText}</div>
                            <div id="barcode-video-stream" class="mb-4"></div>
                            <div class="field is-grouped is-fullwidth">
                                <div class="control is-expanded">
                                    <input class="input" type="text" placeholder="${this.inputPlaceholder}">
                                </div>
                                <div class="control">
                                    <button class="button">${this.buttonText}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize and start the barcode scan
        await import("../../lib/quagga.js");
        Quagga.init(
            {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector("#barcode-video-stream")
                },
                decoder : {
                    readers: ["code_128_reader", "code_39_reader"]
                }
            },
            error => {
                if (error) {
                    console.log(err);
                    return;
                }
                Quagga.start();
                Quagga.onDetected(result => this.processBarcodeResult(result.codeResult.code));
            }
        );

        // Allow the manual entry of a barcode value
        this.querySelector(".button.is-link").onclick = () => {
            const barcodeValue = this.querySelector("input").value;
            document.dispatchEvent(new CustomEvent("BarcodeScanned", { detail: barcodeValue }));
            this.finish();
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

        if (this.foundBarcodeNumber == 5) {
            document.dispatchEvent(new CustomEvent("BarcodeScanned", { detail: barcode }));
            this.finish();
        }
    }

    finish = () => {
        Quagga.stop();
        this.remove();
    }
}

window.customElements.define("barcode-modal", BarcodeModal);
