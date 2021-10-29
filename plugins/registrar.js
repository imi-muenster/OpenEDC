// This file allows to specify custom plugins for OpenEDC
// Reference your plugin in the array below and make sure it exports a default function (e.g., export default () => { ... })
// Currently, the following events are fired by OpenEDC and can be listened to: LanguageChanged, CurrentUserEdited, and CurrentSubjectEdited
// All modules from the app can be imported and used within a plugin as well (e.g., import * as languageHelper from "../js/helper/languagehelper.js")
// New translations can be registered with, for example, languageHelper.registerTranslations("en", new URL("./translations/en.json", import.meta.url))

const enabledPlugins = [
    // "./myplugin.js"
];

export const enablePlugins = () => {
    for (const enabledPlugin of enabledPlugins) {
        import(enabledPlugin)
            .then(plugin => plugin.default())
            .catch(error => console.log(error));
    }
}
