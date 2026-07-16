"use client";

export default function DevTicketAccessDenied() {
  return (
    <div className="container-fluid pt-6">
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="box max-w-md text-center">
          <div className="box-body !p-8">
            <span
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger"
              aria-hidden
            >
              <i className="ri-shield-keyhole-line text-[1.75rem]" />
            </span>
            <h2 className="mb-2 text-[1rem] font-semibold text-defaulttextcolor dark:text-white">
              You don&apos;t have access to Help &amp; Support
            </h2>
            <p className="mb-0 text-[0.8125rem] text-[#8c9097] dark:text-white/50">
              Ask an admin to grant the Help &amp; Support access toggle on your role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
