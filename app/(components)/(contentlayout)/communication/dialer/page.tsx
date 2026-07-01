"use client";

import { Fragment } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import DialerWorkspace from "./_components/DialerWorkspace";

// Standalone telephony workspace. Route-gated by PermissionGuard
// (route-permissions.ts: /communication/dialer requires communication.calling:create).
// Call Records live on /communication/calling.
const DialerPage = () => {
  return (
    <Fragment>
      <Seo title={"Dialer"} />
      <div className="mt-5 sm:mt-6">
        <DialerWorkspace />
      </div>
    </Fragment>
  );
};

export default DialerPage;
