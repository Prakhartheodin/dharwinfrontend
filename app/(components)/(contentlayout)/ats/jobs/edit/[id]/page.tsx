/** Required for static export (output: "export"). Placeholder so the route is built; real id is used at runtime. */
export async function generateStaticParams() {
  return [{ id: '_' }]
}

import EditJobClient from './EditJobClient'

export default function EditJobPage() {
  return <EditJobClient />
}
