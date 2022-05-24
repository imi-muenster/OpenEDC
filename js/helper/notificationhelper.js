import * as ioHelper from "./iohelper.js"

export async function addNotification(message, expirationDate) {
    let notifications = await ioHelper.getJSON('notifications');
    notifications.push({messageexpirationDate: expirationDate})
}

export async function displayNotifications() {
    const notifications = await ioHelper.getJSON('notifications');
    console.log(notifications);

}

export function removeNotification(id) {

}

export function removeNotificationByType(id) {

}