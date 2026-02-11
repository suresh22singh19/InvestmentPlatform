/**
 * Encryption/Decryption utility for sensitive data in localStorage
 * Uses crypto-js library for AES encryption
 */

import CryptoJS from "crypto-js";

// Secret key for encryption (in production, use environment variable)
// This should be a strong, random key stored securely
const SECRET_KEY = "hiims-encryption-secret-key-2024"; // TODO: Move to environment variable

/**
 * Encrypts a string value
 * @param plaintext - The string to encrypt
 * @returns Encrypted string (base64 encoded)
 */
export const encrypt = (plaintext: string): string => {
  if (!plaintext) return "";
  
  try {
    const encrypted = CryptoJS.AES.encrypt(plaintext, SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    // Return plaintext if encryption fails (should not happen)
    return plaintext;
  }
};

/**
 * Decrypts an encrypted string
 * @param ciphertext - The encrypted string
 * @returns Decrypted string
 */
export const decrypt = (ciphertext: string): string => {
  if (!ciphertext) return "";
  
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption fails (returns empty string), try to return as plaintext
    // This handles backward compatibility with unencrypted passwords
    if (!decrypted && ciphertext) {
      // Check if it looks like encrypted data (base64 format)
      // If not, it might be an old unencrypted password
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(ciphertext) && ciphertext.length > 20;
      if (!isBase64) {
        return ciphertext; // Return as plaintext for backward compatibility
      }
    }
    
    return decrypted || ciphertext;
  } catch (error) {
    console.error("Decryption error:", error);
    // If decryption fails, return as plaintext (for backward compatibility)
    return ciphertext;
  }
};

