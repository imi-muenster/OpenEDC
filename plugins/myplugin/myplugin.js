import * as languageHelper from "../../js/helper/languagehelper.js";

export default async () => {

   console.log("plugin loaded");
   languageHelper.registerTranslationFile("en", new URL("./translations/en.json", import.meta.url))
   languageHelper.registerTranslationFile("de", new URL("./translations/de.json", import.meta.url))
}

window.loadMypluginValue = function () {
   console.log("load value callback");
   return "this is a string value"
}