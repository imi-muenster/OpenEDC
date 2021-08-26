import * as ioHelper from "./iohelper.js";

export class Report {
    // id, name, users, list of widgets, ...
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.widgets = [];
    }
}

export class Widget {
    static sizes = {
        SMALL: "small",
        MEDIUM: "medium",
        LARGE: "large"
    };

    static types = {
        BAR: "bar",
        PIE: "pie",
        DONUT: "donut",
        SCATTER: "scatter",
        NUMERIC: "numeric",
        TABLE: "table"
    }

    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.size = Widget.sizes.SMALL;
        this.properties = [];
    }

    set size(value) {
        if (Object.values(Widget.sizes).includes(value)) this._size = value;
    }

    get size() {
        return this._size;
    }

    set type(value) {
        if (Object.values(Widget.types).includes(value)) this._type = value;
    }

    get type() {
        return this._type;
    }

    set properties(values) {
        if (values && values.length <= 2) this._properties = values;
    }

    get properties() {
        return this._properties;
    }
}

let reports = null;

export const init = async () => {
    reports = await ioHelper.getJSON("reports") || [];
}

export const storeReports = async () => {
    await ioHelper.setJSON("reports", reports);
}

export const getReports = () => {
    return reports;
}

export const getReport = reportId => {
    return reports.find(report => report.id == reportId);
}

export const addReport = async name => {
    const id = reports.reduce((highestId, report) => report.id >= highestId ? report.id : highestId, 0) + 1;
    const report = new Report(id, name);
    reports.push(report);
    await storeReports();

    return report;
}

export const getWidget = (reportId, widgetId) => {
    const report = getReport(reportId);
    return report.widgets.find(widget => widget.id == widgetId);
}

export const addWidget = async (reportId, name) => {
    const report = getReport(reportId);
    const id = report.widgets.reduce((highestId, widget) => widget.id >= highestId ? widget.id : highestId, 0) + 1;
    const widget = new Widget(id, name);
    report.widgets.push(widget);
    await storeReports();

    return widget;
}
