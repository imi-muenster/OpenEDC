import * as chartColors from "./chartcolors.js";

export class CustomScatterChart {
    constructor(properties, values, labels, hoverCallback) {
        this.properties = properties;
        this.values = values;
        this.labels = labels;
        this.hoverCallback = hoverCallback;
    }

    get data() {
        return {
            datasets: [
                {
                    label: this.properties[0],
                    data: this.values,
                    backgroundColor: chartColors.colorLight,
                    borderColor: chartColors.colorDark,
                    borderWidth: 2,
                    radius: 4,
                    hoverRadius: 6,
                    hoverBorderWidth: 2
                }
            ]
        };
    }

    get options() {
        const oneDimensional = this.properties.length == 1;
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
            plugins: {
                legend: { display: false },
                tooltip: {
                    caretSize: 0,
                    caretPadding: 10,
                    backgroundColor: chartColors.colorDark,
                    displayColors: false,
                    callbacks: {
                        label: event => {
                            return "Patient: " + this.values[event.dataIndex].label;
                        }
                    }
                }
            },
            onHover: (event, elements) => this.scatterChartHovered(event.chart, elements[0] ? elements[0].index : null)
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
        // TODO: Keep an eye on performance, since this is quite expensive and calculated for every scatter plot
        this.chart.data.datasets[0].borderColor = this.values.map(value => this.previousFiltered && this.previousFiltered.includes(value.label) ? chartColors.colorLight : chartColors.colorDark);
        this.chart.update("none");

        this.previousFiltered = [];
        this.chart.data.datasets[0].borderColor = this.values.map(value => {
            if (value.filtered) {
                this.previousFiltered.push(value.label);
                return chartColors.colorLight;
            } else {
                return chartColors.colorDark;
            }
        });
        this.chart.update();
    }
}
