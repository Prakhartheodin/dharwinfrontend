/**
 * Country-specific payroll field definitions, as data.
 *
 * The form component renders from this and nothing else, so adding a country means
 * adding an entry here plus a Joi branch on the backend — not a second form.
 *
 * The regexes mirror uat.dharwin.backend/src/constants/payrollCountries.js. They are
 * duplicated across the two repos deliberately: the backend copy returns the 400 and
 * is the authority, this copy exists for inline feedback before submit. Change one,
 * change the other.
 */

export type PayrollCountry = "US" | "IN";

export interface FieldSpec {
  id: string;
  label: string;
  type: "text" | "select";
  required: boolean;
  /** Tested against the trimmed, optionally uppercased value. */
  pattern?: RegExp;
  patternMessage?: string;
  /** Persistent helper text below the input — not a placeholder. */
  help?: string;
  /** Rendered as a masked input with a show/hide toggle, and never logged. */
  sensitive?: boolean;
  /** Uppercase before validating and before sending (IFSC, PAN, state code). */
  uppercase?: boolean;
  maxLength?: number;
  /** Numeric keypad on mobile. */
  numeric?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface SectionSpec {
  id: string;
  title: string;
  description?: string;
  fields: FieldSpec[];
}

/** Field ids whose "yes"/"no" select value must be sent as a boolean. */
export const BOOLEAN_FIELDS = new Set<string>(["hasExistingUan"]);

const accountHolderName: FieldSpec = {
  id: "accountHolderName",
  label: "Account holder name",
  type: "text",
  required: true,
  maxLength: 120,
  help: "Exactly as printed on the bank account. A mismatch is the most common cause of a failed salary credit.",
};

const bankName: FieldSpec = {
  id: "bankName",
  label: "Bank name",
  type: "text",
  required: true,
  maxLength: 120,
};

export const PAYROLL_SPEC: Record<PayrollCountry, SectionSpec[]> = {
  US: [
    {
      id: "bank",
      title: "Bank & direct deposit",
      description: "Used to pay you. These details go to payroll only.",
      fields: [
        accountHolderName,
        bankName,
        {
          id: "accountType",
          label: "Account type",
          type: "select",
          required: true,
          options: [
            { value: "checking", label: "Checking" },
            { value: "savings", label: "Savings" },
          ],
        },
        {
          id: "routingNumber",
          label: "Routing number (ABA)",
          type: "text",
          required: true,
          numeric: true,
          maxLength: 9,
          pattern: /^[0-9]{9}$/,
          patternMessage: "Routing number must be exactly 9 digits",
          help: "The nine digits printed at the bottom left of a cheque.",
        },
        {
          id: "accountNumber",
          label: "Account number",
          type: "text",
          required: true,
          numeric: true,
          sensitive: true,
          maxLength: 17,
          pattern: /^[0-9]{1,17}$/,
          patternMessage: "Account number must be 1–17 digits",
        },
      ],
    },
    {
      id: "tax",
      title: "Federal tax withholding (Form W-4)",
      description:
        "Determines how much federal income tax is withheld from your pay. You can change these at any time.",
      fields: [
        {
          id: "ssnStatus",
          label: "Social Security Number status",
          type: "select",
          required: true,
          options: [
            { value: "provided", label: "I have an SSN" },
            { value: "pending", label: "Applied for — not received yet" },
            { value: "itin", label: "I have an ITIN instead" },
          ],
          help: "Payroll cannot run without an SSN, but you can submit this form before yours arrives.",
        },
        {
          id: "ssn",
          label: "Social Security Number",
          type: "text",
          required: false,
          sensitive: true,
          maxLength: 11,
          pattern: /^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$/,
          patternMessage: "SSN must be 9 digits",
        },
        {
          id: "filingStatus",
          label: "Filing status (Step 1c)",
          type: "select",
          required: true,
          options: [
            { value: "single_or_married_separately", label: "Single or Married filing separately" },
            {
              value: "married_jointly_or_surviving_spouse",
              label: "Married filing jointly or Qualifying surviving spouse",
            },
            { value: "head_of_household", label: "Head of household" },
          ],
        },
        {
          id: "workState",
          label: "State you will work in",
          type: "text",
          required: false,
          uppercase: true,
          maxLength: 2,
          pattern: /^[A-Z]{2}$/,
          patternMessage: "Use the two-letter state code (e.g. TX)",
          help: "Most states require their own withholding certificate in addition to the federal W-4. HR will send it if yours does.",
        },
      ],
    },
    {
      id: "statutory",
      title: "Employment eligibility (Form I-9)",
      description:
        "Federal law requires Form I-9 to be completed within three business days of your start date. HR will confirm which of your uploaded documents satisfy it — there is nothing to enter here.",
      fields: [],
    },
  ],
  IN: [
    {
      id: "bank",
      title: "Bank details",
      description: "Used to pay you. These details go to payroll only.",
      fields: [
        accountHolderName,
        bankName,
        {
          id: "accountType",
          label: "Account type",
          type: "select",
          required: true,
          options: [
            { value: "savings", label: "Savings" },
            { value: "current", label: "Current" },
          ],
        },
        {
          id: "ifsc",
          label: "IFSC code",
          type: "text",
          required: true,
          uppercase: true,
          maxLength: 11,
          pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
          patternMessage: "IFSC must be 4 letters, then 0, then 6 letters or digits (e.g. HDFC0001234)",
          help: "Printed on your cheque book and passbook.",
        },
        {
          id: "branchName",
          label: "Branch name",
          type: "text",
          required: false,
          maxLength: 120,
        },
        {
          id: "accountNumber",
          label: "Account number",
          type: "text",
          required: true,
          numeric: true,
          sensitive: true,
          maxLength: 18,
          pattern: /^[0-9]{9,18}$/,
          patternMessage: "Account number must be 9–18 digits",
        },
      ],
    },
    {
      id: "tax",
      title: "Tax details",
      fields: [
        {
          id: "pan",
          label: "PAN",
          type: "text",
          required: true,
          sensitive: true,
          uppercase: true,
          maxLength: 10,
          pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
          patternMessage: "PAN must be 5 letters, 4 digits, then 1 letter (e.g. ABCDE1234F)",
          help: "Required for TDS. Without it, tax is deducted at the higher default rate.",
        },
        {
          id: "taxRegime",
          label: "Tax regime",
          type: "select",
          required: true,
          options: [
            { value: "new", label: "New regime" },
            { value: "old", label: "Old regime (with deductions)" },
          ],
          help: "You can change this at the start of a financial year.",
        },
      ],
    },
    {
      id: "statutory",
      title: "Provident fund & statutory",
      description:
        "PF and ESI applicability are worked out from your offer — you do not need to declare them.",
      fields: [
        {
          id: "hasExistingUan",
          label: "Do you already have a UAN?",
          type: "select",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No / not sure" },
          ],
          help: "A UAN is issued once and stays with you across employers.",
        },
        {
          id: "uan",
          label: "UAN",
          type: "text",
          required: false,
          sensitive: true,
          numeric: true,
          maxLength: 12,
          pattern: /^[0-9]{12}$/,
          patternMessage: "UAN must be 12 digits",
        },
        {
          id: "aadhaar",
          label: "Aadhaar number (optional)",
          type: "text",
          required: false,
          sensitive: true,
          numeric: true,
          maxLength: 12,
          pattern: /^[2-9][0-9]{11}$/,
          patternMessage: "Aadhaar must be 12 digits",
          help: "Optional. Asked only because EPFO requires an Aadhaar-seeded UAN to process your PF. You can leave this blank.",
        },
      ],
    },
  ],
};

export const allFields = (country: PayrollCountry): FieldSpec[] =>
  PAYROLL_SPEC[country].flatMap((section) => section.fields);

/** Returns an error message, or null when the value is acceptable. */
export function validateField(spec: FieldSpec, raw: string): string | null {
  const value = spec.uppercase ? String(raw ?? "").trim().toUpperCase() : String(raw ?? "").trim();
  if (!value) return spec.required ? `${spec.label} is required` : null;
  if (spec.maxLength && value.length > spec.maxLength) {
    return `${spec.label} must be ${spec.maxLength} characters or fewer`;
  }
  if (spec.pattern && !spec.pattern.test(value)) {
    return spec.patternMessage || `${spec.label} is not in the expected format`;
  }
  return null;
}
