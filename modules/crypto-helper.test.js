import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto-helper.js';

describe('crypto-helper', () => {
  const plaintext = 'Hello, Axiom OS!';
  const passphrase = 'my-secret-passphrase';

  it('should encrypt and decrypt a plaintext string correctly', async () => {
    const encrypted = await encrypt(plaintext, passphrase);
    expect(encrypted).toBeTypeOf('string');
    
    const parsed = JSON.parse(encrypted);
    expect(parsed).toHaveProperty('ciphertext');
    expect(parsed).toHaveProperty('salt');
    expect(parsed).toHaveProperty('iv');

    const decrypted = await decrypt(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw an error for empty passphrase during encryption', async () => {
    await expect(encrypt(plaintext, '')).rejects.toThrow('Encryption passphrase cannot be empty.');
    await expect(encrypt(plaintext, '   ')).rejects.toThrow('Encryption passphrase cannot be empty.');
    await expect(encrypt(plaintext, null)).rejects.toThrow('Encryption passphrase cannot be empty.');
  });

  it('should throw an error for empty passphrase during decryption', async () => {
    const encrypted = await encrypt(plaintext, passphrase);
    await expect(decrypt(encrypted, '')).rejects.toThrow('Decryption passphrase cannot be empty.');
    await expect(decrypt(encrypted, '   ')).rejects.toThrow('Decryption passphrase cannot be empty.');
    await expect(decrypt(encrypted, null)).rejects.toThrow('Decryption passphrase cannot be empty.');
  });

  it('should reject incorrect passphrase', async () => {
    const encrypted = await encrypt(plaintext, passphrase);
    await expect(decrypt(encrypted, 'wrong-passphrase')).rejects.toThrow(
      'Cryptographic decryption failed. Please verify your sync passphrase.'
    );
  });

  it('should throw an error for malformed payload JSON', async () => {
    await expect(decrypt('invalid-json', passphrase)).rejects.toThrow(
      'Invalid encrypted payload format.'
    );
  });

  it('should throw an error if cryptographic components are missing', async () => {
    const missingCiphertext = JSON.stringify({ salt: 'salt', iv: 'iv' });
    await expect(decrypt(missingCiphertext, passphrase)).rejects.toThrow(
      'Encrypted payload is missing essential cryptographic components.'
    );

    const missingSalt = JSON.stringify({ ciphertext: 'cipher', iv: 'iv' });
    await expect(decrypt(missingSalt, passphrase)).rejects.toThrow(
      'Encrypted payload is missing essential cryptographic components.'
    );

    const missingIv = JSON.stringify({ ciphertext: 'cipher', salt: 'salt' });
    await expect(decrypt(missingIv, passphrase)).rejects.toThrow(
      'Encrypted payload is missing essential cryptographic components.'
    );
  });
});
