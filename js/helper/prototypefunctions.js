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
