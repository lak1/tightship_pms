/**
 * Encryption Utilities
 *
 * Uses AES-256-GCM for encrypting sensitive data like API tokens
 * Requires ENCRYPTION_KEY environment variable (32-byte hex string)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const AUTH_TAG_LENGTH = 16 // 16 bytes for GCM auth tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * Should be a 32-byte hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one using: openssl rand -hex 32'
    )
  }

  if (key.length !== KEY_LENGTH * 2) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} characters (${KEY_LENGTH} bytes in hex). ` +
      `Current length: ${key.length}. Generate a new one using: openssl rand -hex 32`
    )
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a string using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @returns Encrypted text as base64 string with format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
    ciphertext += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Return format: iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt a string using AES-256-GCM
 *
 * @param encrypted - Encrypted text in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encrypted.split(':')

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const iv = Buffer.from(parts[0], 'base64')
    const authTag = Buffer.from(parts[1], 'base64')
    const ciphertext = parts[2]

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8')
    plaintext += decipher.final('utf8')

    return plaintext
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Encrypt an object (converts to JSON first)
 */
export function encryptObject<T = any>(obj: T): string {
  return encrypt(JSON.stringify(obj))
}

/**
 * Decrypt to an object (parses JSON after decryption)
 */
export function decryptObject<T = any>(encrypted: string): T {
  const plaintext = decrypt(encrypted)
  return JSON.parse(plaintext)
}

/**
 * Generate a new encryption key
 * Use this to generate ENCRYPTION_KEY for .env file
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Check if ENCRYPTION_KEY is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}

/**
 * Encrypt credentials object for database storage
 */
export interface EncryptedCredentials {
  encrypted: true
  data: string
}

export function encryptCredentials(credentials: Record<string, any>): EncryptedCredentials {
  return {
    encrypted: true,
    data: encryptObject(credentials),
  }
}

/**
 * Decrypt credentials object from database
 */
export function decryptCredentials(encryptedCreds: EncryptedCredentials | Record<string, any>): Record<string, any> {
  // Check if already encrypted
  if ('encrypted' in encryptedCreds && encryptedCreds.encrypted === true) {
    return decryptObject(encryptedCreds.data)
  }

  // Return as-is if not encrypted (backward compatibility)
  return encryptedCreds as Record<string, any>
}

/**
 * Safely encrypt credentials (handles null/undefined)
 */
export function safeEncryptCredentials(credentials: Record<string, any> | null | undefined): EncryptedCredentials | null {
  if (!credentials) return null

  try {
    return encryptCredentials(credentials)
  } catch (error) {
    console.error('Failed to encrypt credentials:', error)
    // In development, you might want to return unencrypted for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Storing credentials unencrypted in development mode')
      return credentials as any
    }
    throw error
  }
}

/**
 * Safely decrypt credentials (handles null/undefined and plain objects)
 */
export function safeDecryptCredentials(encryptedCreds: EncryptedCredentials | Record<string, any> | null | undefined): Record<string, any> | null {
  if (!encryptedCreds) return null

  try {
    return decryptCredentials(encryptedCreds)
  } catch (error) {
    console.error('Failed to decrypt credentials:', error)
    // If decryption fails and it looks like plain object, return it (backward compatibility)
    if (!('encrypted' in encryptedCreds)) {
      console.warn('⚠️  Found unencrypted credentials, returning as-is')
      return encryptedCreds as Record<string, any>
    }
    throw error
  }
}
