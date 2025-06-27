import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

// Ideally, derive this from a secure secret vault.
const DEFAULT_SECRET = process.env.SECURE_TRANSFER_KEY || crypto.randomBytes(KEY_LENGTH).toString('hex');

export function encrypt(data: any, secret: string): { iv: string; authTag: string; encrypted: string } {
  // Input validation
  if (!secret || secret.length === 0) {
    throw new Error('Secret key is required for encryption');
  }
  
  // Handle null/undefined data
  if (data === null || data === undefined) {
    data = '';
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Ensure key is proper length - pad or truncate as needed
  let keyBuffer: Buffer;
  if (secret.length < KEY_LENGTH) {
    // Pad short keys
    const paddedSecret = secret.padEnd(KEY_LENGTH, '0');
    keyBuffer = Buffer.from(paddedSecret.slice(0, KEY_LENGTH), 'utf-8');
  } else {
    // Truncate long keys
    keyBuffer = Buffer.from(secret.slice(0, KEY_LENGTH), 'utf-8');
  }
  
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted.toString('hex'),
  };
}

export function decrypt(encryptedData: { iv: string; authTag: string; encrypted: string }, secret: string): any {
  // Input validation
  if (!secret || secret.length === 0) {
    throw new Error('Secret key is required for decryption');
  }
  
  if (!encryptedData || !encryptedData.iv || !encryptedData.authTag || !encryptedData.encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  // Ensure key is proper length - pad or truncate as needed
  let keyBuffer: Buffer;
  if (secret.length < KEY_LENGTH) {
    // Pad short keys
    const paddedSecret = secret.padEnd(KEY_LENGTH, '0');
    keyBuffer = Buffer.from(paddedSecret.slice(0, KEY_LENGTH), 'utf-8');
  } else {
    // Truncate long keys
    keyBuffer = Buffer.from(secret.slice(0, KEY_LENGTH), 'utf-8');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, Buffer.from(encryptedData.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.encrypted, 'hex')),
    decipher.final(),
  ]);
  
  const jsonString = decrypted.toString('utf8');
  return JSON.parse(jsonString);
}

export function generateSecureKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

export function hashData(data: string): string {
  if (!data) {
    return crypto.createHash('sha256').update('').digest('hex');
  }
  return crypto.createHash('sha256').update(data).digest('hex');
} 