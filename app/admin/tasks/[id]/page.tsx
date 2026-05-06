"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../../profile-load-error";
import ReassignPanel from "@/components/admin/ReassignPanel";
import { AVATAR_ANGIE } from "../../staff/data";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TaskBucket = "arrivals" | "departures" | "stayovers" | "dailys" | "eod";
type Priority = "low" | "normal" | "high" | "critical";
type DotColor = "green" | "amber" | "red";

type AdminTaskView = {
  id: string;
  workOrderId: string;
  title: string;
  bucket: TaskBucket;
  createdAt: string;
  dueAt: string;
  assignee: { name: string; avatarUri: string };
  room: string;
  sts: { label: string; dot: DotColor };
  priority: Priority;
  adminNotes: string;
  notesAuthor: string;
  activity: { actor: string; text: string; timestamp: string }[];
};

/* ------------------------------------------------------------------ */
/* Bucket theme — drives dull-body, dull-header, dull-text, dull-text-on
   dull-text: text color on dull surfaces (panel heads, hero strip)
   dull-text-on: text inside elements filled with dull-text (CTAs, chips)
   ------------------------------------------------------------------ */

type BucketTheme = {
  body: string;
  header: string;
  text: string;
  textOn: string;
};

const BUCKET_THEME: Record<TaskBucket, BucketTheme> = {
  arrivals:   { body: "var(--arrivals-dull-body)",   header: "var(--arrivals-dull-header)",   text: "#5C3A00",           textOn: "var(--shell-cream)" },
  departures: { body: "var(--departures-dull-body)", header: "var(--departures-dull-header)", text: "var(--shell-cream)", textOn: "#1A3A30"            },
  stayovers:  { body: "var(--stayovers-dull-body)",  header: "var(--stayovers-dull-header)",  text: "var(--shell-cream)", textOn: "var(--shell-cream)" },
  dailys:     { body: "var(--dailys-dull-body)",     header: "var(--dailys-dull-header)",     text: "#2C2040",           textOn: "var(--shell-cream)" },
  eod:        { body: "var(--eod-dull-body)",        header: "var(--eod-dull-header)",        text: "#5C2020",           textOn: "var(--shell-cream)" },
};

const BUCKET_LABEL: Record<TaskBucket, string> = {
  arrivals:   "ARRIVALS",
  departures: "DEPARTURES",
  stayovers:  "STAYOVERS",
  dailys:     "DAILYS",
  eod:        "EOD",
};

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "low",      label: "Low"      },
  { key: "normal",   label: "Normal"   },
  { key: "high",     label: "High"     },
  { key: "critical", label: "Critical" },
];

const SDOT_CLASS: Record<DotColor, string> = {
  green: styles.sdotGreen,
  amber: styles.sdotAmber,
  red:   styles.sdotRed,
};

/* ------------------------------------------------------------------ */
/* Avatar placeholder                                                  */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Static task data — TODO: replace with Supabase fetch post-beta     */
/* ------------------------------------------------------------------ */

