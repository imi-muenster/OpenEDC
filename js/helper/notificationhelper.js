import * as ioHelper from "./iohelper.js"
export class OpenEDCNotification {
    constructor(creator, title, message, identifier, isSystem, actions, icon, expirationDate) {
        this.id = this.generateUniqSerial();
        this.creationDate = new Date().toISOString();
        this.creator = creator;
        this.title = title;
        this.message = message;
        this.identifier = identifier;
        this.isSystem = isSystem;
        this.actions = actions;
        this.icon = icon;
        this.expirationDate = expirationDate;
        this.status = notification_status.new;
    }

    generateUniqSerial() {  
        return 'xxxx-xxxx-xxx-xxxx'.replace(/[x]/g, (c) => {  
            const r = Math.floor(Math.random() * 16);  
            return r.toString(16);  
      });  
    }
}

export class OpenEDCNotificationAction {
    constructor(name, callback, type) {
        this.name = name;
        this.callback = callback;
        this.type = type;
    }
}

export const notification_status = {
    new: 'new',
    read: 'read',
    deleted: 'deleted'
}

export const notification_scopes = {
    local: 'local',
    instance: 'instance',
    all: 'all'
}

const SETTINGS_NAME = 'notifications';

let localNotifications = [];

export async function addNotification(notification, scope) {
    if(scope && scope == notification_scopes.local) {
        notification.scope = scope;
        localNotifications.push(notification);
        return;
    }

    notification.scope = notification_scopes.instance;
    let notifications = await ioHelper.getJSON(SETTINGS_NAME);
    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    notifications.push(notification);
    await ioHelper.setJSON(SETTINGS_NAME, notifications);
}

export async function getNotifications(scope) {
    let notifications;
    if(scope && scope == notification_scopes.local) notifications = localNotifications;
    else if(scope && scope == notification_scopes.instance) notifications = await ioHelper.getJSON(SETTINGS_NAME);
    else notifications = localNotifications.concat(await ioHelper.getJSON(SETTINGS_NAME))

    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    return notifications;
}

export async function getActiveNotifications(scope) {
    let notifications;
    if(scope && scope == notification_scopes.local) notifications = localNotifications;
    else if(scope && scope == notification_scopes.instance) notifications = await ioHelper.getJSON(SETTINGS_NAME);
    else notifications = localNotifications.concat(await ioHelper.getJSON(SETTINGS_NAME))

    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    return notifications.filter(notification => notification.status != notification_status.deleted);
}

export async function getFilteredNotifications(filterOptions, scope) {
    let notifications;
    if(scope && scope == notification_scopes.local) notifications = localNotifications;
    else if(scope && scope == notification_scopes.instance) notifications = await ioHelper.getJSON(SETTINGS_NAME);
    else {
        notifications = localNotifications;
        let instanceNotifications = await ioHelper.getJSON(SETTINGS_NAME);
        if(!instanceNotifications || typeof instanceNotifications == 'undefined' || instanceNotifications == '') instanceNotifications = [];
        notifications = notifications.concat(instanceNotifications);

    }

    if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
    return notifications.filter(notification => {
        for(let i = 0; i < [...filterOptions].length; i++) {
            if(filterOptions[i].inverse && notification[filterOptions[i].variableName] == filterOptions[i].value) return false;
            if(!filterOptions[i].inverse && notification[filterOptions[i].variableName] != filterOptions[i].value) return false;
        }
        return true;
    });
}

export async function setStatusNotification(id, status, scope) {
    if(scope && (scope.local || scope.all) || !scope) {
        let notifications = localNotifications;
        const index = notifications.findIndex(notification => notification.id == id);
        if(index >= 0) notifications[index].status = status;
        localNotifications = notifications;
    }

    if(scope && (scope.instance || scope.all) || !scope) {
        let notifications = await ioHelper.getJSON(SETTINGS_NAME);
        if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
        const index = notifications.findIndex(notification => notification.id == id);
        if(index >= 0) notifications[index].status = status;
        ioHelper.setJSON(SETTINGS_NAME, notifications);
    }
}

export async function setStatusFilteredNotification(filterOptions, status, scope) {
    if(scope && (scope.local || scope.all) || !scope){
        let notifications = await getFilteredNotifications(filterOptions, scope.local);
        notifications.forEach(filteredNotification => {
            const index = notifications.findIndex(notification => notification.id == filteredNotification.id);
            if(index >= 0) notifications[index].status = status;
        });
        localNotifications = notifications;
    }

    if(scope && (scope.instance || scope.all) || !scope){
        let notifications = await getFilteredNotifications(filterOptions, scope.instance);
        notifications.forEach(filteredNotification => {
            const index = notifications.findIndex(notification => notification.id == filteredNotification.id);
            if(index >= 0) notifications[index].status = status;
        });
        ioHelper.setJSON(SETTINGS_NAME, notifications);
    }
}

export async function removeNotification(id, scope) {
    if(scope && (scope.local || scope.all) || !scope) {
        let notifications = localNotifications
        const index = notifications.findIndex(notification => notification.id == id);
        if(index >= 0) notifications.splice(index,1);
        localNotifications = notifications;
    }
    if(scope && (scope.instance || scope.all) || !scope){
        let notifications = await ioHelper.getJSON(SETTINGS_NAME);
        if(!notifications || typeof notifications == 'undefined' || notifications == '') notifications = [];
        const index = notifications.findIndex(notification => notification.id == id);
        if(index >= 0) notifications.splice(index,1);
        ioHelper.setJSON(SETTINGS_NAME, notifications);
    }
}

export async function removeFilteredNotifications(filterOptions) {
    if(scope && (scope.local || scope.all) || !scope){
        let notifications = await getFilteredNotifications(filterOptions, scope.local);
        notifications.forEach(filteredNotification => {
            const index = notifications.findIndex(notification => notification.id == filteredNotification.id);
            if(index >= 0) notifications.splice(index,1);
        });
        localNotifications = notifications;
    }

    if(scope && (scope.instance || scope.all) || !scope){
        let notifications = await getFilteredNotifications(filterOptions, scope.instance);
        notficitations.forEach(filteredNotification => {
            const index = notifications.findIndex(notification => notification.id == filteredNotification.id);
            if(index >= 0) notifications.splice(index,1);
        });
        ioHelper.setJSON(SETTINGS_NAME, notifications);
    }
}