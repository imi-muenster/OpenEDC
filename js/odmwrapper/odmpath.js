export default class ODMPath {
    static SEPARATOR = "-";

    static elements = {
        STUDYEVENT: "studyevent",
        FORM: "form",
        ITEMGROUP: "itemgroup",
        ITEM: "item",
        CODELISTITEM: "codelistitem"
    }

    static parseRelative(string) {
        const elements = string ? string.split(ODMPath.SEPARATOR) : [];
        return new ODMPath(...Array(Math.max(0, 4 - elements.length)), ...elements);
    }

    static parseAbsolute(string) {
        const elements = string ? string.split(ODMPath.SEPARATOR) : [];
        return new ODMPath(...elements);
    }

    constructor(studyEventOID, formOID, itemGroupOID, itemOID, codeListItem) {
        this.path = new Map();
        this.studyEventOID = studyEventOID;
        this.formOID = formOID;
        this.itemGroupOID = itemGroupOID;
        this.itemOID = itemOID;
        this.codeListItem = codeListItem;
    }

    get studyEventOID() {
        return this.path.get(ODMPath.elements.STUDYEVENT);
    }

    set studyEventOID(oid) {
        this.path.set(ODMPath.elements.STUDYEVENT, oid);
    }

    get formOID() {
        return this.path.get(ODMPath.elements.FORM);
    }

    set formOID(oid) {
        this.path.set(ODMPath.elements.FORM, oid);
    }

    get itemGroupOID() {
        return this.path.get(ODMPath.elements.ITEMGROUP);
    }

    set itemGroupOID(oid) {
        this.path.set(ODMPath.elements.ITEMGROUP, oid);
    }

    get itemOID() {
        return this.path.get(ODMPath.elements.ITEM);
    }

    set itemOID(oid) {
        this.path.set(ODMPath.elements.ITEM, oid);
    }

    get codeListItem() {
        return this.path.get(ODMPath.elements.CODELISTITEM);
    }

    set codeListItem(value) {
        this.path.set(ODMPath.elements.CODELISTITEM, value);
    }

    get last() {
        const lastEntry = Array.from(this.path.entries()).reverse().find(entry => entry[1]);
        return { element: lastEntry?.[0], value: lastEntry?.[1] };
    }

    get previous() {
        const entries = Array.from(this.path.entries()).filter(entry => entry[1]);
        const previous = entries.length > 1 ? entries[entries.length - 2] : null;
        return { element: previous?.[0], value: previous?.[1] };
    }

    set(element, value) {
        this.path.set(element, value);
        return this;
    }

    getItemRelative(contextPath) {
        if (this.studyEventOID != contextPath.studyEventOID) return this;
        else if (this.formOID != contextPath.formOID) return new ODMPath(null, this.formOID, this.itemGroupOID, this.itemOID);
        else if (this.itemGroupOID != contextPath.itemGroupOID) return new ODMPath(null, null, this.itemGroupOID, this.itemOID);
        else return new ODMPath(null, null, null, this.itemOID);
    }

    getItemAbsolute(contextPath) {
        return new ODMPath(
            this.studyEventOID ? this.studyEventOID : contextPath.studyEventOID,
            this.formOID ? this.formOID : contextPath.formOID,
            this.itemGroupOID ? this.itemGroupOID : contextPath.itemGroupOID,
            this.itemOID
        );
    }

    clone(until) {
        return new ODMPath(...Array.from(this.path.values()).slice(0, until ? Array.from(this.path.keys()).indexOf(until) + 1 : this.path.size));
    }

    toString() {
        return Array.from(this.path.values()).filter(value => value).join(ODMPath.SEPARATOR);
    }
}
