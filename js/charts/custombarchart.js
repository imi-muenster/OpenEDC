import * as chartColors from "./chartcolors.js";

export class CustomBarChart {
    constructor(property, counts, labels, values, filterCallback) {
        this.property = property;
        this.counts = counts;
        this.labels = labels;
        this.values = values;
        this.filterCallback = filterCallback;
    }

    get data() {
        return {
            labels: this.labels,
            datasets: [
                {
                    label: this.property,
                    data: this.counts,
                    backgroundColor: chartColors.getColorArray(this.counts.length),
                    borderColor: chartColors.colorDark,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }
            ]
        };
    }

    get options() {
        return {
            maintainAspectRatio: false,
            layout: {
                padding: { top: 20 }
            },
            scales: {
                y: {
                    // max: Math.max(...this.counts),
                    display: false
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                datalabels: {
                    color: chartColors.colorDark,
                    anchor: "end",
                    align: "end",
                    offset: 5,
                    font: { weight: "bold" }
                }
            },
            onClick: (event, elements) => this.barChartClicked(event.chart, elements[0] ? elements[0].index : null)
        };
    }

    get config() {
        return {
            type: "bar",
            data: this.data,
            options: this.options,
            plugins: [ ChartDataLabels ]
        };
    }

    barChartClicked(chart, clickedBarIndex) {
        let value;
        if (clickedBarIndex == this.activeIndex) {
            this.activeIndex = null;
            value = null;
            chart.data.datasets[0].backgroundColor = chartColors.getColorArray(this.counts.length);
        } else {
            this.activeIndex = clickedBarIndex;
            value = this.values[this.activeIndex];
            chart.data.datasets[0].backgroundColor = chartColors.getColorArray(this.counts.length, this.activeIndex);
        }
        
        chart.update();
        if (this.filterCallback) this.filterCallback(this.property, value);
    }

    update() {
        this.chart.update();
    }
}
