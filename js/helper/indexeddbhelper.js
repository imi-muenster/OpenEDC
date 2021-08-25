let db;

export const init = async () => {
    // Reference IndexedDB and sleep necessary because of Safari bug in 14.1.1 (https://bugs.webkit.org/show_bug.cgi?id=226547)
    const idb = globalThis.indexedDB;
    await new Promise(resolve => setTimeout(() => resolve(), 100));

    const request = indexedDB.open("OpenEDC");
    request.onupgradeneeded = () => {
        request.result.createObjectStore("xml");
        request.result.createObjectStore("json");
    };

    db = await promisifyRequest(request);
}

export const promisifyRequest = request => new Promise(resolve => request.onsuccess = () => resolve(request.result));

export const getObjectStore = (storeName, writeable) => db.transaction(storeName, writeable ? "readwrite" : "readonly").objectStore(storeName);

export const get = (storeName, key) => promisifyRequest(getObjectStore(storeName).get(key));

export const getKeys = storeName => promisifyRequest(getObjectStore(storeName).getAllKeys());

export const put = (storeName, key, value) => promisifyRequest(getObjectStore(storeName, true).put(value, key));

export const putBulk = (storeName, keys, values) => {
    const objectStore = getObjectStore(storeName, true);
    for (let i = 0; i < keys.length - 1; i++) {
        objectStore.put(values[i], keys[i]);
    }
    return promisifyRequest(objectStore.put(values[keys.length-1], keys[keys.length-1]));
}

export const remove = (storeName, key) => promisifyRequest(getObjectStore(storeName, true).delete(key));

export const clear = storeName => promisifyRequest(getObjectStore(storeName, true).clear());
