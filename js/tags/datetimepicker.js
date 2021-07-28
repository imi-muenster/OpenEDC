class Day {
    constructor(date) {
        if (!date) date = new Date();

        this.numberInMonth = date.getDate();
        this.numberInWeek = date.getDay() || 7;
        this.month = date.getMonth() + 1;
        this.year = date.getFullYear();
        this.date = date;
    }

    get isToday() {
        const today = new Day();
        return this.numberInMonth == today.numberInMonth && this.month == today.month && this.year == today.year;
    }
}

class Month {
    constructor(date) {
        const day = new Day(date);

        this.numberOfDays = new Date(day.year, day.month, 0).getDate();
        this.number = day.month;
        this.year = day.year;
        this.date = date;
    }

    get days() {
        const days = [];
        for (let i = 1; i <= this.numberOfDays; i++) {
            days.push(new Day(new Date(this.year, this.number - 1, i)));
        }

        return days;
    }

    get firstDayOffset() {
        return this.days[0].numberInWeek - 1;
    }
}

class Calendar {
    constructor(year, month) {
        this.today = new Day();
        this.year = year || this.today.year;
        this.month = new Month(new Date(this.year, (month || this.today.month) - 1));
    }

    get weekDays() {
        return this.month.days.slice(0, 7).sort((a, b) => a.numberInWeek > b.numberInWeek ? 1 : (a.numberInWeek < b.numberInWeek ? -1 : 0));
    }

    get months() {
        const months = [];
        for (let i = 0; i <= 11; i++) {
            months.push(new Month(new Date(this.year, i, 1)));
        }

        return months;
    }
}

class DateTimePicker extends HTMLElement {
    locale = "en";

    connectedCallback() {
        this.render();
    }

    get style() {
        return `
            #day-grid-heading, #day-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                grid-gap: .25rem;
            }
        `;
    }

    render() {
        this.innerHTML = `
            <style>${this.style}</style>
            <div class="modal" id="datetime-picker">
                <div class="modal-background"></div>
                <div class="modal-content is-small">
                    <div class="box has-text-centered">
                        <h1 class="title">Date</h1>
                        <div class="mb-5" id="year-month-select">
                            <button class="button is-link is-inverted">
                                <span class="icon">
                                    <i class="fas fa-xs fa-arrow-left"></i>
                                </span>
                            </button>
                            <div class="select" id="picker-year-select"></div>
                            <div class="select" id="picker-month-select"></div>
                            <button class="button is-link is-inverted">
                                <span class="icon">
                                    <i class="fas fa-xs fa-arrow-right"></i>
                                </span>
                            </button>
                        </div>
                        <div id="day-grid-heading" class="mb-3"></div>
                        <div id="day-grid"></div>
                    </div>
                </div>
            </div>
        `;

        const calendar = new Calendar();

        // Fill year select
        const years = Array.from({ length: 110 }, (_, i) => i + (calendar.year - 100));
        this.querySelector("#picker-year-select").appendChild(this.getSelect(years, calendar.year));

        // Fill month select
        const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
        const monthNames = calendar.months.map(month => month.date.toLocaleDateString(this.locale, { month: "long" }));
        this.querySelector("#picker-month-select").appendChild(this.getSelect(monthNumbers, calendar.month.number, monthNames));

        // Add short names of weekdays
        for (let weekday of calendar.weekDays) {
            this.querySelector("#day-grid-heading").insertAdjacentHTML("beforeend", this.getDayGridHeading(weekday));
        }

        // Add invisible days to grid from previous month
        const firstDayOffset = calendar.month.firstDayOffset;
        for (let i = 0; i < firstDayOffset; i++) {
            this.querySelector("#day-grid").insertAdjacentHTML("beforeend", this.getDayGridButton());
        }

        // Add the days of the current month to grid
        for (let day of calendar.month.days) {
            this.querySelector("#day-grid").insertAdjacentHTML("beforeend", this.getDayGridButton(day));
        }
    }

    getSelect(values, selectedValue, textContents) {
        const select = document.createElement("select");
        for (let i = 0; i < values.length; i++) {
            const option = document.createElement("option");
            option.value = values[i];
            if (values[i] == selectedValue) option.selected = true;
            option.textContent = textContents && textContents.length > i ? textContents[i] : values[i];
            select.appendChild(option);
        }

        return select;
    }

    getDayGridHeading(day) {
        return `<span>${day.date.toLocaleDateString(this.locale, { weekday: "short" })}</span>`;
    }

    getDayGridButton(day) {
        return `<button class="button day-grid-button p-1 ${day ? "" : "is-invisible"}">${day ? day.numberInMonth : ""}</button>`;
    }
}

window.customElements.define("datetime-picker", DateTimePicker);
