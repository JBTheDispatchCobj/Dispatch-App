"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import {
  MAINTENANCE_LOCATIONS,
  MAINTENANCE_TYPES,
} from "@/lib/maintenance";
import ProfileLoadError from "../../profile-load-error";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Severity values mirror public.maintenance_severities seed in
 * docs/supabase/taxonomy_tables.sql. Day 41's Day-1 reconciliation
 * dropped the legacy 4-value priority — Low / Normal / High is the
 * live ladder.
 */
type MaintSeverity = "Low" | "Normal" | "High";

type MaintIssueLite = {
  id: string;
  location: string;
  item: string;
  type: string;
  severity: string;
  body: string | null;
  room_number: string | null;
  created_at: string;
};

/** Severity desc sort keys (mirrors Watchlist convention at app/admin/page.tsx). */
const SEV_RANK: Record<string, number> = { High: 0, Normal: 1, Low: 2 };

/** Sentinel value for "no filter applied." Distinct from the taxonomy values. */
const ALL_FILTER = "All" as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function excerpt(s: string | null | undefined, max = 70): string {
  if (!s) return "";
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function normalizeSeverity(s: string): MaintSeverity {
  if (s === "Low" || s === "Normal" || s === "High") return s;
  return "Normal";
}

/** "MAR 18" — short date for the row meta line. */
function formatRowDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-US", {
      month:    "short",
      day:      "numeric",
      timeZone: "America/Chicago",
    })
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminMaintenanceMasterPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);

  const [locationFilter, setLocationFilter] = useState<string>(ALL_FILTER);
  const [typeFilter,     setTypeFilter]     = useState<string>(ALL_FILTER);

  const [rows, setRows]     = useState<MaintIssueLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Auth gate — clones the [id]/page.tsx pattern (admin-only, redirects
  // non-admin to "/").
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!user) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const profileResult = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!profileResult.ok) {
        setProfileFailure(profileResult.failure);
        return;
      }
      if (profileResult.profile.role !== "admin") {
        window.location.replace("/");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Load (or reload) open issues filtered by location/type. Always
   * `.is("resolved_at", null)` per master plan §II.H spec ("master tables:
   * open issues by location, by type"). Index alignment:
   *   - unfiltered → maintenance_issues_open_idx (partial, where resolved_at is null)
   *   - location set → maintenance_issues_location_idx
   *   - type set → maintenance_issues_type_idx
   * Both filtered indexes carry created_at desc as second key, so DB-side
   * sort stays cheap; severity desc is applied client-side same as the
   * Watchlist lane on /admin.
   */
  const loadRows = useCallback(async () => {
    setLoaded(false);
    setError(null);

    let query = supabase
      .from("maintenance_issues")
      .select(
        "id, location, item, type, severity, body, room_number, created_at, resolved_at",
      )
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (locationFilter !== ALL_FILTER) {
      query = query.eq("location", locationFilter);
    }
    if (typeFilter !== ALL_FILTER) {
      query = query.eq("type", typeFilter);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
      setRows([]);
      setLoaded(true);
      return;
    }
    // supabase-js GenericStringError cast pattern — same workaround documented
    // in lib/maintenance.ts:138 and Day 41's [id]/page.tsx:179.
    const live = (data ?? []) as unknown as MaintIssueLite[];
    // Severity desc client-side; created_at desc tiebreak preserved by the
    // stable sort against the DB-ordered list.
    const sorted = [...live].sort(
      (a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9),
    );
    setRows(sorted);
    setLoaded(true);
  }, [locationFilter, typeFilter]);

  useEffect(() => {
    if (!ready) return;
    void loadRows();
  }, [ready, loadRows]);

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  const filtered =
    locationFilter !== ALL_FILTER || typeFilter !== ALL_FILTER;
  const emptyMsg = filtered
    ? "No open issues match this filter."
    : "No open maintenance issues.";

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <Link href="/admin" className={styles.navBtn} aria-label="Back">
            &lsaquo;
          </Link>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>Maintenance</div>
            <div className={styles.pageSub}>MASTER TABLES</div>
          </div>
          <span className={styles.navBtnSpacer} aria-hidden="true" />
        </div>

        {/* Hero strip — sage, count + dimensions */}
        <div className={styles.heroCard}>
          <div className={styles.heroStrip}>
            <span>
              <span className={styles.heroBadge}>OPEN ISSUES</span>
              {" "}
              {loaded ? rows.length : "—"}
            </span>
            <span>BY LOCATION · BY TYPE</span>
          </div>
        </div>

        {/* Filter panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>FILTERS</span>
            {loaded && filtered && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  setLocationFilter(ALL_FILTER);
                  setTypeFilter(ALL_FILTER);
                }}
              >
                CLEAR
              </button>
            )}
          </div>
          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              <span className={styles.filterLabelText}>LOCATION</span>
              <select
                className={styles.filterSelect}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value={ALL_FILTER}>All locations</option>
                {MAINTENANCE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </label>
            <label className={styles.filterLabel}>
              <span className={styles.filterLabelText}>TYPE</span>
              <select
                className={styles.filterSelect}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value={ALL_FILTER}>All types</option>
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="error" style={{ margin: "0 0 12px" }}>{error}</div>
        )}

        {/* Row list */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>OPEN ISSUES</span>
            <span className={styles.panelHeadRight}>
              {loaded ? `${rows.length} SHOWN` : "LOADING…"}
            </span>
          </div>
          <div className={styles.rowList}>
            {!loaded && (
              <div className={styles.empty}>Loading…</div>
            )}
            {loaded && rows.length === 0 && (
              <div className={styles.empty}>{emptyMsg}</div>
            )}
            {loaded &&
              rows.map((r) => {
                const sev = normalizeSeverity(r.severity);
                const meta = [
                  r.type,
                  r.room_number ? `RM ${r.room_number}` : null,
                  formatRowDate(r.created_at),
                ]
                  .filter(Boolean)
                  .join(" · ");
                const body = excerpt(r.body);
                return (
                  <Link
                    key={r.id}
                    href={`/admin/maintenance/${r.id}`}
                    className={styles.rowLink}
                  >
                    <div className={styles.row}>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>
                          {r.location} — {r.item}
                        </div>
                        <div className={styles.rowMeta}>{meta}</div>
                        {body && (
                          <div className={styles.rowBody}>{body}</div>
                        )}
                      </div>
                      <span
                        className={[
                          styles.rowChip,
                          sev === "High"   ? styles.rowChipHigh   : null,
                          sev === "Normal" ? styles.rowChipNormal : null,
                          sev === "Low"    ? styles.rowChipLow    : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {sev.toUpperCase()}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        <div className={styles.footnote}>
          THE DISPATCH CO &middot; ADMIN &middot; MAINTENANCE
        </div>
      </div>
    </div>
  );
}
