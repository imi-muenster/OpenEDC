import * as ioHelper from "./iohelper.js"
export class OpenEDCNotification {
    constructor(creator, title, message, isSystem, actions, icon, expirationDate) {
        this.id = window.crypto.randomUUID();
        this.creationDate = new Date().toISOString();
        this.creator = creator;
        this.title = title;
        this.message = message;
        this.isSystem = isSystem;
        this.actions = actions;
        this.icon = icon;
        this.expirationDate = expirationDate;
    }
}

export class OpenEDCNotificationAction {
    constructor(name, callback, type) {
        this.name = name;
        this.callback = callback;
        this.type = type;
    }
}

const SETTINGS_NAME = 'notifications';

export async function addNotification(notification) {
    let notifications = await ioHelper.getJSON(SETTINGS_NAME);
    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    notifications.push(notification);
    ioHelper.setJSON(SETTINGS_NAME, notifications);
}

export async function getNotifications() {
    let notifications = await ioHelper.getJSON(SETTINGS_NAME);
    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    console.log(notifications);
    return notifications;
}

export async function getFilteredNotifications(options) {
    let notifications = await ioHelper.getJSON(SETTINGS_NAME);
    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    console.log(notifications);
    return notifications.filter(notification => {
        for(let i = 0; i < options.length; ++i) {
            if(notification[options.identifier] != options.value) return false;
        }
        return true;
    });
}

export async function removeNotification(id) {
    let notifications = await ioHelper.getJSON(SETTINGS_NAME);
    const index = notifications.findIndex(notification => notification.id == id);
    if(index >= 0) notifications.splice(index,1);
    ioHelper.setJSON(SETTINGS_NAME, notifications);
}

export function removeNotificationByType(id) {

}