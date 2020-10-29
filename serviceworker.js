const staticCacheName = "static-cache-v1";

const staticAssets = [
    "/",
    "/css/style.css",
    "/internationalization/de.json",
    "/internationalization/en.json",
    "/internationalization/es.json",
    "/internationalization/fr.json",
    "/internationalization/it.json",
    "/internationalization/nl.json",
    "/internationalization/pt.json",
    "/internationalization/ru.json",
    "/internationalization/sv.json",
    "/internationalization/tr.json",
    "/js/app.js",
    "/js/metadatamodule.js",
    "/js/admindatamodule.js",
    "/js/clinicaldatamodule.js",
    "/js/helper/metadatahelper.js",
    "/js/helper/metadatatemplates.js",
    "/js/helper/admindatahelper.js",
    "/js/helper/admindatatemplates.js",
    "/js/helper/clinicaldatahelper.js",
    "/js/helper/clinicaldatatemplates.js",
    "/js/helper/conditionhelper.js",
    "/js/helper/htmlelements.js",
    "/js/helper/iohelper.js",
    "/js/helper/languagehelper.js",
    "/js/helper/validationhelper.js",
    "/lib/bulma.css",
    "/lib/fontawesome-base.js",
    "/lib/fontawesome-regular.js",
    "/lib/fontawesome-solid.js",
    "/odm/example.xml",
    "/xsl/odmtohtml.xsl",
    "/favicon.ico",
    "/manifest.json"
];

// Cache static assets
self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticCacheName).then(cache => {
            cache.addAll(staticAssets);
        })
    );
});

// Remove old static assets
self.addEventListener("activate", activateEvent => {
    activateEvent.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key != staticCacheName)
                .map(key => caches.delete(key))
            )
        })
    );
});

// Return static assets
self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request).then(cacheResponse => {
            return cacheResponse || fetch(fetchEvent.request);
        })
    );
});
