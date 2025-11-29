import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits

export interface EncryptedData {
  encrypted: string; // Base64 encoded ciphertext
  iv: string; // Base64 encoded IV
  authTag: string; // Base64 encoded authentication tag
}

/**
 * Get the encryption key from environment variable
 * Key must be 32 bytes (256 bits) base64 encoded
 */
function getEncryptionKey(): Buffer {
  const key = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required"
    );
  }

  const keyBuffer = Buffer.from(key, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(
      `OAUTH_TOKEN_ENCRYPTION_KEY must be 32 bytes (256 bits). Got ${keyBuffer.length} bytes. ` +
        "Generate with: openssl rand -base64 32"
    );
  }

  return keyBuffer;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Each encryption uses a unique random IV for security
 */
export function encryptToken(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt an encrypted token using AES-256-GCM
 * Validates the authentication tag to detect tampering
 */
export function decryptToken(data: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, "base64");
  const authTag = Buffer.from(data.authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a cryptographically secure random string
 * Uses base64url encoding (URL-safe)
 */
export function generateSecureRandom(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * Generate PKCE code challenge from code verifier
 * Uses SHA256 hash with base64url encoding
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
}
