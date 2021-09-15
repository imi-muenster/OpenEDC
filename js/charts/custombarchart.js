import * as chartColors from "./chartcolors.js";

export class CustomBarChart {
    constructor(widgetData, filterCallback) {
        this.widgetData = widgetData;
        this.filterCallback = filterCallback;
        this.chart = null;
    }

    get data() {
        return {
            labels: this.widgetData.labels,
            datasets: [
                {
                    label: this.widgetData.itemPath,
                    data: this.widgetData.counts,
                    backgroundColor: chartColors.getColorArray(true, this.widgetData.counts.length),
                    borderColor: chartColors.colorDark,
                    borderWidth: 2,
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
                    // max: Math.max(...this.widgetData.counts),
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
            onClick: (event, elements) => this.barChartClicked(event.chart, elements[0]?.index)
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
        if (clickedBarIndex == this.activeIndex || clickedBarIndex == null) {
            this.activeIndex = null;
            value = null;
            chart.data.datasets[0].backgroundColor = chartColors.getColorArray(true, this.widgetData.counts.length);
        } else {
            this.activeIndex = clickedBarIndex;
            value = this.widgetData.values[this.activeIndex];
            chart.data.datasets[0].backgroundColor = chartColors.getColorArray(true, this.widgetData.counts.length, this.activeIndex);
        }
        
        chart.update();
        if (this.filterCallback) this.filterCallback(this.widgetData.itemPath, value);
    }

    update() {
        this.chart.update();
    }
}
