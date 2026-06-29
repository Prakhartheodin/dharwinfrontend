"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import {
  searchAvailableTelephonyNumbers,
  buyTelephonyNumber,
  listOwnedTelephonyNumbers,
  type AvailableTelephonyNumber,
  type OwnedTelephonyNumber,
  type TelephonyNumberType,
} from "@/shared/lib/api/telephony";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import { COUNTRY_PHONE_RULES } from "@/shared/lib/country-phone";
import pipelineStyles from "../../../ats/ats-pipeline-list.module.css";

// Country catalogue for number search (ISO codes from shared country-phone rules).
const COUNTRY_OPTIONS: { value: string; label: string }[] = COUNTRY_PHONE_RULES.filter(
  (c) => c.code !== "OTHER"
)
  .map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))
  .sort((a, b) => a.label.localeCompare(b.label));

const TYPE_OPTIONS: { value: TelephonyNumberType; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "tollfree", label: "Toll-free" },
  { value: "mobile", label: "Mobile" },
];

function formatRate(rate: string | number | null): string {
  if (rate == null || rate === "") return "—";
  const n = Number(rate);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(rate);
}

function formatAddedOn(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function axiosMessage(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    return (e.response?.data as { message?: string })?.message ?? e.message ?? fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

export default function CompanyWorkNumberPanel({ onPurchased }: { onPurchased?: () => void } = {}) {
  const { permissions, isPlatformSuperUser, isAdministrator, permissionsLoaded } = useAuth();
  const authSubject = { permissions, isPlatformSuperUser, isAdministrator };
  const canCreateCalls = hasPermission(authSubject, "create_call");

  const [countryIso, setCountryIso] = useState("US");
  const [type, setType] = useState<TelephonyNumberType>("local");
  const [pattern, setPattern] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [nearNumber, setNearNumber] = useState("");
  const [distance, setDistance] = useState("");
  const [voice, setVoice] = useState(true);
  const [sms, setSms] = useState(false);
  const [mms, setMms] = useState(false);
  const [fax, setFax] = useState(false);

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AvailableTelephonyNumber[]>([]);
  const [offset, setOffset] = useState(0);
  const [nextPageToken, setNextPageToken] = useState("");
  const [searchProvider, setSearchProvider] = useState<"plivo" | "twilio" | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const PAGE_LIMIT = 20;

  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<Record<string, true>>({});
  const [confirmNumber, setConfirmNumber] = useState<AvailableTelephonyNumber | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  // Numbers already on the connected telephony account.
  const [owned, setOwned] = useState<OwnedTelephonyNumber[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(true);
  const [ownedError, setOwnedError] = useState("");

  const loadOwned = useCallback(async () => {
    setOwnedLoading(true);
    setOwnedError("");
    try {
      const res = await listOwnedTelephonyNumbers();
      setOwned(res.numbers || []);
    } catch (err) {
      setOwnedError(axiosMessage(err, "Failed to load your numbers"));
    } finally {
      setOwnedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOwned();
  }, [loadOwned]);

  const services = useMemo(() => {
    const parts: string[] = [];
    if (voice) parts.push("voice");
    if (sms) parts.push("sms");
    if (mms) parts.push("mms");
    if (fax) parts.push("fax");
    return parts.join(",");
  }, [voice, sms, mms, fax]);

  const runSearch = useCallback(
    async (mode: "new" | "more") => {
      const append = mode === "more";
      setError("");
      if (append) setLoadingMore(true);
      else {
        setSearching(true);
        setNextPageToken("");
        setSearchProvider(null);
      }
      setSearched(true);
      try {
        const trimmedNear = nearNumber.trim();
        const distanceNum = distance.trim() ? Number(distance.trim()) : undefined;
        const params: Parameters<typeof searchAvailableTelephonyNumbers>[0] = {
          countryIso,
          type,
          pattern: pattern.trim() || undefined,
          services: services || undefined,
          city: city.trim() || undefined,
          region: region.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          nearNumber: trimmedNear || undefined,
          distance:
            trimmedNear && distanceNum != null && Number.isFinite(distanceNum) ? distanceNum : undefined,
          limit: PAGE_LIMIT,
        };

        if (append && searchProvider === "twilio" && nextPageToken) {
          params.pageToken = nextPageToken;
        } else if (append) {
          params.offset = offset + PAGE_LIMIT;
        } else {
          params.offset = 0;
        }

        const res = await searchAvailableTelephonyNumbers(params);
        const batch = res.numbers || [];
        setResults((prev) => (append ? [...prev, ...batch] : batch));
        setHasMore(Boolean(res.hasMore));
        setNextPageToken(res.nextPageToken || "");
        setSearchProvider(res.provider ?? null);
        if (!append) setOffset(0);
        else if (res.provider !== "twilio") setOffset(offset + PAGE_LIMIT);
        setTotal(typeof res.total === "number" ? res.total : null);
      } catch (err) {
        if (!append) setResults([]);
        setHasMore(false);
        setNextPageToken("");
        setError(axiosMessage(err, "Failed to search numbers"));
      } finally {
        setSearching(false);
        setLoadingMore(false);
      }
    },
    [
      countryIso,
      type,
      pattern,
      services,
      city,
      region,
      postalCode,
      nearNumber,
      distance,
      offset,
      nextPageToken,
      searchProvider,
    ]
  );

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      void runSearch("new");
    },
    [runSearch]
  );

  const showToast = useCallback((kind: "success" | "error", msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleConfirmBuy = useCallback(async () => {
    if (!canCreateCalls) return;
    if (!confirmNumber) return;
    const num = confirmNumber.number;
    setConfirmNumber(null);
    setBuyingNumber(num);
    try {
      const res = await buyTelephonyNumber(num);
      setPurchased((prev) => ({ ...prev, [num]: true }));
      showToast("success", res.message || `Purchased ${num}.`);
      void loadOwned();
      onPurchased?.();
    } catch (err) {
      showToast("error", axiosMessage(err, `Failed to buy ${num}`));
    } finally {
      setBuyingNumber(null);
    }
  }, [canCreateCalls, confirmNumber, showToast, loadOwned, onPurchased]);

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
      {/* Your current numbers — already on the connected telephony account */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-defaultborder/70 bg-white/60 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-2 border-b border-defaultborder/60 px-4 py-3.5 dark:border-white/10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div>
            <h6 className="mb-0.5 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
              Your current numbers
            </h6>
            <p className="mb-0 text-xs text-defaulttextcolor/55 dark:text-white/45">
              Numbers already rented on the connected telephony account.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!ownedLoading && !ownedError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <i className="ri-phone-line" aria-hidden />
                {owned.length} owned
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void loadOwned()}
              disabled={ownedLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/70 px-3 py-1 text-xs font-semibold text-defaulttextcolor/75 transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/70 dark:hover:bg-white/5"
            >
              <i className={ownedLoading ? "ri-loader-4-line animate-spin" : "ri-refresh-line"} aria-hidden />
              Refresh
            </button>
          </div>
        </div>

        {ownedError ? (
          <div className="flex gap-3 px-5 py-4 text-sm text-danger" role="alert">
            <i className="ri-error-warning-line mt-0.5 shrink-0 text-lg" aria-hidden />
            <span>{ownedError}</span>
          </div>
        ) : ownedLoading ? (
          <div className="flex items-center gap-2 px-5 py-6 text-sm text-defaulttextcolor/55 dark:text-white/45" role="status">
            <i className="ri-loader-4-line animate-spin text-lg" aria-hidden />
            Loading your numbers…
          </div>
        ) : owned.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <i className="ri-phone-line mb-2 text-2xl text-defaulttextcolor/30 dark:text-white/30" aria-hidden />
            <p className="mb-0 text-sm text-defaulttextcolor/60 dark:text-white/50">
              No numbers yet. Buy one below and it shows up here.
            </p>
          </div>
        ) : (
          <div className={pipelineStyles.tableWrap}>
            <table className={`w-full text-sm ${pipelineStyles.tableWide}`}>
              <thead>
                <tr className="border-b border-defaultborder/60 text-left text-xs uppercase tracking-wide text-defaulttextcolor/55 dark:border-white/10 dark:text-white/45">
                  <th className="px-5 py-3 font-semibold">Number</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 font-semibold">Monthly</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                  <th className="px-4 py-3 font-semibold">Capabilities</th>
                </tr>
              </thead>
              <tbody>
                {owned.map((n) => (
                  <tr key={n.number} className="border-b border-defaultborder/40 last:border-0 dark:border-white/5">
                    <td className="px-5 py-3 font-medium text-defaulttextcolor dark:text-white">
                      {n.number}
                      {n.alias ? (
                        <span className="mt-0.5 block text-[0.6875rem] font-normal text-defaulttextcolor/50 dark:text-white/40">
                          {n.alias}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize text-defaulttextcolor/75 dark:text-white/65">{n.type || "—"}</td>
                    <td className="px-4 py-3 text-defaulttextcolor/75 dark:text-white/65">{n.region || "—"}</td>
                    <td className="px-4 py-3 text-defaulttextcolor/75 dark:text-white/65">{formatRate(n.monthlyRentalRate)}</td>
                    <td className="px-4 py-3 text-defaulttextcolor/75 dark:text-white/65">{formatAddedOn(n.addedOn)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {n.voiceEnabled ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 dark:text-emerald-300">
                            Voice
                          </span>
                        ) : null}
                        {n.smsEnabled ? (
                          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700 dark:text-sky-300">
                            SMS
                          </span>
                        ) : null}
                        {n.mmsEnabled ? (
                          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700 dark:text-violet-300">
                            MMS
                          </span>
                        ) : null}
                        {!n.voiceEnabled && !n.smsEnabled && !n.mmsEnabled ? (
                          <span className="text-defaulttextcolor/40">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="min-w-0 rounded-2xl border border-defaultborder/70 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-5"
      >
        <div className="mb-4">
          <h6 className="mb-1 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
            Buy a company work number
          </h6>
          <p className="mb-0 max-w-xl text-xs leading-relaxed text-defaulttextcolor/60 dark:text-white/50">
            Search the telephony catalogue for available numbers, then purchase one.{" "}
            <span className="font-medium text-defaulttextcolor/80 dark:text-white/70">
              Buying a number is a real, paid action
            </span>{" "}
            billed to the connected telephony account.
            {!canCreateCalls && permissionsLoaded ? (
              <span className="mt-1 block text-amber-700 dark:text-amber-400">
              Read-only: you need call create permission to buy numbers.
              </span>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Country
            </span>
            <select
              className="form-select w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={countryIso}
              onChange={(e) => setCountryIso(e.target.value)}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Number type
            </span>
            <select
              className="form-select w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={type}
              onChange={(e) => setType(e.target.value as TelephonyNumberType)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Pattern / prefix <span className="text-defaulttextcolor/40">(optional)</span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 415"
              className="form-control w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              City <span className="text-defaulttextcolor/40">(local)</span>
            </span>
            <input
              type="text"
              placeholder="e.g. San Francisco"
              className="form-control w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              State / province
            </span>
            <input
              type="text"
              placeholder="e.g. CA or California"
              className="form-control w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Postal code <span className="text-defaulttextcolor/40">(optional)</span>
            </span>
            <input
              type="text"
              placeholder="e.g. 94105"
              className="form-control w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Near number <span className="text-defaulttextcolor/40">(geo search)</span>
            </span>
            <input
              type="text"
              inputMode="tel"
              placeholder="e.g. +14155551212"
              className="form-control w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={nearNumber}
              onChange={(e) => setNearNumber(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Distance (miles) <span className="text-defaulttextcolor/40">(with near number)</span>
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 25"
              className="form-control w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              disabled={!nearNumber.trim()}
            />
          </label>

          <div className="block lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
              Capabilities
            </span>
            <div className="flex flex-wrap items-center gap-4 pt-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-defaulttextcolor/80 dark:text-white/70">
                <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} />
                Voice
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-defaulttextcolor/80 dark:text-white/70">
                <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
                SMS
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-defaulttextcolor/80 dark:text-white/70">
                <input type="checkbox" checked={mms} onChange={(e) => setMms(e.target.checked)} />
                MMS
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-defaulttextcolor/80 dark:text-white/70">
                <input type="checkbox" checked={fax} onChange={(e) => setFax(e.target.checked)} />
                Fax
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={searching}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className={searching ? "ri-loader-4-line animate-spin" : "ri-search-line"} aria-hidden />
            {searching ? "Searching…" : "Search numbers"}
          </button>
        </div>
      </form>

      {error ? (
        <div
          className="flex gap-3 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm text-danger dark:bg-danger/10"
          role="alert"
        >
          <i className="ri-error-warning-line mt-0.5 shrink-0 text-lg" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Results */}
      {searched && !searching && !error ? (
        results.length === 0 ? (
          <div className="rounded-2xl border border-defaultborder/70 bg-white/60 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <i className="ri-phone-find-line mb-2 text-3xl text-defaulttextcolor/30 dark:text-white/30" aria-hidden />
            <p className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">No numbers found</p>
            <p className="mb-0 text-xs text-defaulttextcolor/55 dark:text-white/45">
              Try a different country, type, or pattern.
            </p>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-2xl border border-defaultborder/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
            <div className={pipelineStyles.tableWrap}>
              <table className={`w-full text-sm ${pipelineStyles.tableWideLg}`}>
                <thead>
                  <tr className="border-b border-defaultborder/60 text-left text-xs uppercase tracking-wide text-defaulttextcolor/55 dark:border-white/10 dark:text-white/45">
                    <th className="px-4 py-3 font-semibold">Number</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Region / City</th>
                    <th className="px-4 py-3 font-semibold">Monthly</th>
                    <th className="px-4 py-3 font-semibold">Setup</th>
                    <th className="px-4 py-3 font-semibold">Usage rates</th>
                    <th className="px-4 py-3 font-semibold">Capabilities</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((n) => {
                    const isPurchased = Boolean(purchased[n.number]);
                    const isBuying = buyingNumber === n.number;
                    return (
                      <tr
                        key={n.number}
                        className="border-b border-defaultborder/40 last:border-0 dark:border-white/5"
                      >
                        <td className="px-4 py-3 font-medium text-defaulttextcolor dark:text-white">
                          {n.number}
                          {n.restriction || n.restrictionText ? (
                            <span
                              className="mt-0.5 flex items-center gap-1 text-[0.6875rem] font-normal text-amber-600 dark:text-amber-400"
                              title={n.restrictionText || n.restriction}
                            >
                              <i className="ri-error-warning-line" aria-hidden />
                              {n.restriction || "Restricted"}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 capitalize text-defaulttextcolor/75 dark:text-white/65">
                          {n.type || "—"}
                        </td>
                        <td className="px-4 py-3 text-defaulttextcolor/75 dark:text-white/65">
                          {[n.region, n.city].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-defaulttextcolor/75 dark:text-white/65">
                          {formatRate(n.monthlyRentalRate)}
                        </td>
                        <td className="px-4 py-3 text-defaulttextcolor/75 dark:text-white/65">
                          {formatRate(n.setupRate)}
                        </td>
                        <td className="px-4 py-3 text-xs text-defaulttextcolor/65 dark:text-white/55">
                          <div className="flex flex-col gap-0.5">
                            {n.voiceRate != null ? <span>Voice {formatRate(n.voiceRate)}/min</span> : null}
                            {n.smsRate != null ? <span>SMS {formatRate(n.smsRate)}/msg</span> : null}
                            {n.voiceRate == null && n.smsRate == null ? (
                              <span className="text-defaulttextcolor/40">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {n.voiceEnabled ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 dark:text-emerald-300">
                                Voice
                              </span>
                            ) : null}
                            {n.smsEnabled ? (
                              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700 dark:text-sky-300">
                                SMS
                              </span>
                            ) : null}
                            {n.mmsEnabled ? (
                              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700 dark:text-violet-300">
                                MMS
                              </span>
                            ) : null}
                            {!n.voiceEnabled && !n.smsEnabled && !n.mmsEnabled ? (
                              <span className="text-defaulttextcolor/40">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPurchased ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              <i className="ri-check-line" aria-hidden />
                              Purchased
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isBuying || !canCreateCalls}
                              onClick={() => setConfirmNumber(n)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <i className={isBuying ? "ri-loader-4-line animate-spin" : "ri-shopping-cart-line"} aria-hidden />
                              {isBuying ? "Buying…" : "Buy"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-defaultborder/50 px-4 py-3 dark:border-white/10">
              <span className="text-xs text-defaulttextcolor/55 dark:text-white/45">
                Showing {results.length}
                {total != null ? ` of ${total}` : ""} number{results.length === 1 ? "" : "s"}
              </span>
              {hasMore ? (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void runSearch("more")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-defaultborder/70 px-4 py-1.5 text-xs font-semibold text-defaulttextcolor/75 transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/70 dark:hover:bg-white/5"
                >
                  <i className={loadingMore ? "ri-loader-4-line animate-spin" : "ri-arrow-down-line"} aria-hidden />
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </div>
          </div>
        )
      ) : null}

      {/* Buy confirmation dialog */}
      {confirmNumber ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-defaultborder/70 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-bodybg">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <i className="ri-alert-line text-xl" aria-hidden />
              </span>
              <h6 className="text-base font-semibold text-defaulttextcolor dark:text-white">Confirm purchase</h6>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-defaulttextcolor/70 dark:text-white/60">
              You are about to buy{" "}
              <span className="font-semibold text-defaulttextcolor dark:text-white">{confirmNumber.number}</span> for{" "}
              <span className="font-semibold">{formatRate(confirmNumber.monthlyRentalRate)}/mo</span>
              {confirmNumber.setupRate != null ? (
                <> plus a {formatRate(confirmNumber.setupRate)} setup fee</>
              ) : null}
              . This is a <span className="font-semibold text-danger">real, paid action</span> charged to the telephony
              account and cannot be undone here.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmNumber(null)}
                className="rounded-full border border-defaultborder/70 px-4 py-1.5 text-sm font-medium text-defaulttextcolor/75 transition-colors hover:bg-black/[0.03] dark:text-white/70 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmBuy()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <i className="ri-shopping-cart-line" aria-hidden />
                Buy number
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.kind === "success"
              ? "bg-emerald-600 text-white"
              : "bg-danger text-white"
          }`}
          role="status"
        >
          <i className={toast.kind === "success" ? "ri-check-line" : "ri-error-warning-line"} aria-hidden />
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
