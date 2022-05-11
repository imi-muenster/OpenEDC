// Defines the number of PBKDF2 hashing iterations
const iterationsPBKDF2 = 250000;

//
// Export cryptographic primitives
//
export const AES = {
    encrypt: {
        withPassword: async (data, password) => await aesEncryptDataSalted(data, password),
        withKey: async (data, key) => await aesEncryptDataUnsalted(data, key),
    },
    decrypt: {
        withPassword: async (data, password) => await aesDecryptDataSalted(data, password),
        withKey: async (data, key) => await aesDecryptDataUnsalted(data, key),
    },
    generateKey: async () => await aesGenerateKey()
}

export const RSA = {
    encrypt: async (data, publicKey) => await rsaEncryptData(data, publicKey),
    decrypt: async (data, privateKey) => await rsaDecryptData(data, privateKey),
    generateKeyPair: async () => await rsaGenerateKeyPair()
}

export const SHA = {
    hash: async data => await shaHashData(data)
}

export const PBKDF2 = {
    generateAuthenticationKey: async (username, password) => await pbkdfGenerateAuthenticationKey(username, password)
}

//
// Definition of cryptographic primitives
//
const aesEncryptDataSalted = async (data, password) => {
    // Transform data and password to Uint8Arrays containing UTF-8 encoded text
    const dataAsBytes = encodeUTF8(data);
    const passwordAsBytes = encodeUTF8(password);

    // Derive salted AES key
    const salt = window.crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await pbkdf2DeriveKey(passwordAsBytes, salt, { extractable: false });

    // Encrypt data
    const initializationVector = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: initializationVector
        },
        aesKey,
        dataAsBytes
    );

    // Concat salt, initialization vector, and encrypted data
    const encryptedDataAsBytes = new Uint8Array(encryptedContent);
    const encryptedPackageAsBytes = new Uint8Array([...salt, ...initializationVector, ...encryptedDataAsBytes]);

    // Return data as Base64-encoded string
    return bytesToBase64(encryptedPackageAsBytes);
};

const aesDecryptDataSalted = async (data, password) => {
    // Get salt, initialization vector, encrypted data, and password as Uint8Arrays containing UTF-8 encoded text
    const encryptedBytes = base64ToBytes(data);
    const salt = encryptedBytes.slice(0, 32);
    const initializationVector = encryptedBytes.slice(32, 44);
    const encryptedDataAsBytes = encryptedBytes.slice(32 + 12);
    const passwordAsBytes = encodeUTF8(password);

    // Derive salted AES key
    const aesKey = await pbkdf2DeriveKey(passwordAsBytes, salt, { extractable: false });

    // Decrypt data
    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: initializationVector
        },
        aesKey,
        encryptedDataAsBytes
    );

    // Return encrypted and decoded data
    return decodeUTF8(new Uint8Array(decryptedContent));
};

const aesEncryptDataUnsalted = async (data, key) => {
    // Transform data and key to Uint8Arrays containing UTF-8 encoded text
    const dataAsBytes = encodeUTF8(data);
    const keyAsBytes = base64ToBytes(key);

    // Create an AES key
    const aesKey = await window.crypto.subtle.importKey(
        "raw",
        keyAsBytes,
        "AES-GCM",
        false,
        ["encrypt"]
    );

    // Encrypt data
    const initializationVector = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: initializationVector
        },
        aesKey,
        dataAsBytes
    );

    // Concat initialization vector and encrypted data
    const encryptedDataAsBytes = new Uint8Array(encryptedContent);
    const encryptedPackageAsBytes = new Uint8Array([...initializationVector, ...encryptedDataAsBytes]);

    // Return data as Base64-encoded string
    return bytesToBase64(encryptedPackageAsBytes);
};

const aesDecryptDataUnsalted = async (data, key) => {
    // Get initialization vector, encrypted data, and key as Uint8Arrays containing UTF-8 encoded text
    const encryptedBytes = base64ToBytes(data);
    const initializationVector = encryptedBytes.slice(0, 12);
    const encryptedDataAsBytes = encryptedBytes.slice(12);
    const keyAsBytes = base64ToBytes(key);

    // Create an AES key
    const aesKey = await window.crypto.subtle.importKey(
        "raw",
        keyAsBytes,
        "AES-GCM",
        false,
        ["decrypt"]
    );

    // Decrypt data
    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: initializationVector
        },
        aesKey,
        encryptedDataAsBytes
    );

    // Return encrypted and decoded data
    return decodeUTF8(new Uint8Array(decryptedContent));
};

