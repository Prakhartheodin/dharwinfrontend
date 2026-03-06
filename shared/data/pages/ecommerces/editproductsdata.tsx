"use client"
// Category
interface Category {
  value: string;
  label: string;
}

export const CategoryData: Category[] = [
  { value: "Category", label: "Category" },
  { value: "Clothing", label: "Clothing" },
  { value: "Footwear", label: "Footwear" },
  { value: "Accessories", label: "Accessories" },
  { value: "Grooming", label: "Grooming" },
  { value: "Watches", label: "Watches" },
  { value: "Ethnic & Festive", label: "Ethnic & Festive" },
  { value: "Jewellery", label: "Jewellery" },
  { value: "Toys & Babycare", label: "Toys & Babycare" },
  { value: "Festive Gifts", label: "Festive Gifts" },
  { value: "Kitchen", label: "Kitchen" },
  { value: "Dining", label: "Dining" },
  { value: "Home Decors", label: "Home Decors" },
  { value: "Stationery", label: "Stationery" },
];

// Gender
interface Gender {
  value: string;
  label: string;
}

export const GenderData: Gender[] = [
  { value: "Select", label: "Select" },
  { value: "All", label: "All" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
];

// Size
interface Size {
  value: string;
  label: string;
}

export const SizeData: Size[] = [
  { value: "", label: "Select" },
  { value: "Extra Small", label: "Extra Small" },
  { value: "Small", label: "Small" },
  { value: "Medium", label: "Medium" },
  { value: "Large", label: "Large" },
  { value: "Extra Large", label: "Extra Large" },
];

// Brand
interface Brand {
  value: string;
  label: string;
}

export const BrandData: Brand[] = [
  { value: "", label: "Select" },
  { value: "Armani", label: "Armani" },
  { value: "Lacoste", label: "Lacoste" },
  { value: "Puma", label: "Puma" },
  { value: "Spykar", label: "Spykar" },
  { value: "Mufti", label: "Mufti" },
  { value: "Home Town", label: "Home Town" },
  { value: "Arrabi", label: "Arrabi" },
];

// Colors
interface Colors {
  value: string;
  label: string;
}

export const ColorsData: Colors[] = [
  { value: "Blue", label: "Blue" },
  { value: "White", label: "White" },
  { value: "Black", label: "Black" },
  { value: "Red", label: "Red" },
  { value: "Orange", label: "Orange" },
  { value: "Yellow", label: "Yellow" },
  { value: "Green", label: "Green" },
  { value: "Pink", label: "Pink" },
  { value: "Purple", label: "Purple" },
];

// Published Status
interface Publish {
  value: string;
  label: string;
}

export const PublishedData: Publish[] = [
  { value: "Select", label: "Select" },
  { value: "Published", label: "Published" },
  { value: "Scheduled", label: "Scheduled" },
];

// Product Tags
interface ProductData {
  value: string;
  label: string;
}

export const ProductsData: ProductData[] = [
  { value: "Relaxed", label: "Relaxed" },
  { value: "Solid", label: "Solid" },
  { value: "Washed", label: "Washed" },
  { value: "Plain", label: "Plain" },
];

// Availability
interface Availability {
  value: string;
  label: string;
}

export const AvailabilityData: Availability[] = [
  { value: "Select", label: "Select" },
  { value: "In Stock", label: "In Stock" },
  { value: "Out Of Stock", label: "Out Of Stock" },
];

import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'

const defaultContent = `
<p>Care Instructions: Machine Wash</p>
<p>Neckline: The pullover is framed with a Crew Neck</p>
<p>Fit Type: Regular Fit</p>
<p>Long Sleeves: The pullover is designed with Long Sleeves.</p>
<p>Soft Hand feel: The fabric is extremely soft and comfortable, keeping you at ease for hours.</p>
<p>Solid: The pullover is available in a solid pattern.</p>
`;

interface Editor2Props {
  placeholder?: string;
}

const Editor2: React.FC<Editor2Props> = ({ placeholder }) => {
  return (
    <TiptapEditor
      content={defaultContent}
      placeholder={placeholder || 'Enter product features...'}
    />
  );
}

export default Editor2;