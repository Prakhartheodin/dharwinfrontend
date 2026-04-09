/** Sheet names for multi-tab candidate import (keep in sync with parsers). */
export const CANDIDATE_EXCEL_SHEETS = {
  personal: "Personal Info",
  visa: "Visa and IDs",
  supervisor: "Supervisor and salary",
  address: "Address",
  social: "Social Links",
  skills: "Skills",
  qualification: "Qualification",
  workExperience: "Work Experience",
} as const;

/**
 * Build and download the candidate Excel import template.
 * Used by the candidates list page (Excel → Template) and the add-candidate form (Excel import mode).
 * Personal fields are split across tabs so each sheet stays readable (linked by FullName).
 */
export async function downloadCandidateExcelTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const personalInfoData = [
    ["FullName", "Email", "CountryCode", "PhoneNumber", "Password", "ShortBio"],
    ["John Doe", "john.doe@example.com", "US", "9876543210", "password123", "Experienced software developer"],
    ["Jane Smith", "jane.smith@example.com", "IN", "9876543211", "password123", "Data scientist with ML expertise"],
  ];
  const personalInfoSheet = XLSX.utils.aoa_to_sheet(personalInfoData);
  XLSX.utils.book_append_sheet(workbook, personalInfoSheet, CANDIDATE_EXCEL_SHEETS.personal);

  const visaData = [
    ["FullName", "SevisId", "Ead", "Degree", "VisaType", "CustomVisaType"],
    ["John Doe", "SEVIS123456", "EAD789012", "Master of Computer Science", "F-1", ""],
    ["Jane Smith", "SEVIS123457", "EAD789013", "PhD in Data Science", "H-1B", ""],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(visaData), CANDIDATE_EXCEL_SHEETS.visa);

  const supervisorData = [
    ["FullName", "SupervisorName", "SupervisorContact", "SupervisorCountryCode", "SalaryRange"],
    ["John Doe", "Dr. Sarah Johnson", "9876543210", "US", "$80,000 - $100,000"],
    ["Jane Smith", "Dr. Michael Brown", "9876543210", "US", "$90,000 - $120,000"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(supervisorData), CANDIDATE_EXCEL_SHEETS.supervisor);

  const addressData = [
    ["FullName", "StreetAddress", "StreetAddress2", "City", "State", "ZipCode", "Country"],
    ["John Doe", "123 Main St", "Apt 4B", "New York", "NY", "10001", "United States"],
    ["Jane Smith", "456 Oak Ave", "", "San Francisco", "CA", "94102", "United States"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(addressData), CANDIDATE_EXCEL_SHEETS.address);

  const socialLinksData = [
    ["FullName", "Platform", "URL"],
    ["John Doe", "LinkedIn", "https://linkedin.com/in/john-doe"],
    ["John Doe", "GitHub", "https://github.com/john-doe"],
    ["Jane Smith", "LinkedIn", "https://linkedin.com/in/jane-smith"],
    ["Jane Smith", "Portfolio", "https://janesmith.dev"],
  ];
  const socialLinksSheet = XLSX.utils.aoa_to_sheet(socialLinksData);
  XLSX.utils.book_append_sheet(workbook, socialLinksSheet, CANDIDATE_EXCEL_SHEETS.social);

  const skillsData = [
    ["FullName", "SkillName", "Level", "Category"],
    ["John Doe", "JavaScript", "Expert", "Programming Languages"],
    ["John Doe", "React", "Advanced", "Frontend Frameworks"],
    ["John Doe", "Node.js", "Advanced", "Backend Technologies"],
    ["Jane Smith", "Python", "Expert", "Programming Languages"],
    ["Jane Smith", "TensorFlow", "Advanced", "Machine Learning"],
    ["Jane Smith", "SQL", "Intermediate", "Database"],
  ];
  const skillsSheet = XLSX.utils.aoa_to_sheet(skillsData);
  XLSX.utils.book_append_sheet(workbook, skillsSheet, CANDIDATE_EXCEL_SHEETS.skills);

  const qualificationData = [
    ["FullName", "Degree", "Institute", "Location", "StartYear", "EndYear", "Description"],
    ["John Doe", "Master of Computer Science", "University of Technology", "New York, USA", "2020", "2022", "Specialized in Software Engineering"],
    ["John Doe", "Bachelor of Computer Science", "State University", "California, USA", "2016", "2020", "Graduated with honors"],
    ["Jane Smith", "PhD in Data Science", "MIT", "Massachusetts, USA", "2018", "2022", "Research in machine learning algorithms"],
    ["Jane Smith", "Master of Statistics", "Stanford University", "California, USA", "2016", "2018", "Focus on statistical modeling"],
  ];
  const qualificationSheet = XLSX.utils.aoa_to_sheet(qualificationData);
  XLSX.utils.book_append_sheet(workbook, qualificationSheet, CANDIDATE_EXCEL_SHEETS.qualification);

  const workExperienceData = [
    ["FullName", "Company", "Role", "StartDate", "EndDate", "Description", "CurrentlyWorking"],
    ["John Doe", "Tech Solutions Inc", "Senior Software Developer", "2022-01-15", "2024-01-15", "Led development of web applications using React and Node.js", "false"],
    ["John Doe", "StartupXYZ", "Full Stack Developer", "2020-06-01", "2021-12-31", "Developed and maintained web applications", "false"],
    ["Jane Smith", "AI Research Lab", "Data Scientist", "2022-03-01", "", "Developing machine learning models for predictive analytics", "true"],
    ["Jane Smith", "DataCorp", "Junior Data Analyst", "2020-01-01", "2022-02-28", "Analyzed large datasets and created reports", "false"],
  ];
  const workExperienceSheet = XLSX.utils.aoa_to_sheet(workExperienceData);
  XLSX.utils.book_append_sheet(workbook, workExperienceSheet, CANDIDATE_EXCEL_SHEETS.workExperience);

  const fileName = `Candidate_Import_Template_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
