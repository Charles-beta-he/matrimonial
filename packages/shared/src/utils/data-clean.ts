/** Mask PII before analytics logging.
 *  Order matters: longest patterns first so they don't get nibbled by shorter ones.
 *  ID card (18 chars) → phone (11) → email → WeChat/QQ-style IDs.
 */
export function maskPII(text: string): string {
  return text
    // ID card (must run BEFORE phone, since a phone-like 11-digit substring
    // sits inside every ID card and would otherwise mask it first)
    .replace(/\d{17}[\dXx]/g, '****')
    // Phone numbers
    .replace(/1[3-9]\d{9}/g, (m) => `${m.slice(0, 3)}****${m.slice(-4)}`)
    // Email
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '***@***')
    // WeChat/QQ IDs
    .replace(/[a-zA-Z][\w-]{5,19}/g, '***');
}

/** Sanitize user-generated content for storage */
export function sanitizeUGC(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // strip HTML
    // eslint-disable-next-line no-control-regex -- intentional control char stripping
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars
    .trim()
    .slice(0, 5000); // max length
}

/** Normalize phone number to E.164-like format */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('86') && digits.length === 13) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
}

/** Extract clean age from birthday */
export function cleanAge(birthday: string | Date): number | null {
  try {
    const d = new Date(birthday);
    if (isNaN(d.getTime())) return null;
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    return age >= 18 && age <= 100 ? age : null;
  } catch { return null; }
}

/** Validate and clean location string */
export function cleanCity(city: string): string {
  return city.replace(/[^\u4e00-\u9fa5a-zA-Z·\-\s]/g, '').trim().slice(0, 50) || '未知';
}
