import InterviewDetailClient from "./_components/InterviewDetailClient";

type PageProps = {
  params: { id: string };
  searchParams?: { tab?: string };
};

export default function InterviewDetailPage({ params, searchParams }: PageProps) {
  return (
    <div className="container-fluid py-4">
      <InterviewDetailClient meetingId={params.id} initialTab={searchParams?.tab} />
    </div>
  );
}
