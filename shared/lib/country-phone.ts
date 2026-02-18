/**
 * Country dial codes and phone validation rules for forms.
 * Used by candidate onboarding and any phone input that needs country-specific validation.
 */

export interface CountryPhoneRule {
  code: string;
  name: string;
  dialCode: string;
  /** Placeholder for the national number (without country code). */
  placeholder: string;
  /** Min length of national number (digits only). */
  minLength: number;
  /** Max length of national number (digits only). */
  maxLength: number;
  /** Optional: regex for national number (digits only, no spaces). Return true if valid. */
  validate?: (national: string) => boolean;
}

/** Strip to digits only for validation. */
export function digitsOnly(s: string): string {
  return (s || "").replace(/\D/g, "");
}

/** Build full phone number for API: dialCode + national digits (e.g. "+919876543210"). For "Other", national may be full number. */
export function toFullPhone(dialCode: string, national: string): string {
  const d = digitsOnly(national);
  if (!d) return "";
  const code = (dialCode || "").replace(/\s/g, "").replace(/^\+/, "");
  if (!code || code === "0") return national.trim().startsWith("+") ? national.trim() : `+${d}`;
  return `+${code}${d}`;
}

/** Validate national number for a country rule. */
export function validatePhoneForCountry(national: string, rule: CountryPhoneRule): boolean {
  const d = digitsOnly(national);
  const len = rule.code === "OTHER" ? (national.replace(/\s/g, "").replace(/^\+/, "").length) : d.length;
  if (len < rule.minLength || len > rule.maxLength) return false;
  if (rule.validate) return rule.validate(rule.code === "OTHER" ? national : d);
  return true;
}

/** Get validation error message for a country. */
export function getPhoneErrorForCountry(rule: CountryPhoneRule): string {
  return `Enter a valid ${rule.name} number (${rule.placeholder})`;
}

