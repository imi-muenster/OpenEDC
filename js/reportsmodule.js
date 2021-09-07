import ODMPath from "./odmwrapper/odmpath.js";
import * as reportsHelper from "./helper/reportshelper.js";
import * as metadataWrapper from "./odmwrapper/metadatawrapper.js";
import * as clinicaldataWrapper from "./odmwrapper/clinicaldatawrapper.js";
import * as languageHelper from "./helper/languagehelper.js";

// Import custom charts
import { CustomBarChart } from "./charts/custombarchart.js";
import { CustomScatterChart } from "./charts/customscatterchart.js";

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

let dataset = {};
let currentReportId = null;
let widgetComponents = [];
let activeFilters = [];

export async function init() {
    // TODO: Do not init within startApp() but only when needed

    // Only load chart.js library if required
    await import("./components/reports/widgetcomponent.js");
    await import("./components/reports/widgetcontent.js");
    await import("./components/reports/widgetoptions.js");
    await import("../lib/chart.js");
    await import("../lib/chart-datalabels.js");
    
    await reportsHelper.init();
    if (!reportsHelper.getReports().length) reportsHelper.addReport(languageHelper.getTranslation("new-report"));

    dataset = await clinicaldataWrapper.getAllData();

    setIOListeners();
}

export function show() {
    if (!currentReportId) {
        $("#reports-section h1").textContent = languageHelper.getTranslation("no-reported-selected-hint");
        $("#reports-section h2").textContent = languageHelper.getTranslation("please-select-record-hint");
    }

    loadReportList();
    loadWidgets();
    languageHelper.createLanguageSelect();
}

export const loadWidgets = () => {
    widgetComponents = [];
    activeFilters = [];
    $$("#widgets .widget").removeElements();
    if (!currentReportId) return;

    // Add placeholder
    $("#widgets").appendChild(getWidgetPlaceholder());

    // Add widgets
    reportsHelper.getReport(currentReportId).widgets.forEach(widget => addWidgetToGrid(widget));

    // Update widgets
    updateWidgets();
}

const calculateWidgetData = () => {
    if (!currentReportId) return;
    const subjectKeys = Object.keys(dataset);
    const subjectData = Object.values(dataset);
    let filteredCount = 0;

    const widgetData = widgetComponents.map(widgetComponent => widgetComponent?.customChart?.widgetData);
    widgetData.filter(entry => entry instanceof reportsHelper.FrequencyWidgetData).forEach(entry => entry.counts.fill(0));
    widgetData.filter(entry => entry instanceof reportsHelper.DiscreteWidgetData).forEach(entry => entry.sortedValues.length = 0);
    for (let i = 0; i < subjectKeys.length; i++) {
        let filteredInGeneral = false;
        for (const entry of widgetData) {
            let filteredForChart = false;
            for (const filter of activeFilters) {
                if (subjectData[i][filter.itemPath] != filter.value) {
                    filteredInGeneral = true;
                    if (entry.itemPath != filter.itemPath) filteredForChart = true;
                }
            }
            if (entry instanceof reportsHelper.FrequencyWidgetData){
                if (filteredForChart) continue;
                const value = subjectData[i][entry.itemPath];
                const index = entry.values.indexOf(value);
                entry.counts[index]++;
            } else if (entry instanceof reportsHelper.DiscreteWidgetData) {
                entry.values[i].filtered = filteredInGeneral;
                if (filteredInGeneral) entry.sortedValues.unshift(entry.values[i]);
                else entry.sortedValues.push(entry.values[i]);
            }
        }
        if (filteredInGeneral) filteredCount++;
    }

    $("#reports-section h1").textContent = (subjectKeys.length - filteredCount) + (activeFilters.length > 0 ? " " + languageHelper.getTranslation("of") + " " + subjectKeys.length : "") + " " + languageHelper.getTranslation("subjects");
    $("#reports-section h2").textContent = activeFilters.length + " " + languageHelper.getTranslation("active-filters");
}

const getMonthsInteger = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
}

const getMonthsShort = locale => {
    return Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1)).map(date => date.toLocaleDateString(locale, { month: "short" }));
}

const filterCallback = (itemPath, value) => {
    if (value) addFilter(itemPath, value);
    else removeFilter(itemPath);
    updateWidgets();
}

const addFilter = (itemPath, value) => {
    // No use of data.filter(); since a filter should not be applied for the triggering chart
    activeFilters = activeFilters.filter(filter => filter.itemPath != itemPath);
    activeFilters.push({ itemPath, value });
}

const removeFilter = itemPath => {
    activeFilters = activeFilters.filter(filter => filter.itemPath != itemPath);
}

const updateWidgets = () => {
    calculateWidgetData();
    widgetComponents.forEach(widgetComponent => widgetComponent.update());
}

const reloadWidget = widgetId => {
    const widget = reportsHelper.getWidget(currentReportId, widgetId);
    const widgetComponent = widgetComponents.find(entry => entry.widget.id == widgetId);

    // First, remove a filter that is possibly set for the widget
    removeFilter(widget.itemPaths[0]);

    // Second, add or replace the chart
    const customChart = getCustomChart(widget);
    if (customChart) {
        widgetComponent.customChart?.chart?.destroy();
        customChart.chart = new Chart(widgetComponent.querySelector("canvas"), customChart.config);;
        widgetComponent.setCustomChart(customChart);
    }

    // Third, update all widgets
    updateWidgets();
}

const removeWidget = widgetId => {
    const widget = reportsHelper.getWidget(currentReportId, widgetId);

    // Remove widget component and a possibly set filter
    removeFilter(widget.itemPaths[0]);
    widgetComponents = widgetComponents.filter(entry => entry.widget.id != widgetId);
    reportsHelper.removeWidget(currentReportId, widgetId);

    // Update all widgets
    updateWidgets();
}

