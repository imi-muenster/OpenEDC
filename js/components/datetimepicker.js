class Time {
    constructor(hours, minutes) {
        this.hours = hours;
        this.minutes = minutes;
    }

    get paddedHours() {
        return String(this.hours).padStart(2, "0")
    }

    get paddedMinutes() {
        return String(this.minutes).padStart(2, "0")
    }
}

class Day {
    constructor(date, initial) {
        if (!date) date = new Date();

        this.numberInMonth = date.getDate();
        this.numberInWeek = date.getDay() || 7;
        this.month = date.getMonth() + 1;
        this.year = date.getFullYear();
        this.time = new Time(date.getHours(), date.getMinutes());
        this.date = date;
        this.initial = initial;
    }

    equals(day) {
        return this.numberInMonth == day.numberInMonth && this.month == day.month && this.year == day.year;
    }

    get isToday() {
        return this.equals(new Day());
    }

    get localDateTimeISOString() {
        this.date.setHours(this.time.hours);
        this.date.setMinutes(this.time.minutes);
        this.date.setSeconds(0, 0);
        
        const timezoneOffset = new Date().getTimezoneOffset() * 60000;
        return new Date(this.date.getTime() - timezoneOffset).toISOString().slice(0, -5);
    }

    get localDateISOString() {
        return this.localDateTimeISOString.split("T")[0];
    }

    get localTimeISOString() {
        return this.localDateTimeISOString.split("T")[1];
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

    get previousMonth() {
        if (this.number == 1) return new Month(new Date(this.year - 1, 11));
        else return new Month(new Date(this.year, this.number - 2));
    }

    get nextMonth() {
        if (this.number == 12) return new Month(new Date(this.year + 1, 0));
        else return new Month(new Date(this.year, this.number));
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

    setPreviousMonth() {
        this.month = this.month.previousMonth;
        this.year = this.month.year;
    }

    setNextMonth() {
        this.month = this.month.nextMonth;
        this.year = this.month.year;
    }
}

class DateTimePicker extends HTMLElement {
    calendar = new Calendar();

    setInput(input) {
        this.selectedDay = this.parseDateString(input.value);
        this.calendar = new Calendar(this.selectedDay.year, this.selectedDay.month);
        this.input = input;
    }

    setLocale(locale) {
        this.locale = locale;
    }

    setTranslations(translations) {
        this.translations = translations;
    }

    setOptions(options) {
        this.options = options;
    }

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
            #day-grid .button.is-static {
                border: none;
            }
        `;
    }

    render() {
        this.innerHTML = `
            <style>${this.style}</style>
            <div class="modal is-active" id="datetime-picker">
                <div class="modal-background"></div>
                <div class="modal-content is-small is-fullheight-mobile">
                    <div class="box has-text-centered">
                        <h1 class="title">${this.translations.heading}</h1>
                        <div class="is-hidden mb-5" id="picker-date">
                            <div class="mb-5" id="year-month-select">
                                <button class="button is-link is-inverted" id="previous-month-button">
                                    <span class="icon">
                                        <i class="fa-solid fa-xs fa-arrow-left"></i>
                                    </span>
                                </button>
                                <div class="select is-rounded" id="picker-years-select"></div>
                                <div class="select is-rounded" id="picker-months-select"></div>
                                <button class="button is-link is-inverted" id="next-month-button">
                                    <span class="icon">
                                        <i class="fa-solid fa-xs fa-arrow-right"></i>
                                    </span>
                                </button>
                            </div>
                            <div class="mb-2" id="day-grid-heading"></div>
                            <div id="day-grid"></div>
                        </div>
                        <div class="mb-5 is-hidden" id="picker-time">
                            <div class="field has-addons is-justify-content-center">
                                <div class="control">
                                    <div class="select is-rounded" id="picker-hours-select"></div>
                                </div>
                                <div class="control">
                                    <div class="select is-rounded" id="picker-minutes-select"></div>
                                </div>
                            </div>
                        </div>
                        <div class="buttons is-centered are-small">
                            <button class="button is-link is-hidden" id="picker-save-button">${this.translations.save}</button>
                            <button class="button is-link" id="picker-today-button">${this.translations.today}</button>
                            <button class="button is-danger is-hidden" id="picker-reset-button">${this.translations.reset}</button>
                            <button class="button" id="picker-close-button">${this.translations.close}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render static elements, day grid, and set current select values as well as listen to inputs
        if (this.options.enableDate) this.renderDateStaticElements();
        if (this.options.enableTime) this.renderTimeStaticElements();

        if (this.options.enableDate)this.setDateSelectValues();
        if (this.options.enableTime)this.setTimeSelectValues();

        if (this.options.enableDate) this.renderDayGrid();
        
        if (this.options.enableDate) this.setDateIOListeners();
        if (this.options.enableTime) this.setTimeIOListeners();
        this.setGeneralIOListeners();

        if (!this.selectedDay.initial) this.showResetButton();
    }

    renderDateStaticElements() {
        // Add year select
        const years = Array.from({ length: 110 }, (_, i) => i + (this.calendar.year - 100));
        this.querySelector("#picker-years-select").appendChild(this.getSelect(years));

        // Add month select
        const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
        const monthNames = this.calendar.months.map(month => month.date.toLocaleDateString(this.locale, { month: "long" }));
        this.querySelector("#picker-months-select").appendChild(this.getSelect(monthNumbers, monthNames));

        // Add short names of weekdays
        for (let weekday of this.calendar.weekDays) {
            this.querySelector("#day-grid-heading").insertAdjacentElement("beforeend", this.getDayGridHeading(weekday));
        }

        this.querySelector("#picker-date").classList.remove("is-hidden");
    }

