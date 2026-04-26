"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../profile-load-error";
import styles from "./page.module.css";
import { STAFF } from "./data";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function StaffRosterPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);

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

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  const onShiftCount = STAFF.filter((s) => !s.off).length;
  const offCount = STAFF.filter((s) => s.off).length;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <button className={styles.iconBtn} aria-label="Back">
            &lsaquo;
          </button>
          <div className={styles.breadcrumb}>
            ADMIN / <span className={styles.breadcrumbCurrent}>STAFF</span>
          </div>
          <button className={styles.iconBtn} aria-label="Add staff member">
            +
          </button>
        </div>

        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Staff Roster</h1>
          <div className={styles.heroSub}>
            <span className={styles.shiftDot} />
            {onShiftCount} ON SHIFT
            <span className={styles.sep} />
            {offCount} OFF
            <span className={styles.sep} />
            SAT MAR 21
          </div>
        </div>

        {STAFF.length === 0 ? (
          <p className={styles.empty}>No staff members yet.</p>
        ) : (
          <div className={styles.grid}>
            {STAFF.map((member) => (
              <Link
                key={member.slug}
                href={`/admin/staff/${member.slug}`}
                className={[
                  styles.card,
                  member.off ? styles.cardOff : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.cardStrip}>
                  <span>{member.roleStrip}</span>
                  <span className={styles.onlineDot} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.idRow}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.avatar}
                      src={member.avatarSrc}
                      alt={`${member.firstName} ${member.lastName}`}
                      width={38}
                      height={38}
                    />
                    <div className={styles.name}>
                      {member.firstName}
                      <br />
                      {member.lastName}
                    </div>
                  </div>
                  <div className={styles.role}>{member.shiftLabel}</div>
                  <div className={styles.bottomRow}>
                    {member.metrics.map((m, i) => (
                      <div key={i} className={styles.metric}>
                        <div className={styles.metricVal}>{m.value}</div>
                        <div className={styles.metricLbl}>{m.label}</div>
                      </div>
                    ))}
                    <div className={styles.drillBtn} aria-hidden="true">
                      &rsaquo;
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <button className={styles.addStaff}>
          <span className={styles.addPlus}>+</span>
          <span>Add staff member</span>
        </button>

        <div className={styles.footnote}>TAP A CARD FOR FULL PROFILE</div>
      </div>
    </div>
  );
}
