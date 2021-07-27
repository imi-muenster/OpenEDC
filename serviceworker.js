const staticCacheName = "static-cache-0.6.0";
const dynamicCacheName = "dynamic-cache";
const messageQueueName = "message-queue";

const staticAssets = [
    "./",
    "./css/style.css",
    "./internationalization/en.json",
    "./internationalization/es.json",
    "./internationalization/de.json",
    "./js/app.js",
    "./js/metadatamodule.js",
    "./js/admindatamodule.js",
    "./js/clinicaldatamodule.js",
    "./js/helper/metadatahelper.js",
    "./js/helper/admindatahelper.js",
    "./js/helper/clinicaldatahelper.js",
    "./js/helper/expressionhelper.js",
    "./js/helper/htmlelements.js",
    "./js/helper/iohelper.js",
    "./js/helper/indexeddbhelper.js",
    "./js/helper/languagehelper.js",
    "./js/helper/odmvalidation.js",
    "./js/helper/validationhelper.js",
    "./js/helper/cryptohelper.js",
    "./js/helper/autocompletehelper.js",
    "./js/helper/prototypefunctions.js",
    "./js/helper/odmtohtml.js",
    "./js/odmtemplates/metadatatemplates.js",
    "./js/odmtemplates/admindatatemplates.js",
    "./js/odmtemplates/clinicaldatatemplates.js",
    "./js/tags/navigationbar.js",
    "./js/tags/metadatasection.js",
    "./js/tags/clinicaldatasection.js",
    "./js/tags/projectmodal.js",
    "./js/tags/codelistmodal.js",
    "./js/tags/othermodals.js",
    "./lib/expr-eval.js",
    "./lib/bulma.css",
    "./lib/fontawesome.css",
    "./lib/webfonts/fa-regular-400.woff2",
    "./lib/webfonts/fa-solid-900.woff2",
    "./odm/example.xml",
    "./img/title-logo.png"
];

// Cache static assets
self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticCacheName).then(cache => {
            // It seems that cache.addAll sometimes adds old cached assets to the new cache
            // Therefore, cache.add with a custom request is used
            staticAssets.forEach(asset => {
                const request = new Request(asset, { cache: "reload" });
                cache.add(request);
            });
        })
    );
});

// Remove old static assets
self.addEventListener("activate", activateEvent => {
    activateEvent.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key != staticCacheName && key != dynamicCacheName && key != messageQueueName)
                .map(key => caches.delete(key))
            )
        })
    );
});

// Return static and dynamic assets
self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request, { cacheName: staticCacheName, ignoreVary: true }).then(async staticCacheResponse => {
            const requestBody = await fetchEvent.request.clone().text();
            return staticCacheResponse || fetch(fetchEvent.request)
                .then(async fetchResponse => {
                    const dynamicCache = await caches.open(dynamicCacheName);
                    if (fetchEvent.request.method == "GET" && !fetchEvent.request.url.includes("version.json")) {
                        dynamicCache.put(fetchEvent.request.url, fetchResponse.clone());
                    } else if (fetchEvent.request.method == "PUT") {
                        dynamicCache.put(fetchEvent.request.url, new Response(requestBody, { status: fetchResponse.status, statusText: fetchResponse.statusText, headers: fetchResponse.headers }));
                        updateCachedSubjectList(true, fetchEvent.request.url);
                        removeFromMessageQueue(fetchEvent.request.url);
                    } else if (fetchEvent.request.method == "DELETE") {
                        dynamicCache.delete(fetchEvent.request.url);
                        updateCachedSubjectList(false, fetchEvent.request.url);
                    }
                    return fetchResponse;
                })
                .catch(async () => {
                    const cacheResponse = await caches.match(fetchEvent.request, { ignoreVary: true });
                    if (fetchEvent.request.method == "GET" || cacheResponse) {
                        return cacheResponse;
                    } else {
                        const messageQueue = await caches.open(messageQueueName);
                        if (fetchEvent.request.method == "PUT") {
                            messageQueue.put(fetchEvent.request.url, new Response(requestBody));
                            updateCachedSubjectList(true, fetchEvent.request.url);
                            return new Response("Offline response created from service worker.", { status: 201 });
                        } else if (fetchEvent.request.method == "DELETE") {
                            messageQueue.delete(fetchEvent.request.url);
                            updateCachedSubjectList(false, fetchEvent.request.url);
                            return new Response("Offline response created from service worker.", { status: 201 });
                        }
                    }
                });
        })
    );
});

const updateCachedSubjectList = async (add, url) => {
    if (!url.includes("clinicaldata")) return;

    const lastSlashPosition = url.lastIndexOf("/");
    const subjectListURL = url.substring(0, lastSlashPosition);
    const fileName = url.substring(lastSlashPosition + 1);

    const dynamicCache = await caches.open(dynamicCacheName);
    const subjectListResponse = await dynamicCache.match(subjectListURL);
    let subjectList = await subjectListResponse.json();
    
    // Remove and then maybe add file name to the list of subjects
    subjectList = subjectList.filter(entry => entry != fileName);
    if (add) subjectList.push(fileName);

    dynamicCache.put(subjectListURL, new Response(JSON.stringify(subjectList), { status: subjectListResponse.status, statusText: subjectListResponse.statusText, headers: subjectListResponse.headers }));
}

const removeFromMessageQueue = async url => {
    const messageQueue = await caches.open(messageQueueName);
    messageQueue.delete(url);
}
