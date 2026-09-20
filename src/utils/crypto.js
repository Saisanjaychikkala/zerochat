// Native Web Crypto API: AES-GCM 256-bit End-to-End Encryption

// Derive an AES-GCM 256-bit key from a room passphrase or room ID
export async function deriveKey(secret, salt = 'zerochat_salt_v2') {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string -> returns { ciphertext (base64), iv (base64) }
export async function encryptMessage(text, key) {
  if (!key) return { ciphertext: text, iv: null };

  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = enc.encode(text);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt { ciphertext (base64), iv (base64) } -> returns plaintext string
export async function decryptMessage(encryptedPayload, key) {
  if (!key || !encryptedPayload.iv) {
    return encryptedPayload.ciphertext || encryptedPayload;
  }

  try {
    const iv = base64ToArrayBuffer(encryptedPayload.iv);
    const ciphertext = base64ToArrayBuffer(encryptedPayload.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption error:', err);
    return '[Encrypted message - decryption failed]';
  }
}

// Helper: ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
