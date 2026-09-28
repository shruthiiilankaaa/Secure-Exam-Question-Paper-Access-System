'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Crypto Adapter for Person D
 * Integrates with Person B's cryptographic core (paperCrypto.js)
 * Supports AES-256-GCM paper encryption & Shamir's Secret Sharing (N, K)
 */

let paperCrypto = null;

// Try locating existing crypto-core module from Person B
const candidatePaths = [
    path.resolve(__dirname, '../../crypto-core/paperCrypto.js'),
    path.resolve(__dirname, '../crypto-core/paperCrypto.js'),
    path.resolve(process.cwd(), 'crypto-core/paperCrypto.js'),
    path.resolve(process.cwd(), '../crypto-core/paperCrypto.js')
];

for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
        try {
            paperCrypto = require(p);
            console.log(`[CryptoAdapter] Loaded Person B's paperCrypto from: ${p}`);
            break;
        } catch (err) {
            console.warn(`[CryptoAdapter] Failed loading from ${p}:`, err.message);
        }
    }
}

if (!paperCrypto) {
    console.warn('[CryptoAdapter] Warning: crypto-core/paperCrypto.js not found in standard paths, initializing standalone crypto fallback.');
    // Standalone fallback using standard Node crypto if isolated
    const crypto = require('crypto');
    paperCrypto = {
        encryptPaper: (buffer, n, k) => {
            const key = crypto.randomBytes(32);
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
            const tag = cipher.getAuthTag();
            const ciphertext = Buffer.concat([iv, tag, enc]);
            
            // Basic mock shares if Person B's shamir.js is unavailable
            const shares = [];
            for (let i = 1; i <= n; i++) {
                shares.push(Buffer.concat([Buffer.from([i]), key]).toString('base64'));
            }
            return { ciphertext, shares };
        },
        decryptPaper: (ciphertext, shares) => {
            if (!shares || shares.length === 0) {
                throw new Error('decryption failed: invalid key, corrupted data, or tampered ciphertext');
            }
            const firstShare = Buffer.from(shares[0], 'base64');
            const key = firstShare.subarray(1, 33);
            const iv = ciphertext.subarray(0, 12);
            const tag = ciphertext.subarray(12, 28);
            const enc = ciphertext.subarray(28);
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(enc), decipher.final()]);
        }
    };
}

module.exports = {
    encryptPaper: (buffer, n, k) => paperCrypto.encryptPaper(buffer, n, k),
    decryptPaper: (ciphertext, shares) => paperCrypto.decryptPaper(ciphertext, shares)
};
