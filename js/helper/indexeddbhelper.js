let db;

export const init = async fileTypes => {
    // Reference IndexedDB and sleep necessary because of Safari bug in 14.1.1 (https://bugs.webkit.org/show_bug.cgi?id=226547)
    const idb = globalThis.indexedDB;
    await new Promise(resolve => setTimeout(() => resolve(), 100));

    const request = indexedDB.open("OpenEDC", 2);
    request.onupgradeneeded = () => fileTypes.forEach(fileType => {
        if (!request.result.objectStoreNames.contains(fileType)) request.result.createObjectStore(fileType);
    });

    db = await promisifyRequest(request);
}

export const promisifyRequest = request => new Promise(resolve => request.onsuccess = () => resolve(request.result));

export const getObjectStore = (fileType, writeable) => db.transaction(fileType, writeable ? "readwrite" : "readonly").objectStore(fileType);

export const get = (key, fileType) => promisifyRequest(getObjectStore(fileType).get(key));

export const getKeys = fileType => promisifyRequest(getObjectStore(fileType).getAllKeys());

export const put = (key, value, fileType) => promisifyRequest(getObjectStore(fileType, true).put(value, key));

export const putBulk = (keys, values, fileType) => {
    const objectStore = getObjectStore(fileType, true);
    for (let i = 0; i < keys.length - 1; i++) {
        objectStore.put(values[i], keys[i]);
    }
    return promisifyRequest(objectStore.put(values[keys.length-1], keys[keys.length-1]));
}

export const remove = (key, fileType) => promisifyRequest(getObjectStore(fileType, true).delete(key));

export const clear = fileType => promisifyRequest(getObjectStore(fileType, true).clear());
