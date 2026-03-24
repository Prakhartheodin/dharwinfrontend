"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { ROUTES } from "@/shared/lib/constants";
import { hasSettingsUsersManage } from "@/shared/lib/permissions";
import * as bolnaApi from "@/shared/lib/api/bolna";
import { AxiosError } from "axios";

const MAX_GREETING = 500;
const MAX_EXTRA = 8000;

export default function SettingsBolnaVoiceAgentPage() {
  const router = useRouter();
  const { permissions, permissionsLoaded, isAdministrator } = useAuth();
  const hasUsersManage = isAdministrator || hasSettingsUsersManage(permissions);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [greetingOverride, setGreetingOverride] = useState("");
  const [extraSystemInstructions, setExtraSystemInstructions] = useState("");

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (!hasUsersManage) router.replace(ROUTES.settingsPersonalInfo);
  }, [permissionsLoaded, hasUsersManage, router]);

  const load = useCallback(async () => {
    if (!hasUsersManage) return;
    setError("");
    setLoading(true);
    try {
      const data = await bolnaApi.getBolnaCandidateAgentSettings();
      setGreetingOverride(data.greetingOverride ?? "");
      setExtraSystemInstructions(data.extraSystemInstructions ?? "");
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Failed to load settings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [hasUsersManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await bolnaApi.patchBolnaCandidateAgentSettings({
        greetingOverride: greetingOverride.slice(0, MAX_GREETING),
        extraSystemInstructions: extraSystemInstructions.slice(0, MAX_EXTRA),
      });
      await load();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const clearOverrides = async () => {
    setGreetingOverride("");
    setExtraSystemInstructions("");
    setSaving(true);
    setError("");
    try {
      await bolnaApi.patchBolnaCandidateAgentSettings({
        greetingOverride: "",
        extraSystemInstructions: "",
      });
      await load();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String((e.response?.data as { message?: string })?.message ?? e.message)
          : "Reset failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!permissionsLoaded || !hasUsersManage) {
    return null;
  }

  return (
    <>
      <Seo title="Voice agent (Bolna)" />
      <div className="box-body space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-defaulttextcolor">Candidate verification voice agent</h2>
          <p className="text-sm text-defaulttextcolor/70 mt-1 max-w-3xl">
            Optional overrides for the Bolna agent used after job applications. Leave blank to use the default
            greeting. Plain text only — max {MAX_EXTRA.toLocaleString()} / {MAX_GREETING} characters. Placeholders:{" "}
            <code className="text-xs bg-light">{"{candidate_name}"}</code>,{" "}
            <code className="text-xs bg-light">{"{job_title}"}</code>,{" "}
            <code className="text-xs bg-light">{"{company_name}"}</code>.
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-defaulttextcolor/70">Loading…</p>
        ) : (
          <div className="space-y-5 max-w-3xl">
            <div>
              <label className="form-label" htmlFor="bolna-greeting">
                Greeting override ({greetingOverride.length}/{MAX_GREETING})
              </label>
              <textarea
                id="bolna-greeting"
                className="form-control"
                rows={3}
                value={greetingOverride}
                onChange={(e) => setGreetingOverride(e.target.value.slice(0, MAX_GREETING))}
                placeholder='e.g. Hello! I am Ava from Dharwin, calling on behalf of {company_name} about {job_title}. Am I speaking with {candidate_name}?'
              />
            </div>
            <div>
              <label className="form-label" htmlFor="bolna-extra">
                Extra system instructions ({extraSystemInstructions.length}/{MAX_EXTRA})
              </label>
              <textarea
                id="bolna-extra"
                className="form-control"
                rows={10}
                value={extraSystemInstructions}
                onChange={(e) => setExtraSystemInstructions(e.target.value.slice(0, MAX_EXTRA))}
                placeholder="Additional instructions appended to the agent system prompt (admin-only)."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ti-btn ti-btn-primary" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-light"
                disabled={saving}
                onClick={() => void clearOverrides()}
              >
                Reset to default
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
