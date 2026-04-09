import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_KEYLEN = 64;
const PASSWORD_VERSION = "scrypt.v1";

export async function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;

  return `${PASSWORD_VERSION}:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyCustomerPassword(password: string, passwordHash: string) {
  const [version, salt, storedHash] = passwordHash.split(":");

  if (version !== PASSWORD_VERSION || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}
