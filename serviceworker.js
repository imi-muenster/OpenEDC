const staticCacheName = "static-cache-0.8.1";
const odmCacheName = "odm-cache";
const dynamicCacheName = "dynamic-cache";
const messageQueueName = "message-queue";

const baseURL = self.location.href.replace("serviceworker.js", "");

const staticURLs = [
    "/css/",
    "/img/",
    "/internationalization/",
    "/js/",
    "/lib/",
    "/plugins/",
    "/favicon.ico",
    "/manifest.json"
];

const odmURLs = [
    "/metadata/",
    "/clinicaldata/",
    "/admindata/"
];

const cacheFirstURLs = staticURLs.concat(odmURLs);

// Cache base url
self.addEventListener("install", installEvent => {
    self.skipWaiting();
    installEvent.waitUntil(
        caches.open(staticCacheName).then(cache => {
            return cache.add(new Request("./", { cache: "reload" }));
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

addEventListener("message", (activateEvent) => {
    console.log('recieved message')
    activateEvent.waitUntil(
        caches.keys().then(async keys => {
            await Promise.all(keys
                .filter(key => key != staticCacheName && key != odmCacheName && key != dynamicCacheName && key != messageQueueName)
                .map(key => caches.delete(key))
            )
            activateEvent.source.postMessage("Deleting cache done");
        })
    );
})


// Cache and return static and dynamic assets
self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request, { ignoreVary: true }).then(async cacheResponse => {
            const requestBody = await fetchEvent.request.clone().text();
            const isCacheFirst = cacheFirstURLs.some(url => cacheResponse ? cacheResponse.url.includes(url) || cacheResponse.url == baseURL : false);
            return isCacheFirst && cacheResponse ? cacheResponse : fetch(new Request(fetchEvent.request, { cache: "reload" }))
                .then(async fetchResponse => {
                    const isStaticRequest = staticURLs.some(url => fetchEvent.request.url.includes(url));
                    const isODMRequest = odmURLs.some(url => fetchEvent.request.url.includes(url));
                    const cache = await caches.open(isStaticRequest ? staticCacheName : (isODMRequest ? odmCacheName : dynamicCacheName));
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
