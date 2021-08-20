// This file allows to specify custom plugins for OpenEDC
// Reference your plugin in the array below and make sure it exports a default function (e.g., export default () => { ... })
// Currently, three events are fired by OpenEDC that can be listened to: LanguageChanged, CurrentUserEdited, and CurrentSubjectEdited
// New events can be fired with document.dispatchEvent(new CustomEvent( ... ))

const enabledPlugins = [
    // "./myplugin.js"
];

export const enablePlugins = async () => {
    for (const enabledPlugin of enabledPlugins) {
        await import(enabledPlugin)
            .then(plugin => plugin.default())
            .catch(error => console.log(error));
    }
}
