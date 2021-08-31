import * as reportsHelper from "./helper/reportshelper.js";
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

    dataset = clinicaldataWrapper.getAllData();

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

const loadWidgets = () => {
    if (!currentReportId) return;
    widgetComponents = [];
    $$("#widgets .widget").removeElements();

    // // Create bar charts
    // widgetData.push(getBarChartWidgetData("Einschlussjahr", "createdYear"));
    // widgetData.push(getBarChartWidgetData("Einschlussmonat", "createdMonth", getMonthsShort(), getMonthsInteger()));
    // widgetData.push(getBarChartWidgetData("Klinik", "site"));
    // widgetData.push(getBarChartWidgetData("Geschlecht", "gender"));

    // // Create scatter charts
    // widgetData.push(getScatterChartWidgetData("Größe und Gewicht", ["weight", "height"]));
    // widgetData.push(getScatterChartWidgetData("Alter", ["age"]));
    
    // Fill value arrays
    // calculateWidgetData();

    // Add placeholder
    $("#widgets").appendChild(getWidgetPlaceholder());

    // Render charts
    reportsHelper.getReport(currentReportId).widgets.forEach(widget => addWidgetToGrid(widget));
}

const calculateWidgetData = () => {
    if (!currentReportId) return;
    let filteredCount = 0;

    widgetData.filter(entry => entry instanceof BarChartWidgetData).forEach(entry => entry.counts.fill(0));
    widgetData.filter(entry => entry instanceof ScatterChartWidgetData).forEach(entry => entry.sortedValues.length = 0);
    for (let i = 0; i < dataset.length; i++) {
        let filteredInGeneral = false;
        for (const entry of widgetData) {
            let filteredForChart = false;
            for (const filter of activeFilters) {
                if (dataset[i][filter.property] != filter.value) {
                    filteredInGeneral = true;
                    if (entry.property != filter.property) filteredForChart = true;
                }
            }
            if (entry instanceof BarChartWidgetData){
                if (filteredForChart) continue;
                const value = dataset[i][entry.property];
                const index = entry.values.indexOf(value);
                entry.counts[index]++;
            } else if (entry instanceof ScatterChartWidgetData) {
                entry.values[i].filtered = filteredInGeneral;
                if (filteredInGeneral) entry.sortedValues.unshift(entry.values[i]);
                else entry.sortedValues.push(entry.values[i]);
            }
        }
        if (filteredInGeneral) filteredCount++;
    }

    $("#reports-section h1").textContent = (dataset.length - filteredCount) + (activeFilters.length > 0 ? " von " + dataset.length : "") + " Patienten";
    $("#reports-section h2").textContent = activeFilters.length + " aktive Filter";
}

const getMonthsInteger = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
}

const getMonthsShort = locale => {
    return Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1))
        .map(date => date.toLocaleDateString(locale, { month: "short" }));
}

const filterCallback = (property, value) => {
    if (value) addFilter(property, value);
    else removeFilter(property);
    updateCharts();
}

const addFilter = (property, value) => {
    // No use of data.filter(); since a filter should not be applied for the triggering chart
    activeFilters = activeFilters.filter(filter => filter.property != property);
    activeFilters.push({ property, value });
}

const removeFilter = property => {
    activeFilters = activeFilters.filter(filter => filter.property != property);
}

const updateCharts = () => {
    calculateWidgetData();
    customCharts.forEach(customChart => customChart.update());
}

const hoverCallback = (chartId, index) => {
    for (const customChart of customCharts) {
        if (!(customChart instanceof CustomScatterChart) || customChart.chart.id == chartId) continue;

        if (index != null) customChart.chart.setActiveElements([{ datasetIndex: 0, index: index }]);
        else customChart.chart.setActiveElements([]);
        customChart.chart.update();
    }
}

const addWidgetToGrid = widget => {
    let customChart;
    // TODO: Create WidgetData and, if appropriate, CustomChart

    const widgetComponent = document.createElement("widget-component");
    widgetComponent.setWidget(widget);
    $("#reports-section .widget.is-placeholder").insertAdjacentElement("beforebegin", widgetComponent);

    if (customChart) {
        const chart = new Chart(widgetElement.querySelector("canvas"), customChart.config);
        customChart.chart = chart;
        customCharts.push(customChart);
    } else {
        setTimeout(() => widgetComponent.showOptions(), 250);
    }

    widgetComponents.push(widgetComponent);
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
        const reportEntry = document.createElement("a");
        reportEntry.textContent = report.name;
        reportEntry.setAttribute("id", report.id);
        reportEntry.onclick = () => loadReport(report.id);
        $("#reports-list").appendChild(reportEntry);
    }
}

const loadReport = id => {
    $(`#reports-list a.is-active`)?.deactivate();
    $(`#reports-list a[id="${id}"]`).activate();
    currentReportId = id;
    loadWidgets();
}

const addReport = async () => {
    const report = await reportsHelper.addReport(languageHelper.getTranslation("new-report"));
    currentReportId = report.id;
    loadReportList();
    loadReport(currentReportId);
}

const setIOListeners = () => {
    $("#reports-section #add-report-button").addEventListener("click", () => addReport());
}
