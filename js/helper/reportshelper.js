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
        this.hasDefaultName = true;
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
        this.hasDefaultName = true;
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

export const standardReports = {
    INCLUSIONS: {
        name: "inclusion-report",
        widgets: [
            {
                name: "site",
                type: Widget.types.BAR,
                itemPaths: ["siteOID"],
                size: Widget.sizes.SMALL
            },
            {
                name: "year-of-inclusion",
                type: Widget.types.BAR,
                itemPaths: ["createdYear"],
                size: Widget.sizes.SMALL
            },
            {
                name: "month-of-inclusion",
                type: Widget.types.BAR,
                itemPaths: ["createdMonth"],
                size: Widget.sizes.SMALL
            }
        ]
    }
}

let reports = [];

export const init = async () => {
    await loadReports();

    // Add initial standard and one custom report
    if (!reports.length) {
        addStandardReports();
        addReport("new-report");
        storeReports();
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

export const addReport = (name, isStandard) => {
    const id = reports.reduce((highestId, report) => report.id >= highestId ? report.id : highestId, 0) + 1;
    const report = new Report(id, name, null, isStandard);
    reports.push(report);

    return report;
}

export const removeReport = async reportId => {
    reports = reports.filter(report => report.id != reportId);
    await storeReports();
}

export const addWidget = (reportId, name, type, itemPaths, size, isStandard) => {
    const report = getReport(reportId);
    const id = report.widgets.reduce((highestId, widget) => widget.id >= highestId ? widget.id : highestId, 0) + 1;
    const widget = new Widget(id, name, type, itemPaths, size, isStandard);
    report.widgets.push(widget);

    return widget;
}

export const removeWidget = async (reportId, widgetId) => {
    const report = getReport(reportId);
    report.widgets = report.widgets.filter(widget => widget.id != widgetId);
    await storeReports();
}

const addStandardReports = () => {
    for (const standardReport of Object.values(standardReports)) {
        const report = addReport(standardReport.name, true);
        for (const widget of standardReport.widgets) {
            addWidget(report.id, widget.name, widget.type, widget.itemPaths, widget.size, true);
        }
    }
}
