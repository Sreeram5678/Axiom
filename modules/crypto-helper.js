/**
 * Zero-Knowledge cryptographic helper using WebCrypto API (AES-GCM 256-bit).
 * Encrypts sensitive data locally before syncing via chrome.storage.sync.
 */

// Helper to convert a string to an ArrayBuffer
function stringToBuffer(str) {
  return new TextEncoder().encode(str);
}

// Helper to convert an ArrayBuffer to a string
function bufferToString(buf) {
  return new TextDecoder().decode(buf);
}

// Helper to convert an ArrayBuffer to Base64
function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  // Safe chunked conversion to prevent maximum call stack size exceeded errors
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an encryption key from a passphrase and a salt.
 * 
 * @param {string} passphrase - User-defined secret passphrase.
 * @param {Uint8Array} salt - Crypto salt.
 * @returns {Promise<CryptoKey>} Derived AES-GCM key.
 */
async function deriveKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    stringToBuffer(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

let cachedPassphrase = null;
let cachedKey = null;
let cachedSalt = null;

/**
 * Encrypts plaintext string using AES-GCM 256-bit.
 * 
 * @param {string} plaintext - Sensitive string to encrypt.
 * @param {string} passphrase - Passphrase for PBKDF2 key derivation.
 * @returns {Promise<string>} Base64-encoded encrypted JSON string containing ciphertext, salt, and iv.
 */
export async function encrypt(plaintext, passphrase) {
  if (!passphrase || passphrase.trim() === "") {
    throw new Error("Encryption passphrase cannot be empty.");
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  if (passphrase !== cachedPassphrase || !cachedKey || !cachedSalt) {
    cachedSalt = crypto.getRandomValues(new Uint8Array(16));
    cachedKey = await deriveKey(passphrase, cachedSalt);
    cachedPassphrase = passphrase;
  }
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    cachedKey,
    stringToBuffer(plaintext)
  );

  const payload = {
    ciphertext: bufferToBase64(ciphertextBuffer),
    salt: bufferToBase64(cachedSalt),
    iv: bufferToBase64(iv)
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts an encrypted payload JSON using AES-GCM 256-bit.
 * 
 * @param {string} encryptedJson - JSON payload containing ciphertext, salt, and iv.
 * @param {string} passphrase - Passphrase for decryption.
 * @returns {Promise<string>} Decrypted plaintext.
 */
export async function decrypt(encryptedJson, passphrase) {
  if (!passphrase || passphrase.trim() === "") {
    throw new Error("Decryption passphrase cannot be empty.");
  }

  let payload;
  try {
    payload = JSON.parse(encryptedJson);
  } catch (e) {
    throw new Error("Invalid encrypted payload format.");
  }

  if (!payload.ciphertext || !payload.salt || !payload.iv) {
    throw new Error("Encrypted payload is missing essential cryptographic components.");
  }

  const ciphertext = base64ToBuffer(payload.ciphertext);
  const salt = base64ToBuffer(payload.salt);
  const iv = base64ToBuffer(payload.iv);

  let key;
  if (passphrase === cachedPassphrase && cachedKey && bufferToBase64(salt) === bufferToBase64(cachedSalt)) {
     key = cachedKey;
  } else {
     key = await deriveKey(passphrase, new Uint8Array(salt));
     cachedPassphrase = passphrase;
     cachedSalt = new Uint8Array(salt);
     cachedKey = key;
  }

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv)
      },
      key,
      ciphertext
    );
    return bufferToString(decryptedBuffer);
  } catch (err) {
    throw new Error("Cryptographic decryption failed. Please verify your sync passphrase.");
  }
}