/** Sorted list of countries with dial code and validation. */
export const COUNTRY_PHONE_RULES: CountryPhoneRule[] = [
  { code: "IN", name: "India", dialCode: "+91", placeholder: "10-digit mobile (e.g. 9876543210)", minLength: 10, maxLength: 10, validate: (n) => /^[6-9]\d{9}$/.test(n) },
  { code: "US", name: "United States", dialCode: "+1", placeholder: "10-digit number (e.g. 2025551234)", minLength: 10, maxLength: 10, validate: (n) => /^\d{10}$/.test(n) },
  { code: "GB", name: "United Kingdom", dialCode: "+44", placeholder: "10–11 digits (e.g. 7911123456)", minLength: 10, maxLength: 11 },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", placeholder: "9 digits (e.g. 501234567)", minLength: 9, maxLength: 9 },
  { code: "AU", name: "Australia", dialCode: "+61", placeholder: "9 digits (e.g. 412345678)", minLength: 9, maxLength: 9 },
  { code: "CA", name: "Canada", dialCode: "+1", placeholder: "10-digit number", minLength: 10, maxLength: 10 },
  { code: "DE", name: "Germany", dialCode: "+49", placeholder: "10–11 digits", minLength: 10, maxLength: 11 },
  { code: "FR", name: "France", dialCode: "+33", placeholder: "9 digits (e.g. 612345678)", minLength: 9, maxLength: 9 },
  { code: "SG", name: "Singapore", dialCode: "+65", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "PK", name: "Pakistan", dialCode: "+92", placeholder: "10 digits (e.g. 3001234567)", minLength: 10, maxLength: 10 },
  { code: "BD", name: "Bangladesh", dialCode: "+880", placeholder: "10 digits (e.g. 1712345678)", minLength: 10, maxLength: 10 },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "ZA", name: "South Africa", dialCode: "+27", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "NG", name: "Nigeria", dialCode: "+234", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "KE", name: "Kenya", dialCode: "+254", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "EG", name: "Egypt", dialCode: "+20", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "CN", name: "China", dialCode: "+86", placeholder: "11 digits", minLength: 11, maxLength: 11 },
  { code: "JP", name: "Japan", dialCode: "+81", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "KR", name: "South Korea", dialCode: "+82", placeholder: "9–10 digits", minLength: 9, maxLength: 10 },
  { code: "BR", name: "Brazil", dialCode: "+55", placeholder: "10–11 digits", minLength: 10, maxLength: 11 },
  { code: "MX", name: "Mexico", dialCode: "+52", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "NL", name: "Netherlands", dialCode: "+31", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "ES", name: "Spain", dialCode: "+34", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "IT", name: "Italy", dialCode: "+39", placeholder: "9–10 digits", minLength: 9, maxLength: 10 },
  { code: "PH", name: "Philippines", dialCode: "+63", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "MY", name: "Malaysia", dialCode: "+60", placeholder: "9–10 digits", minLength: 9, maxLength: 10 },
  { code: "ID", name: "Indonesia", dialCode: "+62", placeholder: "9–12 digits", minLength: 9, maxLength: 12 },
  { code: "TH", name: "Thailand", dialCode: "+66", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "VN", name: "Vietnam", dialCode: "+84", placeholder: "9–10 digits", minLength: 9, maxLength: 10 },
  { code: "PL", name: "Poland", dialCode: "+48", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "TR", name: "Turkey", dialCode: "+90", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "RU", name: "Russia", dialCode: "+7", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "UA", name: "Ukraine", dialCode: "+380", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "IL", name: "Israel", dialCode: "+972", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "NZ", name: "New Zealand", dialCode: "+64", placeholder: "9–10 digits", minLength: 9, maxLength: 10 },
  { code: "IE", name: "Ireland", dialCode: "+353", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "PT", name: "Portugal", dialCode: "+351", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "GR", name: "Greece", dialCode: "+30", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "RO", name: "Romania", dialCode: "+40", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "HU", name: "Hungary", dialCode: "+36", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "SE", name: "Sweden", dialCode: "+46", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "NO", name: "Norway", dialCode: "+47", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "DK", name: "Denmark", dialCode: "+45", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "FI", name: "Finland", dialCode: "+358", placeholder: "9–10 digits", minLength: 9, maxLength: 10 },
  { code: "CH", name: "Switzerland", dialCode: "+41", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "AT", name: "Austria", dialCode: "+43", placeholder: "10–13 digits", minLength: 10, maxLength: 13 },
  { code: "BE", name: "Belgium", dialCode: "+32", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "AR", name: "Argentina", dialCode: "+54", placeholder: "10–11 digits", minLength: 10, maxLength: 11 },
  { code: "CL", name: "Chile", dialCode: "+56", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "CO", name: "Colombia", dialCode: "+57", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "PE", name: "Peru", dialCode: "+51", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "HK", name: "Hong Kong", dialCode: "+852", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "TW", name: "Taiwan", dialCode: "+886", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "AF", name: "Afghanistan", dialCode: "+93", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "NP", name: "Nepal", dialCode: "+977", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "IQ", name: "Iraq", dialCode: "+964", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "IR", name: "Iran", dialCode: "+98", placeholder: "10 digits", minLength: 10, maxLength: 10 },
  { code: "QA", name: "Qatar", dialCode: "+974", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "KW", name: "Kuwait", dialCode: "+965", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "BH", name: "Bahrain", dialCode: "+973", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "OM", name: "Oman", dialCode: "+968", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "JO", name: "Jordan", dialCode: "+962", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "LB", name: "Lebanon", dialCode: "+961", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "SY", name: "Syria", dialCode: "+963", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "YE", name: "Yemen", dialCode: "+967", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "ET", name: "Ethiopia", dialCode: "+251", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "GH", name: "Ghana", dialCode: "+233", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "TZ", name: "Tanzania", dialCode: "+255", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "UG", name: "Uganda", dialCode: "+256", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "MA", name: "Morocco", dialCode: "+212", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "DZ", name: "Algeria", dialCode: "+213", placeholder: "9 digits", minLength: 9, maxLength: 9 },
  { code: "TN", name: "Tunisia", dialCode: "+216", placeholder: "8 digits", minLength: 8, maxLength: 8 },
  { code: "OTHER", name: "Other", dialCode: "", placeholder: "Full number with + (e.g. +441234567890)", minLength: 10, maxLength: 15, validate: (n) => /^\+?\d{10,15}$/.test(n.replace(/\s/g, "")) },
].sort((a, b) => a.name.localeCompare(b.name));

/** Default country code for dropdown (e.g. India). */
export const DEFAULT_COUNTRY_CODE = "IN";

export function getCountryRuleByCode(code: string): CountryPhoneRule {
  const rule = COUNTRY_PHONE_RULES.find((r) => r.code === code);
  return rule ?? COUNTRY_PHONE_RULES.find((r) => r.code === "OTHER")!;
}
