class Report {
    // id, name, users, list of widgets, ...
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}

class Widget {
    // id, properties, representation (bar, pie, scatter, numeric, table, ...), size, ...
    constructor(id, property) {
        this.id = id;
        this.property = property;
    }
}

let reports = [];

export const init = () => {
    // TODO: Load persisted reports
    if (reports.length) reportsHelper.addReport(languageHelper.getTranslation("new-report"));
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
