import * as chartColors from "./chartcolors.js";
import * as languageHelper from "../helper/languagehelper.js";

export class CustomScatterChart {
    constructor(widgetData, hoverCallback) {
        this.widgetData = widgetData;
        this.hoverCallback = hoverCallback;
        this.chart = null;
    }

    get data() {
        return {
            datasets: [
                {
                    label: this.widgetData.itemPaths[0],
                    data: this.widgetData.sortedValues,
                    backgroundColor: chartColors.colorLight,
                    borderColor: chartColors.colorDark,
                    borderWidth: 2,
                    radius: 4,
                    hoverRadius: 6,
                    hoverBorderWidth: 3
                }
            ]
        };
    }

    get options() {
        const oneDimensional = this.widgetData.itemPaths.length == 1;
        return {
            maintainAspectRatio: false,
            scales: {
                y: {
                    display: oneDimensional ? false : true,
                    min: oneDimensional ? -1 : undefined,
                    max: oneDimensional ? 2 : undefined
                },
                x: {
                    grid: {
                        display: true,
                        drawBorder: false
                    }
                }
            },
            interaction: { mode: "nearest" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    caretSize: 0,
                    caretPadding: 10,
                    backgroundColor: chartColors.colorDark,
                    displayColors: false,
                    callbacks: {
                        label: event => [
                            languageHelper.getTranslation("subject") + ": " + this.widgetData.sortedValues[event.dataIndex].label,
                            languageHelper.getTranslation(oneDimensional ? "value": "values") + ": " + this.widgetData.sortedValues[event.dataIndex].x
                            + (oneDimensional ? "" : " | " + this.widgetData.sortedValues[event.dataIndex].y)
                        ]
                    }
                }
            },
            onHover: (event, elements) => this.scatterChartHovered(event.chart, elements[0]?.index)
        };
    }

    get config() {
        return {
            type: "scatter",
            data: this.data,
            options: this.options
        };
    }

    scatterChartHovered(chart, hoveredIndex) {
        if (hoveredIndex != this.hoveredIndex) {
            this.hoveredIndex = hoveredIndex;
            if (this.hoverCallback) this.hoverCallback(chart.id, hoveredIndex);
        }
    }

    update() {
        // The following is required since values are sorted to prevent filtered dots to be rendered over active dots
        // However, this would lead Chart.js to render all dots again leading in an undesired animation
        // The following ensures that only the changed borderColor is animated
        // For over 500 points, skip the animation for performance reasons
        let skipAnimation = this.widgetData.sortedValues.length > 500 ? true : false;
        if (!skipAnimation) {
            this.chart.data.datasets[0].borderColor = this.widgetData.sortedValues.map(value => this.previousFiltered && this.previousFiltered.includes(value.label) ? chartColors.colorLight : chartColors.colorDark);
            this.chart.update("none");
        }

        this.previousFiltered = [];
        this.chart.data.datasets[0].borderColor = this.widgetData.sortedValues.map(value => {
            if (value.filtered) {
                this.previousFiltered.push(value.label);
                return chartColors.colorLight;
            } else {
                return chartColors.colorDark;
            }
        });
        
        this.chart.update(skipAnimation ? "none" : null);
    }
}
