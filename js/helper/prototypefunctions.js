Element.prototype.getOID = function() {
    return this.getAttribute("OID");
}

Element.prototype.getName = function() {
    return this.getAttribute("Name");
}

Element.prototype.getCodedValue = function() {
    return this.getAttribute("CodedValue");
}

Element.prototype.getDataType = function() {
    return this.getAttribute("DataType");
}

Element.prototype.getTranslatedDescription = function(locale, nameFallback) {
    const translatedText = this.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    return translatedText ? translatedText.textContent : (nameFallback ? this.getName() : null);
}

Element.prototype.getTranslatedQuestion = function(locale, nameFallback) {
    const translatedText = this.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
    return translatedText ? translatedText.textContent : (nameFallback ? this.getName() : null);
}

Element.prototype.getTranslatedSymbol = function(locale, nameFallback) {
    const translatedText = this.querySelector(`Symbol TranslatedText[*|lang="${locale}"]`);
    return translatedText ? translatedText.textContent : (nameFallback ? this.getName() : null);
}

Element.prototype.getTranslatedDecode = function(locale, codedValueFallback) {
    const translatedText = this.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
    return translatedText ? translatedText.textContent : (codedValueFallback ? this.getCodedValue() : null);
}

Element.prototype.getFormalExpression = function() {
    // Since ODM only provides a CollectionExceptionCondition, but a CollectionCondition is much more user friendly, the expression is stored negated
    const formalExpression = this.querySelector("FormalExpression");
    if (formalExpression && formalExpression.getAttribute("Context") == "OpenEDC") {
        return formalExpression.textContent.getBetween("!(", ")");
    }
    return null;
}

String.prototype.escapeXML = function() {
    return this.replace(/[&<>'"]/g, function(character) {
        switch (character) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "'": return "&apos;";
            case '"': return "&quot;";
        }
    });
}

String.prototype.getBetween = function(start, end) {
    return this.substring(
        this.indexOf(start) + start.length, 
        this.lastIndexOf(end)
    );
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

HTMLElement.prototype.activate = function() {
    this.classList.add("is-active");
}

HTMLElement.prototype.deactivate = function() {
    this.classList.remove("is-active");
}

HTMLElement.prototype.highlight = function() {
    this.classList.add("is-highlighted");
}

HTMLElement.prototype.unhighlight = function() {
    this.classList.remove("is-highlighted");
}

HTMLElement.prototype.isVisible = function() {
    return !this.classList.contains("is-hidden");
}

HTMLElement.prototype.isActive = function() {
    return this.classList.contains("is-active");
}

HTMLElement.prototype.isHighlighted = function() {
    return this.classList.contains("is-highlighted");
}
