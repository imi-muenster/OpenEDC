import * as reportsHelper from "./helper/reportshelper.js";
import * as languageHelper from "./helper/languagehelper.js";

// Import custom charts
import { CustomBarChart } from "./charts/custombarchart.js";
import { CustomScatterChart } from "./charts/customscatterchart.js";

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

const $ = query => document.querySelector(query);
const $$ = query => document.querySelectorAll(query);

const widgetSizeOptions = {
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large"
};

let dataset = {};
let currentReportId = null;
let customCharts = [];
let widgetData = [];
let activeFilters = [];

export async function init() {
    // Only load chart.js library if required
    await import("../lib/chart.js");
    await import("../lib/chart-datalabels.js");
    
    reportsHelper.init();
    if (!reportsHelper.getReports().length) reportsHelper.addReport(languageHelper.getTranslation("new-report"));

    setIOListeners();
}

export function show() {
    if (!currentReportId) {
        $("#reports-section h1").textContent = languageHelper.getTranslation("no-reported-selected-hint");
        $("#reports-section h2").textContent = languageHelper.getTranslation("please-select-record-hint");
    }

    loadReportList();
    loadWidgets();
}

const loadWidgets = () => {
    if (!currentReportId) return;
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
    calculateWidgetData();

    // Add placeholder
    const placeholder = getChartPlaceholder();
    $("#widgets").appendChild(placeholder);

    // Render charts
    for (const widget of reportsHelper.getReport(currentReportId).widgets) {
        const widgetData = new WidgetData(widget.id, widget.name);
        addWidgetToGrid(widgetData);
    }
}

const getBarChartWidgetData = (id, name, property, labels, values) => {
    // If no labels are provided, the function gets all unique values from the data for the property
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


const getUniqueValues = property => {
    return dataset.reduce((values, entry) => {
        if (!values.includes(entry[property])) values.push(entry[property]);
        return values;
    }, new Array());
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

const addWidgetToGrid = widgetData => {
    let customChart;
    if (widgetData instanceof BarChartWidgetData) {
        customChart = new CustomBarChart(
            widgetData.property,
            widgetData.counts,
            widgetData.labels,
            widgetData.values,
            filterCallback
        );
    } else if (widgetData instanceof ScatterChartWidgetData) {
        customChart = new CustomScatterChart(
            widgetData.properties,
            widgetData.sortedValues,
            widgetData.labels,
            hoverCallback
        );
    }

    const widgetElement = getWidgetElement(widgetData.name);
    $("#reports-section .widget.is-placeholder").insertAdjacentElement("beforebegin", widgetElement);

    if (customChart) {
        const chart = new Chart(widgetElement.querySelector("canvas"), customChart.config);
        customChart.chart = chart;
        customCharts.push(customChart);
    } else {
        const chartOptionsElement = getChartOptionsElement(widgetData.id);
        widgetElement.appendChild(chartOptionsElement);
        setTimeout(() => widgetElement.classList.add("is-flipped"), 250);
    }
}

const getWidgetElement = widget => {
    const widgetElement = document.createElement("div");
    widgetElement.className = "widget is-relative";

    const chartContainer = getChartContainer(widget.name);
    widgetElement.appendChild(chartContainer);
    
    const optionsIcon = getOptionsIcon();
    optionsIcon.querySelector("i").onclick = () => {
        // Only create the options element when needed
        const chartOptionsElement = getChartOptionsElement(widget.id);
        chartOptionsElement.querySelectorAll("button").forEach(button => button.onclick = () => {
            widgetElement.classList.remove("is-flipped");
            setTimeout(() => chartOptionsElement.remove(), 500);
        });
        widgetElement.appendChild(chartOptionsElement);
        widget.classList.add("is-flipped");
    };
    widgetElement.appendChild(optionsIcon);

    return widgetElement;
}

const getChartContainer = titleText => {
    const chartContainer = document.createElement("div");
    chartContainer.className = "chart-container is-flex is-flex-direction-column has-text-centered p-5";

    const title = document.createElement("h2");
    title.className = "subtitle";
    title.textContent = titleText;
    chartContainer.appendChild(title);

    const canvasContainer = document.createElement("div");
    canvasContainer.className = "canvas-container is-flex-grow-1";
    const canvas = document.createElement("canvas");
    canvasContainer.appendChild(canvas);
    chartContainer.appendChild(canvasContainer);

    return chartContainer;
}

const getOptionsIcon = () => {
    const iconContainer = document.createElement("span");
    iconContainer.className = "icon has-text-link";
    const icon = document.createElement("i");
    icon.className = "far fa-ellipsis-h is-clickable";
    iconContainer.appendChild(icon);

    return iconContainer;
}

const getChartOptionsElement = widgetId => {
    const widget = reportsHelper.getWidget(currentReportId, widgetId);

    const chartOptions = document.createElement("div");
    chartOptions.className = "chart-options is-flex is-flex-direction-column is-justify-content-space-between is-align-items-center p-5";

    const title = document.createElement("h2");
    title.className = "subtitle";
    title.textContent = languageHelper.getTranslation("options");
    chartOptions.appendChild(title);

    const sizeOptions = document.createElement("div");
    for (const option of Object.values(widgetSizeOptions)) {
        const sizeOption = document.createElement("label");
        sizeOption.className = "radio";
        const radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.name = widget.id;
        if ((widget.size && widget.size == option) || (!widget.size && option == widgetSizeOptions.SMALL)) radioInput.checked = true;
        sizeOption.appendChild(radioInput);
        sizeOption.appendChild(document.createTextNode(" " + option));
        sizeOptions.appendChild(sizeOption);
    }
    chartOptions.appendChild(sizeOptions);

    const buttons = document.createElement("div");
    buttons.className = "buttons";
    const saveButton = document.createElement("button");
    saveButton.className = "button is-link is-light is-small";
    saveButton.textContent = languageHelper.getTranslation("save");
    buttons.appendChild(saveButton);

    const removeButton = document.createElement("button");
    removeButton.className = "button is-danger is-light is-small";
    removeButton.textContent = languageHelper.getTranslation("remove");
    buttons.appendChild(removeButton);

    const cancelButton = document.createElement("button");
    cancelButton.className = "button is-small";
    cancelButton.textContent = languageHelper.getTranslation("cancel");
    buttons.appendChild(cancelButton);
    chartOptions.appendChild(buttons);

    return chartOptions;
}

const getChartPlaceholder = () => {
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
    addWidgetToGrid(new WidgetData(widget.id, widget.name));
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