const aesGenerateKey = async () => {
    // Generate AES key
    const aesKey = await window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    // Return key as Base64-encoded string
    const keyAsBytes = await crypto.subtle.exportKey(
        "raw",
        aesKey
    );
    return bytesToBase64(new Uint8Array(keyAsBytes));
}

const rsaEncryptData = async (data, publicKey) => {
    // Transform data and public key to a Uint8Array containing UTF-8 encoded text
    const dataAsBytes = encodeUTF8(data);
    const publicKeyAsBytes = base64ToBytes(publicKey);

    // Create public RSA key
    const publicRSAKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeyAsBytes,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["encrypt"]
    );

    // Encrypt data
    const encryptedDataAsBytes = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        publicRSAKey,
        dataAsBytes
    );

    // Return data as Base64-encoded string
    return bytesToBase64(new Uint8Array(encryptedDataAsBytes));
}

const rsaDecryptData = async (data, privateKey) => {
    // Get encrypted data and private key as Uint8Arrays containing UTF-8 encoded text
    const encryptedBytes = base64ToBytes(data);
    const privateKeyAsBytes = base64ToBytes(privateKey);

    // Create public RSA key
    const privateRSAKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyAsBytes,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["decrypt"]
    );

    // Encrypt data
    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateRSAKey,
        encryptedBytes
    );

    // Return encrypted and decoded data
    return decodeUTF8(new Uint8Array(decryptedContent));
}

const rsaGenerateKeyPair = async () => {
    // Generate RSA key pair
    const rsaKeyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
    );

    // Export public key
    const publicKeyAsBytes = await crypto.subtle.exportKey(
        "spki",
        rsaKeyPair.publicKey
    );
    const publicKey = bytesToBase64(new Uint8Array(publicKeyAsBytes));

    // Export private key
    const privateKeyAsBytes = await crypto.subtle.exportKey(
        "pkcs8",
        rsaKeyPair.privateKey
    );
    const privateKey = bytesToBase64(new Uint8Array(privateKeyAsBytes));

    // Return RSA key pair
    return {
        publicKey,
        privateKey
    }
}

const shaHashData = async data => {
    // Transform password to a Uint8Array containing UTF-8 encoded text
    const dataAsBytes = encodeUTF8(data);

    // Calculate hash
    const hash = await crypto.subtle.digest(
        "SHA-256",
        dataAsBytes
    );

    // Return hash as Base64-encoded string
    return bytesToBase64(new Uint8Array(hash));
}

const pbkdfGenerateAuthenticationKey = async (username, password) => {
    // Authentication key used to make brute-force attacks far more difficult compared to simple password hashing
    const usernameHash = await shaHashData(username);

    // Transform inputs to bytes while using part of the username's hash as salt
    const salt = encodeUTF8(usernameHash.slice(0, 32));
    const passwordAsBytes = encodeUTF8(password);

    // Derive salted AES key 
    const aesKey = await pbkdf2DeriveKey(passwordAsBytes, salt, { extractable: true });

    // Return key as Base64-encoded string
    const keyAsBytes = await crypto.subtle.exportKey(
        "raw",
        aesKey
    );
    return bytesToBase64(new Uint8Array(keyAsBytes));
}

const pbkdf2DeriveKey = async (passwordAsBytes, salt, options) => {
    // Create a password key to derive the encryption key later on
    const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        passwordAsBytes,
        "PBKDF2",
        false,
        ["deriveKey"]
    );
 
    // Derive the salted AES key
    return await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: iterationsPBKDF2,
            hash: "SHA-256"
        },
        passwordKey,
        {
            name: "AES-GCM",
            length: 256
        },
        options.extractable,
        ["encrypt", "decrypt"]
    );
}

//
// Auxiliary functions
//
const encodeUTF8 = string => new TextEncoder().encode(string);

const decodeUTF8 = bytes => new TextDecoder().decode(bytes);

const bytesToBase64 = bytes => {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
}

const base64ToBytes = base64 => {
    const binary = window.atob(base64);
    const length = binary.length;
    let bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}
