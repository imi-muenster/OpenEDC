let db;

export const init = async () => {
    const request = indexedDB.open("OpenEDC");
    request.onupgradeneeded = () => request.result.createObjectStore("OpenEDC");

    db = await promisifyRequest(request);
}

export const promisifyRequest = request => new Promise(resolve => request.onsuccess = () => resolve(request.result));

export const getObjectStore = writeable => db.transaction("OpenEDC", writeable ? "readwrite" : "readonly").objectStore("OpenEDC");

export const get = key => promisifyRequest(getObjectStore().get(key));

export const getKeys = () => promisifyRequest(getObjectStore().getAllKeys());

export const put = (key, value) => promisifyRequest(getObjectStore(true).put(value, key));

export const putBulk = (keys, values) => {
    const objectStore = getObjectStore(true);
    for (let i = 0; i < keys.length - 1; i++) {
        objectStore.put(values[i], keys[i]);
    }
    return promisifyRequest(objectStore.put(values[keys.length-1], keys[keys.length-1]));
}

export const remove = key => promisifyRequest(getObjectStore(true).delete(key));

export const clear = () => promisifyRequest(getObjectStore(true).clear());
