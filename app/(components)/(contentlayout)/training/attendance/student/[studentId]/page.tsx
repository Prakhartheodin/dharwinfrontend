import StudentAttendancePage from "./student-attendance-client";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    // Fetch all students to generate static pages (optional; no auth at build/SSR so 401 is expected)
    const raw = process.env.NEXT_PUBLIC_API_URL || "";
    const apiUrl = raw.replace(/\/$/, "");
    if (!apiUrl) {
      return [];
    }

    const response = await fetch(`${apiUrl}/training/students?limit=1000`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      // 401 = no auth at build/SSR; 5xx = API down. Use placeholder so build/navigation still works.
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
