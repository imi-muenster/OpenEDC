import * as languageHelper from "./languagehelper.js";
import * as ioHelper from "./iohelper.js";

export class Report {
    static fromObject(object) {
        return Object.assign(new Report(), object);
    }

    constructor(id, name, widgets, isStandard) {
        this.id = id;
        this.name = name;
        this.widgets = widgets ?? [];
        this.isStandard = isStandard;
    }
}

export class Widget {
    static sizes = {
        SMALL: "small",
        MEDIUM: "medium",
        LARGE: "large"
    };

    static types = {
        BAR: "bar-chart",
        PIE: "pie-chart",
        DONUT: "donut-chart",
        SCATTER: "scatter-chart"
    };

    static fromObject(object) {
        return Object.assign(new Widget(), object);
    }

    constructor(id, name, type, itemPaths, size, isStandard) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.itemPaths = itemPaths ?? [];
        this.size = size ?? Widget.sizes.SMALL;
        this.isStandard = isStandard;
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

    set itemPaths(paths) {
        if (paths && paths.length <= 2) this._itemPaths = paths;
    }

    get itemPaths() {
        return this._itemPaths;
    }
}

export class WidgetData {
    constructor(values) {
        this.values = values;
    }
}

export class FrequencyWidgetData extends WidgetData {
    constructor(itemPath, counts, labels, values) {
        super(values);
        this.itemPath = itemPath;
        this.counts = counts;
        this.labels = labels;
    }
}

export class DiscreteWidgetData extends WidgetData {
    constructor(itemPaths, values, sortedValues) {
        super(values);
        this.itemPaths = itemPaths;
        this.sortedValues = sortedValues;
    }
}

let reports = [];

export const init = async () => {
    await loadReports();

    // Add initial standard and one custom report
    if (!reports.length) {
        await addStandardReports();
        await addReport(languageHelper.getTranslation("new-report"));
    };
}

export const storeReports = async () => {
    await ioHelper.setJSON("reports", reports);
}

export const loadReports = async () => {
    const reportObjects = await ioHelper.getJSON("reports");
    if (!reportObjects) return;

    for (const reportObject of reportObjects) {
        const report = Report.fromObject(reportObject);
        report.widgets = report.widgets.map(widget => Widget.fromObject(widget));
        reports.push(report);
    }
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

export const removeReport = async id => {
    reports = reports.filter(report => report.id != id);
    await storeReports();
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

export const removeWidget = async (reportId, widgetId) => {
    const report = getReport(reportId);
    report.widgets = report.widgets.filter(widget => widget.id != widgetId);
    await storeReports();
}

// TODO: Make more generic via a new function to get standard widgets
const addStandardReports = async () => {
    // Inclusions report
    const createdYearWidget = new Widget(1, "year-of-inclusion", Widget.types.BAR, ["createdYear"], Widget.sizes.SMALL, true);
    const createdMonthWidget = new Widget(2, "month-of-inclusion", Widget.types.BAR, ["createdMonth"], Widget.sizes.SMALL, true);
    const siteWidget = new Widget(3, "site", Widget.types.BAR, ["siteOID"], Widget.sizes.SMALL, true);
    const inclusionReport = new Report(1, "inclusion-report", [createdYearWidget, createdMonthWidget, siteWidget], true);
    reports.push(inclusionReport);

    await storeReports();
}
