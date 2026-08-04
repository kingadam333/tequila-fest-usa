"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw, Mail, AlertCircle, CheckCircle, ExternalLink, ListChecks } from "lucide-react";

interface Lint {
  name: string;
  title: string;
  level: "ERROR" | "WARN" | "INFO";
  categories: string[];
  description: string;
  detail?: string;
  remediation?: string;
  metadata?: { name?: string; entity?: string; schema?: string; type?: string };
}

interface ScanResult {
  issues: Lint[];
  scannedAt: string;
  emailSent?: boolean;
}

const LEVEL_STYLES: Record<string, string> = {
  ERROR: "bg-red-500/15 text-red-400 border border-red-500/30",
  WARN:  "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  INFO:  "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};

const CAT_STYLES: Record<string, string> = {
  SECURITY:    "bg-orange-500/10 text-orange-400",
  PERFORMANCE: "bg-purple-500/10 text-purple-400",
};

export default function SecuritySection({ adminToken }: { adminToken: string }) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [error, setError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  const headers = { "Content-Type": "application/json", "x-admin-token": adminToken };

  async function runScan() {
    setScanning(true);
    setError("");
    setEmailSuccess(false);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }

  async function emailReport() {
    setEmailing(true);
    setEmailSuccess(false);
    setError("");
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "email" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Email failed");
      setResult(data);
      setEmailSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEmailing(false);
    }
  }

  const isClean = result !== null && result.issues.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={22} className="text-yellow-400" />
            Security Scanner
          </h2>
          <p className="text-white/80 text-sm mt-1">
            Scans your Supabase project for security and performance issues.
            {result && (
              <span className="ml-2 text-white/80">
                Last scan: {new Date(result.scannedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {result && (
            <button
              onClick={emailReport}
              disabled={emailing || scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-40 cursor-pointer"
            >
              <Mail size={15} />
              {emailing ? "Sending…" : "Email Report"}
            </button>
          )}
          <button
            onClick={runScan}
            disabled={scanning || emailing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={15} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning…" : "Run Scan"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Error</p>
            <p className="text-sm opacity-80 mt-0.5">{error}</p>
            {error.includes("SUPABASE_ACCESS_TOKEN") && (
              <p className="text-xs opacity-60 mt-2">
                Go to supabase.com → Account → Access Tokens → create one → add it as{" "}
                <code className="font-mono bg-red-500/10 px-1 rounded">SUPABASE_ACCESS_TOKEN</code> in your Vercel project env vars.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Email success toast */}
      {emailSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
          <CheckCircle size={18} />
          <p className="text-sm font-medium">Report emailed to adam@tequilafestusa.com</p>
        </div>
      )}

      {/* No scan yet */}
      {!result && !scanning && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheck size={48} className="text-white/80 mb-4" />
          <p className="text-white/80 text-sm">Click <strong className="text-white/80">Run Scan</strong> to check your Supabase project for security and performance issues.</p>
        </div>
      )}

      {/* Scanning placeholder */}
      {scanning && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <RefreshCw size={36} className="text-yellow-400/40 animate-spin mb-4" />
          <p className="text-white/80 text-sm">Scanning Supabase advisors…</p>
        </div>
      )}

      {/* All clear */}
      {isClean && !scanning && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-green-500/5 border border-green-500/15 rounded-2xl">
          <ShieldCheck size={48} className="text-green-400 mb-3" />
          <p className="text-green-400 font-bold text-lg">All Clear</p>
          <p className="text-white/80 text-sm mt-1">No actionable security or performance issues found.</p>
        </div>
      )}

      {/* Issues table */}
      {result && result.issues.length > 0 && !scanning && (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-red-500/10 border-b border-red-500/20">
            <ShieldAlert size={16} className="text-red-400" />
            <span className="text-red-400 font-semibold text-sm">
              {result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} found
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {result.issues.map((issue, i) => (
              <div key={i} className="p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLES[issue.level] ?? LEVEL_STYLES.INFO}`}>
                    {issue.level}
                  </span>
                  {issue.categories?.map((c) => (
                    <span key={c} className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_STYLES[c] ?? "bg-white/5 text-white/80"}`}>
                      {c}
                    </span>
                  ))}
                  {(issue.metadata?.name || issue.metadata?.entity) && (
                    <span className="text-xs text-white/80 font-mono">
                      {issue.metadata.schema ? `${issue.metadata.schema}.` : ""}{issue.metadata.name ?? issue.metadata.entity}
                    </span>
                  )}
                </div>
                <p className="text-white font-semibold text-sm">{issue.title || issue.name}</p>
                <p className="text-white/80 text-sm mt-1">{issue.detail || issue.description}</p>
                {issue.remediation && (
                  <a
                    href={issue.remediation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-yellow-400/70 hover:text-yellow-400 transition-colors"
                  >
                    <ExternalLink size={11} />
                    View remediation guide
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <MarketingEnvCheck adminToken={adminToken} />
    </div>
  );
}

const CITY_LABELS: Record<string, string> = {
  CINCINNATI: "Cincinnati", CLEVELAND: "Cleveland", COLUMBUS: "Columbus", PHOENIX: "Phoenix",
};

function MarketingEnvCheck({ adminToken }: { adminToken: string }) {
  const [data, setData] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function check() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/diagnostics/marketing-env", { headers: { "x-admin-token": adminToken } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Check failed");
      setData(json);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const sharedKeys = ["BREVO_API_KEY", "TEXTMAGIC_USERNAME", "TEXTMAGIC_API_KEY"];

  return (
    <div className="rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <ListChecks size={16} className="text-yellow-400" />
            Marketing Sync Config (Brevo / TextMagic)
          </h3>
          <p className="text-white/80 text-xs mt-1">Confirms all 4 cities have their list-ID env vars set in Vercel. Booleans only — no secret values are ever shown.</p>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-40 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Checking…" : "Check"}
        </button>
      </div>

      {err && <p className="text-red-400 text-xs mt-3">{err}</p>}

      {data && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {sharedKeys.map((k) => (
              <span key={k} className={`text-xs font-mono px-2 py-1 rounded-lg border ${data[k] ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {data[k] ? "✓" : "✗"} {k}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CITY_LABELS).map(([suffix, city]) => {
              const brevo = data[`BREVO_LIST_ID_${suffix}`];
              const tm = data[`TEXTMAGIC_LIST_ID_${suffix}`];
              const ok = brevo && tm;
              return (
                <div key={suffix} className={`rounded-xl border p-3 ${ok ? "bg-green-500/5 border-green-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                  <p className="text-white text-sm font-semibold">{city}</p>
                  <p className={`text-xs mt-1 ${brevo ? "text-green-400" : "text-red-400"}`}>{brevo ? "✓" : "✗"} Brevo list</p>
                  <p className={`text-xs mt-0.5 ${tm ? "text-green-400" : "text-red-400"}`}>{tm ? "✓" : "✗"} TextMagic list</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
