class WidgetComponent extends HTMLElement {
    setWidget(widget) {
        this.widget = widget;
    }

    setCustomChart(customChart) {
        this.customChart = customChart;
    }

    connectedCallback() {
        // Keeping track of the initialized status is required for drag-and-drop, since the element would be re-rendered after a movement otherwise
        if (!this.initialized) {
            this.render();
            this.initialized = true;
        }
    }

    render() {
        this.className = "widget is-relative";
        this.classList.add("is-" + this.widget.size);
        this.id = this.widget.id;

        this.widgetContent = document.createElement("widget-content");
        this.widgetContent.setTitle(this.widget.name);
        this.appendChild(this.widgetContent);
        
        this.addOptionsIcon();
        this.addDragEventListeners();
    }

    addOptionsIcon() {
        const iconContainer = document.createElement("span");
        iconContainer.className = "icon has-text-link";
        const icon = document.createElement("i");
        icon.className = "far fa-ellipsis-h is-clickable";
        icon.onclick = () => this.showOptions();
        icon.onmousedown = () => this.draggable = true;
        icon.onmouseup = () => this.draggable = false;
        iconContainer.appendChild(icon);
    
        this.appendChild(iconContainer);
    }

    addDragEventListeners() {
        this.ondragstart = event => event.dataTransfer.setData("sourceWidgetId", this.widget.id);
        this.ondragover = event => event.preventDefault();
        this.ondragend = () => this.draggable = false;
        this.ondrop = event => {
            const source = document.querySelector(`.widget[id="${event.dataTransfer.getData("sourceWidgetId")}"]`);
            const target = event.target.closest(".widget");
            if (source.widget.id != target.widget.id) target.parentNode.insertBefore(source, target);
        };
    }

    showOptions() {
        const widgetOptions = document.createElement("widget-options");
        widgetOptions.setComponent(this);
        this.appendChild(widgetOptions);
        this.classList.add("is-flipped");
    }

    update() {
        this.widgetContent.querySelector(".subtitle").textContent = this.widget.name;
        this.customChart?.update();
    }
}

window.customElements.define("widget-component", WidgetComponent);
