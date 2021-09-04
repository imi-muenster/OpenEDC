class WidgetComponent extends HTMLElement {
    setWidget(widget) {
        this.widget = widget;
    }

    setCustomChart(customChart) {
        this.customChart = customChart;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.className = "widget is-relative";
        this.classList.add("is-" + this.widget.size);
        this.id = this.widget.id;

        this.widgetContent = document.createElement("widget-content");
        this.widgetContent.setTitle(this.widget.name);
        this.appendChild(this.widgetContent);
        
        this.addOptionsIcon();
    }

    addOptionsIcon() {
        const iconContainer = document.createElement("span");
        iconContainer.className = "icon has-text-link";
        const icon = document.createElement("i");
        icon.className = "far fa-ellipsis-h is-clickable";
        icon.onclick = () => this.showOptions();
        iconContainer.appendChild(icon);
    
        this.appendChild(iconContainer);
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
