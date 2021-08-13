class Report {
    // id, name, users, list of widgets, ...
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.widgets = [];
    }
}

class Widget {
    // id, properties, representation (bar, pie, scatter, numeric, table, ...), size, ...
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}

let reports = [];

export const init = () => {
    // TODO: Load persisted reports
}

const storeReports = async () => {
    // TODO: Persist reports
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

export const addWidget = async (reportId, name) => {
    const report = getReport(reportId);
    const id = report.widgets.reduce((highestId, widget) => widget.id >= highestId ? widget.id : highestId, 0) + 1;
    const widget = new Widget(id, name);
    report.widgets.push(widget);
    await storeReports();

    return widget;
}
