"use client";

import React, { Fragment, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import Seo from "@/shared/layout-components/seo/seo";
import { ROUTES } from "@/shared/lib/constants";
import * as authApi from "@/shared/lib/api/auth";
import { AuthPageLayout } from "@/shared/components/auth-page-layout";
import { AuthFormCard } from "@/shared/components/auth-form-card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">(
    token ? "loading" : "missing"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      setMessage("This link is missing a verification token. Use the link from your email, or ask an admin to resend verification.");
      return;
    }

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        await authApi.verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage("Your email has been verified. You can sign in.");
        redirectTimer = setTimeout(() => router.push(ROUTES.signIn), 2500);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        if (err instanceof AxiosError) {
          const msg = err.response?.data?.message;
          setMessage(
            typeof msg === "string"
              ? msg
              : "Verification failed. The link may be invalid or expired."
          );
        } else {
          setMessage("Verification failed. Please try again or request a new link.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [token, router]);

  return (
    <AuthFormCard>
      <div className="text-center space-y-4 px-2 py-4">
        {status === "loading" && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <i className="ri-checkbox-circle-line text-2xl" aria-hidden />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email verified</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
            <p className="text-xs text-gray-500">Redirecting to sign in…</p>
            <Link
              href={ROUTES.signIn}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Go to sign in
            </Link>
          </>
        )}
        {(status === "error" || status === "missing") && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-600">
              <i className="ri-error-warning-line text-2xl" aria-hidden />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {status === "missing" ? "Invalid link" : "Verification failed"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
            <Link
              href={ROUTES.signIn}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </AuthFormCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Fragment>
      <Seo title="Verify Email" />
      <AuthPageLayout>
        <Suspense
          fallback={
            <AuthFormCard>
              <div className="flex justify-center py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            </AuthFormCard>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </AuthPageLayout>
    </Fragment>
  );
}