const hoverCallback = (chartId, index) => {
    // TODO: Performance with .map() and .filter() on each hover event?
    const customCharts = widgetComponents.map(widgetComponent => widgetComponent.customChart).filter(customChart => customChart);
    for (const customChart of customCharts) {
        if (!(customChart instanceof CustomScatterChart) || customChart.chart.id == chartId) continue;

        if (index != null) customChart.chart.setActiveElements([{ datasetIndex: 0, index: index }]);
        else customChart.chart.setActiveElements([]);
        customChart.chart.update();
    }
}

const addWidgetToGrid = widget => {
    const widgetComponent = document.createElement("widget-component");
    widgetComponent.setWidget(widget);
    $("#reports-section .widget.is-placeholder").insertAdjacentElement("beforebegin", widgetComponent);

    const customChart = getCustomChart(widget);
    if (customChart) {
        customChart.chart = new Chart(widgetComponent.querySelector("canvas"), customChart.config);
        // TODO: Use setter instead
        widgetComponent.setCustomChart(customChart);
    } else {
        setTimeout(() => widgetComponent.showOptions(), 250);
    }

    widgetComponents.push(widgetComponent);
}

const getCustomChart = widget => {
    switch (widget.type) {
        case reportsHelper.Widget.types.BAR:
            const frequencyWidgetData = getFrequencyWidgetData(widget.itemPaths[0]);
            return new CustomBarChart(frequencyWidgetData, filterCallback);
        case reportsHelper.Widget.types.SCATTER:
            const discreteWidgetData = getDiscreteWidgetData(widget.itemPaths);
            return new CustomScatterChart(discreteWidgetData, hoverCallback);
    }
}

const getFrequencyWidgetData = itemPath => {
    const itemOID = ODMPath.parseAbsolute(itemPath).itemOID;

    let values, labels;
    switch (metadataWrapper.getElementDefByOID(itemOID).getDataType()) {
        case metadataWrapper.dataTypes.CODELISTTEXT:
        case metadataWrapper.dataTypes.CODELISTINTEGER:
        case metadataWrapper.dataTypes.CODELISTFLOAT:
            const codeListItems = metadataWrapper.getCodeListItemsByItem(itemOID);
            values = codeListItems.map(item => item.getCodedValue());
            labels = codeListItems.map(item => item.getTranslatedDecode(languageHelper.getCurrentLocale()));
            break;
        case metadataWrapper.dataTypes.BOOLEAN:
            values = ["1", "0"];
            labels = [languageHelper.getTranslation("yes"), languageHelper.getTranslation("no")];
            break;
        default:
            return;
    }
    
    return new reportsHelper.FrequencyWidgetData(
        itemPath,
        Array(values.length),
        labels,
        values
    );
}

const getDiscreteWidgetData = itemPaths => {
    // TODO: Evaluate performance of .map() in this scenario
    const values = Object.entries(dataset).map(entry => {
        return {
            x: entry[1][itemPaths[0]],
            y: itemPaths.length > 1 ? entry[1][itemPaths[1]] : Math.random(),
            label: entry[0],
            filtered: false
        };
    });
    return new reportsHelper.DiscreteWidgetData(
        itemPaths,
        values,
        []
    );
}

const getWidgetPlaceholder = () => {
    const placeholder = document.createElement("div");
    placeholder.className = "widget is-placeholder is-flex is-align-items-center is-justify-content-center is-clickable";

    const iconContainer = document.createElement("span");
    iconContainer.className = "icon is-size-1";
    const icon = document.createElement("i");
    icon.className = "fas fa-plus is-clickable";
    iconContainer.appendChild(icon);
    placeholder.appendChild(iconContainer);

    placeholder.onclick = () => addWidget();

    return placeholder;
}

const addWidget = async () => {
    const widget = await reportsHelper.addWidget(currentReportId, languageHelper.getTranslation("new-chart"));
    addWidgetToGrid(widget);
}

const loadReportList = () => {
    $$("#reports-list a").removeElements();
    for (const report of reportsHelper.getReports()) {
        const reportElement = document.createElement("a");
        reportElement.textContent = report.name;
        reportElement.setAttribute("id", report.id);
        reportElement.onclick = () => loadReport(report.id);
        if (currentReportId == report.id) reportElement.activate();
        $("#reports-list").appendChild(reportElement);
    }
    currentReportId ? $("#edit-report-button").show() : $("#edit-report-button").hide();
}

const loadReport = id => {    
    currentReportId = id;
    loadReportList();
    loadWidgets();
}

const addReport = async () => {
    const report = await reportsHelper.addReport(languageHelper.getTranslation("new-report"));
    currentReportId = report.id;
    loadReportList();
    loadReport(currentReportId);
}

const showReportModal = async () => {
    await import("./components/reports/reportmodal.js");
    const reportModal = document.createElement("report-modal");
    reportModal.setReport(reportsHelper.getReport(currentReportId));

    document.body.appendChild(reportModal);
    languageHelper.localize(reportModal);
}

const setIOListeners = () => {
    $("#reports-section #add-report-button").addEventListener("click", () => addReport());
    $("#reports-section #edit-report-button").addEventListener("click", () => showReportModal());

    document.addEventListener("ReportEdited", () => {
        loadReportList();
        reportsHelper.storeReports();
    });
    document.addEventListener("ReportRemoved", event => {
        reportsHelper.removeReport(event.detail);
        loadReport(null);
    });
    document.addEventListener("WidgetUpdated", event => {
        reloadWidget(event.detail);
        reportsHelper.storeReports();
    });
    document.addEventListener("WidgetRemoved", event => removeWidget(event.detail));
}
