// 404 boundary. Rendered INSIDE app/layout.tsx — must NOT emit its own
// <html>/<body>; doing so produces nested-shell hydration warnings.

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-10 text-center">
      <p className="mb-4">The Above Url Cannot Found</p>
      <Link href="/dashboard" className="btn btn-primary">Return Home</Link>
    </div>
  );
}