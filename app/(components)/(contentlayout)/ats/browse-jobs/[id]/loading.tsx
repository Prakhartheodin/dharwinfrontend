import Pageheader from "@/shared/layout-components/page-header/pageheader";

export default function BrowseJobDetailLoading() {
  return (
    <>
      <Pageheader currentpage="Job Details" activepage="Browse Jobs" mainpage="Job Details" />
      <div className="container pt-6">
        <div className="animate-pulse space-y-6">
        <div className="h-6 w-48 bg-defaultborder/30 dark:bg-white/10 rounded" />
        <div className="box custom-box">
          <div className="box-body space-y-4">
            <div className="h-7 w-3/4 bg-defaultborder/30 dark:bg-white/10 rounded" />
            <div className="h-4 w-1/3 bg-defaultborder/20 dark:bg-white/5 rounded" />
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-defaultborder/20 rounded" />
              <div className="h-4 w-24 bg-defaultborder/20 rounded" />
              <div className="h-4 w-24 bg-defaultborder/20 rounded" />
            </div>
          </div>
        </div>
        <div className="box custom-box">
          <div className="box-header">
            <div className="h-5 w-32 bg-defaultborder/30 dark:bg-white/10 rounded" />
          </div>
          <div className="box-body space-y-3">
            <div className="h-4 w-full bg-defaultborder/20 dark:bg-white/5 rounded" />
            <div className="h-4 w-full bg-defaultborder/20 dark:bg-white/5 rounded" />
            <div className="h-4 w-2/3 bg-defaultborder/20 dark:bg-white/5 rounded" />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