    renderTimeStaticElements() {
        // Add hours select
        const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
        this.querySelector("#picker-hours-select").appendChild(this.getSelect(hours));

        // Add minutes select
        const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
        this.querySelector("#picker-minutes-select").appendChild(this.getSelect(minutes));

        this.querySelector("#picker-time").classList.remove("is-hidden");
    }

    setDateSelectValues() {
        this.querySelector("#picker-years-select select").value = this.calendar.year;
        this.querySelector("#picker-months-select select").value = this.calendar.month.number;
    }

    setTimeSelectValues() {
        this.querySelector("#picker-hours-select select").value = this.selectedDay.time.paddedHours;
        this.querySelector("#picker-minutes-select select").value = this.selectedDay.time.paddedMinutes;
    }

    renderDayGrid() {
        this.querySelector("#day-grid").innerHTML = "";

        // Add last days from previous month
        const firstDayOffset = this.calendar.month.firstDayOffset;
        const lastDaysPreviousMonth = firstDayOffset ? this.calendar.month.previousMonth.days.slice(-firstDayOffset) : [];
        for (let i = 0; i < lastDaysPreviousMonth.length; i++) {
            this.querySelector("#day-grid").insertAdjacentElement("beforeend", this.getDayGridButton(lastDaysPreviousMonth[i], true));
        }

        // Add days of current month
        for (let day of this.calendar.month.days) {
            this.querySelector("#day-grid").insertAdjacentElement("beforeend", this.getDayGridButton(day));
        }

        // Add first days from next month
        const requiredDays = 42 - firstDayOffset - this.calendar.month.days.length;
        const firstDaysNextMonth = this.calendar.month.nextMonth.days.slice(0, requiredDays);
        for (let i = 0; i < firstDaysNextMonth.length; i++) {
            this.querySelector("#day-grid").insertAdjacentElement("beforeend", this.getDayGridButton(firstDaysNextMonth[i], true));
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

    getDayGridButton(day, disabled) {
        const button = document.createElement("button");
        button.className = "button day-grid-button p-1";
        button.textContent = day ? day.numberInMonth : "";

        if (!disabled && !this.selectedDay.initial && day.equals(this.selectedDay)) button.classList.add("is-link");
        else if (!disabled && day.isToday) button.classList.add("is-link", "is-light");

        if (!disabled) button.onclick = () => this.daySelected(day);
        else button.classList.add("is-static");
        
        return button;
    }

    daySelected(day) {
        this.selectedDay = new Day(new Date(day.year, day.month - 1, day.numberInMonth, this.selectedDay.time.hours, this.selectedDay.time.minutes));
        if (this.options.enableTime) {
            this.renderDayGrid();
            this.showSaveButton();
        } else {
            this.saveValue();
            this.remove();
        }
    }

    showSaveButton() {
        this.querySelector("#picker-save-button").classList.remove("is-hidden");
        this.querySelector("#picker-today-button").classList.add("is-hidden");
    }

    showResetButton() {
        this.querySelector("#picker-reset-button").classList.remove("is-hidden");
    }

    parseDateString(string) {
        let day = new Day(new Date(), true);
        if (string && this.isTime(string)) {
            day.time.hours = string.split(":")[0];
            day.time.minutes = string.split(":")[1];
            day.initial = false;
        } else if (string) {
            day = new Day(new Date(string));
        }

        return day;
    }

    // TODO: In validationHelper as well -- could be transformed to string prototype function
    isTime(string) {
        return new RegExp(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/).test(string);
    }

    saveValue() {
        if (this.options.enableDate && this.options.enableTime) {
            this.input.value = this.selectedDay.localDateTimeISOString;
        } else if (this.options.enableDate) {
            this.input.value = this.selectedDay.localDateISOString;
        } else if (this.options.enableTime) {
            this.input.value = this.selectedDay.localTimeISOString;
        }
        this.input.dispatchEvent(new Event("input"));
    }

    setDateIOListeners() {
        this.querySelector("#picker-years-select select").addEventListener("input", event => {
            this.calendar = new Calendar(event.target.value, this.calendar.month.number);
            this.renderDayGrid();
        });

        this.querySelector("#picker-months-select select").addEventListener("input", event => {
            this.calendar = new Calendar(this.calendar.year, event.target.value);
            this.renderDayGrid();
        });

        this.querySelector("#previous-month-button").addEventListener("click", () => {
            this.calendar.setPreviousMonth();
            this.setDateSelectValues();
            this.renderDayGrid();
        });

        this.querySelector("#next-month-button").addEventListener("click", () => {
            this.calendar.setNextMonth();
            this.setDateSelectValues();
            this.renderDayGrid();
        });
    }

    setTimeIOListeners() {
        this.querySelector("#picker-hours-select select").addEventListener("input", event => {
            this.selectedDay.time.hours = parseInt(event.target.value);
            this.showSaveButton();
        });

        this.querySelector("#picker-minutes-select select").addEventListener("input", event => {
            this.selectedDay.time.minutes = parseInt(event.target.value);
            this.showSaveButton();
        });
    }

    setGeneralIOListeners() {
        this.querySelector("#picker-save-button").addEventListener("click", () => {
            this.saveValue();
            this.remove();
        });

        this.querySelector("#picker-today-button").addEventListener("click", () => {
            this.selectedDay = this.calendar.today;
            this.saveValue();
            this.remove();
        });

        this.querySelector("#picker-reset-button").addEventListener("click", () => {
            this.input.value = "";
            this.input.dispatchEvent(new Event("input"));
            this.remove();
        });

        this.querySelector("#picker-close-button").addEventListener("click", () => {
            this.remove();
        });

        this.querySelector("#datetime-picker .modal-background").addEventListener("click", () => {
            this.remove();
        });
    }
}

window.customElements.define("datetime-picker", DateTimePicker);
