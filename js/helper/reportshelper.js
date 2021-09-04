import * as ioHelper from "./iohelper.js";

export class Report {
    static fromObject(object) {
        return Object.assign(new Report(), object);
    }

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

    static fromObject(object) {
        return Object.assign(new Widget(), object);
    }

    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.size = Widget.sizes.SMALL;
        this.itemPaths = [];
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

    set itemPaths(values) {
        if (values && values.length <= 2) this._itemPaths = values;
    }

    get itemPaths() {
        return this._itemPaths;
    }
}

class WidgetData {
    constructor(id, name, values) {
        this.id = id;
        this.name = name;
        this.values = values;
    }
}

class FrequencyWidgetData extends WidgetData {
    constructor(id, name, itemPath, counts, labels, values) {
        super(id, name, values);
        this.itemPath = itemPath;
        this.counts = counts;
        this.labels = labels;
    }
}

class DiscreteWidgetData extends WidgetData {
    constructor(id, name, itemPaths, values, sortedValues) {
        super(id, name, values);
        this.itemPaths = itemPaths;
        this.sortedValues = sortedValues;
    }
}

let reports = [];

export const init = async () => {
    await loadReports();
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

const getFrequencyWidgetData = (id, name, itemPath, labels, values) => {
    // If no labels are provided, the function gets all unique values from the data for the itemPath
    // TODO: Use metadata for getting unique values
    const uniqueValues = !labels ? getUniqueValues(itemPath) : null;
    return new FrequencyWidgetData(
        id,
        name,
        itemPath,
        Array(uniqueValues ? uniqueValues.length : labels.length),
        uniqueValues ? uniqueValues : labels,
        uniqueValues ? uniqueValues : values,
    );
}

const getDiscreteWidgetData = (id, name, itemPaths) => {
    const values = dataset.map(entry => {
        return {
            x: entry[itemPaths[0]],
            y: itemPaths.length > 1 ? entry[itemPaths[1]] : Math.random(),
            label: entry.subjectKey,
            filtered: false
        };
    });
    return new DiscreteWidgetData(
        id,
        name,
        itemPaths,
        values,
        []
    );
}

const getUniqueValues = itemPath => {
    return dataset.reduce((values, entry) => {
        if (!values.includes(entry[itemPath])) values.push(entry[itemPath]);
        return values;
    }, new Array());
}