const TASK: AdminTaskView = {
  id: "hk-1",
  workOrderId: "DEPARTURE · ROOM 33",
  title: "Turn over 33 for 4pm check-in",
  bucket: "departures",
  createdAt: "10:15 AM by Courtney",
  dueAt: "3:30 PM",
  assignee: { name: "Angie Lopez", avatarUri: AVATAR_ANGIE },
  room: "33",
  sts: { label: "In progress", dot: "amber" },
  priority: "high",
  adminNotes:
    "VIP arrival — guest is allergic to feather pillows, swap to foam before check-in. Confirm fridge stocked with sparkling water per request.",
  notesAuthor: "COURTNEY",
  activity: [
    {
      actor: "Angie",
      text: "“Started at 1:05 — linens low, sent to laundry”",
      timestamp: "1:15 PM",
    },
    {
      actor: "Angie",
      text: "started turnover",
      timestamp: "1:05 PM",
    },
    {
      actor: "Courtney",
      text: "assigned to Angie Lopez",
      timestamp: "10:15 AM",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminTaskViewPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [priority, setPriority] = useState<Priority>(TASK.priority);
  const [liveStaffId, setLiveStaffId] = useState<string | null>(null);
  const [liveStaffName, setLiveStaffName] = useState<string | null>(null);

  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  // Day 35 III.H Scope B / II.G — live assignee fetch backing the ReassignPanel.
  // The rest of this page is still mocked (chase #1 territory); we only need
  // staff_id + assignee_name (+ embedded staff name) for the reassign flow.
  const loadLiveAssignee = useCallback(async () => {
    if (!id || id === "unknown") return;
    const { data } = await supabase
      .from("tasks")
      .select("id, staff_id, assignee_name, staff (name)")
      .eq("id", id)
      .maybeSingle();
    if (!data) {
      setLiveStaffId(null);
      setLiveStaffName(null);
      return;
    }
    const staffId =
      typeof data.staff_id === "string" ? data.staff_id : null;
    setLiveStaffId(staffId);
    const staffEmbed = data.staff as unknown;
    let embeddedName: string | undefined;
    if (
      Array.isArray(staffEmbed) &&
      staffEmbed[0] &&
      typeof staffEmbed[0] === "object"
    ) {
      embeddedName = (staffEmbed[0] as { name?: string }).name;
    } else if (
      staffEmbed &&
      typeof staffEmbed === "object" &&
      !Array.isArray(staffEmbed)
    ) {
      embeddedName = (staffEmbed as { name?: string }).name;
    }
    const fallback =
      typeof data.assignee_name === "string" ? data.assignee_name : "";
    const resolved = (embeddedName?.trim() || fallback.trim()) || null;
    setLiveStaffName(resolved);
  }, [id]);

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

  useEffect(() => {
    if (!ready) return;
    void loadLiveAssignee();
  }, [ready, loadLiveAssignee]);

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  if (id === "unknown") {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Task not found.{" "}
          <Link href="/admin/tasks">Back to tasks</Link>
        </div>
      </div>
    );
  }

  const task = TASK;
  const theme = BUCKET_THEME[task.bucket];

  return (
    <div className={styles.page}>
      <div
        className={styles.shell}
        style={{
          "--dull-body":    theme.body,
          "--dull-header":  theme.header,
          "--dull-text":    theme.text,
          "--dull-text-on": theme.textOn,
        } as React.CSSProperties}
      >
        {/* Hero strip */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>ADMIN VIEW</span>
            <span>{task.workOrderId}</span>
          </div>
          <button
            className={styles.closeBtn}
            aria-label="Close"
            onClick={() => router.back()}
          >
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {/* Title */}
          <div className={styles.taskTitle}>{task.title}</div>
          <div className={styles.taskSub}>
            Created {task.createdAt} &middot; Due {task.dueAt}
          </div>

          {/* Meta grid */}
          <div className={styles.metaGrid}>
            <div>
              <div className={styles.metaLabel}>ASSIGNED TO</div>
              <div className={styles.metaVal}>
                <span className={styles.assigneeChip}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.assigneeAvatar}
                    src={task.assignee.avatarUri}
                    alt={task.assignee.name}
                    width={22}
                    height={22}
                  />
                  {task.assignee.name}
                </span>
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>ROOM</div>
              <div className={`${styles.metaVal} ${styles.metaValMono}`}>
                {task.room}
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>BUCKET</div>
              <div className={`${styles.metaVal} ${styles.metaValMono} ${styles.metaValMonoSm}`}>
                {BUCKET_LABEL[task.bucket]}
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>CURRENT STATUS</div>
              <div className={styles.metaVal}>
                <span className={SDOT_CLASS[task.sts.dot]} />
                {task.sts.label}
              </div>
            </div>
          </div>

          {/* Priority panel */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>PRIORITY</span>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.chipRow}>
                {PRIORITIES.map(({ key, label }) => {
                  const isActive = priority === key;
                  const isAlert = isActive && (key === "high" || key === "critical");
                  return (
                    <button
                      key={key}
                      className={[
                        styles.chip,
                        isActive ? styles.chipActive : null,
                        isAlert ? styles.chipAlert : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setPriority(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Admin notes panel */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>ADMIN NOTES</span>
              <span className={styles.panelHeadRight}>FROM {task.notesAuthor}</span>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.notesText}>{task.adminNotes}</div>
            </div>
          </div>

          {/* Activity panel */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>ACTIVITY</span>
              <span className={styles.panelHeadRight}>
                {task.activity.length} EVENTS
              </span>
            </div>
            <div className={`${styles.panelBody} ${styles.panelBodyLog}`}>
              {task.activity.map((event, i) => (
                <div key={i} className={styles.logRow}>
                  <span className={styles.logDot} />
                  <div className={styles.logText}>
                    <b>{event.actor}</b> {event.text}
                  </div>
                  <div className={styles.logTime}>{event.timestamp}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reassign panel — live, plumbed to reassignTask helper. */}
          {id && id !== "unknown" ? (
            <ReassignPanel
              taskId={id}
              currentStaffId={liveStaffId}
              currentStaffName={liveStaffName}
              onSuccess={loadLiveAssignee}
            />
          ) : null}

          {/* CTA pair — TODO: Save & Deploy wires admin write-path post-beta */}
          <div className={styles.ctaPair}>
            <button className={styles.btnSecondary} onClick={() => router.back()}>
              Cancel
            </button>
            <button className={styles.btnPrimary}>
              Save &amp; Deploy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
