Element.prototype.getOID = function() {
    return this.getAttribute("OID");
}

Element.prototype.getName = function() {
    return this.getAttribute("Name");
}

NodeList.prototype.getLastElement = function() {
    if (this.length > 0) return this[this.length - 1];
    else return null;
}

NodeList.prototype.removeElements = function() {
    for (const element of this) element.remove();
}

HTMLElement.prototype.show = function() {
    this.classList.remove("is-hidden");
}

HTMLElement.prototype.hide = function() {
    this.classList.add("is-hidden");
}

HTMLElement.prototype.isVisible = function() {
    return !this.classList.contains("is-hidden");
}

HTMLElement.prototype.activate = function() {
    this.classList.add("is-active");
}

HTMLElement.prototype.deactivate = function() {
    this.classList.remove("is-active");
}
