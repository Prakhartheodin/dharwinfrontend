import InterviewDetailClient from "./_components/InterviewDetailClient";

export default async function InterviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;

  return (
    <div className="container-fluid py-4 max-w-6xl mx-auto">
      <InterviewDetailClient meetingId={id} initialTab={sp?.tab} />
    </div>
  );
}
