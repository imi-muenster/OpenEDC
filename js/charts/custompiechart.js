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
                tooltip: { enabled: false },
                datalabels: {
                    color: chartColors.colorWhite,
                    font: { weight: "bold" },
                    display: function(context) {
                        return context.dataset.data[context.dataIndex] != 0;
                    }
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
        if (clickedBarIndex == this.activeIndex) {
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
        if (this.chart.canvas.height == 300) {
            this.chart.canvas.style.height = null;
            this.chart.canvas.height = null;
        }
        this.chart.update();
    }
}