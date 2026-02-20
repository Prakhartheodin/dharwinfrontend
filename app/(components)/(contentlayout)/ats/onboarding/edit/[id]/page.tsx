/** Required for static export (output: "export"). Placeholder so the route is built; real id is used at runtime. */
export async function generateStaticParams() {
  return [{ id: '_' }]
}

import EditOnboardingClient from './EditOnboardingClient'

export default function EditOnboardingPage() {
  return <EditOnboardingClient />
}
