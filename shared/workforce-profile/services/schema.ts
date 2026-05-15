import type {
  WorkforceFormState,
  PersonalInfoSlice,
  QualificationSlice,
  ExperienceSlice,
  DocumentsSlice,
  SalarySlice,
} from "../types/workforce.types";

export const emptyPersonalInfo = (): PersonalInfoSlice => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  countryCode: "IN",
  shortBio: "",
  degree: "",
  designation: "",
  visaType: "",
  customVisaType: "",
  sevisId: "",
  ead: "",
  supervisorName: "",
  supervisorContact: "",
  supervisorCountryCode: "",
  salaryRange: "",
  password: "",
  companyAssignedEmail: "",
  companyEmailProvider: "",
  address: {
    streetAddress: "",
    streetAddress2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  },
  profilePicture: undefined,
  profilePictureFile: null,
  profilePictureRemoved: false,
  socialLinks: [],
});

export const emptyQualification = (): QualificationSlice => ({
  educations: [],
  skills: [],
});

export const emptyExperience = (): ExperienceSlice => ({
  experiences: [],
});

export const emptyDocuments = (): DocumentsSlice => ({
  documents: [],
});

export const emptySalary = (): SalarySlice => ({
  salarySlips: [],
});

export const emptyWorkforceFormState = (): WorkforceFormState => ({
  personalInfo: emptyPersonalInfo(),
  qualification: emptyQualification(),
  experience: emptyExperience(),
  documents: emptyDocuments(),
  salary: emptySalary(),
});
