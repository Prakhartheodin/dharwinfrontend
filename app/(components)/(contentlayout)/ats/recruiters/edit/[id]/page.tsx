import EditRecruiterClient from "./EditRecruiterClient";

/** Required for static export (output: "export"). Placeholder so the route is built; actual id is used at runtime. */
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function EditRecruiterPage() {
  return <EditRecruiterClient />;
}
