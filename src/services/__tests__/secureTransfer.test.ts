import { encrypt, decrypt, generateSecureKey, hashData } from '../secureTransfer';
import { EncryptedData } from '../secureTransfer';
import crypto from 'crypto';

describe('Secure Transfer Service', () => {
  const testSecret = 'test-secret-key-32-characters-long';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt simple string data', () => {
      const data = 'Hello, World!';
      const result = encrypt(data, testSecret);

      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('encrypted');
      expect(typeof result.iv).toBe('string');
      expect(typeof result.authTag).toBe('string');
      expect(typeof result.encrypted).toBe('string');
    });

    it('should encrypt object data', () => {
      const data = { name: 'John', age: 30, active: true };
      const result = encrypt(data, testSecret);

      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('encrypted');
      expect(result.iv).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(result.authTag).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should encrypt array data', () => {
      const data = [1, 2, 3, 'test', { nested: true }];
      const result = encrypt(data, testSecret);

      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('encrypted');
    });

    it('should generate different IV for each encryption', () => {
      const data = 'same data';
      const result1 = encrypt(data, testSecret);
      const result2 = encrypt(data, testSecret);

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.authTag).not.toBe(result2.authTag);
    });

    it('should handle null and undefined values', () => {
      const nullResult = encrypt(null, testSecret);
      const undefinedResult = encrypt(undefined, testSecret);

      expect(nullResult).toHaveProperty('iv');
      expect(nullResult).toHaveProperty('authTag');
      expect(nullResult).toHaveProperty('encrypted');
      
      expect(undefinedResult).toHaveProperty('iv');
      expect(undefinedResult).toHaveProperty('authTag');
      expect(undefinedResult).toHaveProperty('encrypted');
    });

    it('should throw error when secret is not provided', () => {
      const data = 'test data';
      // This test specifically checks the error when no secret is provided
      expect(() => encrypt(data, '')).toThrow('Secret key is required for encryption');
    });
  });

  describe('decrypt', () => {
    it('should decrypt simple string data', () => {
      const originalData = 'Hello, World!';
      const encrypted = encrypt(originalData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(originalData);
    });

    it('should decrypt object data', () => {
      const originalData = { name: 'John', age: 30, active: true };
      const encrypted = encrypt(originalData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt array data', () => {
      const originalData = [1, 2, 3, 'test', { nested: true }];
      const encrypted = encrypt(originalData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt null and undefined values', () => {
      const nullEncrypted = encrypt(null, testSecret);
      const undefinedEncrypted = encrypt(undefined, testSecret);
      
      const nullDecrypted = decrypt(nullEncrypted, testSecret);
      const undefinedDecrypted = decrypt(undefinedEncrypted, testSecret);

      expect(nullDecrypted).toBe('');
      expect(undefinedDecrypted).toBe('');
    });

    it('should fail with wrong secret', () => {
      const originalData = 'secret message';
      const encrypted = encrypt(originalData, testSecret);
      const wrongSecret = 'wrong-secret-key-32-characters-long';

      expect(() => decrypt(encrypted, wrongSecret)).toThrow();
    });

    it('should fail with tampered encrypted data', () => {
      const originalData = 'secret message';
      const encrypted = encrypt(originalData, testSecret);
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encrypted: encrypted.encrypted.slice(0, -2) + 'ff'
      };

      expect(() => decrypt(tamperedEncrypted, testSecret)).toThrow();
    });

    it('should fail with tampered auth tag', () => {
      const originalData = 'secret message';
      const encrypted = encrypt(originalData, testSecret);
      
      // Tamper with auth tag
      const tamperedEncrypted = {
        ...encrypted,
        authTag: encrypted.authTag.slice(0, -2) + 'ff'
      };

      expect(() => decrypt(tamperedEncrypted, testSecret)).toThrow();
    });

    it('should fail with tampered IV', () => {
      const originalData = 'secret message';
      const encrypted = encrypt(originalData, testSecret);
      
      // Tamper with IV
      const tamperedEncrypted = {
        ...encrypted,
        iv: encrypted.iv.slice(0, -2) + 'ff'
      };

      expect(() => decrypt(tamperedEncrypted, testSecret)).toThrow();
    });

    it('should fail with invalid hex strings', () => {
      const invalidPacket = {
        iv: 'invalid-hex',
        authTag: 'invalid-hex',
        encrypted: 'invalid-hex'
      };

      expect(() => decrypt(invalidPacket, testSecret)).toThrow();
    });

    it('should fail with missing packet properties', () => {
      const incompletePacket = {
        iv: '123456789012345678901234',
        authTag: '12345678901234567890123456789012'
        // missing encrypted
      } as any;

      expect(() => decrypt(incompletePacket, testSecret)).toThrow();
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should handle complex nested objects', () => {
      const complexData = {
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            settings: {
              theme: 'dark',
              notifications: true,
              preferences: ['email', 'sms']
            }
          }
        },
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      const encrypted = encrypt(complexData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toEqual(complexData);
    });

    it('should handle empty string data', () => {
      const data = '';
      const encrypted = encrypt(data, testSecret);
      const decrypted = decrypt(encrypted, testSecret);
      expect(decrypted).toBe(data);
    });

    it('should handle large string data', () => {
      const largeData = 'A'.repeat(5000); // 5KB string
      const encrypted = encrypt(largeData, testSecret);
      const decrypted = decrypt(encrypted, testSecret);
      expect(decrypted).toBe(largeData);
    });

    it('should handle boolean data', () => {
      const data = true;
      const encrypted = encrypt(data, testSecret);
      const decrypted = decrypt(encrypted, testSecret);
      expect(decrypted).toBe(data);
    });

    it('should handle number data', () => {
      const data = 12345.6789;
      const encrypted = encrypt(data, testSecret);
      const decrypted = decrypt(encrypted, testSecret);
      expect(decrypted).toBe(data);
    });

    it('should work with a securely generated key', () => {
      const newSecret = crypto.randomBytes(32).toString('hex'); // Generate a random 32-byte hex key
      const data = 'data with new secret';
      const encrypted = encrypt(data, newSecret);
      const decrypted = decrypt(encrypted, newSecret);
      expect(decrypted).toBe(data);
    });
  });

  describe('generateSecureKey', () => {
    it('should generate a secure key of appropriate length', () => {
      const key = generateSecureKey();
      expect(typeof key).toBe('string');
      expect(key).toHaveLength(64); // 32 bytes * 2 hex chars/byte
    });
  });

  describe('hashData', () => {
    it('should generate a consistent hash for the same input', () => {
      const data = 'test data for hashing';
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 produces 64 hex characters
    });

    it('should generate a different hash for different inputs', () => {
      const data1 = 'test data one';
      const data2 = 'test data two';
      const hash1 = hashData(data1);
      const hash2 = hashData(data2);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string input', () => {
      const data = '';
      const hash = hashData(data);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('should handle null and undefined input', () => {
      const nullHash = hashData(null as any);
      const undefinedHash = hashData(undefined as any);
      expect(nullHash).toBeDefined();
      expect(undefinedHash).toBeDefined();
      // Expecting them to hash to the empty string hash due to internal handling
      expect(nullHash).toBe(hashData(''));
      expect(undefinedHash).toBe(hashData(''));
    });
  });
}); 