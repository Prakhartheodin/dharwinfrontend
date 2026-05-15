import type { DocumentResource } from "./resource.types";

export type Address = {
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type PersonalInfoSlice = {
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  shortBio: string;
  degree: string;
  designation: string;
  visaType: string;
  customVisaType: string;
  sevisId: string;
  ead: string;
  supervisorName: string;
  supervisorContact: string;
  supervisorCountryCode: string;
  salaryRange: string;
  password: string;
  companyAssignedEmail: string;
  companyEmailProvider: "" | "gmail" | "outlook" | "unknown";
  address: Address;
  profilePicture?: {
    url?: string;
    key?: string;
    originalName?: string;
    size?: number;
    mimeType?: string;
  };
  profilePictureFile?: File | null;
  profilePictureRemoved: boolean;
  socialLinks: Array<{ id: string | number; platform: string; url: string }>;
};

export type Education = {
  id: string | number;
  degree: string;
  institute: string;
  location: string;
  startYear: string;
  endYear: string;
  description: string;
};

export type Skill = {
  id: string | number;
  name: string;
  level: string;
  category?: string;
};

export type QualificationSlice = {
  educations: Education[];
  skills: Skill[];
};

export type Experience = {
  id: string | number;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
};

export type ExperienceSlice = {
  experiences: Experience[];
};

export type DocumentsSlice = {
  documents: DocumentResource[];
};

export type SalarySlip = {
  id: string | number;
  month: string;
  year: string;
  resource: DocumentResource;
};

export type SalarySlice = {
  salarySlips: SalarySlip[];
};

export type WorkforceFormState = {
  personalInfo: PersonalInfoSlice;
  qualification: QualificationSlice;
  experience: ExperienceSlice;
  documents: DocumentsSlice;
  salary: SalarySlice;
};

export type NormalizedWorkforce = {
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  shortBio: string;
  degree: string;
  designation: string;
  visaType: string;
  customVisaType: string;
  sevisId: string;
  ead: string;
  supervisorName: string;
  supervisorContact: string;
  supervisorCountryCode: string;
  salaryRange: string;
  password?: string;
  companyAssignedEmail?: string;
  companyEmailProvider?: string;
  address: Address;
  profilePicture?: PersonalInfoSlice["profilePicture"];
  socialLinks: Array<{ platform: string; url: string }>;
  qualifications: Array<Omit<Education, "id">>;
  experiences: Array<Omit<Experience, "id">>;
  skills: Array<Omit<Skill, "id">>;
  documents: Array<{
    type?: string;
    label: string;
    url: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }>;
  salarySlips: Array<{
    month: string;
    year: string;
    documentUrl: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
  }>;
};
