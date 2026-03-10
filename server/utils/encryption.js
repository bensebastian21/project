const crypto = require('crypto');

// Use a secure key derivation or fallback to a hash of the JWT secret
// Ideally, use a dedicated CHAT_SECRET in .env
const SECRET_KEY = process.env.CHAT_SECRET
  ? crypto.createHash('sha256').update(String(process.env.CHAT_SECRET)).digest()
  : process.env.JWT_SECRET
    ? crypto.createHash('sha256').update(String(process.env.JWT_SECRET)).digest()
    : crypto.randomBytes(32); // Fallback (not persistent across restarts without env)

const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a text string.
 * Returns { content: "hexString", iv: "hexString" }
 */
exports.encryptMessage = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    content: encrypted,
    iv: iv.toString('hex'),
  };
};

/**
 * Decrypts a stored message object { content, iv }.
 * Returns original text string.
 */
exports.decryptMessage = (encrypted) => {
  if (!encrypted || !encrypted.content || !encrypted.iv) return '[Corrupted Message]';
  try {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '[Decryption Failed]';
  }
};
