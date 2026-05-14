import { safeStorage } from 'electron';

export class SecureStorageService {
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  encrypt(plaintext: string): string {
    if (!this.isAvailable()) return plaintext;
    return safeStorage.encryptString(plaintext).toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!this.isAvailable()) return ciphertext;
    try {
      const buffer = Buffer.from(ciphertext, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      // If decryption fails, return as-is (might be unencrypted legacy value)
      return ciphertext;
    }
  }
}
