/** Canonical workbook contract — keep in sync with backend `candidateExcelContract.js`. */
export const CANDIDATE_EXCEL_SHEETS = {
  details: "Employee Details",
  personal: "Employee Details",
  visa: "Visa and IDs",
  supervisor: "Supervisor and salary",
  address: "Address",
  social: "Social Links",
  skills: "Skills",
  qualification: "Qualifications",
  qualifications: "Qualifications",
  workExperience: "Experience",
  experience: "Experience",
  documents: "Documents",
  salarySlips: "Salary Slips",
} as const;

export const EMPLOYEE_EXCEL_IDENTITY_HEADERS = ["Employee ID", "Full Name", "Email"] as const;

export const EMPLOYEE_DETAILS_HEADERS = [
  "Employee ID",
  "Full Name",
  "Email",
  "Password",
  "Phone Number",
  "Country Code",
  "Owner",
  "Owner Email",
  "Admin",
  "Admin Email",
  "Assigned Agent Name",
  "Assigned Agent Email",
  "Designation",
  "Position",
  "Compensation Status",
  "Employment Status",
  "Profile Completion %",
  "Profile Status",
  "Short Bio",
  "SEVIS ID",
  "EAD",
  "Degree",
  "Visa Type",
  "Custom Visa Type",
  "Supervisor Name",
  "Supervisor Contact",
  "Supervisor Country Code",
  "Salary Range",
  "Street Address",
  "Street Address 2",
  "City",
  "State",
  "Zip Code",
  "Country",
  "Created At",
  "Updated At",
] as const;

export const SAMPLE_IMPORT_PASSWORD = "Welcome1A";

function detailsSample(overrides: Record<string, string>): string[] {
  const row = EMPLOYEE_DETAILS_HEADERS.map(() => "");
  const set = (header: (typeof EMPLOYEE_DETAILS_HEADERS)[number], value: string) => {
    row[EMPLOYEE_DETAILS_HEADERS.indexOf(header)] = value;
  };
  set("Password", SAMPLE_IMPORT_PASSWORD);
  set("Country Code", "US");
  Object.entries(overrides).forEach(([header, value]) => {
    const idx = EMPLOYEE_DETAILS_HEADERS.indexOf(header as (typeof EMPLOYEE_DETAILS_HEADERS)[number]);
    if (idx >= 0) row[idx] = value;
  });
  return row;
}

/**
 * Build and download the employee Excel import template.
 * Sheet names and headers match live export so a round-trip import works.
 */
export async function downloadCandidateExcelTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const details = [
    [...EMPLOYEE_DETAILS_HEADERS],
    detailsSample({
      "Employee ID": "",
      "Full Name": "John Doe",
      Email: "john.doe@example.com",
      "Phone Number": "2025551234",
      "Country Code": "US",
      "Short Bio": "Experienced software developer",
      "SEVIS ID": "SEVIS123456",
      EAD: "EAD789012",
      Degree: "Master of Computer Science",
      "Visa Type": "F-1",
      "Supervisor Name": "Dr. Sarah Johnson",
      "Supervisor Contact": "2025551234",
      "Supervisor Country Code": "US",
      "Salary Range": "$80,000 - $100,000",
      "Street Address": "123 Main St",
      "Street Address 2": "Apt 4B",
      City: "New York",
      State: "NY",
      "Zip Code": "10001",
      Country: "United States",
    }),
    detailsSample({
      "Full Name": "Jane Smith",
      Email: "jane.smith@example.com",
      "Phone Number": "9876543211",
      "Country Code": "IN",
      "Short Bio": "Data scientist with ML expertise",
      "SEVIS ID": "SEVIS123457",
      EAD: "EAD789013",
      Degree: "PhD in Data Science",
      "Visa Type": "H-1B",
      "Supervisor Name": "Dr. Michael Brown",
      "Supervisor Contact": "9876543210",
      "Supervisor Country Code": "IN",
      "Salary Range": "$90,000 - $120,000",
      "Street Address": "456 Oak Ave",
      City: "San Francisco",
      State: "CA",
      "Zip Code": "94102",
      Country: "United States",
    }),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(details), CANDIDATE_EXCEL_SHEETS.details);

  const qualifications = [
    [...EMPLOYEE_EXCEL_IDENTITY_HEADERS, "Degree", "Institute", "Location", "Start Year", "End Year", "Description"],
    ["", "John Doe", "john.doe@example.com", "Master of Computer Science", "University of Technology", "New York, USA", "2020", "2022", "Specialized in Software Engineering"],
    ["", "Jane Smith", "jane.smith@example.com", "PhD in Data Science", "MIT", "Massachusetts, USA", "2018", "2022", "Research in machine learning algorithms"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(qualifications), CANDIDATE_EXCEL_SHEETS.qualifications);

  const experience = [
    [...EMPLOYEE_EXCEL_IDENTITY_HEADERS, "Company", "Role", "Start Date", "End Date", "Currently Working", "Description"],
    ["", "John Doe", "john.doe@example.com", "Tech Solutions Inc", "Senior Software Developer", "2022-01-15", "2024-01-15", "No", "Led development of web applications"],
    ["", "Jane Smith", "jane.smith@example.com", "AI Research Lab", "Data Scientist", "2022-03-01", "", "Yes", "Developing machine learning models"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(experience), CANDIDATE_EXCEL_SHEETS.experience);

  const skills = [
    [...EMPLOYEE_EXCEL_IDENTITY_HEADERS, "Skill Name", "Level", "Category"],
    ["", "John Doe", "john.doe@example.com", "JavaScript", "Expert", "Programming Languages"],
    ["", "Jane Smith", "jane.smith@example.com", "Python", "Expert", "Programming Languages"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(skills), CANDIDATE_EXCEL_SHEETS.skills);

  const social = [
    [...EMPLOYEE_EXCEL_IDENTITY_HEADERS, "Platform", "URL"],
    ["", "John Doe", "john.doe@example.com", "LinkedIn", "https://linkedin.com/in/john-doe"],
    ["", "Jane Smith", "jane.smith@example.com", "LinkedIn", "https://linkedin.com/in/jane-smith"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(social), CANDIDATE_EXCEL_SHEETS.social);

  const documents = [
    [...EMPLOYEE_EXCEL_IDENTITY_HEADERS, "Document Name", "Document Type", "Upload Status", "Mime Type", "Note"],
    ["", "John Doe", "john.doe@example.com", "Resume", "Resume", "", "", "files not included"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(documents), CANDIDATE_EXCEL_SHEETS.documents);

  const slips = [
    [...EMPLOYEE_EXCEL_IDENTITY_HEADERS, "Month", "Year"],
    ["", "John Doe", "john.doe@example.com", "March", "2026"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(slips), CANDIDATE_EXCEL_SHEETS.salarySlips);

  const fileName = `Employee_Import_Template_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
