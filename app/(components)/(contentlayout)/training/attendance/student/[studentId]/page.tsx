import StudentAttendancePage from "./student-attendance-client";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    // Fetch all students to generate static pages
    // Note: This requires the API to be available at build time
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    if (!apiUrl) {
      console.warn("NEXT_PUBLIC_API_URL not set, skipping generateStaticParams");
      return [];
    }
    
    const response = await fetch(`${apiUrl}/training/students?limit=1000`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      // Auth not available at build time (401) or API unreachable – return placeholder
      return [{ studentId: "_" }];
    }
    
    const data = await response.json();
    return (data.results || []).map((student: { id: string }) => ({
      studentId: student.id,
    }));
  } catch (error) {
    // If API is not available at build time, return a placeholder
    // This allows the build to succeed; real IDs are loaded at runtime
    console.warn("Failed to fetch students for generateStaticParams:", error);
    return [{ studentId: "_" }];
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ studentId?: string }>;
}) {
  return <StudentAttendancePage />;
}
