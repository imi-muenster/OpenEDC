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
    return this.querySelector("CodeListRef") ? "codelist-" + this.getAttribute("DataType") : this.getAttribute("DataType");
}

Element.prototype.getTranslatedDescription = function(locale, nameFallback) {
    let translatedText = this.querySelector(`Description TranslatedText[*|lang="${locale}"]`);
    if (!translatedText) translatedText = this.querySelector(`Description TranslatedText:not([*|lang])`);
    return translatedText ? translatedText.textContent : (nameFallback ? this.getName() : null);
}

Element.prototype.getTranslatedQuestion = function(locale, nameFallback) {
    let translatedText = this.querySelector(`Question TranslatedText[*|lang="${locale}"]`);
    if (!translatedText) translatedText = this.querySelector(`Question TranslatedText:not([*|lang])`);
    return translatedText ? translatedText.textContent : (nameFallback ? this.getName() : null);
}

Element.prototype.getTranslatedSymbol = function(locale, nameFallback) {
    let translatedText = this.querySelector(`Symbol TranslatedText[*|lang="${locale}"]`);
    if (!translatedText) translatedText = this.querySelector(`Symbol TranslatedText:not([*|lang])`);
    return translatedText ? translatedText.textContent : (nameFallback ? this.getName() : null);
}

Element.prototype.getTranslatedDecode = function(locale, codedValueFallback) {
    let translatedText = this.querySelector(`Decode TranslatedText[*|lang="${locale}"]`);
    if (!translatedText) translatedText = this.querySelector(`Decode TranslatedText:not([*|lang])`);
    return translatedText ? translatedText.textContent : (codedValueFallback ? this.getCodedValue() : null);
}

Element.prototype.getFormalExpression = function() {
    const formalExpression = this.querySelector("FormalExpression");
    // Since ODM only provides a CollectionExceptionCondition, but a CollectionCondition is much more user friendly, the expression is stored negated
    if (formalExpression && formalExpression.getAttribute("Context", "OpenEDC")) {
        if (this.tagName == "ConditionDef") return formalExpression.textContent.getBetween("!(", ")");
        else if (formalExpression) return formalExpression.textContent;
    }
}

String.prototype.getBetween = function(start, end) {
    const startIndex = this.indexOf(start);
    const endIndex = this.lastIndexOf(end);
    return this.substring(
        startIndex == -1 || endIndex == -1 ? 0 : startIndex + start.length, 
        startIndex == -1 || endIndex == -1 ? this.length : endIndex
    );
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

NodeList.prototype.getLastElement = function() {
    if (this.length) return this[this.length - 1];
    else return null;
}

NodeList.prototype.removeElements = function() {
    for (const element of this) element.remove();
}

// Used for performance reasons instead of querySelectorAll().forEach ...
Array.prototype.enableElements = function() {
    for (const element of this) element.disabled = false;
}

Array.prototype.disableElements = function() {
    for (const element of this) element.disabled = true;
}

Array.prototype.emptyInputs = function() {
    for (const element of this) element.value = "";
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

HTMLElement.prototype.showLoading = function() {
    this.classList.add("is-loading");
}

HTMLElement.prototype.hideLoading = function() {
    this.classList.remove("is-loading");
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
