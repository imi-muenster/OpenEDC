class WidgetContent extends HTMLElement {
    setTitle(titleText) {
        this.titleText = titleText;
    }

    connectedCallback() {
        if (!this.initialized) {
            this.render();
            this.initialized = true;
        }
    }

    render() {
        this.className = "widget-content is-flex is-flex-direction-column has-text-centered p-5";

        const title = document.createElement("h2");
        title.className = "subtitle";
        title.textContent = this.titleText;
        this.appendChild(title);

        const canvasContainer = document.createElement("div");
        canvasContainer.className = "canvas-container is-flex-grow-1";
        const canvas = document.createElement("canvas");
        canvasContainer.appendChild(canvas);
        this.appendChild(canvasContainer);
    }
}

window.customElements.define("widget-content", WidgetContent);
