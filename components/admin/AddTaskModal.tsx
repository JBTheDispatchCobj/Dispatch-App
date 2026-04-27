"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchAssignableStaffOptions,
  type AssignableStaffOption,
} from "@/lib/assignable-staff";
import {
  AVATAR_COURTNEY,
  AVATAR_LIZZIE,
  AVATAR_ANGIE,
  AVATAR_MARK,
} from "@/app/admin/staff/data";
import styles from "./AddTaskModal.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ModalBucket =
  | "arrivals"
  | "departures"
  | "stayovers"
  | "dailys"
  | "eod"
  | "maintenance";

type Priority = "low" | "medium" | "high";
type FormStatus = "editing" | "submitting" | "error" | "success";

export type AddTaskModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedStaffId?: string | null;
  preselectedStaffName?: string | null;
};

/* ------------------------------------------------------------------ */
/* Static config                                                       */
/* ------------------------------------------------------------------ */

type BucketConfig = {
  label: string;
  shortLabel: string;
  body: string;
  header: string;
  text: string;
};

const BUCKET_CONFIG: Record<ModalBucket, BucketConfig> = {
  arrivals:    { label: "Arrivals",    shortLabel: "Arrival",  body: "var(--arrivals-body)",    header: "var(--arrivals-header)",    text: "var(--arrivals-text)"    },
  departures:  { label: "Departures",  shortLabel: "Depart",   body: "var(--departures-body)",  header: "var(--departures-header)",  text: "var(--departures-text)"  },
  stayovers:   { label: "Stayovers",   shortLabel: "Stay",     body: "var(--stayovers-body)",   header: "var(--stayovers-header)",   text: "var(--stayovers-text)"   },
  dailys:      { label: "Dailys",      shortLabel: "Daily",    body: "var(--dailys-body)",      header: "var(--dailys-header)",      text: "var(--dailys-text)"      },
  eod:         { label: "End of Day",  shortLabel: "EOD",      body: "var(--eod-body)",         header: "var(--eod-header)",         text: "var(--eod-text)"         },
  maintenance: { label: "Maintenance", shortLabel: "Maint",    body: "var(--sage-body)",        header: "var(--sage-header)",        text: "var(--sage-text)"        },
};

const BUCKET_ORDER: ModalBucket[] = [
  "arrivals",
  "departures",
  "stayovers",
  "dailys",
  "eod",
  "maintenance",
];

