//
//
// TODO: This file should be refactored. ODM attributes should be moved to another file and range checks as well as data types combined to one object.
// Moreover, the code is quite redundant for some functions and creating a select should be refactored across the app as well.
// For the data types there are already translations in the i18n files available (different codelist data types may be removed for usability purposes)
//
//

import * as languageHelper from "./languagehelper.js";
import * as notificationHelper from "./notificationhelper.js"

const rangeCheckComparators = ["", "LT", "LE", "GT", "GE", "EQ", "NE"];
const rangeCheckComparatorsDisplay = ["--", "<", "<=", ">", ">=", "=", "!="];

export function getMetadataPanelBlock(elementOID, elementType, titleText, fallbackText, subtitleText, draggable, hasCondition, conditionIsFalse) {
    let panelBlock = document.createElement("a");
    panelBlock.className = "panel-block";
    panelBlock.setAttribute("oid", elementOID);
    panelBlock.setAttribute("element-type", elementType);
    panelBlock.setAttribute("draggable", draggable);

    let title = document.createElement("div");
    title.className = "panel-block-title";

    if (titleText) title.textContent = titleText;
    if (!titleText || hasCondition) {
        let dot = document.createElement("span");
        dot.className = "panel-icon has-text-link";
        let dotIcon = document.createElement("i");
        dotIcon.className = !titleText ? "fa-solid fa-question" : (conditionIsFalse ? "fa-solid fa-eye-slash" : "fa-solid fa-code-branch");
        dot.appendChild(dotIcon);
        panelBlock.appendChild(dot);
        subtitleText = !titleText ? languageHelper.getTranslation("missing-translation") : subtitleText;
        if (!titleText && fallbackText) {
            title.textContent = fallbackText;
        } else if (!titleText) {
            title.innerHTML = "&nbsp;";
        }
    }

    if (subtitleText) {
        let content = document.createElement("div");
        content.className = "panel-block-content";
        content.appendChild(title);
        let subtitle = document.createElement("div");
        subtitle.className = "panel-block-subtitle";
        subtitle.textContent = subtitleText;
        content.appendChild(subtitle);
        panelBlock.appendChild(content);
    } else {
        panelBlock.appendChild(title);
    }

    return panelBlock;
}

export function getClinicaldataPanelBlock(elementOID, titleText, fallbackText, subtitleText, dataStatus, hasConflict) {
    let panelBlock = document.createElement("a");
    panelBlock.className = "panel-block";
    panelBlock.setAttribute("oid", elementOID);

    if (dataStatus) {
        let dot = document.createElement("span");
        dot.className = hasConflict ? "panel-icon has-text-danger" : "panel-icon has-text-link";
        let dotIcon = document.createElement("i");

        switch (dataStatus) {
            case 1:
                dotIcon.className = "fa-regular fa-circle";
                break;
            case 2:
                dotIcon.className = "fa-solid fa-dot-circle";
                break;
            case 3:
                dotIcon.className = "fa-solid fa-circle";
                break;
            case 4:
                dotIcon.className = "fa-solid fa-check-circle";
        }

        dot.appendChild(dotIcon);
        panelBlock.appendChild(dot);
    }

    let title = document.createElement("div");
    title.className = "panel-block-title";

    if (titleText) {
        title.textContent = titleText;
    } else if (fallbackText) {
        title.textContent = fallbackText;
    } else {
        title.innerHTML = "&nbsp;";
    }

    if (subtitleText) {
        let content = document.createElement("div");
        content.className = "panel-block-content";
        content.appendChild(title);
        let subtitle = document.createElement("div");
        subtitle.className = "panel-block-subtitle";
        subtitle.textContent = subtitleText;
        content.appendChild(subtitle);
        panelBlock.appendChild(content);
    } else {
        panelBlock.appendChild(title);
    }

    return panelBlock;
}

export function getAliasInputElement(context, name) {
    let field = document.createElement("div");
    field.className = "field alias-input is-grouped";

    let input = document.createElement("input");
    input.type = "text";

    input.value = context;
    input.className = "input alias-context";
    if (!context) input.placeholder = languageHelper.getTranslation("context");
    field.appendChild(input.cloneNode());
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    input.value = name;
    input.className = "input alias-name";
    if (!name) input.placeholder = languageHelper.getTranslation("name");
    field.appendChild(input.cloneNode());

    return field;
}

