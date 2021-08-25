const staticCacheName = "static-cache-0.7.1";
const odmCacheName = "odm-cache";
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
    "./js/odmwrapper/metadatawrapper.js",
    "./js/odmwrapper/admindatawrapper.js",
    "./js/odmwrapper/clinicaldatawrapper.js",
    "./js/odmwrapper/odmpath.js",
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
    "./js/components/datetimepicker.js",
    "./js/components/navigationbar.js",
    "./js/components/metadatasection.js",
    "./js/components/clinicaldatasection.js",
    "./js/components/projectmodal.js",
    "./js/components/codelistmodal.js",
    "./js/components/othermodals.js",
    "./lib/expr-eval.js",
    "./lib/bulma.css",
    "./lib/fontawesome.css",
    "./lib/webfonts/fa-regular-400.woff2",
    "./lib/webfonts/fa-solid-900.woff2",
    "./img/title-logo.png"
];

const odmRequestURLs = [
    "/metadata/",
    "/clinicaldata/",
    "/admindata/"
];

const cacheFirstURLs = staticAssets
    .filter(asset => asset.length > 2)
    .map(asset => asset.slice(1))
    .concat(odmRequestURLs);

// Cache static assets
self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticCacheName).then(cache => {
            // It seems that cache.addAll sometimes adds old cached assets to the new cache
            // Therefore, cache.add with a custom request is used
            return Promise.all(staticAssets
                .map(asset => cache.add(new Request(asset, { cache: "reload" })))
            );
        })
    );
});

// Remove old static assets
self.addEventListener("activate", activateEvent => {
    activateEvent.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key != staticCacheName && key != odmCacheName && key != dynamicCacheName && key != messageQueueName)
                .map(key => caches.delete(key))
            )
        })
    );
});

// Return static and dynamic assets
self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request, { ignoreVary: true }).then(async cacheResponse => {
            const requestBody = await fetchEvent.request.clone().text();
            const isCacheFirst = cacheFirstURLs.some(url => cacheResponse ? cacheResponse.url.includes(url) : false);
            return isCacheFirst && cacheResponse ? cacheResponse : fetch(new Request(fetchEvent.request, { cache: "reload" }))
                .then(async fetchResponse => {
                    const isODMRequest = odmRequestURLs.some(url => fetchEvent.request.url.includes(url));
                    const cache = await caches.open(isODMRequest ? odmCacheName : dynamicCacheName);
                    if (fetchEvent.request.method == "GET" && !fetchEvent.request.url.includes("version.json")) {
                        cache.put(fetchEvent.request.url, fetchResponse.clone());
                    } else if (isODMRequest && fetchEvent.request.method == "PUT") {
                        cache.put(fetchEvent.request.url, new Response(requestBody, { status: fetchResponse.status, statusText: fetchResponse.statusText, headers: fetchResponse.headers }));
                        updateCachedSubjectList(true, fetchEvent.request.url);
                        removeFromMessageQueue(fetchEvent.request.url);
                    } else if (isODMRequest && fetchEvent.request.method == "DELETE") {
                        cache.delete(fetchEvent.request.url);
                        updateCachedSubjectList(false, fetchEvent.request.url);
                    }
                    return fetchResponse;
                })
                .catch(async () => {
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
