"use client"
import React, { useState } from "react";
import Select, { Props as SelectProps } from 'react-select';
import { Selectoption4 } from '@/shared/data/pages/candidates/skillsdata';
import { createCandidate, updateCandidate, updateMyCandidate, uploadDocuments, importCandidatesFromExcel } from "@/shared/lib/api/candidates";
import { getPhoneCountry, getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import { useEffect } from "react";

// Wizard Component
const Wizard = ({ step: currentIndex, onChange, onSubmit, children, validateStep, stepValidationErrors, canNavigateToStep }: any) => {
  const steps = React.Children.toArray(children) as React.ReactElement[];
  const prevStep = currentIndex !== 0 && (steps[currentIndex - 1] as any).props;
  const nextStep = currentIndex !== steps.length - 1 && (steps[currentIndex + 1] as any).props;

  const handleNext = () => {
    if (validateStep && !validateStep(currentIndex)) {
      return; // Don't proceed if validation fails
    }
    onChange(currentIndex + 1);
  };

  const handleStepClick = (targetStep: number) => {
    if (canNavigateToStep && !canNavigateToStep(targetStep)) {
      return; // Don't allow navigation if step is not accessible
    }
    onChange(targetStep);
  };

  return (
    <div>
      <nav className="btn-group steps basicsteps">
        {steps.map((step: any, index: number) => {
          const isDisabled = index === currentIndex || (canNavigateToStep && !canNavigateToStep(index));
          return (
            <Button
              key={index}
              onClick={() => handleStepClick(index)}
              className={getClsNavBtn(index === currentIndex, isDisabled)}
              disabled={isDisabled}
            >
              {step.props.title}
            </Button>
          );
        })}
      </nav>

      {steps[currentIndex]}

      <div className="p-3 flex justify-between border-t border-dashed border-defaultborder dark:border-defaultborder/10">
        <Button
          visible={prevStep}
          onClick={() => onChange(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          Back
        </Button>

        {currentIndex === steps.length - 1 ? (
          <button
            type="button"
            onClick={onSubmit}
            className="ti-btn bg-green-600 text-white !py-2 !px-4 !rounded-md"
          >
            Submit
          </button>
        ) : (
          <Button
            visible={nextStep}
            onClick={handleNext}
            disabled={currentIndex === steps.length - 1}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

const Step = ({ children }: any) => children;

function getClsNavBtn(active: boolean, disabled: boolean = false) {
  let className = "btn";
  if (active) className += " active";
  if (disabled) className += " disabled";
  return className;
}

function Button({ visible = true, disabled, ...props }: any) {
  if (!visible) return null;
  return (
    <button
      className="ti-btn ti-btn-primary-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled}
      {...props}
    />
  );
}

// Function to get clickable document thumbnail for supported file types (JPG, JPEG, PNG, PDF)
const getFileThumbnail = (file: File) => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const fileUrl = URL.createObjectURL(file);
  
  // Image files (JPG, JPEG, PNG) - show actual image
  if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer"
        title="Click to view image"
      >
        <img 
          src={fileUrl} 
          alt="Document Preview" 
          className="w-full h-full object-cover"
        />
      </a>
    );
  }
  
  // PDF files - show PDF preview
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
        title="Click to view PDF"
      >
        <iframe
          src={fileUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'}
          className="w-full h-full border-0 pointer-events-none"
          title="PDF Preview"
          onError={(e) => {
            // Fallback to PDF icon if iframe fails
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="w-full h-full bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
          <div className="text-center">
            <i className="ri-file-pdf-line text-2xl text-red-600 dark:text-red-400 mb-1"></i>
            <div className="text-xs text-red-600 dark:text-red-400">PDF</div>
          </div>
        </div>
      </a>
    );
  }
  
  // Unsupported file type - show generic file icon
  return (
    <div className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm">
      <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
          <div className="text-xs text-gray-600 dark:text-gray-400">FILE</div>
        </div>
      </div>
    </div>
  );
};

// Function to get clickable document thumbnail for existing files (JPG, JPEG, PNG, PDF only)
const getExistingFileThumbnail = (url: string, label: string) => {
  // Append token to API endpoint URLs for direct browser access
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isApiEndpoint = url && (url.includes('/candidates/documents/') || url.includes('/download'));
  const finalUrl = isApiEndpoint && token && !url.includes('?token=') ? `${url}?token=${token}` : url;
  
  const fileName = url.toLowerCase();
  const docLabel = (label || '').toLowerCase();
  
  // PDF files - show PDF preview
  if (fileName.includes('.pdf') || docLabel.includes('pdf')) {
    return (
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
        title="Click to view PDF"
      >
        <iframe
          src={finalUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'}
          className="w-full h-full border-0 pointer-events-none"
          title="PDF Preview"
          onError={(e) => {
            // Fallback to PDF icon if iframe fails
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="w-full h-full bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
          <div className="text-center">
            <i className="ri-file-pdf-line text-2xl text-red-600 dark:text-red-400 mb-1"></i>
            <div className="text-xs text-red-600 dark:text-red-400">PDF</div>
          </div>
        </div>
      </a>
    );
  }
  
  // Image files (JPG, JPEG, PNG) - show actual image
  if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png')) {
    return (
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
        title="Click to view image"
      >
        <img 
          src={finalUrl} 
          alt="Document Preview" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to image icon if image fails to load
            e.currentTarget.style.display = 'none';
            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
            if (nextElement) {
              nextElement.style.display = 'flex';
            }
          }}
        />
        <div className="w-full h-full bg-gray-50 dark:bg-gray-700 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
          <div className="text-center">
            <i className="ri-image-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
            <div className="text-xs text-gray-600 dark:text-gray-400">IMG</div>
          </div>
        </div>
      </a>
    );
  }
  
  // Unsupported file type - show generic file icon
  return (
    <div className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm">
      <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
          <div className="text-xs text-gray-600 dark:text-gray-400">FILE</div>
        </div>
      </div>
    </div>
  );
};

/** Current user id as string for adminId (backend requires string ObjectId when role is "user"). */
function getAdminIdString(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    const id = user?.id ?? user?._id;
    if (id == null) return null;
    const s = String(id).trim();
    return s.length ? s : null;
  } catch {
    return null;
  }
}

export const Basicwizard = ({
  initialData,
  initialExcelMode,
  returnToCandidatesOnBack,
}: {
  initialData?: any;
  initialExcelMode?: boolean;
  returnToCandidatesOnBack?: boolean;
}) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Security check for edit permissions
  useEffect(() => {
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      
      // If editing existing data, check permissions
      if (initialData) {
        // Admin can edit any profile
        if (user.role === 'admin') {
          return; // Allow access
        }
        
        // Regular users can only edit their own profile
        if (user.role === 'user' && String(user.id) !== String(initialData.owner)) {
          Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You can only edit your own profile.',
            confirmButtonText: 'OK'
          }).then(() => {
            router.push(ROUTES.candidateProfile);
          });
          return;
        }
      }
    }
  }, [initialData, router]);

  const [formData, setFormData] = useState({ 
    fullName: "", email: "", phoneNumber: "", countryCode: "IN", shortBio: "", sevisId: "", ead: "", degree: "", supervisorName: "", supervisorContact: "", supervisorCountryCode: "IN", visaType: "", customVisaType: "", salaryRange: "", streetAddress: "", streetAddress2: "", city: "", state: "", zipCode: "", country: "", password: "",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>("");
  const [profilePictureRemoved, setProfilePictureRemoved] = useState<boolean>(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear individual field error when user starts typing
    clearFieldError(e.target.name);
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type - only allow JPEG, JPG, PNG
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['jpeg', 'jpg', 'png'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Format',
          text: 'Please select a valid image file. Only JPEG, JPG, and PNG formats are allowed.',
          confirmButtonText: 'OK'
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'Please select an image smaller than 5MB',
          confirmButtonText: 'OK'
        });
        return;
      }
      
      setProfilePicture(file);
      setProfilePictureRemoved(false); // Reset removed flag when new picture is selected
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ------------------------------- State: Education -------------------------------

  const [educations, setEducations] = useState([
    { degree: "", institute: "", location: "", startYear: "", endYear: "", description: "" },
  ]);

  const handleAddEducation = () => {
    setEducations([
      ...educations,
      { degree: "", institute: "", location: "", startYear: "", endYear: "", description: "" },
    ]);
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const newEducations = [...educations];
    (newEducations[index] as any)[field] = value;
    setEducations(newEducations);
  };

  // ------------------------------- State: Work Experience -------------------------------

  const [experiences, setExperiences] = useState([
    { company: "", role: "", startDate: "", endDate: "", description: "", currentlyWorking: false },
  ]);

  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      { company: "", role: "", startDate: "", endDate: "", description: "", currentlyWorking: false },
    ]);
  };

  const handleExpChange = (index: number, field: string, value: string | boolean) => {
    const newExperiences = [...experiences];
    (newExperiences[index] as any)[field] = value;
    setExperiences(newExperiences);
  };

  // ------------------------------- State: Skills -------------------------------

  const [skills, setSkills] = useState<{id: number, name: string, level: string}[]>([]);

  // ------------------------------- State: Social Links -------------------------------

  const [socialLinks, setSocialLinks] = useState<{id: number, platform: string, url: string}[]>([]);

  const handleAddSkill = () => {
    setSkills([
      ...skills,
      { id: Date.now(), name: "", level: "Beginner" },
    ]);
  };

  const handleSkillChange = (index: number, field: string, value: string) => {
    const newSkills = [...skills];
    (newSkills[index] as any)[field] = value;
    setSkills(newSkills);
  };

  const handleAddSocialLink = () => {
    setSocialLinks([
      ...socialLinks,
      { id: Date.now(), platform: "", url: "" },
    ]);
    // Clear social links error when adding a new link
    clearFieldError('socialLinks');
  };

  const handleSocialLinkChange = (index: number, field: string, value: string) => {
    const newSocialLinks = [...socialLinks];
    (newSocialLinks[index] as any)[field] = value;
    setSocialLinks(newSocialLinks);
    // Clear social links error when user starts typing
    clearFieldError('socialLinks');
  };

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
    // Clear social links error when removing a link
    clearFieldError('socialLinks');
  };

  // ------------------------------- Salary Slips Handlers -------------------------------
  const handleAddSalarySlip = () => {
    setSalarySlips([
      ...salarySlips,
      { id: Date.now(), month: "", year: "", file: null, documentUrl: "" },
    ]);
  };

  const handleSalarySlipChange = (index: number, field: string, value: string | File | null) => {
    const newSalarySlips = [...salarySlips];
    (newSalarySlips[index] as any)[field] = value;
    setSalarySlips(newSalarySlips);
  };

  // Function to validate duplicate month/year combinations
  const validateSalarySlipDuplicates = (slips: any[]) => {
    const combinations = new Set();
    const duplicates: number[] = [];
    
    slips.forEach((slip, index) => {
      if (slip.month && slip.year) {
        const combination = `${slip.month}_${slip.year}`;
        if (combinations.has(combination)) {
          duplicates.push(index);
        } else {
          combinations.add(combination);
        }
      }
    });
    
    return duplicates;
  };

  // ------------------------------- State: Documents -------------------------------

  const [documentsList, setDocumentsList] = useState<{id: number, name: string, customName: string, file: File | null}[]>([]);

  const [existingDocs, setExistingDocs] = useState<{ label: string; url: string }[]>([]);

  const [documents, setDocuments] = useState<{
    cv?: File;
    marksheets?: File;
    certificates?: File;
    experienceLetters?: File;
    other?: File;
  }>({});

  // ------------------------------- State: Salary Slips -------------------------------
  const [salarySlips, setSalarySlips] = useState<{id: number, month: string, year: string, file: File | null, documentUrl: string}[]>([]);
  const [existingSalarySlips, setExistingSalarySlips] = useState<{ month: string; year: string; documentUrl: string }[]>([]);

  // ------------------------------- Step Control -------------------------------
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------- Excel Import State -------------------------------
  const [excelImportMode, setExcelImportMode] = useState(!!initialExcelMode);
  
  // Disable Excel import mode when editing existing candidates; apply initialExcelMode from URL
  useEffect(() => {
    if (initialData) {
      setExcelImportMode(false);
    } else if (initialExcelMode) {
      setExcelImportMode(true);
    }
  }, [initialData, initialExcelMode]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelImportProgress, setExcelImportProgress] = useState<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }>({ total: 0, processed: 0, successful: 0, failed: 0, errors: [] });
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ------------------------------- Validation State -------------------------------
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [stepValidationErrors, setStepValidationErrors] = useState<{[key: number]: string[]}>({});

  // ------------------------------- Validation Functions -------------------------------
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string, countryCode: string = "IN"): boolean => {
    const digits = (phone || "").replace(/\D/g, "");
    return getPhoneCountry(countryCode).regex.test(digits);
  };

  const validateURL = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateRequired = (value: string): boolean => {
    return value.trim() !== '';
  };

  const validateYearRange = (startYear: string, endYear: string): boolean => {
    if (!startYear || !endYear) return true; // Allow empty values, they'll be caught by required validation
    const start = parseInt(startYear);
    const end = parseInt(endYear);
    return start <= end;
  };

  const validateDateRange = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return true; // Allow empty values, they'll be caught by required validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  };

  const validateNotFutureDate = (date: string): boolean => {
    if (!date) return true; // Allow empty values, they'll be caught by required validation
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
    return inputDate <= today;
  };

  // Generate year options from 2000 to current year
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2000; year--) {
      years.push(year);
    }
    return years;
  };

  const validateStep = (stepIndex: number): boolean => {
    const errors: string[] = [];
    const newFieldErrors: {[key: string]: string} = {};
    
    switch (stepIndex) {
      case 0: // Personal Info
        if (!validateRequired(formData.fullName)) {
          errors.push('Full Name is required');
          newFieldErrors['fullName'] = 'Full Name is required';
        }
        if (!validateRequired(formData.email)) {
          errors.push('Email is required');
          newFieldErrors['email'] = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          errors.push('Please enter a valid email address');
          newFieldErrors['email'] = 'Please enter a valid email address';
        }
        if (!validateRequired(formData.phoneNumber)) {
          errors.push('Phone Number is required');
          newFieldErrors['phoneNumber'] = 'Phone Number is required';
        } else if (!validatePhone(formData.phoneNumber, formData.countryCode)) {
          const msg = getPhoneValidationError(formData.phoneNumber, formData.countryCode) || "Please enter a valid phone number";
          errors.push(msg);
          newFieldErrors['phoneNumber'] = msg;
        }
        if (!validateRequired(formData.visaType)) {
          errors.push('Visa Type is required');
          newFieldErrors['visaType'] = 'Visa Type is required';
        }
        if (formData.supervisorContact && !validatePhone(formData.supervisorContact, formData.supervisorCountryCode || formData.countryCode)) {
          const msg = getPhoneValidationError(formData.supervisorContact, formData.supervisorCountryCode || formData.countryCode) || "Please enter a valid supervisor phone number";
          errors.push(msg);
          newFieldErrors['supervisorContact'] = msg;
        }
        if (formData.visaType === "Other" && !validateRequired(formData.customVisaType)) {
          errors.push('Custom visa type is required when "Other" is selected');
          newFieldErrors['customVisaType'] = 'Custom visa type is required when "Other" is selected';
        }
        if (!initialData && !validateRequired(formData.password)) {
          errors.push('Password is required');
          newFieldErrors['password'] = 'Password is required';
        }
        // Validate address fields
        if (!validateRequired(formData.streetAddress)) {
          errors.push('Street Address is required');
          newFieldErrors['streetAddress'] = 'Street Address is required';
        }
        if (!validateRequired(formData.city)) {
          errors.push('City is required');
          newFieldErrors['city'] = 'City is required';
        }
        if (!validateRequired(formData.state)) {
          errors.push('State is required');
          newFieldErrors['state'] = 'State is required';
        }
        if (!validateRequired(formData.zipCode)) {
          errors.push('ZIP Code is required');
          newFieldErrors['zipCode'] = 'ZIP Code is required';
        }
        if (!validateRequired(formData.country)) {
          errors.push('Country is required');
          newFieldErrors['country'] = 'Country is required';
        }
        if (!validateRequired(formData.salaryRange)) {
          errors.push('Salary Range is required');
          newFieldErrors['salaryRange'] = 'Salary Range is required';
        }
        // Validate social links - at least one entry is required
        const validSocialLinks = socialLinks.filter(link => 
          validateRequired(link.platform) && validateRequired(link.url) && validateURL(link.url)
        );
        if (validSocialLinks.length === 0) {
          errors.push('At least one social link is required');
          newFieldErrors['socialLinks'] = 'At least one social link is required';
        }
        break;
        
      case 1: // Qualification
        const validEducations = educations.filter(edu => 
          validateRequired(edu.degree) && validateRequired(edu.institute) && validateRequired(edu.location) && validateRequired(edu.startYear) && validateRequired(edu.endYear)
        );
        if (validEducations.length === 0) {
          errors.push('education required');
          newFieldErrors['education'] = 'education required';
        }
        // Validate year ranges for all educations
        const invalidYearRanges = educations.filter(edu => 
          edu.startYear && edu.endYear && !validateYearRange(edu.startYear, edu.endYear)
        );
        if (invalidYearRanges.length > 0) {
          errors.push('Start year cannot be ahead of end year');
          newFieldErrors['education'] = 'Start year cannot be ahead of end year';
        }
        const validSkills = skills.filter(skill => validateRequired(skill.name));
        if (validSkills.length === 0) {
          errors.push('skill is required');
          newFieldErrors['skills'] = 'skill is required';
        }
        break;
        
      case 2: // Work Experience
        const validExperiences = experiences.filter(exp => 
          validateRequired(exp.company) && validateRequired(exp.role) && validateRequired(exp.startDate) && 
          (exp.currentlyWorking || validateRequired(exp.endDate))
        );
        if (validExperiences.length === 0) {
          errors.push('work experience required');
          newFieldErrors['experience'] = 'work experience required';
        }
        // Validate date ranges for all experiences
        const invalidDateRanges = experiences.filter(exp => 
          exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate)
        );
        if (invalidDateRanges.length > 0) {
          errors.push('Start date cannot be ahead of end date');
          newFieldErrors['experience'] = 'Start date cannot be ahead of end date';
        }
        // Validate that end dates are not in the future
        const futureEndDates = experiences.filter(exp => 
          exp.endDate && !validateNotFutureDate(exp.endDate)
        );
        if (futureEndDates.length > 0) {
          errors.push('End date cannot be in the future');
          newFieldErrors['experience'] = 'End date cannot be in the future';
        }
        break;
        
      case 3: // Documents (Optional)
        // Documents are now optional, no validation required
        break;
        
      case 4: // Salary Slips (Optional)
          const validSalarySlips = salarySlips.filter(slip => 
            validateRequired(slip.month) && validateRequired(slip.year) && (slip.file || slip.documentUrl)
          );
          const hasDuplicates = validateSalarySlipDuplicates(salarySlips).length > 0;
          
          // Only validate duplicates if salary slips are provided
          if (hasDuplicates) {
            errors.push('Duplicate month/year combinations found');
            newFieldErrors['salarySlips'] = 'Duplicate month/year combinations found';
          }

        break;
    }
    
    setStepValidationErrors(prev => ({ ...prev, [stepIndex]: errors }));
    setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
    return errors.length === 0;
  };

  const clearValidationErrors = () => {
    setFieldErrors({});
    setStepValidationErrors({});
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // ------------------------------- Excel Template and Import Functions -------------------------------
  const downloadCSVTemplate = () => {
    const csvHeaders = [
      'FullName',
      'Email', 
      'PhoneNumber',
      'Password',
      'ShortBio',
      'SevisId',
      'Ead',
      'Degree',
      'SupervisorName',
      'SupervisorContact',
      'Qualifications',
      'Experiences',
      'Skills',
      'SocialLinks'
    ];

    const csvData = [
      csvHeaders.join(','),
      'John Doe,john.doe@example.com,9876543210,password123,Experienced software developer,SEVIS123456,EAD789012,Master of Computer Science,Dr. Sarah Johnson,9876543210,"Master of Computer Science|University of Technology|New York USA|2020|2022|Specialized in Software Engineering;Bachelor of Computer Science|State University|California USA|2016|2020|Graduated with honors","Tech Solutions Inc|Senior Software Developer|2022-01-15|2024-01-15|Led development of web applications;StartupXYZ|Full Stack Developer|2020-06-01|2021-12-31|Developed and maintained web applications","JavaScript|Expert|Programming Languages;React|Advanced|Frontend Frameworks;Node.js|Advanced|Backend Technologies","LinkedIn|https://linkedin.com/in/john-doe;GitHub|https://github.com/john-doe"',
      'Jane Smith,jane.smith@example.com,9876543211,password123,Data scientist with ML expertise,SEVIS123457,EAD789013,PhD in Data Science,Dr. Michael Brown,9876543210,"PhD in Data Science|MIT|Massachusetts USA|2018|2022|Research in machine learning algorithms;Master of Statistics|Stanford University|California USA|2016|2018|Focus on statistical modeling","AI Research Lab|Data Scientist|2022-03-01||Developing machine learning models;DataCorp|Junior Data Analyst|2020-01-01|2022-02-28|Analyzed large datasets","Python|Expert|Programming Languages;TensorFlow|Advanced|Machine Learning;SQL|Intermediate|Database","LinkedIn|https://linkedin.com/in/jane-smith;Portfolio|https://janesmith.dev"'
    ];

    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Candidate_Import_Template_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    try {
      // Dynamic import of xlsx library
      const XLSX = await import('xlsx');
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // 1. Personal Info Sheet
      const personalInfoData = [
        ['FullName', 'Email', 'CountryCode', 'PhoneNumber', 'Password', 'ShortBio', 'SevisId', 'Ead', 'Degree', 'VisaType', 'SupervisorName', 'SupervisorContact', 'SalaryRange', 'StreetAddress', 'StreetAddress2', 'City', 'State', 'ZipCode', 'Country'],
        ['John Doe', 'john.doe@example.com', 'US', '9876543210', 'password123', 'Experienced software developer', 'SEVIS123456', 'EAD789012', 'Master of Computer Science', 'F-1', 'Dr. Sarah Johnson', '9876543210', '$80,000 - $100,000', '123 Main St', 'Apt 4B', 'New York', 'NY', '10001', 'United States'],
        ['Jane Smith', 'jane.smith@example.com', 'IN', '9876543211', 'password123', 'Data scientist with ML expertise', 'SEVIS123457', 'EAD789013', 'PhD in Data Science', 'H-1B', 'Dr. Michael Brown', '9876543210', '$90,000 - $120,000', '456 Oak Ave', '', 'San Francisco', 'CA', '94102', 'United States']
      ];
      const personalInfoSheet = XLSX.utils.aoa_to_sheet(personalInfoData);
      XLSX.utils.book_append_sheet(workbook, personalInfoSheet, 'Personal Info');
      
      // 2. Social Links Sheet
      const socialLinksData = [
        ['FullName', 'Platform', 'URL'],
        ['John Doe', 'LinkedIn', 'https://linkedin.com/in/john-doe'],
        ['John Doe', 'GitHub', 'https://github.com/john-doe'],
        ['Jane Smith', 'LinkedIn', 'https://linkedin.com/in/jane-smith'],
        ['Jane Smith', 'Portfolio', 'https://janesmith.dev']
      ];
      const socialLinksSheet = XLSX.utils.aoa_to_sheet(socialLinksData);
      XLSX.utils.book_append_sheet(workbook, socialLinksSheet, 'Social Links');
      
      // 3. Skills Sheet
      const skillsData = [
        ['FullName', 'SkillName', 'Level', 'Category'],
        ['John Doe', 'JavaScript', 'Expert', 'Programming Languages'],
        ['John Doe', 'React', 'Advanced', 'Frontend Frameworks'],
        ['John Doe', 'Node.js', 'Advanced', 'Backend Technologies'],
        ['Jane Smith', 'Python', 'Expert', 'Programming Languages'],
        ['Jane Smith', 'TensorFlow', 'Advanced', 'Machine Learning'],
        ['Jane Smith', 'SQL', 'Intermediate', 'Database']
      ];
      const skillsSheet = XLSX.utils.aoa_to_sheet(skillsData);
      XLSX.utils.book_append_sheet(workbook, skillsSheet, 'Skills');
      
      // 4. Qualification Sheet
      const qualificationData = [
        ['FullName', 'Degree', 'Institute', 'Location', 'StartYear', 'EndYear', 'Description'],
        ['John Doe', 'Master of Computer Science', 'University of Technology', 'New York, USA', '2020', '2022', 'Specialized in Software Engineering'],
        ['John Doe', 'Bachelor of Computer Science', 'State University', 'California, USA', '2016', '2020', 'Graduated with honors'],
        ['Jane Smith', 'PhD in Data Science', 'MIT', 'Massachusetts, USA', '2018', '2022', 'Research in machine learning algorithms'],
        ['Jane Smith', 'Master of Statistics', 'Stanford University', 'California, USA', '2016', '2018', 'Focus on statistical modeling']
      ];
      const qualificationSheet = XLSX.utils.aoa_to_sheet(qualificationData);
      XLSX.utils.book_append_sheet(workbook, qualificationSheet, 'Qualification');
      
      // 5. Work Experience Sheet
      const workExperienceData = [
        ['FullName', 'Company', 'Role', 'StartDate', 'EndDate', 'Description', 'CurrentlyWorking'],
        ['John Doe', 'Tech Solutions Inc', 'Senior Software Developer', '2022-01-15', '2024-01-15', 'Led development of web applications using React and Node.js', 'false'],
        ['John Doe', 'StartupXYZ', 'Full Stack Developer', '2020-06-01', '2021-12-31', 'Developed and maintained web applications', 'false'],
        ['Jane Smith', 'AI Research Lab', 'Data Scientist', '2022-03-01', '', 'Developing machine learning models for predictive analytics', 'true'],
        ['Jane Smith', 'DataCorp', 'Junior Data Analyst', '2020-01-01', '2022-02-28', 'Analyzed large datasets and created reports', 'false']
      ];
      const workExperienceSheet = XLSX.utils.aoa_to_sheet(workExperienceData);
      XLSX.utils.book_append_sheet(workbook, workExperienceSheet, 'Work Experience');
      
      // Generate and download file
      const fileName = `Candidate_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      await Swal.fire({
        icon: 'success',
        title: 'Template Downloaded!',
        text: 'Excel template has been downloaded successfully.',
        confirmButtonText: 'OK'
      });
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Failed to download template. Please install xlsx library: npm install xlsx',
        confirmButtonText: 'OK'
      });
    }
  };

  const parseCSVFile = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const candidates: any[] = [];

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.some(v => v !== '')) {
        const candidate: any = {
          qualifications: [],
          experiences: [],
          skills: [],
          socialLinks: []
        };

        // Map CSV columns to candidate fields
        headers.forEach((header, index) => {
          const value = values[index] || '';
          const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
          
          switch (normalizedHeader) {
            case 'fullname':
              candidate.fullName = value;
              break;
            case 'email':
              candidate.email = value;
              break;
            case 'phonenumber':
              candidate.phoneNumber = value;
              break;
            case 'countrycode':
              candidate.countryCode = value;
              break;
            case 'password':
              candidate.password = value;
              break;
            case 'shortbio':
              candidate.shortBio = value;
              break;
            case 'sevisid':
              candidate.sevisId = value;
              break;
            case 'ead':
              candidate.ead = value;
              break;
            case 'degree':
              candidate.degree = value;
              break;
            case 'supervisorname':
              candidate.supervisorName = value;
              break;
            case 'supervisorcontact':
              candidate.supervisorContact = value;
              break;
            case 'supervisorcountrycode':
              candidate.supervisorCountryCode = value;
              break;
            case 'visatype':
              candidate.visaType = value;
              break;
            case 'customvisatype':
              candidate.customVisaType = value;
              break;
            case 'salaryrange':
              candidate.salaryRange = value;
              break;
            case 'streetaddress':
              candidate.streetAddress = value;
              break;
            case 'streetaddress2':
              candidate.streetAddress2 = value;
              break;
            case 'city':
              candidate.city = value;
              break;
            case 'state':
              candidate.state = value;
              break;
            case 'zipcode':
              candidate.zipCode = value;
              break;
            case 'country':
              candidate.country = value;
              break;
            // Handle array fields from CSV (comma-separated values)
            case 'qualifications':
              if (value) {
                candidate.qualifications = parseArrayField(value, ['degree', 'institute', 'location', 'startYear', 'endYear', 'description']);
              }
              break;
            case 'experiences':
              if (value) {
                candidate.experiences = parseArrayField(value, ['company', 'role', 'startDate', 'endDate', 'description', 'currentlyWorking']);
              }
              break;
            case 'skills':
              if (value) {
                candidate.skills = parseArrayField(value, ['name', 'level', 'category']);
              }
              break;
            case 'sociallinks':
              if (value) {
                candidate.socialLinks = parseArrayField(value, ['platform', 'url']);
              }
              break;
          }
        });

        // Set default values (backend requires adminId to be a string when role is "user")
        const adminIdStr = getAdminIdString();
        if (adminIdStr) {
          candidate.role = 'user';
          candidate.adminId = adminIdStr;
        }

        candidates.push(candidate);
      }
    }

    return candidates;
  };

  const parseArrayField = (value: string, fields: string[]): any[] => {
    // Parse semicolon-separated entries, then pipe-separated fields within each entry
    // Format: "entry1|field1|field2|field3;entry2|field1|field2|field3"
    const entries = value.split(';').filter(entry => entry.trim());
    return entries.map(entry => {
      const values = entry.split('|').map(v => v.trim());
      const obj: any = {};
      fields.forEach((field, index) => {
        obj[field] = values[index] || '';
      });
      return obj;
    });
  };

  const parseMultiSheetExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error('Failed to read file'));
            return;
          }

          // Handle CSV files
          if (file.name.toLowerCase().endsWith('.csv')) {
            try {
              const candidates = parseCSVFile(data.toString());
              resolve(candidates);
              return;
            } catch (error) {
              reject(new Error('Failed to parse CSV file: ' + (error as Error).message));
              return;
            }
          }

          // Dynamic import of xlsx library for Excel files
          import('xlsx').then((XLSX) => {
            try {
              const workbook = XLSX.read(data, { type: 'array' });
              const candidates: any[] = [];
              
              // Get all sheet names
              const sheetNames = workbook.SheetNames;
              
              // Check if required sheets exist
              const requiredSheets = ['Personal Info', 'Social Links', 'Skills', 'Qualification', 'Work Experience'];
              const missingSheets = requiredSheets.filter(sheet => !sheetNames.includes(sheet));
              
              if (missingSheets.length > 0) {
                reject(new Error(`Missing required sheets: ${missingSheets.join(', ')}`));
                return;
              }
              
              // Parse Personal Info sheet to get candidate list
              const personalInfoSheet = workbook.Sheets['Personal Info'];
              const personalInfoData = XLSX.utils.sheet_to_json(personalInfoSheet, { header: 1 });
              
              if (personalInfoData.length < 2) {
                reject(new Error('Personal Info sheet must have at least a header row and one data row'));
                return;
              }
              
              const headers = (personalInfoData[0] as string[]).map(h => h?.toString().trim() || '');
              
              // Process each candidate
              for (let i = 1; i < personalInfoData.length; i++) {
                const row = personalInfoData[i] as any[];
                if (row && row.some(cell => cell !== undefined && cell !== null && cell !== '')) {
                  const candidate: any = {
                    qualifications: [],
                    experiences: [],
                    skills: [],
                    socialLinks: []
                  };
                  
                  // Parse personal info and format like manual form payload
                  let addressData: any = {};
                  let customVisaType = '';
                  
                  headers.forEach((header, index) => {
                    const value = row[index]?.toString().trim() || '';
                    const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
                    
                    switch (normalizedHeader) {
                      case 'fullname':
                        candidate.fullName = value;
                        break;
                      case 'email':
                        candidate.email = value;
                        break;
                      case 'phonenumber':
                        candidate.phoneNumber = value;
                        break;
                      case 'countrycode':
                        candidate.countryCode = value;
                        break;
                      case 'password':
                        candidate.password = value;
                        break;
                      case 'shortbio':
                        candidate.shortBio = value;
                        break;
                      case 'sevisid':
                        candidate.sevisId = value;
                        break;
                      case 'ead':
                        candidate.ead = value;
                        break;
                      case 'degree':
                        candidate.degree = value;
                        break;
                      case 'supervisorname':
                        candidate.supervisorName = value;
                        break;
                      case 'supervisorcontact':
                        candidate.supervisorContact = value;
                        break;
                      case 'supervisorcountrycode':
                        candidate.supervisorCountryCode = value;
                        break;
                      case 'visatype':
                        candidate.visaType = value;
                        break;
                      case 'customvisatype':
                        customVisaType = value;
                        break;
                      case 'salaryrange':
                        candidate.salaryRange = value;
                        break;
                      case 'streetaddress':
                        addressData.streetAddress = value;
                        break;
                      case 'streetaddress2':
                        addressData.streetAddress2 = value;
                        break;
                      case 'city':
                        addressData.city = value;
                        break;
                      case 'state':
                        addressData.state = value;
                        break;
                      case 'zipcode':
                        addressData.zipCode = value;
                        break;
                      case 'country':
                        addressData.country = value;
                        break;
                    }
                  });
                  
                  // Format data exactly like manual form payload (backend requires adminId string when role is "user")
                  const adminIdStr = getAdminIdString();
                  const formattedCandidate = {
                    ...(adminIdStr ? { role: 'user' as const, adminId: adminIdStr } : {}),
                    fullName: candidate.fullName,
                    email: candidate.email,
                    phoneNumber: candidate.phoneNumber,
                    countryCode: candidate.countryCode,
                    shortBio: candidate.shortBio,
                    profilePicture: {}, // Excel import doesn't include profile pictures
                    sevisId: candidate.sevisId,
                    ead: candidate.ead,
                    degree: candidate.degree,
                    supervisorName: candidate.supervisorName,
                    supervisorContact: candidate.supervisorContact,
                    supervisorCountryCode: candidate.supervisorCountryCode,
                    visaType: candidate.visaType,
                    ...(candidate.visaType === "Other" && customVisaType ? { customVisaType: customVisaType } : {}),
                    salaryRange: candidate.salaryRange,
                    address: {
                      streetAddress: addressData.streetAddress || '',
                      streetAddress2: addressData.streetAddress2 || '',
                      city: addressData.city || '',
                      state: addressData.state || '',
                      zipCode: addressData.zipCode || '',
                      country: addressData.country || '',
                    },
                    password: candidate.password,
                    qualifications: candidate.qualifications || [],
                    experiences: candidate.experiences || [],
                    skills: candidate.skills || [],
                    socialLinks: candidate.socialLinks || [],
                    documents: [], // Excel import doesn't include documents
                    salarySlips: [], // Excel import doesn't include salary slips
                  };
                  
                  // Replace the candidate object with formatted version
                  Object.assign(candidate, formattedCandidate);
                  
                  candidates.push(candidate);
                }
              }
              
              // Parse Social Links
              const socialLinksSheet = workbook.Sheets['Social Links'];
              const socialLinksData = XLSX.utils.sheet_to_json(socialLinksSheet, { header: 1 });
              
              for (let i = 1; i < socialLinksData.length; i++) {
                const row = socialLinksData[i] as any[];
                if (row && row.length >= 3) {
                  const fullName = row[0]?.toString().trim();
                  const platform = row[1]?.toString().trim();
                  const url = row[2]?.toString().trim();
                  
                  if (fullName && platform && url) {
                    const candidate = candidates.find(c => c.fullName === fullName);
                    if (candidate) {
                      candidate.socialLinks.push({ platform, url });
                    }
                  }
                }
              }
              
              // Parse Skills
              const skillsSheet = workbook.Sheets['Skills'];
              const skillsData = XLSX.utils.sheet_to_json(skillsSheet, { header: 1 });
              
              for (let i = 1; i < skillsData.length; i++) {
                const row = skillsData[i] as any[];
                if (row && row.length >= 3) {
                  const fullName = row[0]?.toString().trim();
                  const name = row[1]?.toString().trim();
                  const level = row[2]?.toString().trim() || 'Beginner';
                  const category = row[3]?.toString().trim() || '';
                  
                  if (fullName && name) {
                    const candidate = candidates.find(c => c.fullName === fullName);
                    if (candidate) {
                      candidate.skills.push({ name, level, category });
                    }
                  }
                }
              }
              
              // Parse Qualifications
              const qualificationSheet = workbook.Sheets['Qualification'];
              const qualificationData = XLSX.utils.sheet_to_json(qualificationSheet, { header: 1 });
              
              for (let i = 1; i < qualificationData.length; i++) {
                const row = qualificationData[i] as any[];
                if (row && row.length >= 6) {
                  const fullName = row[0]?.toString().trim();
                  const degree = row[1]?.toString().trim();
                  const institute = row[2]?.toString().trim();
                  const location = row[3]?.toString().trim();
                  const startYear = row[4]?.toString().trim();
                  const endYear = row[5]?.toString().trim();
                  const description = row[6]?.toString().trim() || '';
                  
                  if (fullName && degree && institute && location && startYear && endYear) {
                    const candidate = candidates.find(c => c.fullName === fullName);
                    if (candidate) {
                      candidate.qualifications.push({
                        degree,
                        institute,
                        location,
                        startYear: parseInt(startYear),
                        endYear: parseInt(endYear),
                        description
                      });
                    }
                  }
                }
              }
              
              // Parse Work Experience
              const workExperienceSheet = workbook.Sheets['Work Experience'];
              const workExperienceData = XLSX.utils.sheet_to_json(workExperienceSheet, { header: 1 });
              
              for (let i = 1; i < workExperienceData.length; i++) {
                const row = workExperienceData[i] as any[];
                if (row && row.length >= 5) {
                  const fullName = row[0]?.toString().trim();
                  const company = row[1]?.toString().trim();
                  const role = row[2]?.toString().trim();
                  const startDate = row[3]?.toString().trim();
                  const endDate = row[4]?.toString().trim() || '';
                  const description = row[5]?.toString().trim() || '';
                  const currentlyWorking = row[6]?.toString().trim().toLowerCase() === 'true';
                  
                  if (fullName && company && role && startDate) {
                    const candidate = candidates.find(c => c.fullName === fullName);
                    if (candidate) {
                      // Convert Excel serial numbers to YYYY-MM-DD format
                      const convertExcelDateToYYYYMMDD = (excelDate: string | number): string => {
                        if (!excelDate) return '';
                        
                        // If it's already a string in YYYY-MM-DD format, return as is
                        if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
                          return excelDate;
                        }
                        
                        // If it's a number (Excel serial date), convert it
                        if (typeof excelDate === 'number' || !isNaN(Number(excelDate))) {
                          const serialDate = Number(excelDate);
                          // Excel serial date conversion (Excel counts from 1900-01-01)
                          const date = new Date((serialDate - 25569) * 86400 * 1000);
                          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
                        }
                        
                        // If it's a string but not in YYYY-MM-DD format, try to parse it
                        if (typeof excelDate === 'string') {
                          const parsedDate = new Date(excelDate);
                          if (!isNaN(parsedDate.getTime())) {
                            return parsedDate.toISOString().split('T')[0];
                          }
                        }
                        
                        return String(excelDate);
                      };
                      
                      const convertedStartDate = convertExcelDateToYYYYMMDD(startDate);
                      const convertedEndDate = endDate ? convertExcelDateToYYYYMMDD(endDate) : undefined;
                      
                      console.log('Excel Import - Date conversion:', {
                        company,
                        rawStartDate: startDate,
                        rawStartDateType: typeof startDate,
                        convertedStartDate: convertedStartDate,
                        rawEndDate: endDate,
                        rawEndDateType: typeof endDate,
                        convertedEndDate: convertedEndDate
                      });
                      
                      candidate.experiences.push({
                        company,
                        role,
                        startDate: convertedStartDate,
                        endDate: convertedEndDate,
                        description,
                        currentlyWorking
                      });
                    }
                  }
                }
              }
              
              resolve(candidates);
            } catch (error) {
              reject(new Error('Failed to parse Excel file: ' + (error as Error).message));
            }
          }).catch(() => {
            reject(new Error('Excel parsing library not available. Please install xlsx library: npm install xlsx'));
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const validateExcelCandidate = (candidate: any, index: number): { isValid: boolean; error?: string } => {
    if (!candidate.fullName || typeof candidate.fullName !== 'string') {
      return { isValid: false, error: `Candidate ${index + 1}: Full Name is required` };
    }
    
    if (!candidate.email || typeof candidate.email !== 'string') {
      return { isValid: false, error: `Candidate ${index + 1}: Email is required` };
    }
    
    if (!validateEmail(candidate.email)) {
      return { isValid: false, error: `Candidate ${index + 1}: Invalid email format` };
    }
    
    if (!candidate.phoneNumber || typeof candidate.phoneNumber !== 'string') {
      return { isValid: false, error: `Candidate ${index + 1}: Phone Number is required` };
    }
    
    if (!validatePhone(candidate.phoneNumber)) {
      return { isValid: false, error: `Candidate ${index + 1}: Invalid phone number format` };
    }
    
    if (!candidate.password || typeof candidate.password !== 'string') {
      return { isValid: false, error: `Candidate ${index + 1}: Password is required` };
    }
    
    // Validate qualifications
    if (!candidate.qualifications || candidate.qualifications.length === 0) {
      return { isValid: false, error: `Candidate ${index + 1}: At least one qualification is required` };
    }
    
    // Validate experiences
    if (!candidate.experiences || candidate.experiences.length === 0) {
      return { isValid: false, error: `Candidate ${index + 1}: At least one work experience is required` };
    }
    
    // Validate skills
    if (!candidate.skills || candidate.skills.length === 0) {
      return { isValid: false, error: `Candidate ${index + 1}: At least one skill is required` };
    }
    
    // Validate social links
    if (!candidate.socialLinks || candidate.socialLinks.length === 0) {
      return { isValid: false, error: `Candidate ${index + 1}: At least one social link is required` };
    }
    
    return { isValid: true };
  };

  const handleExcelFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Please upload an Excel file (.xlsx, .xls).',
        confirmButtonText: 'OK'
      });
      return;
    }

    setExcelFile(file);
    
    await Swal.fire({
      icon: 'success',
      title: 'File Selected',
      text: `File "${file.name}" is ready for import. Click "Import Excel Data" to proceed.`,
      confirmButtonText: 'OK'
    });
  };

  const handleExcelImport = async () => {
    if (!excelFile) {
      await Swal.fire({
        icon: 'error',
        title: 'No File',
        text: 'Please upload an Excel file first.',
        confirmButtonText: 'OK'
      });
      return;
    }

    setExcelImportLoading(true);
    setExcelImportProgress({ total: 0, processed: 0, successful: 0, failed: 0, errors: [] });

    try {
      const result = await importCandidatesFromExcel(excelFile);
      
      setExcelImportProgress({
        total: result.summary.total,
        processed: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
        errors: result.failed.map(f => `Row ${f.row} (${f.fullName}): ${f.error}`)
      });

      if (result.summary.failed === 0) {
        await Swal.fire({
          icon: 'success',
          title: 'Import Successful',
          text: `Successfully imported ${result.summary.successful} candidates.`,
          confirmButtonText: 'OK'
        });
        router.push("/ats/candidates");
      } else if (result.summary.successful === 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Import Failed',
          html: `All ${result.summary.failed} candidates failed to import.<br><br>Errors:<br>${result.failed.slice(0, 5).map(f => `Row ${f.row}: ${f.error}`).join('<br>')}${result.failed.length > 5 ? '<br>... and more' : ''}`,
          confirmButtonText: 'OK'
        });
      } else {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial Import',
          html: `Imported ${result.summary.successful} candidates successfully.<br>${result.summary.failed} candidates failed.<br><br>First few errors:<br>${result.failed.slice(0, 5).map(f => `Row ${f.row}: ${f.error}`).join('<br>')}${result.failed.length > 5 ? '<br>... and more' : ''}`,
          confirmButtonText: 'OK'
        });
        router.push("/ats/candidates");
      }

      // Reset
      setExcelFile(null);
      setExcelData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Excel import error:', error);
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message 
        || 'Failed to import candidates from Excel.';
      
      const errorDetails = error.response?.data?.failed 
        ? `<br><br>Errors:<br>${error.response.data.failed.slice(0, 5).map((f: any) => `Row ${f.row}: ${f.error}`).join('<br>')}`
        : '';
      
      await Swal.fire({
        icon: 'error',
        title: 'Import Error',
        html: errorMessage + errorDetails,
        confirmButtonText: 'OK'
      });
    } finally {
      setExcelImportLoading(false);
    }
  };

  // ------------------------------- Step Navigation Validation -------------------------------
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Personal Info
        const validSocialLinks = socialLinks.filter(link => 
          validateRequired(link.platform) && validateRequired(link.url) && validateURL(link.url)
        );
        return validateRequired(formData.fullName) && 
               validateRequired(formData.email) && 
               validateEmail(formData.email) &&
               validateRequired(formData.phoneNumber) && 
               validatePhone(formData.phoneNumber, formData.countryCode) &&
               validateRequired(formData.visaType) &&
               (!formData.supervisorContact || validatePhone(formData.supervisorContact, formData.supervisorCountryCode)) &&
               (formData.visaType !== "Other" || validateRequired(formData.customVisaType)) &&
               (initialData || validateRequired(formData.password)) &&
               validateRequired(formData.streetAddress) &&
               validateRequired(formData.city) &&
               validateRequired(formData.state) &&
               validateRequired(formData.zipCode) &&
               validateRequired(formData.country) &&
               validateRequired(formData.salaryRange) &&
               validSocialLinks.length > 0;
               
      case 1: // Qualification
        const validEducations = educations.filter(edu => 
          validateRequired(edu.degree) && validateRequired(edu.institute) && validateRequired(edu.location) && validateRequired(edu.startYear) && validateRequired(edu.endYear)
        );
        const validSkills = skills.filter(skill => validateRequired(skill.name));
        const invalidYearRanges = educations.filter(edu => 
          edu.startYear && edu.endYear && !validateYearRange(edu.startYear, edu.endYear)
        );
        return validEducations.length > 0 && validSkills.length > 0 && invalidYearRanges.length === 0;
        
      case 2: // Work Experience
        const validExperiences = experiences.filter(exp => 
          validateRequired(exp.company) && validateRequired(exp.role) && validateRequired(exp.startDate) && 
          (exp.currentlyWorking || validateRequired(exp.endDate))
        );
        const invalidDateRanges = experiences.filter(exp => 
          exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate)
        );
        const futureEndDates = experiences.filter(exp => 
          exp.endDate && !validateNotFutureDate(exp.endDate)
        );
        return validExperiences.length > 0 && invalidDateRanges.length === 0 && futureEndDates.length === 0;
        
      case 3: // Documents (Optional)
        // Documents are now optional, always return true
        return true;
        
      case 4: // Salary Slips (Optional)
          const validSalarySlips = salarySlips.filter(slip => 
            validateRequired(slip.month) && validateRequired(slip.year) && (slip.file || slip.documentUrl)
          );
          const hasDuplicates = validateSalarySlipDuplicates(salarySlips).length > 0;
          // Only validate duplicates if salary slips are provided, otherwise always return true
          return !hasDuplicates;
        // For non-admin users, this step doesn't exist, so always return true
        return true;
        
      default:
        return false;
    }
  };

  const canNavigateToStep = (targetStep: number): boolean => {
    // Can always go to step 0
    if (targetStep === 0) return true;
    
    // Check if all previous steps are valid
    for (let i = 0; i < targetStep; i++) {
      if (!isStepValid(i)) {
        return false;
      }
    }
    return true;
  };

  // ------------------------------- User Role Check -------------------------------
  const [userRole, setUserRole] = useState<string>('user');
  
  React.useEffect(() => {
    // Get user role from localStorage
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUserRole(parsedUser.role || 'user');
        } catch (error) {
          console.error('Error parsing user data:', error);
          setUserRole('user');
        }
      }
    }
  }, []);

  // ------------------------------- Prefill on Edit -------------------------------
  React.useEffect(() => {
    // Initialize documentsList as empty for new candidates (optional)
    if (!initialData && documentsList.length === 0) {
      setDocumentsList([]);
    }
    
    // Initialize skills with default entry for new candidates
    if (!initialData && skills.length === 0) {
      setSkills([{ id: Date.now(), name: "", level: "Beginner" }]);
    }
    
    // Initialize social links with default entry for new candidates
    if (!initialData && socialLinks.length === 0) {
      setSocialLinks([{ id: Date.now(), platform: "", url: "" }]);
    }
    
    if (!initialData) return;
    try {
      setFormData({
        fullName: initialData.fullName || "",
        email: initialData.email || "",
        phoneNumber: initialData.phoneNumber || "",
        countryCode: initialData.countryCode || "IN",
        shortBio: initialData.shortBio || "",
        sevisId: initialData.sevisId || "",
        ead: initialData.ead || "",
        degree: initialData.degree || "",
        supervisorName: initialData.supervisorName || "",
        supervisorContact: initialData.supervisorContact || "",
        supervisorCountryCode: initialData.supervisorCountryCode || initialData.countryCode || "IN",
        visaType: initialData.visaType || "",
        customVisaType: initialData.customVisaType || "",
        salaryRange: initialData.salaryRange || "",
        streetAddress: initialData.address?.streetAddress || initialData.streetAddress || "",
        streetAddress2: initialData.address?.streetAddress2 || initialData.streetAddress2 || "",
        city: initialData.address?.city || initialData.city || "",
        state: initialData.address?.state || initialData.state || "",
        zipCode: initialData.address?.zipCode || initialData.zipCode || "",
        country: initialData.address?.country || initialData.country || "",
        password: initialData ? "" : "",
      });
      
      // Set profile picture preview if exists
      if (initialData.profilePicture) {
        // Handle both old format (string URL) and new format (object with url property)
        const profilePictureUrl = typeof initialData.profilePicture === 'string' 
          ? initialData.profilePicture 
          : initialData.profilePicture.url;
        setProfilePicturePreview(profilePictureUrl);
        setProfilePictureRemoved(false); // Reset removed flag when loading existing data
      }
      if (Array.isArray(initialData.qualifications) && initialData.qualifications.length) {
        setEducations(initialData.qualifications.map((q: any) => ({
          degree: q.degree || "",
          institute: q.institute || "",
          location: q.location || "",
          startYear: q.startYear ? String(q.startYear) : "",
          endYear: q.endYear ? String(q.endYear) : "",
          description: q.description || "",
        })));
      }
      if (Array.isArray(initialData.experiences) && initialData.experiences.length) {
        setExperiences(initialData.experiences.map((x: any) => ({
          company: x.company || "",
          role: x.role || "",
          startDate: x.startDate ? String(x.startDate).slice(0,10) : "",
          endDate: x.endDate ? String(x.endDate).slice(0,10) : "",
          description: x.description || "",
          currentlyWorking: x.currentlyWorking || false,
        })));
      }
      if (Array.isArray(initialData.documents)) {
        setExistingDocs(initialData.documents.map((d: any) => ({ label: d.label, url: d.url })));
      }
      if (Array.isArray(initialData.salarySlips) && initialData.salarySlips.length) {
        setExistingSalarySlips(initialData.salarySlips.map((s: any) => ({
          month: s.month || "",
          year: s.year || "",
          documentUrl: s.documentUrl || "",
        })));
        // Clear the default blank entry when editing existing profile with salary slips
        setSalarySlips([]);
      }
      if (Array.isArray(initialData.skills) && initialData.skills.length) {
        setSkills(initialData.skills.map((s: any) => ({
          id: Date.now() + Math.random(),
          name: s.name || "",
          level: s.level || "Beginner",
        })));
      }
      if (Array.isArray(initialData.socialLinks) && initialData.socialLinks.length) {
        setSocialLinks(initialData.socialLinks.map((s: any) => ({
          id: Date.now() + Math.random(),
          platform: s.platform || "",
          url: s.url || "",
        })));
      }
    } catch {}
  }, [initialData]);


  // ------------------------------- Handle Final Submission -------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    clearValidationErrors();
    
    // Validate all steps before submission
    let allStepsValid = true;
    for (let i = 0; i < 5; i++) {
      if (!validateStep(i)) {
        allStepsValid = false;
      }
    }
    
    if (!allStepsValid) {
      setError("Please fix all validation errors before submitting");
      setLoading(false);
      return;
    }
    
    try {
      const toYear = (dateStr: string) => {
        if (!dateStr) return undefined as number | undefined;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return undefined;
        return d.getUTCFullYear();
      };

      const DOCUMENT_TYPES = ['Aadhar', 'PAN', 'Bank', 'Passport'] as const;
      // Upload documents using uploadDocuments API
      const uploadedDocs: { 
        type?: string;
        label: string; 
        url: string; 
        key: string; 
        originalName: string; 
        size: number; 
        mimeType: string; 
      }[] = [];
      const documentsToUpload = documentsList.filter(doc => doc.file && doc.name);
      
      if (documentsToUpload.length > 0) {
        const files = documentsToUpload.map(doc => doc.file!);
        const labels = documentsToUpload.map(doc => 
          doc.name === "Other" ? doc.customName : doc.name
        );
        
        try {
          const uploadResponse = await uploadDocuments(files, labels);
          console.log('Documents upload response:', uploadResponse);
          
          // Handle the API response format: {success, message, data: [{key, url, originalName, size, mimeType}]}
          if (uploadResponse.success && uploadResponse.data && Array.isArray(uploadResponse.data)) {
            // Map the response data to our expected format with labels
            uploadResponse.data.forEach((fileData: any, index: number) => {
              const docType = documentsToUpload[index]?.name;
              const type = DOCUMENT_TYPES.includes(docType as any) ? docType : 'Other';
              uploadedDocs.push({
                type,
                label: labels[index] || fileData.originalName,
                url: fileData.url,
                key: fileData.key,
                originalName: fileData.originalName,
                size: fileData.size,
                mimeType: fileData.mimeType
              });
            });
          } else {
            // Fallback for unexpected response format
            console.warn('Unexpected upload response format:', uploadResponse);
            throw new Error('Invalid response format from upload API');
          }
        } catch (uploadError: unknown) {
          console.error('Document upload failed:', uploadError);
          const ax = uploadError as { response?: { data?: { message?: string } }; message?: string };
          const msg =
            ax?.response?.data?.message ||
            ax?.message ||
            'Failed to upload documents (check S3 / network).';
          throw new Error(msg);
        }
      }

      // Upload salary slips using uploadDocuments API
      const uploadedSalarySlips: { 
        month: string; 
        year: string; 
        documentUrl: string;
        key: string;
        originalName: string;
        size: number;
        mimeType: string;
      }[] = [];
      const salarySlipsToUpload = salarySlips.filter(slip => slip.file && slip.month && slip.year);
      
      if (salarySlipsToUpload.length > 0) {
        const files = salarySlipsToUpload.map(slip => slip.file!);
        const labels = salarySlipsToUpload.map(slip => `${slip.month} ${slip.year} Salary Slip`);
        
        try {
          const uploadResponse = await uploadDocuments(files, labels);
          console.log('Salary slips upload response:', uploadResponse);
          
          // Handle the API response format: {success, message, data: [{key, url, originalName, size, mimeType}]}
          if (uploadResponse.success && uploadResponse.data && Array.isArray(uploadResponse.data)) {
            // Map the response data to our expected format with month/year info
            uploadResponse.data.forEach((fileData: any, index: number) => {
              const slip = salarySlipsToUpload[index];
              uploadedSalarySlips.push({
                month: slip.month,
                year: slip.year,
                documentUrl: fileData.url,
                key: fileData.key,
                originalName: fileData.originalName,
                size: fileData.size,
                mimeType: fileData.mimeType
              });
            });
          } else {
            // Fallback for unexpected response format
            console.warn('Unexpected salary slips upload response format:', uploadResponse);
            throw new Error('Invalid response format from salary slips upload API');
          }
        } catch (uploadError) {
          console.error('Salary slips upload failed:', uploadError);
          throw new Error('Failed to upload salary slips');
        }
      }

      const isEdit = initialData?.id || initialData?._id;
      
      // Handle profile picture upload if provided
      let profilePictureData = null;
      console.log('Profile picture state:', profilePicture);
      if (profilePicture) {
        try {
          const uploadResult = await uploadDocuments([profilePicture], ['profile-picture']);
          console.log('Profile picture upload result:', uploadResult);
          if (uploadResult && uploadResult.success && uploadResult.data && uploadResult.data.length > 0) {
            const uploadedFile = uploadResult.data[0];
            profilePictureData = {
              url: uploadedFile.url,
              key: uploadedFile.key,
              originalName: uploadedFile.originalName,
              size: uploadedFile.size,
              mimeType: uploadedFile.mimeType
            };
            console.log('Profile picture data:', profilePictureData);
          }
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError);
          throw new Error('Failed to upload profile picture');
        }
      }
      
      // Preserve existing profile picture if editing and no new picture is selected
      let finalProfilePicture: any = profilePictureData || null;
      if (isEdit && !profilePictureData) {
        if (profilePictureRemoved) {
          // User explicitly removed the picture, send empty object to clear it
          finalProfilePicture = {};
        } else if (initialData?.profilePicture) {
          // Preserve existing profile picture when updating without selecting a new one
          finalProfilePicture = typeof initialData.profilePicture === 'string' 
            ? { url: initialData.profilePicture }
            : initialData.profilePicture;
        } else {
          // No existing picture, use empty object
          finalProfilePicture = {};
        }
      } else if (!isEdit && !profilePictureData) {
        // For new candidates, use empty object if no picture
        finalProfilePicture = {};
      }
      
      const adminIdStr = getAdminIdString();
      const payload = {
        ...(isEdit ? {} : adminIdStr ? { role: "user" as const, adminId: adminIdStr } : {}), // Only include role/adminId for new candidates when we have a valid string
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: (formData.phoneNumber || "").replace(/\D/g, ""),
        countryCode: formData.countryCode,
        shortBio: formData.shortBio,
        profilePicture: finalProfilePicture || {},
        sevisId: formData.sevisId,
        ead: formData.ead,
        degree: formData.degree,
        supervisorName: formData.supervisorName,
        supervisorContact: (formData.supervisorContact || "").replace(/\D/g, ""),
        supervisorCountryCode: formData.supervisorCountryCode,
        visaType: formData.visaType,
        ...(formData.visaType === "Other" ? { customVisaType: formData.customVisaType } : {}),
        salaryRange: formData.salaryRange,
        address: {
          streetAddress: formData.streetAddress,
          streetAddress2: formData.streetAddress2,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        ...(initialData ? {} : { password: formData.password }),
        qualifications: educations.map((edu) => ({
          degree: edu.degree,
          institute: edu.institute,
          location: edu.location,
          startYear: edu.startYear ? Number(edu.startYear) : undefined,
          endYear: edu.endYear ? Number(edu.endYear) : undefined,
          description: edu.description,
        })),
        experiences: experiences.map((exp) => {
          console.log('Backend Submission - Sending dates to backend:', {
            company: exp.company,
            startDate: (exp as any).startDate,
            endDate: (exp as any).endDate
          });
          
          return {
            company: exp.company,
            role: exp.role,
            startDate: (exp as any).startDate || undefined,
            endDate: (exp as any).endDate || undefined,
            description: exp.description,
            currentlyWorking: (exp as any).currentlyWorking || false,
          };
        }),
        skills: skills.filter(skill => skill.name.trim() !== "").map((skill) => ({
          name: skill.name,
          level: skill.level,
        })),
        socialLinks: socialLinks.filter(link => link.platform.trim() !== "" && link.url.trim() !== "").map((link) => ({
          platform: link.platform,
          url: link.url,
        })),
        documents: [...existingDocs, ...uploadedDocs],
        salarySlips: [...existingSalarySlips, ...uploadedSalarySlips],
      } as any;

      console.log('Final payload profilePicture:', payload.profilePicture);

      let res: any;
      
      if (isEdit) {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const user = userData ? JSON.parse(userData) : null;
        if (user?.role === 'user') {
          res = await updateMyCandidate(payload);
        } else {
          res = await updateCandidate(String(initialData.id || initialData._id), payload);
        }
        
        // Success alert for editing
        await Swal.fire({
          icon: 'success',
          title: 'Profile Updated!',
          text: 'Candidate profile has been successfully updated.',
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true
        });
      } else {
        res = await createCandidate(payload);
        
        // Success alert for adding new candidate
        await Swal.fire({
          icon: 'success',
          title: 'Candidate Added!',
          text: 'New candidate has been successfully added to the system.',
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true
        });
      }

      // Redirect after successful operation – candidates (role user) go to profile
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const user = userData ? JSON.parse(userData) : null;
      router.push(user?.role === 'user' ? ROUTES.candidateProfile : "/ats/candidates");
    } catch (err: any) {
      setError("Failed to add candidate");
      await Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: err?.response?.data?.message || err?.message || 'An error occurred while adding candidate.',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  // If in Excel import mode, show Excel import UI (only for new candidates)
  if (excelImportMode && !initialData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Excel Import Candidates</h3>
            <button
              onClick={() =>
                returnToCandidatesOnBack
                  ? router.push("/ats/candidates")
                  : setExcelImportMode(false)
              }
              className="ti-btn ti-btn-secondary"
            >
              {returnToCandidatesOnBack ? "Back to Candidates" : "Back to Manual Entry"}
            </button>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">File Format Requirements:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Excel Files (.xlsx/.xls):</strong> 5 Required Sheets - Personal Info, Social Links, Skills, Qualification, Work Experience</li>
              <li>• <strong>CSV Files (.csv):</strong> Single sheet with all data in columns</li>
              <li>• <strong>Required Columns:</strong> FullName, Email, PhoneNumber, Password</li>
              <li>• <strong>Optional Columns:</strong> ProfilePicture, ShortBio, SevisId, Ead, Degree, SupervisorName, SupervisorContact, SalaryRange</li>
              <li>• <strong>Array Fields (CSV):</strong> Qualifications, Experiences, Skills, SocialLinks (use semicolon to separate entries, pipe to separate fields)</li>
              <li>• <em>Note: Excel files require xlsx library: npm install xlsx</em></li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <div className="flex gap-4 mb-4">
              {/* <button
                onClick={downloadCSVTemplate}
                className="ti-btn ti-btn-success text-white"
              >
                <i className="ri-file-text-line me-2"></i>
                Download CSV Template
              </button> */}
              <button
                onClick={downloadExcelTemplate}
                className="ti-btn ti-btn-primary text-white"
              >
                <i className="ri-file-excel-line me-2"></i>
                Download Excel Template
              </button>
            </div>
          </div>

          <div className="col-span-12">
            <label className="form-label">Upload File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileUpload}
              className="form-control w-full !rounded-md"
            />
            <small className="text-gray-500 text-xs mt-1">Supported formats: .csv (fully supported), .xlsx/.xls (requires xlsx library)</small>
          </div>

          {excelFile && (
            <div className="col-span-12">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 className="font-semibold mb-2">Selected File:</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">{excelFile.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Size: {(excelFile.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          )}

          {excelFile && (
            <div className="col-span-12">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">File Ready:</h5>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {excelFile.name} ({(excelFile.size / 1024).toFixed(2)} KB) is ready for import.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Click "Import Excel Data" below to process and import all candidates from this file.
                </p>
              </div>
            </div>
          )}

          {excelImportLoading && (
            <div className="col-span-12">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Import Progress:</h5>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(excelImportProgress.processed / excelImportProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Processed: {excelImportProgress.processed} / {excelImportProgress.total} | 
                  Successful: {excelImportProgress.successful} | 
                  Failed: {excelImportProgress.failed}
                </p>
              </div>
            </div>
          )}

          <div className="col-span-12 flex gap-4">
            <button
              onClick={handleExcelImport}
              disabled={!excelFile || excelImportLoading}
              className="ti-btn ti-btn-primary-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excelImportLoading ? 'Importing...' : 'Import Excel Data'}
            </button>
            
            <button
              onClick={() => {
                setExcelFile(null);
                setExcelData([]);
                setExcelImportProgress({ total: 0, processed: 0, successful: 0, failed: 0, errors: [] });
              }}
              className="ti-btn ti-btn-secondary"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Mode Selection - Only show for new candidates, not when editing */}
      {!initialData && (
        <div className="p-6 border-b border-defaultborder dark:border-defaultborder/10">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setExcelImportMode(false)}
              className={`ti-btn ${!excelImportMode ? 'ti-btn-primary-full text-white' : 'ti-btn-secondary'}`}
            >
              <i className="ri-user-add-line me-2"></i>
              Manual Entry
            </button>
            <button
              onClick={() => setExcelImportMode(true)}
              className={`ti-btn ${excelImportMode ? 'ti-btn-primary-full text-white' : 'ti-btn-secondary'}`}
            >
              <i className="ri-file-excel-line me-2"></i>
              Excel Import
            </button>
          </div>
        </div>
      )}

      <Wizard 
        step={step} 
        onChange={setStep} 
        onSubmit={handleSubmit}
        validateStep={validateStep}
        stepValidationErrors={stepValidationErrors}
        canNavigateToStep={canNavigateToStep}
      >
      <Step title={<><i className="ri-user-3-line basicstep-icon"></i> Personal Info</>}>
        <div className="p-6 w-full">
          <p className="mb-1 font-semibold text-[#8c9097] dark:text-white/50 opacity-50 text-[1.25rem]">01</p>
          <div className="grid grid-cols-12 gap-6 w-full">
            {/* Profile Picture Upload */}
            <div className="xl:col-span-12 col-span-12 mb-4">
              <label className="form-label">Profile Picture (Optional)</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profilePicturePreview ? (
                    <img 
                      src={profilePicturePreview} 
                      alt="Profile Preview" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <i className="ri-user-line text-2xl text-gray-400"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleProfilePictureChange}
                    className="form-control w-full !rounded-md"
                    id="profilePicture"
                  />
                  <small className="text-gray-500 text-xs mt-1">
                    Supported formats: JPG, JPEG, PNG only. Max size: 5MB
                  </small>
                </div>
                {profilePicturePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePicture(null);
                      setProfilePicturePreview("");
                      setProfilePictureRemoved(true);
                    }}
                    className="ti-btn ti-btn-danger ti-btn-sm"
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                )}
              </div>
            </div>
            
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="fullName" className="form-label">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={formData.fullName} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['fullName'] ? 'border-red-500' : ''}`} 
                  placeholder="Full Name" 
                  // required
                />
                {fieldErrors['fullName'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['fullName']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['email'] ? 'border-red-500' : ''}`} 
                  placeholder="xyz@example.com" 
                  // required
                />
                {fieldErrors['email'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['email']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="phone" className="form-label">Phone Number <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <PhoneCountrySelect
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={(code) => handleFormChange({ target: { name: "countryCode", value: code } } as React.ChangeEvent<HTMLSelectElement>)}
                  />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleFormChange}
                    className={`form-control flex-1 !rounded-md ${fieldErrors['phoneNumber'] ? '!border-red-500' : ''}`}
                    id="phone"
                    placeholder={getPhoneCountry(formData.countryCode).placeholder}
                    maxLength={getPhoneCountry(formData.countryCode).maxLength}
                    inputMode="numeric"
                  />
                </div>
                {fieldErrors['phoneNumber'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['phoneNumber']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="sevisId" className="form-label">SEVIS ID</label>
                <input type="text" name="sevisId" value={formData.sevisId} onChange={handleFormChange} className="form-control w-full !rounded-md" id="sevisId" placeholder="SEVIS ID" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="ead" className="form-label">EAD</label>
                <input type="text" name="ead" value={formData.ead} onChange={handleFormChange} className="form-control w-full !rounded-md" id="ead" placeholder="EAD" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="degree" className="form-label">Degree</label>
                <input type="text" name="degree" value={formData.degree} onChange={handleFormChange} className="form-control w-full !rounded-md" id="degree" placeholder="Degree" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="supervisorName" className="form-label">Supervisor Name</label>
                <input type="text" name="supervisorName" value={formData.supervisorName} onChange={handleFormChange} className="form-control w-full !rounded-md" id="supervisorName" placeholder="supervisor name" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="supervisorContact" className="form-label">Supervisor Phone No.</label>
                <div className="flex gap-2">
                  <PhoneCountrySelect
                    name="supervisorCountryCode"
                    value={formData.supervisorCountryCode || formData.countryCode}
                    onChange={(code) => handleFormChange({ target: { name: "supervisorCountryCode", value: code } } as React.ChangeEvent<HTMLSelectElement>)}
                  />
                  <input
                    type="tel"
                    name="supervisorContact"
                    value={formData.supervisorContact}
                    onChange={handleFormChange}
                    className={`form-control flex-1 !rounded-md ${fieldErrors['supervisorContact'] ? '!border-red-500' : ''}`}
                    id="supervisorContact"
                    placeholder={getPhoneCountry(formData.supervisorCountryCode || formData.countryCode).placeholder}
                    maxLength={getPhoneCountry(formData.supervisorCountryCode || formData.countryCode).maxLength}
                    inputMode="numeric"
                  />
                </div>
                {fieldErrors['supervisorContact'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['supervisorContact']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="visaType" className="form-label">Visa Type <span className="text-red-500">*</span></label>
                <select 
                  name="visaType" 
                  value={formData.visaType} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['visaType'] ? 'border-red-500' : ''}`} 
                  id="visaType"
                  required
                >
                  <option value="">Select Visa Type</option>
                  <option value="F-1">F-1 (Student Visa)</option>
                  <option value="J-1">J-1 (Exchange Visitor)</option>
                  <option value="H-1B">H-1B (Specialty Occupation)</option>
                  <option value="H-2B">H-2B (Temporary Non-Agricultural Worker)</option>
                  <option value="L-1">L-1 (Intracompany Transferee)</option>
                  <option value="O-1">O-1 (Extraordinary Ability)</option>
                  <option value="P-1">P-1 (Athlete/Entertainer)</option>
                  <option value="R-1">R-1 (Religious Worker)</option>
                  <option value="TN">TN (NAFTA Professional)</option>
                  <option value="E-1">E-1 (Treaty Trader)</option>
                  <option value="E-2">E-2 (Treaty Investor)</option>
                  <option value="E-3">E-3 (Australian Professional)</option>
                  <option value="B-1">B-1 (Business Visitor)</option>
                  <option value="B-2">B-2 (Tourist)</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors['visaType'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['visaType']}</div>
                )}
            </div>
            {formData.visaType === "Other" && (
              <div className="xl:col-span-6 col-span-12">
                <label htmlFor="customVisaType" className="form-label">Custom Visa Type <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="customVisaType" 
                  value={formData.customVisaType} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['customVisaType'] ? 'border-red-500' : ''}`} 
                  id="customVisaType" 
                  placeholder="Enter visa type" 
                  required
                />
                {fieldErrors['customVisaType'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['customVisaType']}</div>
                )}
              </div>
            )}
            
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="salaryRange" className="form-label">Salary Range <span className="text-red-500">*</span></label>
                <select 
                  name="salaryRange" 
                  value={formData.salaryRange} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['salaryRange'] ? 'border-red-500' : ''}`} 
                  id="salaryRange"
                >
                  <option value="">Select Salary Range</option>
                  <option value="Under $5,000">Under $5,000</option>
                  <option value="$5,000 - $10,000">$5,000 - $10,000</option>
                  <option value="$10,000 - $15,000">$10,000 - $15,000</option>
                  <option value="$15,000 - $20,000">$15,000 - $20,000</option>
                  <option value="$20,000 - $30,000">$20,000 - $30,000</option>
                  <option value="$30,000 - $50,000">$30,000 - $50,000</option>
                  <option value="$50,000 - $70,000">$50,000 - $70,000</option>
                  <option value="$70,000 - $90,000">$70,000 - $90,000</option>
                  <option value="$90,000 - $110,000">$90,000 - $110,000</option>
                  <option value="$110,000 - $130,000">$110,000 - $130,000</option>
                  <option value="$130,000 - $150,000">$130,000 - $150,000</option>
                  <option value="$150,000 - $200,000">$150,000 - $200,000</option>
                  <option value="$200,000 - $250,000">$200,000 - $250,000</option>
                  <option value="$250,000 - $300,000">$250,000 - $300,000</option>
                  <option value="$300,000 - $400,000">$300,000 - $400,000</option>
                  <option value="$400,000+">$400,000+</option>
                  <option value="Prefer not to disclose">Prefer not to disclose</option>
                </select>
                {fieldErrors['salaryRange'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['salaryRange']}</div>
                )}
            </div>
            
            {/* Address Section */}
            
            <div className="xl:col-span-12 col-span-12">
              <div className="grid grid-cols-12 gap-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="xl:col-span-12 col-span-12">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Address Information</h4>
                </div>
                <div className="xl:col-span-12 col-span-12">
                    <label htmlFor="streetAddress" className="form-label">Street Address <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="streetAddress" 
                      value={formData.streetAddress} 
                      onChange={handleFormChange} 
                      className={`form-control w-full !rounded-md ${fieldErrors['streetAddress'] ? 'border-red-500' : ''}`} 
                      id="streetAddress" 
                      placeholder="Enter street address" 
                    />
                    {fieldErrors['streetAddress'] && (
                      <div className="text-red-500 text-sm mt-1">{fieldErrors['streetAddress']}</div>
                    )}
                </div>
                
                <div className="xl:col-span-12 col-span-12">
                    <label htmlFor="streetAddress2" className="form-label">Street Address Line 2</label>
                    <input 
                      type="text" 
                      name="streetAddress2" 
                      value={formData.streetAddress2} 
                      onChange={handleFormChange} 
                      className="form-control w-full !rounded-md" 
                      id="streetAddress2" 
                      placeholder="Apartment, suite, unit, building, floor, etc." 
                    />
                </div>
                
                <div className="xl:col-span-6 col-span-12">
                    <label htmlFor="city" className="form-label">City <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleFormChange} 
                      className={`form-control w-full !rounded-md ${fieldErrors['city'] ? 'border-red-500' : ''}`} 
                      id="city" 
                      placeholder="Enter city" 
                    />
                    {fieldErrors['city'] && (
                      <div className="text-red-500 text-sm mt-1">{fieldErrors['city']}</div>
                    )}
                </div>
                
                <div className="xl:col-span-6 col-span-12">
                    <label htmlFor="state" className="form-label">State (Territory or Military Post) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="state" 
                      value={formData.state} 
                      onChange={handleFormChange} 
                      className={`form-control w-full !rounded-md ${fieldErrors['state'] ? 'border-red-500' : ''}`} 
                      id="state" 
                      placeholder="Enter state, territory, or military post" 
                    />
                    {fieldErrors['state'] && (
                      <div className="text-red-500 text-sm mt-1">{fieldErrors['state']}</div>
                    )}
                </div>
                
                <div className="xl:col-span-6 col-span-12">
                    <label htmlFor="zipCode" className="form-label">ZIP Code <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="zipCode" 
                      value={formData.zipCode} 
                      onChange={handleFormChange} 
                      className={`form-control w-full !rounded-md ${fieldErrors['zipCode'] ? 'border-red-500' : ''}`} 
                      id="zipCode" 
                      placeholder="Enter ZIP code" 
                    />
                    {fieldErrors['zipCode'] && (
                      <div className="text-red-500 text-sm mt-1">{fieldErrors['zipCode']}</div>
                    )}
                </div>
                
                <div className="xl:col-span-6 col-span-12">
                    <label htmlFor="country" className="form-label">Country <span className="text-red-500">*</span></label>
                    <select 
                      name="country" 
                      value={formData.country} 
                      onChange={handleFormChange} 
                      className={`form-control w-full !rounded-md ${fieldErrors['country'] ? 'border-red-500' : ''}`} 
                      id="country"
                    >
                      <option value="">Select Country</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="India">India</option>
                      <option value="China">China</option>
                      <option value="Japan">Japan</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Other">Other</option>
                    </select>
                    {fieldErrors['country'] && (
                      <div className="text-red-500 text-sm mt-1">{fieldErrors['country']}</div>
                    )}
                </div>
              </div>
            </div>
                            
            <div className="xl:col-span-12 col-span-12">
                <label htmlFor="bio" className="form-label">Short Bio </label>
                <textarea name="shortBio" value={formData.shortBio} onChange={handleFormChange} className="form-control w-full !rounded-md" rows={3}></textarea>
            </div>

            {/* Social Links Section */}
            <div className="xl:col-span-12 col-span-12">
              <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
                <div>Social Links <span className="text-red-500">*</span> :</div>
                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
                >
                  + Add Social Link
                </button>
              </div>
              {fieldErrors['socialLinks'] && (
                <div className="text-red-500 text-sm mb-3">
                  {fieldErrors['socialLinks']}
                </div>
              )}

              {socialLinks.map((link, index) => (
                <div key={link.id} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
                  <button
                    type="button"
                    onClick={() => handleRemoveSocialLink(index)}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

                  <div className="xl:col-span-6 col-span-12">
                    <label className="form-label">Platform <span className="text-red-500">*</span></label>
                    <select
                      className="form-control w-full !rounded-md"
                      value={link.platform}
                      onChange={(e) => handleSocialLinkChange(index, "platform", e.target.value)}
                      required
                    >
                      <option value="">Select Platform</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="GitHub">GitHub</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Portfolio">Portfolio</option>
                      <option value="Website">Website</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="xl:col-span-6 col-span-12">
                    <label className="form-label">URL <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      className="form-control w-full !rounded-md"
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) => handleSocialLinkChange(index, "url", e.target.value)}
                      required
                    />
                    {link.url && !validateURL(link.url) && (
                      <div className="text-red-500 text-sm mt-1">Please enter a valid URL</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!initialData && (
              <div className="xl:col-span-6 col-span-12">
                <label htmlFor="password" className="form-label">Password <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['password'] ? 'border-red-500' : ''}`} 
                  placeholder="Enter password" 
                  required
                />
                {fieldErrors['password'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['password']}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </Step>

      <Step title={<><i className="ri-book-line basicstep-icon"></i> Qualification</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">02</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Qualification :</div>
            <button
              type="button"
              onClick={handleAddEducation}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Education
            </button>
          </div>
          {fieldErrors['education'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['education']}</div>
          )}

          {educations.map((edu, index) => (
            <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
              <button type="button" onClick={() => { setEducations(educations.filter((_, i) => i !== index)) }} className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600">
                ✕
              </button>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Degree <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) => handleEducationChange(index, "degree", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">University <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                  placeholder="University/Institute"
                  value={edu.institute}
                  onChange={(e) => handleEducationChange(index, "institute", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Location <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                  placeholder="Location"
                  value={edu.location}
                  onChange={(e) => handleEducationChange(index, "location", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <label className="form-label">Start Year <span className="text-red-500">*</span></label>
                    <select
                      className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                      value={(edu as any).startYear}
                      onChange={(e) => handleEducationChange(index, "startYear", e.target.value)}
                    >
                      <option value="">Select Start Year</option>
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6">
                    <label className="form-label">End Year <span className="text-red-500">*</span></label>
                    <select
                      className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                      value={(edu as any).endYear}
                      onChange={(e) => handleEducationChange(index, "endYear", e.target.value)}
                    >
                      <option value="">Select End Year</option>
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {edu.startYear && edu.endYear && !validateYearRange(edu.startYear, edu.endYear) && (
                  <div className="text-red-500 text-sm mt-2 col-span-12">
                    Start year cannot be ahead of end year
                  </div>
                )}
              </div>
              
              <div className="xl:col-span-12 col-span-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control w-full !rounded-md"
                  rows={3}
                  placeholder="Description"
                  value={edu.description}
                  onChange={(e) => handleEducationChange(index, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
          <div className="xl:col-span-12 col-span-12">
            <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
              <div>Skills :</div>
              <button
                type="button"
                onClick={handleAddSkill}
                className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
              >
                + Add Skill
              </button>
            </div>
            {fieldErrors['skills'] && (
              <div className="text-red-500 text-sm mb-3">{fieldErrors['skills']}</div>
            )}

            {skills.map((skill, index) => (
              <div key={skill.id} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                  className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                >
                  ✕
                </button>

                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Skill Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${fieldErrors['skills'] ? 'border-red-500' : ''}`}
                    placeholder="e.g., JavaScript, Python, React"
                    value={skill.name}
                    onChange={(e) => handleSkillChange(index, "name", e.target.value)}
                    // required
                  />
                </div>

                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Skill Level</label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={skill.level}
                    onChange={(e) => handleSkillChange(index, "level", e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Step>

      <Step title={<><i className="ri-bank-card-line basicstep-icon"></i> Work Experience</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">03</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Experience :</div>
            <button
              type="button"
              onClick={handleAddExperience}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Experience
            </button>
          </div>
          {fieldErrors['experience'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['experience']}</div>
          )}
          {experiences.map((exp, index) => (
            <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
              <button type="button"
                onClick={() => setExperiences(experiences.filter((_, i) => i !== index))}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              {/* Fields */}
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="Company Name"
                  value={exp.company}
                  onChange={(e) => handleExpChange(index, "company", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Role/Designation <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="Role/Designation"
                  value={exp.role}
                  onChange={(e) => handleExpChange(index, "role", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="Start Date"
                  value={(exp as any).startDate}
                  onChange={(e) => handleExpChange(index, "startDate", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">End Date {!exp.currentlyWorking && <span className="text-red-500">*</span>}</label>
                <input
                  type="date"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="End Date"
                  value={(exp as any).endDate}
                  onChange={(e) => handleExpChange(index, "endDate", e.target.value)}
                  disabled={exp.currentlyWorking}
                  // required={!exp.currentlyWorking}
                />
              </div>
              <div className="xl:col-span-12 col-span-12">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`currentlyWorking-${index}`}
                    checked={(exp as any).currentlyWorking}
                    onChange={(e) => {
                      handleExpChange(index, "currentlyWorking", e.target.checked);
                      if (e.target.checked) {
                        handleExpChange(index, "endDate", "");
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`currentlyWorking-${index}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Currently working here
                  </label>
                </div>
              </div>
              {exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate) && (
                <div className="text-red-500 text-sm mt-2 col-span-12">
                  Start date cannot be ahead of end date
                </div>
              )}
              {exp.endDate && !validateNotFutureDate(exp.endDate) && (
                <div className="text-red-500 text-sm mt-2 col-span-12">
                  End date cannot be in the future
                </div>
              )}
              <div className="xl:col-span-12 col-span-12">
                <label className="form-label">Responsibilities / Description</label>
                <textarea
                  className="form-control w-full !rounded-md"
                  rows={3}
                  placeholder="Responsibilities / Description"
                  value={exp.description}
                  onChange={(e) => handleExpChange(index, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Step>

      <Step title={<><i className="ri-checkbox-circle-line basicstep-icon"></i> Document Uploads</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">04</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Documents (Optional) :</div>
            <button
              type="button"
              onClick={() => setDocumentsList([...documentsList, { id: Date.now(), name: "", customName: "", file: null }])}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Document
            </button>
          </div>
          {fieldErrors['documents'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['documents']}</div>
          )}

          {/* Existing Documents */}
          {existingDocs.length > 0 && (
            <div className="mb-6">
              <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Existing Documents</h6>
              {existingDocs.map((doc, index) => (
                <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setExistingDocs(existingDocs.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Document Type</label>
                    <input
                      type="text"
                      className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                      value={doc.label}
                      readOnly
                    />
                  </div>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Current File</label>
                    <div className="flex items-center">
                      {getExistingFileThumbnail(doc.url, doc.label)}
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="text-xs">{doc.label || 'Document'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Replace File</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="form-control w-full !rounded-md"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const updated = [...documentsList];
                          updated.push({ 
                            id: Date.now() + index, 
                            name: doc.label, 
                            customName: "",
                            file: e.target.files[0] 
                          });
                          setDocumentsList(updated);
                          // Remove from existing docs since we're replacing it
                          setExistingDocs(existingDocs.filter((_, i) => i !== index));
                        }
                      }}
                    />
                    <small className="text-gray-500 text-xs mt-1">Supported formats: JPG, JPEG, PNG, PDF</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Documents */}
          {documentsList.length > 0 && (
            <div>
              <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">New Documents</h6>
              {documentsList.map((doc, index) => (
                <div key={doc.id} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setDocumentsList(documentsList.filter(d => d.id !== doc.id))}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Document Type <span className="text-red-500">*</span></label>
                <select
                  className={`form-control w-full !rounded-md ${fieldErrors['documents'] ? 'border-red-500' : ''}`}
                  value={doc.name}
                  onChange={(e) => {
                    const updated = [...documentsList];
                    updated[index].name = e.target.value;
                    // Clear custom name when changing from "Other" to a predefined type
                    if (e.target.value !== "Other") {
                      updated[index].customName = "";
                    }
                    setDocumentsList(updated);
                  }}
                  required
                >
                  <option value="">Select Document Type</option>
                  <optgroup label="Identity / KYC (Pre-boarding)">
                    <option value="Aadhar">Aadhar</option>
                    <option value="PAN">PAN</option>
                    <option value="Bank">Bank</option>
                    <option value="Passport">Passport</option>
                  </optgroup>
                  <optgroup label="Application">
                    <option value="CV/Resume">CV/Resume</option>
                    <option value="Marksheet">Marksheet</option>
                    <option value="Degree Certificate">Degree Certificate</option>
                    <option value="Experience Letter">Experience Letter</option>
                  </optgroup>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Custom Document Name Input - Show only when "Other" is selected */}
              {doc.name === "Other" && (
                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">Custom Document Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${fieldErrors['documents'] ? 'border-red-500' : ''}`}
                    placeholder="Enter custom document name"
                    value={doc.customName}
                    onChange={(e) => {
                      const updated = [...documentsList];
                      updated[index].customName = e.target.value;
                      setDocumentsList(updated);
                    }}
                    required
                  />
                </div>
              )}

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Upload File <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className={`form-control w-full !rounded-md ${fieldErrors['documents'] ? 'border-red-500' : ''}`}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const updated = [...documentsList];
                      updated[index].file = e.target.files[0];
                      setDocumentsList(updated);
                    }
                  }}
                  required
                />
                <small className="text-gray-500 text-xs mt-1">Supported formats: JPG, JPEG, PNG, PDF</small>
              </div>

                  {doc.file && (
                    <div className="xl:col-span-4 col-span-12 mt-6">
                      <label className="form-label">File Preview</label>
                      <div className="flex items-center">
                        {getFileThumbnail(doc.file)}
                        <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="text-xs">{doc.file.name}</div>
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {doc.name === "Other" ? doc.customName : doc.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Step>

      <Step title={<><i className="ri-money-dollar-box-line basicstep-icon"></i> Salary Slips</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">05</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Salary Slips (Optional) :</div>
            <button
              type="button"
              onClick={handleAddSalarySlip}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Salary Slip
            </button>
          </div>
        {fieldErrors['salarySlips'] && (
          <div className="text-red-500 text-sm mb-3">{fieldErrors['salarySlips']}</div>
        )}
        {validateSalarySlipDuplicates(salarySlips).length > 0 && (
          <div className="text-red-500 text-sm mb-3">
            Duplicate month/year combinations found. Each month and year combination must be unique.
          </div>
        )}

        {/* Existing Salary Slips */}
        {existingSalarySlips.length > 0 && (
          <div className="mb-6">
            <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Existing Salary Slips</h6>
            {existingSalarySlips.map((slip, index) => (
              <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setExistingSalarySlips(existingSalarySlips.filter((_, i) => i !== index))}
                  className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                >
                  ✕
                </button>

                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">Month</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                    value={slip.month}
                    readOnly
                  />
                </div>

                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">Year</label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                    value={slip.year}
                    readOnly
                  />
                </div>

                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">File Preview</label>
                  <div className="flex items-center">
                    {getExistingFileThumbnail(slip.documentUrl, `${slip.month} ${slip.year}`)}
                    <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="text-xs">Existing File</div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {slip.month} {slip.year}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Salary Slips */}
        {salarySlips.length > 0 && (
          <div>
            {salarySlips.map((slip, index) => {
              const duplicateIndexes = validateSalarySlipDuplicates(salarySlips);
              const isDuplicate = duplicateIndexes.includes(index);
              return (
          <div key={slip.id} className={`relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 ${isDuplicate ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}>
            <button
              type="button"
              onClick={() => setSalarySlips(salarySlips.filter(s => s.id !== slip.id))}
              className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
            >
              ✕
            </button>

            <div className="xl:col-span-2 col-span-6">
              <label className="form-label">Month <span className="text-red-500">*</span></label>
              <select
                className={`form-control w-full !rounded-md ${fieldErrors['salarySlips'] || isDuplicate ? 'border-red-500' : ''}`}
                value={slip.month}
                onChange={(e) => handleSalarySlipChange(index, "month", e.target.value)}
                required
              >
                <option value="">Select</option>
                <option value="January">January</option>
                <option value="February">February</option>
                <option value="March">March</option>
                <option value="April">April</option>
                <option value="May">May</option>
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="October">October</option>
                <option value="November">November</option>
                <option value="December">December</option>
              </select>
            </div>

            <div className="xl:col-span-2 col-span-6">
              <label className="form-label">Year <span className="text-red-500">*</span></label>
              <select
                className={`form-control w-full !rounded-md ${fieldErrors['salarySlips'] || isDuplicate ? 'border-red-500' : ''}`}
                value={slip.year}
                onChange={(e) => handleSalarySlipChange(index, "year", e.target.value)}
                required
              >
                <option value="">Select</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="xl:col-span-4 col-span-12">
              <label className="form-label">Upload Salary Slip</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className={`form-control w-full !rounded-md ${fieldErrors['salarySlips'] ? 'border-red-500' : ''}`}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSalarySlipChange(index, "file", e.target.files[0]);
                  }
                }}
                required
              />
              <small className="text-gray-500 text-xs mt-1">Supported formats: JPG, JPEG, PNG, PDF</small>
            </div>

            {(slip.file || slip.documentUrl) && (
              <div className="xl:col-span-4 col-span-12 mt-6">
                <label className="form-label">File Preview</label>
                <div className="flex items-center">
                  {slip.file ? getFileThumbnail(slip.file) : getExistingFileThumbnail(slip.documentUrl, `${slip.month} ${slip.year}`)}
                  <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="text-xs">{slip.file ? slip.file.name : 'Uploaded File'}</div>
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {slip.month} {slip.year}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
              );
            })}
          </div>
        )}
      </div>
      </Step>

    </Wizard>
    </div>
  );
};