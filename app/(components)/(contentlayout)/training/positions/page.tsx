import { redirect } from 'next/navigation'

export default function TrainingPositionsRedirectPage() {
  redirect('/training/curriculum/setup?tab=positions')
}