const AVATAR_MAP: Record<string, string> = {
  "Courtney Manager": AVATAR_COURTNEY,
  "Lizzie Larson":    AVATAR_LIZZIE,
  "Angie Lopez":      AVATAR_ANGIE,
  "Mark Parry":       AVATAR_MARK,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function firstNameOf(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
}

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function bucketToCardType(bucket: ModalBucket): string {
  if (bucket === "maintenance") return "maintenance";
  if (bucket === "departures") return "housekeeping_turn";
  if (bucket === "arrivals") return "arrival";
  if (bucket === "stayovers") return "stayover";
  if (bucket === "eod") return "eod";
  if (bucket === "dailys") return "dailys";
  return "generic";
}

function buildContext(bucket: ModalBucket, notes: string): Record<string, unknown> {
  const staffHomeBucket = bucket === "maintenance" ? "start_of_day" : bucket;
  const ctx: Record<string, unknown> = { staff_home_bucket: staffHomeBucket };
  if (notes.trim()) ctx.notes = notes.trim();
  return ctx;
}

function priorityLabel(p: Priority): string {
  if (p === "low") return "Low";
  if (p === "high") return "High";
  return "Normal";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AddTaskModal({
  open,
  onClose,
  onSuccess,
  preselectedStaffId,
  preselectedStaffName,
}: AddTaskModalProps) {
  const [status, setStatus] = useState<FormStatus>("editing");
  const [validationShown, setValidationShown] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [staff, setStaff] = useState<AssignableStaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState<ModalBucket | null>(null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isPreselectedLocked, setIsPreselectedLocked] = useState(false);

  const [countdown, setCountdown] = useState(3);

  function doReset() {
    setStatus("editing");
    setValidationShown(false);
    setErrorMessage("");
    setTitle("");
    setBucket(null);
    setPriority("medium");
    setAssigneeId(preselectedStaffId ?? null);
    setIsPreselectedLocked(!!preselectedStaffId);
    setRoomNumber("");
    setNotes("");
    setCountdown(3);
  }

  useEffect(() => {
    if (!open) return;
    doReset();
    setStaffLoading(true);
    void fetchAssignableStaffOptions(supabase).then(({ options }) => {
      setStaff(options);
      setStaffLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (status !== "success") return;
    setCountdown(3);
    const iv = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const t = setTimeout(() => {
      clearInterval(iv);
      onSuccess();
      onClose();
    }, 3000);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!open) return null;

  /* ---- Derived values ---- */
  const selectedAssigneeName =
    staff.find((s) => s.id === assigneeId)?.name ??
    (assigneeId === preselectedStaffId ? (preselectedStaffName ?? "") : "");

  const selectedFirstName = firstNameOf(selectedAssigneeName);

  const whatCount =
    (title.trim() ? 1 : 0) + (bucket ? 1 : 0) + 1; // priority always set
  const whoCount =
    (assigneeId ? 1 : 0) + (roomNumber.trim() ? 1 : 0);

  const titleError = validationShown && !title.trim();
  const bucketError = validationShown && !bucket;
  const assigneeError = validationShown && !assigneeId && !staffLoading;

  const validationErrorCount = [
    !title.trim(),
    !bucket,
    !assigneeId && !staffLoading,
  ].filter(Boolean).length;

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  const dispatchDisabled = isSubmitting || isSuccess || !title.trim();

  const dispatchBtnVars = bucket
    ? ({
        "--dispatch-bg": BUCKET_CONFIG[bucket].header,
        "--dispatch-color": BUCKET_CONFIG[bucket].text,
      } as React.CSSProperties)
    : ({} as React.CSSProperties);

  /* ---- Hero content ---- */
  const heroBadge = isSuccess ? "DISPATCHED" : "NEW TASK";
  const heroContextText =
    bucket && !isSuccess
      ? `${BUCKET_CONFIG[bucket].label.toUpperCase()}${selectedFirstName ? ` · FOR ${selectedFirstName.toUpperCase()}` : ""}`
      : selectedFirstName
        ? `FOR ${selectedFirstName.toUpperCase()}`
        : null;

  /* ---- Toast sub-line ---- */
  const toastSub = [
    bucket ? BUCKET_CONFIG[bucket].label.toUpperCase() : null,
    roomNumber.trim() ? `ROOM ${roomNumber.trim()}` : null,
    `${priorityLabel(priority).toUpperCase()} PRIORITY`,
  ]
    .filter(Boolean)
    .join(" · ");

  /* ---- Dispatch handler ---- */
  async function handleDispatch() {
    if (!title.trim() || !bucket || !assigneeId) {
      setValidationShown(true);
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const today = new Date().toISOString().split("T")[0];
      const name =
        staff.find((s) => s.id === assigneeId)?.name ??
        (preselectedStaffName ?? "");

      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        status: "open",
        due_date: today,
        staff_id: assigneeId,
        assignee_name: name,
        priority,
        created_by_user_id: user?.id ?? null,
        card_type: bucketToCardType(bucket),
        source: "manual",
        context: buildContext(bucket, notes),
        room_number: roomNumber.trim() || null,
      });

      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  function handleChipSelect(staffOption: AssignableStaffOption) {
    setAssigneeId(staffOption.id);
    setIsPreselectedLocked(false);
  }

  function handleClose() {
    if (!isSubmitting && !isSuccess) onClose();
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal}>

          {/* Hero strip */}
          <div className={styles.hero}>
            <div className={styles.heroLeft}>
              <span className={styles.heroBadge}>{heroBadge}</span>
              {heroContextText && (
                <span className={styles.heroContext}>
                  {bucket && !isSuccess && (
                    <span
                      className={styles.heroBucketDot}
                      style={{ background: BUCKET_CONFIG[bucket].body }}
                    />
                  )}
                  {heroContextText}
                </span>
              )}
            </div>
            <button
              className={styles.closeBtn}
              aria-label="Close"
              disabled={isSubmitting || isSuccess}
              onClick={handleClose}
            >
              &times;
            </button>
          </div>

          {/* Success state */}
          {isSuccess && (
            <>
              <div className={styles.toast}>
                <div className={styles.toastIcon}>&check;</div>
                <div className={styles.toastBody}>
                  <p className={styles.toastTitle}>
                    Task dispatched{selectedFirstName ? ` to ${selectedFirstName}` : ""}.
                  </p>
                  <p className={styles.toastSub}>{toastSub}</p>
                </div>
              </div>
              <div className={styles.body}>
                <p className={styles.countdown}>CLOSING IN {countdown}&hellip;</p>
              </div>
            </>
          )}

          {/* Editing / submitting / error state */}
          {!isSuccess && (
            <div
              className={`${styles.body}${isSubmitting ? ` ${styles.bodyFrozen}` : ""}`}
            >
              <p className={styles.titleLine}>Add a task</p>
              <p className={styles.titleSub}>
                {isSubmitting
                  ? "Dispatching…"
                  : selectedFirstName
                    ? `Dispatches to ${selectedFirstName}’s queue on save`
                    : "Fill in the details below"}
              </p>

              {/* Validation banner */}
              {validationShown && validationErrorCount > 0 && !isSubmitting && (
                <div className={styles.banner}>
                  <span className={styles.bannerIcon}>!</span>
                  <span>
                    {validationErrorCount === 1
                      ? "1 field needs attention before dispatch."
                      : `${validationErrorCount} fields need attention before dispatch.`}
                  </span>
                </div>
              )}

              {/* Server error block */}
              {isError && errorMessage && (
                <div className={styles.errBlock}>
                  <p className={styles.errHeadline}>
                    Couldn&apos;t dispatch the task. Try again, or copy this and ping Bryan.
                  </p>
                  <p className={styles.errDetail}>{errorMessage}</p>
                </div>
              )}

              {/* WHAT panel */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span>WHAT</span>
                  <span className={styles.panelHeadSub}>
                    {whatCount === 0 ? "REQUIRED" : `${whatCount} OF 3`}
                  </span>
                </div>
                <div className={styles.panelBody}>

                  {/* Title */}
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>
                      <span className={styles.reqDot} />
                      Title
                    </div>
                    <input
                      className={`${styles.input}${titleError ? ` ${styles.inputError}` : ""}`}
                      placeholder="e.g., Turn over Room 14"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {titleError && (
                      <p className={styles.fieldError}>Title is required.</p>
                    )}
                  </div>

                  {/* Bucket */}
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>
                      <span className={styles.reqDot} />
                      Bucket
                    </div>
                    <div className={styles.bucketGrid}>
                      {BUCKET_ORDER.map((b) => {
                        const cfg = BUCKET_CONFIG[b];
                        const isActive = bucket === b;
                        const chipVars = isActive
                          ? ({
                              "--bc-bg": cfg.body,
                              "--bc-text": cfg.text,
                              "--bc-border": cfg.header,
                            } as React.CSSProperties)
                          : undefined;
                        return (
                          <button
                            key={b}
                            className={`${styles.bucketChip}${isActive ? ` ${styles.bucketChipActive}` : ""}`}
                            style={chipVars}
                            disabled={isSubmitting}
                            onClick={() => setBucket(b)}
                          >
                            <span
                              className={styles.bucketSwatch}
                              style={{ background: cfg.body }}
                            />
                            {cfg.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                    {bucketError && (
                      <p className={styles.fieldError}>
                        Pick a bucket so it routes correctly.
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>
                      <span className={styles.reqDot} />
                      Priority
                    </div>
                    <div className={styles.chipRow}>
                      {(["low", "medium", "high"] as Priority[]).map((p) => {
                        const isActive = priority === p;
                        const isAlert = isActive && p === "high";
                        return (
                          <button
                            key={p}
                            className={`${styles.chip}${
                              isActive
                                ? isAlert
                                  ? ` ${styles.chipActiveAlert}`
                                  : ` ${styles.chipActive}`
                                : ""
                            }`}
                            disabled={isSubmitting}
                            onClick={() => setPriority(p)}
                          >
                            {priorityLabel(p)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* WHO & WHERE panel */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span>WHO &amp; WHERE</span>
                  <span className={styles.panelHeadSub}>
                    {whoCount === 0 ? "" : `${whoCount} OF 2`}
                  </span>
                </div>
                <div className={styles.panelBody}>

                  {/* Assignee */}
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>
                      <span className={styles.reqDot} />
                      Assignee
                    </div>
                    {staffLoading ? (
                      <p className={styles.staffLoading}>Loading staff&hellip;</p>
                    ) : (
                      <div className={styles.assigneeGrid}>
                        {staff.map((s) => {
                          const isActive = assigneeId === s.id && !isPreselectedLocked;
                          const isLocked = isPreselectedLocked && s.id === preselectedStaffId;
                          const avatarSrc = AVATAR_MAP[s.name];
                          const initials = staffInitials(s.name);
                          return (
                            <button
                              key={s.id}
                              className={`${styles.assigneeChip}${
                                isActive
                                  ? ` ${styles.assigneeChipActive}`
                                  : isLocked
                                    ? ` ${styles.assigneeChipLocked}`
                                    : ""
                              }`}
                              disabled={isSubmitting}
                              onClick={() => handleChipSelect(s)}
                            >
                              {avatarSrc ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  className={styles.assigneeAvatar}
                                  src={avatarSrc}
                                  alt={s.name}
                                  width={28}
                                  height={28}
                                />
                              ) : (
                                <span className={styles.assigneeInitials}>
                                  {initials}
                                </span>
                              )}
                              <span className={styles.assigneeName}>
                                {initials}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {isPreselectedLocked && !staffLoading && (
                      <p className={styles.assigneeLockedHint}>
                        PRE-FILLED FROM PROFILE &middot; TAP ANOTHER TO REASSIGN
                      </p>
                    )}
                    {assigneeError && (
                      <p className={styles.fieldError}>Select who this is for.</p>
                    )}
                  </div>

                  {/* Room */}
                  <div className={styles.field}>
                    <div className={styles.fieldLabel}>Room</div>
                    <input
                      className={`${styles.input} ${styles.inputRoom}`}
                      placeholder="optional &middot; e.g., 14"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                </div>
              </div>

              {/* NOTES panel */}
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <span>NOTES</span>
                  <span className={styles.panelHeadSub}>
                    {notes.trim() ? "FILLED" : "OPTIONAL"}
                  </span>
                </div>
                <div className={styles.panelBody}>
                  <textarea
                    className={styles.textarea}
                    placeholder={
                      selectedFirstName
                        ? `Anything ${selectedFirstName} should know…`
                        : "Add context or instructions…"
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className={styles.ctaPair}>
                <button
                  className={styles.btn}
                  disabled={isSubmitting}
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={dispatchBtnVars}
                  disabled={dispatchDisabled}
                  onClick={() => void handleDispatch()}
                >
                  {isSubmitting ? (
                    <>
                      <span className={styles.spinner} />
                      Dispatching
                    </>
                  ) : isError ? (
                    "Try again"
                  ) : (
                    "Dispatch"
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
