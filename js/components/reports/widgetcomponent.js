class WidgetComponent extends HTMLElement {
    setWidget(widget) {
        this.widget = widget;
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.className = "widget is-relative";
        this.classList.add("is-" + this.widget.size);
        this.id = this.widget.id;

        const widgetContent = document.createElement("widget-content");
        widgetContent.setTitle(this.widget.name);
        this.appendChild(widgetContent);
        
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
}

window.customElements.define("widget-component", WidgetComponent);