export function getRangeCheckInputElement(selectedComparator, checkValue) {
    let field = document.createElement("div");
    field.className = "field range-check-input is-grouped";

    let select = getSelect("range-check-comparator", false, false, rangeCheckComparators, selectedComparator, rangeCheckComparatorsDisplay, null);
    field.appendChild(select);
    
    field.insertAdjacentHTML("beforeend", "&nbsp;&nbsp;");

    let input = document.createElement("input");
    input.type = "text";
    input.value = checkValue;
    input.className = "input range-check-value";
    if (!checkValue) input.placeholder = languageHelper.getTranslation("check-value");
    field.appendChild(input.cloneNode());

    return field;
}

export function getSelect(name, isUnique, isFullwidth, values, selectedValue, displayTexts, i18n) {
    let select = document.createElement("div");
    if (isUnique) {
        select.id = `${name}-outer`;
        if (isFullwidth) {
            select.className = `select is-fullwidth`;
        } else {
            select.className = `select`;
        }
    } else {
        if (isFullwidth) {
            select.className = `select is-fullwidth ${name}-outer`;
        } else {
            select.className = `select ${name}-outer`;
        }
    }

    let innerSelect = document.createElement("select");
    if (isUnique) {
        innerSelect.id = `${name}-inner`;
    } else {
        innerSelect.className = `${name}-inner`;
    }

    for (let i = 0; i < values.length; i++) {
        let option = document.createElement("option");
        option.value = values[i];
        option.textContent = displayTexts ? displayTexts[i] : values[i];
        if (i18n) option.setAttribute("i18n", values[i].toLowerCase());
        if (values[i] == selectedValue) option.selected = true;
        innerSelect.appendChild(option);
    }

    select.appendChild(innerSelect);

    return select;
}

export function getTable(data) {
    const keys = Object.keys(data);
    const table = document.createElement("table");
    table.className = "table is-fullwidth is-bordered is-hoverable";

    // Add header
    const header = document.createElement("thead");
    const headerRow = document.createElement("tr");
    keys.forEach(key => headerRow.insertAdjacentHTML("beforeend", `<th>${key}</th>`));
    header.appendChild(headerRow);
    table.appendChild(header);

    // Add body
    const body = document.createElement("tbody");
    for (let y = 0; y < data[keys[0]].length ; y++) {
        const bodyRow = document.createElement("tr");
        for (let x = 0; x < keys.length; x++) {
            bodyRow.insertAdjacentHTML("beforeend", `<td>${data[keys[x]][y]}</td>`);
        }
        body.appendChild(bodyRow);
    }
    table.appendChild(body);

    return table;
}

// TODO: Used the DOMParser as alternative to document.createElement. Check if the performance is not significantly worse
// TODO: Not very legible -- should be edited
export function getAuditRecord(auditRecord) {
    return new DOMParser().parseFromString(`
        <div class="notification">
            <p class="mb-3"><strong>${languageHelper.getTranslation(auditRecord.type)}</strong></p>
            <p>${languageHelper.getTranslation("timestamp")}: <strong>${auditRecord.date.toLocaleString()}</strong></p>
            ${auditRecord.formOID && auditRecord.studyEventOID ? "<p>" + languageHelper.getTranslation("form") + ": <strong>" + auditRecord.studyEventDescription + ", " + auditRecord.formDescription + "</strong></p>": ""}
            ${auditRecord.dataStatus ? "<p>" + languageHelper.getTranslation("data-status") + ": <strong>" + languageHelper.getTranslation(auditRecord.dataStatus) + "</strong></p>": ""}
            ${auditRecord.userOID ? "<p>" + languageHelper.getTranslation("user") + ": <strong>" + auditRecord.userName + "</strong></p>": ""}
            ${auditRecord.siteOID ? "<p>" + languageHelper.getTranslation("site") + ": <strong>" + auditRecord.siteName + "</strong></p>": ""}
            ${auditRecord.dataChanges && auditRecord.dataChanges.length ? "<div class='text-divider is-size-7 mt-3 mb-1'>" + languageHelper.getTranslation("changed-data") + "</div>" : ""}
            ${auditRecord.dataChanges && auditRecord.dataChanges.length ? "<p class='is-size-7'>" + auditRecord.dataChanges.map(item => item.translatedQuestion + " <b>" + item.localizedValue + "</b>").join("<br>") + "</p>" : ""}
            ${auditRecord.formOID ? "<button class='button is-small mt-4'>" + languageHelper.getTranslation("view-data") + "</button>" : ""}
        </div>
    `, "text/html").body.firstChild;
}

