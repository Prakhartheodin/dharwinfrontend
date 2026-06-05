import { redirect } from 'next/navigation'

export default function TrainingCategoriesRedirectPage() {
  redirect('/training/curriculum/setup?tab=categories')
}
