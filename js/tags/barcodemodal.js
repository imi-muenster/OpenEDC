class BarcodeModal extends HTMLElement {
    setHeading(heading) { this.heading = heading; }

    async connectedCallback() {
        this.innerHTML = `
            <div class="modal is-active" id="barcode-modal">
                <div class="modal-background"></div>
                <div class="modal-content is-medium">
                    <div class="box">
                        <div class="width-is-two-thirds">
                            <h1 class="title">${this.heading}</h1>
                            <hr>
                            <div id="barcode-video-stream"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

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

        this.querySelector(".modal-background").onclick = () => {
            Quagga.stop();
            this.remove();
        }
    }

    foundBarcode;
    foundBarcodeNumber;
    processBarcodeResult = barcode => {
        if (this.foundBarcode && barcode == this.foundBarcode) this.foundBarcodeNumber++;
        else this.foundBarcodeNumber = 0;
        this.foundBarcode = barcode;

        if (this.foundBarcodeNumber == 5) {
            document.dispatchEvent(new CustomEvent("BarcodeRead", { detail: barcode }));
            Quagga.stop();
        }
    }
}

window.customElements.define("barcode-modal", BarcodeModal);