export function getNotificationList(notifications) {

    let ul = document.createElement('ul');
    ul.classList = 'no-bullets';
    if(notifications.length > 0) {
        notifications.forEach(notification => {
            let li = document.createElement('li');
            let div = document.createElement('div');
            div.classList = 'm-1 has-background-link-light'
    
            let columnsDiv = document.createElement('div');
            columnsDiv.classList = 'columns m-0';
            div.appendChild(columnsDiv);
    
            //Icon Column
            let iconColumn = document.createElement('div');
            iconColumn.classList = 'column is-2 has-text-centered';
            let iconContainer = document.createElement('span');
            iconContainer.classList = 'icon is-medium mt-2';
            let icon = document.createElement('i');
            icon.classList = `fa-solid fa-2x has-text-link-dark ${notification.icon && typeof notification.icon != 'undefined' && notification.icon != '' ? notification.icon : 'fa-circle-info'}`;
            iconContainer.appendChild(icon);
            iconColumn.appendChild(iconContainer);
            columnsDiv.appendChild(iconColumn);
    
            //Content Column
            let contentColumn = document.createElement('div');
            contentColumn.classList = 'column is-9';
    
            let creatorDiv = document.createElement('div');
            contentColumn.appendChild(creatorDiv);
            let creator = document.createElement('span');
            creator.classList = `is-inline-block ${notification.isSystem ? 'has-text-success' : ''}`
            creator.innerText = notification.creator;
            creatorDiv.appendChild(creator);
    
            let date = document.createElement('span');
            date.classList = 'is-pulled-right';
            const creationDate = new Date(notification.creationDate);
            if(isToday(creationDate)) date.innerText = creationDate.toLocaleTimeString();
            else date.innerText = creationDate.toLocaleDateString();
            creatorDiv.appendChild(date);
    
            let title = document.createElement('h2')
            title.classList = 'title is-6 mb-2';
            title.innerText = notification.title;
            contentColumn.appendChild(title);
    
            let text = document.createElement('p');
            text.innerText = notification.message;
            contentColumn.appendChild(text);
            columnsDiv.appendChild(contentColumn);

            if(notification.actions) {
                let buttonsDiv = document.createElement('div');
                buttonsDiv.classList = 'buttons';
                notification.actions.forEach(action => {
                    let button = document.createElement('button');
                    button.classList = 'button is-link is-small is-fullwidth';
                    button.onclick = () => window[action.callback]();
                    button.innerText = languageHelper.getTranslation(action.name);
                    button.value = languageHelper.getTranslation(action.name);
                    buttonsDiv.appendChild(button);
                });
                contentColumn.appendChild(buttonsDiv);
                
            }
           
            //close column
            let closeColumn = document.createElement('div');
            closeColumn.classList = 'column is-1 is-flex is-align-items-center notification-close';
            closeColumn.onclick = async () => { await notificationHelper.removeNotification(notification.id); showNotifications(); };
            let closeSpan = document.createElement('span');
            closeSpan.classList = 'icon';
            let closeIcon = document.createElement('i');
            closeIcon.classList = `fa-solid fa-close has-text-link-dark`;
            closeSpan.appendChild(closeIcon);
            closeColumn.appendChild(closeSpan);
            columnsDiv.appendChild(closeColumn);
    
            li.appendChild(div);
            ul.appendChild(li);
        })
    }
    else {
        let li = document.createElement('li');
        
        let div = document.createElement('div');
        div.classList = 'm-1 has-background-link-light'
        let noNots = document.createElement('span');
        noNots.innerText = "No new notifications available";
        div.appendChild(noNots);
        li.appendChild(div);
        ul.append(li);
    }

    return ul;
}

const isToday = (someDate) => {
    const today = new Date()
    return someDate.getDate() == today.getDate() &&
        someDate.getMonth() == today.getMonth() &&
        someDate.getFullYear() == today.getFullYear()
}
