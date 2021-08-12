import { testData } from "./charts/testdata.js";
import { CustomBarChart } from "./charts/custombarchart.js";
import { CustomScatterChart } from "./charts/customscatterchart.js";

class Report {
    // id, name, users, list of widgets, ...
    constructor() {

    }
}

class Widget {
    // id, properties, representation (bar, pie, scatter, numeric, table, ...), size, ...
    constructor() {

    }
}

class ChartData {
    constructor(name, values) {
        this.name = name;
        this.values = values;
    }
}

class BarChartData extends ChartData {
    constructor(name, property, counts, labels, values) {
        super(name, values);
        this.property = property;
        this.counts = counts;
        this.labels = labels;
    }
}

class ScatterChartData extends ChartData {
    constructor(name, properties, values, sortedValues) {
        super(name, values);
        this.properties = properties;
        this.sortedValues = sortedValues;
    }
}

let customCharts = [];
let chartData = [];
let activeFilters = [];

export function init() {

}

export async function show() {
    await import("../lib/chart.js");
    await import("../lib/chart-datalabels.js");

    initializeCharts();
}

const initializeCharts = () => {
    // Create bar charts
    chartData.push(getBarChartData("Einschlussjahr", "createdYear"));
    chartData.push(getBarChartData("Einschlussmonat", "createdMonth", getMonthsShort(), getMonthsInteger()));
    chartData.push(getBarChartData("Klinik", "site"));
    chartData.push(getBarChartData("Geschlecht", "gender"));

    // Create scatter charts
    chartData.push(getScatterChartData("Größe und Gewicht", ["weight", "height"]));
    chartData.push(getScatterChartData("Alter", ["age"]));
    
    // Fill value arrays
    calculateChartData();

    // Render charts
    for (const entry of chartData) {
        let customChart;
        if (entry instanceof BarChartData) {
            customChart = new CustomBarChart(
                entry.property,
                entry.counts,
                entry.labels,
                entry.values,
                filterCallback
            );
        } else {
            customChart = new CustomScatterChart(
                entry.properties,
                entry.sortedValues,
                entry.labels,
                hoverCallback
            );
        }

        const widget = getWidget(entry.name);
        document.querySelector("#reports-section #widgets").appendChild(widget);

        const chart = new Chart(widget.querySelector("canvas"), customChart.config);
        customChart.chart = chart;
        customCharts.push(customChart);
    }

    const placeholder = getChartPlaceholder();
    document.querySelector("#widgets").appendChild(placeholder);
}

const getBarChartData = (name, property, labels, values) => {
    // If no labels are provided, the function gets all unique values from the data for the property
    const uniqueValues = !labels ? getUniqueValues(property) : null;
    return new BarChartData(
        name,
        property,
        Array(uniqueValues ? uniqueValues.length : labels.length),
        uniqueValues ? uniqueValues : labels,
        uniqueValues ? uniqueValues : values,
    );
}

const getScatterChartData = (name, properties) => {
    const values = testData.map(entry => {
        return {
            x: entry[properties[0]],
            y: properties.length > 1 ? entry[properties[1]] : Math.random(),
            label: entry.subjectKey,
            filtered: false
        };
    });
    return new ScatterChartData(
        name,
        properties,
        values,
        []
    );
}

const calculateChartData = () => {
    let filteredCount = 0;

    chartData.filter(entry => entry instanceof BarChartData).forEach(entry => entry.counts.fill(0));
    chartData.filter(entry => entry instanceof ScatterChartData).forEach(entry => entry.sortedValues.length = 0);
    for (let i = 0; i < testData.length; i++) {
        let filteredInGeneral = false;
        for (const entry of chartData) {
            let filteredForChart = false;
            for (const filter of activeFilters) {
                if (testData[i][filter.property] != filter.value) {
                    filteredInGeneral = true;
                    if (entry.property != filter.property) filteredForChart = true;
                }
            }
            if (entry instanceof BarChartData){
                if (filteredForChart) continue;
                const value = testData[i][entry.property];
                const index = entry.values.indexOf(value);
                entry.counts[index]++;
            } else if (entry instanceof ScatterChartData) {
                entry.values[i].filtered = filteredInGeneral;
                if (filteredInGeneral) entry.sortedValues.unshift(entry.values[i]);
                else entry.sortedValues.push(entry.values[i]);
            }
        }
        if (filteredInGeneral) filteredCount++;
    }

    document.querySelector("#reports-section h1").textContent = (testData.length - filteredCount) + (activeFilters.length > 0 ? " von " + testData.length : "") + " Patienten";
    document.querySelector("#reports-section h2").textContent = activeFilters.length + " aktive Filter";
}

const getMonthsInteger = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
}

const getMonthsShort = locale => {
    return Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1))
        .map(date => date.toLocaleDateString(locale, { month: "short" }));
}


const getUniqueValues = property => {
    return testData.reduce((values, entry) => {
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
    calculateChartData();
    customCharts.forEach(customChart => customChart.update());
}

const hoverCallback = (chartId, index) => {
    for (const customChart of customCharts) {
        if (!(customChart instanceof CustomScatterChart) || customChart.chart.id == chartId) continue;

        if (index) customChart.chart.setActiveElements([{ datasetIndex: 0, index: index }]);
        else customChart.chart.setActiveElements([]);
        customChart.chart.update();
    }
}

const getWidget = titleText => {
    const widget = document.createElement("div");
    widget.className = "widget is-relative";

    const chartContainer = getChartContainer(titleText);
    widget.appendChild(chartContainer);
    
    const optionsIcon = getOptionsIcon();
    optionsIcon.querySelector("i").onclick = () => {
        // Only create the options element when needed
        const chartOptions = getChartOptions();
        chartOptions.querySelectorAll("button").forEach(button => button.onclick = () => {
            widget.classList.remove("is-flipped");
            setTimeout(() => chartOptions.remove(), 500);
        });
        widget.appendChild(chartOptions);
        widget.classList.add("is-flipped");
    };
    widget.appendChild(optionsIcon);

    return widget;
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

const getChartOptions = () => {
    const chartOptions = document.createElement("div");
    chartOptions.className = "chart-options is-flex is-flex-direction-column is-justify-content-space-between is-align-items-center p-5";

    const title = document.createElement("h2");
    title.className = "subtitle";
    title.textContent = "Optionen";
    chartOptions.appendChild(title);

    const buttons = document.createElement("div");
    buttons.className = "buttons";

    const saveButton = document.createElement("button");
    saveButton.className = "button is-link is-light is-small";
    saveButton.textContent = "Speichern";
    buttons.appendChild(saveButton);

    const cancelButton = document.createElement("button");
    cancelButton.className = "button is-small";
    cancelButton.textContent = "Abbrechen";
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

    return placeholder;
}
