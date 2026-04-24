/**
 * Country phone config: dial code, validation regex, placeholder, max length.
 * Digits are validated after stripping non-digits with .replace(/\D/g, "").
 */
export interface PhoneCountryConfig {
  code: string;
  dialCode: string;
  label: string;
  /** Regex to test digits only (no + or spaces) */
  regex: RegExp;
  placeholder: string;
  maxLength: number;
  errorMessage: string;
}

export const PHONE_COUNTRIES: PhoneCountryConfig[] = [
  { code: "AF", dialCode: "+93", label: "🇦🇫 Afghanistan +93", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Afghan phone number" },
  { code: "AL", dialCode: "+355", label: "🇦🇱 Albania +355", regex: /^[2-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Albanian phone number" },
  { code: "DZ", dialCode: "+213", label: "🇩🇿 Algeria +213", regex: /^[5-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Algerian phone number" },
  { code: "AR", dialCode: "+54", label: "🇦🇷 Argentina +54", regex: /^[2-9]\d{9}$/, placeholder: "10 digits", maxLength: 10, errorMessage: "Enter a valid Argentine phone number" },
  { code: "AU", dialCode: "+61", label: "🇦🇺 Australia +61", regex: /^[2-4789]\d{8}$/, placeholder: "9 digits (no leading 0)", maxLength: 9, errorMessage: "Enter a valid Australian phone number" },
  { code: "AT", dialCode: "+43", label: "🇦🇹 Austria +43", regex: /^[1-9]\d{9,10}$/, placeholder: "10-11 digits", maxLength: 11, errorMessage: "Enter a valid Austrian phone number" },
  { code: "BH", dialCode: "+973", label: "🇧🇭 Bahrain +973", regex: /^[3-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Bahraini phone number" },
  { code: "BD", dialCode: "+880", label: "🇧🇩 Bangladesh +880", regex: /^1[3-9]\d{8}$/, placeholder: "10 digits", maxLength: 10, errorMessage: "Enter a valid Bangladeshi mobile" },
  { code: "BE", dialCode: "+32", label: "🇧🇪 Belgium +32", regex: /^[4-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Belgian phone number" },
  { code: "BR", dialCode: "+55", label: "🇧🇷 Brazil +55", regex: /^[1-9]\d{9,10}$/, placeholder: "10-11 digits", maxLength: 11, errorMessage: "Enter a valid Brazilian phone number" },
  { code: "BG", dialCode: "+359", label: "🇧🇬 Bulgaria +359", regex: /^[2-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Bulgarian phone number" },
  { code: "CA", dialCode: "+1", label: "🇨🇦 Canada +1", regex: /^\d{10}$/, placeholder: "10-digit number", maxLength: 10, errorMessage: "Enter a valid 10-digit Canadian phone number" },
  { code: "CL", dialCode: "+56", label: "🇨🇱 Chile +56", regex: /^9\d{8}$/, placeholder: "9 digits (starts with 9)", maxLength: 9, errorMessage: "Enter a valid Chilean mobile" },
  { code: "CN", dialCode: "+86", label: "🇨🇳 China +86", regex: /^1[3-9]\d{9}$/, placeholder: "11 digits", maxLength: 11, errorMessage: "Enter a valid Chinese mobile" },
  { code: "CO", dialCode: "+57", label: "🇨🇴 Colombia +57", regex: /^3\d{9}$/, placeholder: "10 digits (starts with 3)", maxLength: 10, errorMessage: "Enter a valid Colombian mobile" },
  { code: "CZ", dialCode: "+420", label: "🇨🇿 Czech Republic +420", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Czech phone number" },
  { code: "DK", dialCode: "+45", label: "🇩🇰 Denmark +45", regex: /^\d{8}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Danish phone number" },
  { code: "EG", dialCode: "+20", label: "🇪🇬 Egypt +20", regex: /^1[0-2]\d{8}$/, placeholder: "10 digits", maxLength: 10, errorMessage: "Enter a valid Egyptian mobile" },
  { code: "ET", dialCode: "+251", label: "🇪🇹 Ethiopia +251", regex: /^9\d{8}$/, placeholder: "9 digits (starts with 9)", maxLength: 9, errorMessage: "Enter a valid Ethiopian mobile" },
  { code: "FI", dialCode: "+358", label: "🇫🇮 Finland +358", regex: /^[4-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Finnish phone number" },
  { code: "FR", dialCode: "+33", label: "🇫🇷 France +33", regex: /^[1-9]\d{8}$/, placeholder: "9 digits (no leading 0)", maxLength: 9, errorMessage: "Enter a valid French phone number" },
  { code: "DE", dialCode: "+49", label: "🇩🇪 Germany +49", regex: /^[1-9]\d{9,11}$/, placeholder: "10-12 digits", maxLength: 12, errorMessage: "Enter a valid German phone number" },
  { code: "GH", dialCode: "+233", label: "🇬🇭 Ghana +233", regex: /^[2-5]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Ghanaian phone number" },
  { code: "GR", dialCode: "+30", label: "🇬🇷 Greece +30", regex: /^6\d{9}$/, placeholder: "10 digits (starts with 6)", maxLength: 10, errorMessage: "Enter a valid Greek mobile" },
  { code: "HK", dialCode: "+852", label: "🇭🇰 Hong Kong +852", regex: /^[5-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Hong Kong phone number" },
  { code: "HU", dialCode: "+36", label: "🇭🇺 Hungary +36", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Hungarian phone number" },
  { code: "IN", dialCode: "+91", label: "🇮🇳 India +91", regex: /^[6-9]\d{9}$/, placeholder: "10-digit mobile", maxLength: 10, errorMessage: "Enter a valid 10-digit Indian mobile (starts with 6-9)" },
  { code: "ID", dialCode: "+62", label: "🇮🇩 Indonesia +62", regex: /^8\d{9,10}$/, placeholder: "10-11 digits (starts with 8)", maxLength: 11, errorMessage: "Enter a valid Indonesian mobile" },
  { code: "IR", dialCode: "+98", label: "🇮🇷 Iran +98", regex: /^9\d{9}$/, placeholder: "10 digits (starts with 9)", maxLength: 10, errorMessage: "Enter a valid Iranian mobile" },
  { code: "IQ", dialCode: "+964", label: "🇮🇶 Iraq +964", regex: /^7[3-9]\d{8}$/, placeholder: "10 digits", maxLength: 10, errorMessage: "Enter a valid Iraqi mobile" },
  { code: "IE", dialCode: "+353", label: "🇮🇪 Ireland +353", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Irish phone number" },
  { code: "IL", dialCode: "+972", label: "🇮🇱 Israel +972", regex: /^5\d{8}$/, placeholder: "9 digits (starts with 5)", maxLength: 9, errorMessage: "Enter a valid Israeli mobile" },
  { code: "IT", dialCode: "+39", label: "🇮🇹 Italy +39", regex: /^3\d{8,9}$/, placeholder: "9-10 digits", maxLength: 10, errorMessage: "Enter a valid Italian mobile" },
  { code: "JP", dialCode: "+81", label: "🇯🇵 Japan +81", regex: /^[1-9]\d{8,9}$/, placeholder: "9-10 digits", maxLength: 10, errorMessage: "Enter a valid Japanese phone number" },
  { code: "JO", dialCode: "+962", label: "🇯🇴 Jordan +962", regex: /^7[5-9]\d{7}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Jordanian mobile" },
  { code: "KE", dialCode: "+254", label: "🇰🇪 Kenya +254", regex: /^7\d{8}$/, placeholder: "9 digits (starts with 7)", maxLength: 9, errorMessage: "Enter a valid Kenyan mobile" },
  { code: "KW", dialCode: "+965", label: "🇰🇼 Kuwait +965", regex: /^[569]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Kuwaiti phone number" },
  { code: "LB", dialCode: "+961", label: "🇱🇧 Lebanon +961", regex: /^[3-9]\d{6}$/, placeholder: "7 digits", maxLength: 7, errorMessage: "Enter a valid Lebanese phone number" },
  { code: "MY", dialCode: "+60", label: "🇲🇾 Malaysia +60", regex: /^1[0-9]\d{7,8}$/, placeholder: "9-10 digits", maxLength: 10, errorMessage: "Enter a valid Malaysian phone number" },
  { code: "MX", dialCode: "+52", label: "🇲🇽 Mexico +52", regex: /^1\d{9}$/, placeholder: "10 digits (starts with 1)", maxLength: 10, errorMessage: "Enter a valid Mexican mobile" },
  { code: "MA", dialCode: "+212", label: "🇲🇦 Morocco +212", regex: /^[5-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Moroccan phone number" },
  { code: "NP", dialCode: "+977", label: "🇳🇵 Nepal +977", regex: /^9[7-8]\d{8}$/, placeholder: "10 digits", maxLength: 10, errorMessage: "Enter a valid Nepalese mobile" },
  { code: "NL", dialCode: "+31", label: "🇳🇱 Netherlands +31", regex: /^[1-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Dutch phone number" },
  { code: "NZ", dialCode: "+64", label: "🇳🇿 New Zealand +64", regex: /^[2-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid New Zealand phone number" },
  { code: "NG", dialCode: "+234", label: "🇳🇬 Nigeria +234", regex: /^[7-9]\d{9}$/, placeholder: "10 digits", maxLength: 10, errorMessage: "Enter a valid Nigerian mobile" },
  { code: "NO", dialCode: "+47", label: "🇳🇴 Norway +47", regex: /^[4-9]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Norwegian phone number" },
  { code: "OM", dialCode: "+968", label: "🇴🇲 Oman +968", regex: /^[79]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Omani mobile" },
  { code: "PK", dialCode: "+92", label: "🇵🇰 Pakistan +92", regex: /^3\d{9}$/, placeholder: "10 digits (starts with 3)", maxLength: 10, errorMessage: "Enter a valid 10-digit Pakistani mobile" },
  { code: "PH", dialCode: "+63", label: "🇵🇭 Philippines +63", regex: /^9\d{9}$/, placeholder: "10 digits (starts with 9)", maxLength: 10, errorMessage: "Enter a valid 10-digit Philippine mobile" },
  { code: "PL", dialCode: "+48", label: "🇵🇱 Poland +48", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Polish phone number" },
  { code: "PT", dialCode: "+351", label: "🇵🇹 Portugal +351", regex: /^9[1-6]\d{7}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Portuguese mobile" },
  { code: "QA", dialCode: "+974", label: "🇶🇦 Qatar +974", regex: /^[3-7]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid Qatari phone number" },
  { code: "RO", dialCode: "+40", label: "🇷🇴 Romania +40", regex: /^7\d{8}$/, placeholder: "9 digits (starts with 7)", maxLength: 9, errorMessage: "Enter a valid Romanian mobile" },
  { code: "RU", dialCode: "+7", label: "🇷🇺 Russia +7", regex: /^9\d{9}$/, placeholder: "10 digits (starts with 9)", maxLength: 10, errorMessage: "Enter a valid Russian mobile" },
  { code: "SA", dialCode: "+966", label: "🇸🇦 Saudi Arabia +966", regex: /^5\d{8}$/, placeholder: "9 digits (starts with 5)", maxLength: 9, errorMessage: "Enter a valid Saudi mobile" },
  { code: "SG", dialCode: "+65", label: "🇸🇬 Singapore +65", regex: /^[689]\d{7}$/, placeholder: "8 digits", maxLength: 8, errorMessage: "Enter a valid 8-digit Singapore number" },
  { code: "ZA", dialCode: "+27", label: "🇿🇦 South Africa +27", regex: /^[6-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid South African mobile" },
  { code: "KR", dialCode: "+82", label: "🇰🇷 South Korea +82", regex: /^[1-9]\d{8,9}$/, placeholder: "9-10 digits", maxLength: 10, errorMessage: "Enter a valid South Korean phone number" },
  { code: "ES", dialCode: "+34", label: "🇪🇸 Spain +34", regex: /^[6-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Spanish mobile" },
  { code: "LK", dialCode: "+94", label: "🇱🇰 Sri Lanka +94", regex: /^7\d{8}$/, placeholder: "9 digits (starts with 7)", maxLength: 9, errorMessage: "Enter a valid Sri Lankan mobile" },
  { code: "SE", dialCode: "+46", label: "🇸🇪 Sweden +46", regex: /^7\d{8}$/, placeholder: "9 digits (starts with 7)", maxLength: 9, errorMessage: "Enter a valid Swedish mobile" },
  { code: "CH", dialCode: "+41", label: "🇨🇭 Switzerland +41", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Swiss phone number" },
  { code: "TW", dialCode: "+886", label: "🇹🇼 Taiwan +886", regex: /^9\d{8}$/, placeholder: "9 digits (starts with 9)", maxLength: 9, errorMessage: "Enter a valid Taiwanese mobile" },
  { code: "TH", dialCode: "+66", label: "🇹🇭 Thailand +66", regex: /^[6-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Thai mobile" },
  { code: "TR", dialCode: "+90", label: "🇹🇷 Turkey +90", regex: /^5\d{9}$/, placeholder: "10 digits (starts with 5)", maxLength: 10, errorMessage: "Enter a valid Turkish mobile" },
  { code: "AE", dialCode: "+971", label: "🇦🇪 UAE +971", regex: /^[2-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid UAE phone number" },
  { code: "GB", dialCode: "+44", label: "🇬🇧 UK +44", regex: /^[1-9]\d{9,10}$/, placeholder: "10-11 digits (no leading 0)", maxLength: 11, errorMessage: "Enter a valid UK phone number (10-11 digits)" },
  { code: "UA", dialCode: "+380", label: "🇺🇦 Ukraine +380", regex: /^[3-9]\d{8}$/, placeholder: "9 digits", maxLength: 9, errorMessage: "Enter a valid Ukrainian mobile" },
  { code: "US", dialCode: "+1", label: "🇺🇸 US +1", regex: /^\d{10}$/, placeholder: "10-digit number", maxLength: 10, errorMessage: "Enter a valid 10-digit US phone number" },
  { code: "VN", dialCode: "+84", label: "🇻🇳 Vietnam +84", regex: /^9\d{8}$/, placeholder: "9 digits (starts with 9)", maxLength: 9, errorMessage: "Enter a valid Vietnamese mobile" },
];

const byCode = new Map(PHONE_COUNTRIES.map((c) => [c.code, c]));

/** When country is unknown, prefer a neutral default (avoids wrong India +91 for US/international users). */
export const DEFAULT_PHONE_COUNTRY = "US" as const;

export function getPhoneCountry(code: string): PhoneCountryConfig {
  return byCode.get(code) || byCode.get(DEFAULT_PHONE_COUNTRY)!;
}

export function validatePhoneByCountry(phone: string, countryCode: string): boolean {
  const digits = (phone || "").replace(/\D/g, "");
  const config = getPhoneCountry(countryCode);
  return config.regex.test(digits);
}

export function getPhoneValidationError(phone: string, countryCode: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "Phone number is required.";
  const config = getPhoneCountry(countryCode);
  return config.regex.test(digits) ? null : config.errorMessage;
}

/** Returns dial code without + for building full phone (e.g. "91" for India). */
export function getDialCodeForApi(countryCode: string): string {
  const config = byCode.get(countryCode);
  return config ? config.dialCode.replace("+", "") : "";
}

/** Build full phone for API: +919876543210 */
export function formatPhoneForApi(digits: string, countryCode: string): string {
  const dial = getDialCodeForApi(countryCode);
  return dial ? `+${dial}${digits}` : digits;
}
