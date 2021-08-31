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

class WidgetData {
    constructor(id, name, values) {
        this.id = id;
        this.name = name;
        this.values = values;
    }
}

class BarChartWidgetData extends WidgetData {
    constructor(id, name, property, counts, labels, values) {
        super(id, name, values);
        this.property = property;
        this.counts = counts;
        this.labels = labels;
    }
}

class ScatterChartWidgetData extends WidgetData {
    constructor(id, name, properties, values, sortedValues) {
        super(id, name, values);
        this.properties = properties;
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

const getBarChartWidgetData = (id, name, property, labels, values) => {
    // If no labels are provided, the function gets all unique values from the data for the property
    // TODO: Use metadata for getting unique values
    const uniqueValues = !labels ? getUniqueValues(property) : null;
    return new BarChartWidgetData(
        id,
        name,
        property,
        Array(uniqueValues ? uniqueValues.length : labels.length),
        uniqueValues ? uniqueValues : labels,
        uniqueValues ? uniqueValues : values,
    );
}

const getScatterChartWidgetData = (id, name, properties) => {
    const values = dataset.map(entry => {
        return {
            x: entry[properties[0]],
            y: properties.length > 1 ? entry[properties[1]] : Math.random(),
            label: entry.subjectKey,
            filtered: false
        };
    });
    return new ScatterChartWidgetData(
        id,
        name,
        properties,
        values,
        []
    );
}

const getUniqueValues = property => {
    return dataset.reduce((values, entry) => {
        if (!values.includes(entry[property])) values.push(entry[property]);
        return values;
    }, new Array());
}
