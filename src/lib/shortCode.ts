import crypto from "crypto";

// Excludes visually-ambiguous characters (0/O, 1/l/I) so codes are easy to
// read off a printed flyer or read aloud — not derived from any personal
// info (name, email, etc.), since an affiliate's link/slug is public and
// name-based codes are a privacy leak.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

export function generateShortCode(length = 7): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}
