use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce
};

// 1. SHA-256 Hashing for secure PIN validation
#[wasm_bindgen]
pub fn sha256_hash(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

// 2. AES-GCM 256-bit symmetric encryption for local storage security
#[wasm_bindgen]
pub fn encrypt_payload_aes(data: &str, key_str: &str) -> String {
    // Derive 32-byte key from key_str using SHA-256
    let mut hasher = Sha256::new();
    hasher.update(key_str.as_bytes());
    let key_bytes = hasher.finalize();

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).unwrap();
    
    // Generate random 12-byte nonce for each encryption (required for AES-GCM security)
    let mut nonce_bytes = [0u8; 12];
    getrandom::getrandom(&mut nonce_bytes).expect("Failed to generate random nonce");
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    if let Ok(ciphertext) = cipher.encrypt(nonce, data.as_bytes()) {
        // Prepend nonce to ciphertext so decryption can recover it
        let mut output = nonce_bytes.to_vec();
        output.extend_from_slice(&ciphertext);
        return hex::encode(output);
    }
    "".to_string()
}

// 3. AES-GCM Decryption
#[wasm_bindgen]
pub fn decrypt_payload_aes(encrypted_hex: &str, key_str: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key_str.as_bytes());
    let key_bytes = hasher.finalize();
    
    let cipher = Aes256Gcm::new_from_slice(&key_bytes).unwrap();
    
    if let Ok(encrypted_bytes) = hex::decode(encrypted_hex) {
        // Extract nonce (first 12 bytes) and ciphertext (rest)
        if encrypted_bytes.len() < 12 {
            return "".to_string();
        }
        let nonce_bytes = &encrypted_bytes[..12];
        let ciphertext = &encrypted_bytes[12..];
        let nonce = Nonce::from_slice(nonce_bytes);
        
        if let Ok(plaintext) = cipher.decrypt(nonce, ciphertext) {
            if let Ok(result_str) = String::from_utf8(plaintext) {
                return result_str;
            }
        }
    }
    "".to_string()
}

// 4. Token verification - structural validation (header.payload.signature format)
#[wasm_bindgen]
pub fn verify_token_checksum(token: &str) -> bool {
    // Validate JWT structural format: three base64url parts separated by dots
    if token.is_empty() {
        return false;
    }
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return false;
    }
    
    // Verify each part is non-empty and contains only valid base64url characters
    for part in &parts {
        if part.is_empty() {
            return false;
        }
        // Basic base64url character check (A-Z, a-z, 0-9, -, _)
        if !part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
            return false;
        }
    }
    
    true
}

// Simple hex module to avoid external hex dependency in cdylib
mod hex {
    pub fn encode(data: Vec<u8>) -> String {
        data.iter().map(|b| format!("{:02x}", b)).collect()
    }
    
    pub fn decode(hex_str: &str) -> Result<Vec<u8>, String> {
        let mut bytes = Vec::new();
        let mut chars = hex_str.chars().peekable();
        while chars.peek().is_some() {
            let chunk: String = chars.by_ref().take(2).collect();
            if chunk.len() < 2 {
                return Err("Invalid hex string: odd length".to_string());
            }
            if let Ok(b) = u8::from_str_radix(&chunk, 16) {
                bytes.push(b);
            } else {
                return Err("Invalid hex string".to_string());
            }
        }
        Ok(bytes)
    }
}
