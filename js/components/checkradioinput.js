class CustomCheckbox extends HTMLElement {
    static get observedAttributes() {
        return ["checked", "disabled"];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.render();
    }

    attributeChangedCallback(name) {
        if (this.input[name]) this.input[name] = false;
        else this.input[name] = true;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>${this.style}</style>
            <label class="checkbox">
                <input type="checkbox"></input>
                <span><slot></slot></span>
            </div>
        `;
    }

    get style() {
        return `
            label {
                display: block;
                cursor: pointer;
            }
            input {
                margin: 0 .2rem 0 0;
                cursor: pointer;
            }
        `;
    }

    get input() {
        return this.shadowRoot.querySelector("input");
    }

    get checked() {
        return this.input.checked;
    }

    set checked(value) {
        this.input.checked = value;
    }
}

window.customElements.define("custom-checkbox", CustomCheckbox);
