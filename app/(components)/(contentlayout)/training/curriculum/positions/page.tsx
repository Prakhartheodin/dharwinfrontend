import { redirect } from 'next/navigation'

/** Legacy route: Categories & Positions merged into Curriculum Setup. */
export default function TrainingPositionsRedirectPage() {
  redirect('/training/curriculum/setup')
}
