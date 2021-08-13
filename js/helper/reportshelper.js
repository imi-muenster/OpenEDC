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
    constructor(id) {
        this.id = id;
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

export const addReport = async name => {
    const id = reports.reduce((highestId, report) => report.id >= highestId ? report.id : highestId, 0) + 1;
    reports.push(new Report(id, name));
    await storeReports();

    return id;
}

export const addWidget = async reportId => {
    const report = reports.find(report => report.id == reportId);
    const id = report.widgets.reduce((highestId, widget) => widget.id >= highestId ? widget.id : highestId, 0) + 1;
    report.widgets.push(new Widget(id));
    await storeReports();

    return id;
}
