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

    setNextMonth() {
        if (this.month.number == 12) {
            this.year++;
            this.month = new Month(new Date(this.year, 0));
        } else {
            this.month = new Month(new Date(this.year, this.month.number));
        }
    }

    setPreviousMonth() {
        if (this.month.number == 1) {
            this.year--;
            this.month = new Month(new Date(this.year, 11));
        } else {
            this.month = new Month(new Date(this.year, this.month.number - 2));
        }
    }
}

class DateTimePicker extends HTMLElement {
    calendar = new Calendar();
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
            <div class="modal is-active" id="datetime-picker">
                <div class="modal-background"></div>
                <div class="modal-content is-small">
                    <div class="box has-text-centered">
                        <h1 class="title">Date</h1>
                        <div class="mb-5" id="year-month-select">
                            <button class="button is-link is-inverted" id="previous-month-button">
                                <span class="icon">
                                    <i class="fas fa-xs fa-arrow-left"></i>
                                </span>
                            </button>
                            <div class="select" id="picker-year-select"></div>
                            <div class="select" id="picker-month-select"></div>
                            <button class="button is-link is-inverted" id="next-month-button">
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

        // Fill year select
        const years = Array.from({ length: 110 }, (_, i) => i + (this.calendar.year - 100));
        this.querySelector("#picker-year-select").appendChild(this.getSelect(years));

        // Fill month select
        const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
        const monthNames = this.calendar.months.map(month => month.date.toLocaleDateString(this.locale, { month: "long" }));
        this.querySelector("#picker-month-select").appendChild(this.getSelect(monthNumbers, monthNames));

        // Add short names of weekdays
        for (let weekday of this.calendar.weekDays) {
            this.querySelector("#day-grid-heading").insertAdjacentElement("beforeend", this.getDayGridHeading(weekday));
        }

        // Render day grid, set current select values and listen to input
        this.setSelectValues();
        this.renderDayGrid();
        this.setIOListeners();
    }

    setSelectValues() {
        this.querySelector("#picker-year-select select").value = this.calendar.year;
        this.querySelector("#picker-month-select select").value = this.calendar.month.number;
    }

    renderDayGrid() {
        this.querySelector("#day-grid").innerHTML = "";

        // Add invisible days to grid from previous month
        const firstDayOffset = this.calendar.month.firstDayOffset;
        for (let i = 0; i < firstDayOffset; i++) {
            this.querySelector("#day-grid").insertAdjacentElement("beforeend", this.getDayGridButton());
        }

        // Add the days of the current month to grid
        for (let day of this.calendar.month.days) {
            this.querySelector("#day-grid").insertAdjacentElement("beforeend", this.getDayGridButton(day));
        }
    }

    getSelect(values, textContents) {
        const select = document.createElement("select");
        for (let i = 0; i < values.length; i++) {
            const option = document.createElement("option");
            option.value = values[i];
            option.textContent = textContents && textContents.length > i ? textContents[i] : values[i];
            select.appendChild(option);
        }

        return select;
    }

    getDayGridHeading(day) {
        const heading = document.createElement("span");
        heading.textContent = day.date.toLocaleDateString(this.locale, { weekday: "short" });

        return heading;
    }

    getDayGridButton(day) {
        const button = document.createElement("button");
        button.className = "button day-grid-button p-3";
        if (day && day.isToday) button.classList.add("is-primary");
        if (!day) button.classList.add("is-invisible");
        button.textContent = day ? day.numberInMonth : "";
        
        return button;
    }

    setIOListeners() {
        this.querySelector("#picker-year-select select").addEventListener("input", event => {
            this.calendar = new Calendar(event.target.value, this.calendar.month.number);
            this.setSelectValues();
            this.renderDayGrid();
        });

        this.querySelector("#picker-month-select select").addEventListener("input", event => {
            this.calendar = new Calendar(this.calendar.year, event.target.value);
            this.setSelectValues();
            this.renderDayGrid();
        });

        this.querySelector("#previous-month-button").addEventListener("click", () => {
            this.calendar.setPreviousMonth();
            this.setSelectValues();
            this.renderDayGrid();
        });

        this.querySelector("#next-month-button").addEventListener("click", () => {
            this.calendar.setNextMonth();
            this.setSelectValues();
            this.renderDayGrid();
        });
    }
}

window.customElements.define("datetime-picker", DateTimePicker);
