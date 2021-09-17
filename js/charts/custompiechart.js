import * as chartColors from "./chartcolors.js";

export class CustomPieChart {
    constructor(widgetData, filterCallback, isDonut) {
        this.widgetData = widgetData;
        this.filterCallback = filterCallback;
        this.isDonut = isDonut;
        this.chart = null;
    }

    get data() {
        return {
            labels: this.widgetData.labels,
            datasets: [
                {
                    label: this.widgetData.itemPath,
                    data: this.widgetData.counts,
                    backgroundColor: chartColors.getColorArray(false, this.widgetData.counts.length),
                    borderColor: chartColors.colorDark,
                    borderWidth: 2
                }
            ]
        };
    }

    get options() {
        return {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "right" },
                tooltip: {
                    caretSize: 0,
                    caretPadding: 10,
                    backgroundColor: chartColors.colorDark,
                    displayColors: false,
                    callbacks: {
                        label: event => event.label
                    }
                },
                datalabels: {
                    font: { weight: "bold" },
                    color: context => context.dataset.backgroundColor[context.dataIndex] == chartColors.colorLight ? chartColors.colorDark : chartColors.colorLight,
                    display: context =>  context.dataset.data[context.dataIndex] != 0
                }
            },
            onClick: (event, elements) => this.pieChartClicked(event.chart, elements[0]?.index)
        };
    }

    get config() {
        return {
            type: this.isDonut ? "doughnut" : "pie",
            data: this.data,
            options: this.options,
            plugins: [ ChartDataLabels ]
        };
    }

    pieChartClicked(chart, clickedBarIndex) {
        let value;
        if (clickedBarIndex == this.activeIndex || clickedBarIndex == null) {
            this.activeIndex = null;
            value = null;
            chart.data.datasets[0].backgroundColor = chartColors.getColorArray(false, this.widgetData.counts.length);
        } else {
            this.activeIndex = clickedBarIndex;
            value = this.widgetData.values[this.activeIndex];
            chart.data.datasets[0].backgroundColor = chartColors.getColorArray(true, this.widgetData.counts.length, this.activeIndex);
        }
        
        chart.update();
        if (this.filterCallback) this.filterCallback(this.widgetData.itemPath, value);
    }

    update() {
        // Pie and donut charts have a minimal height of 300px which must be reset in order to display it within small widgets
        if (this.chart.canvas.style.height == "300px") {
            this.chart.canvas.style.height = null;
            this.chart.canvas.height = null;
        }
        this.chart.update();
    }
}
