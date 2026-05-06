"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { fetchMentionTargets, fetchProfile } from "@/lib/profile";
import {
  logTaskEvent,
  taskEventType,
  uploadTaskFile,
} from "@/lib/task-events";
import {
  redirectToLoginUnlessLocalDevBypass,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";
import ReassignPanel from "@/components/admin/ReassignPanel";
import {
  checklistProgress,
  displayAssignee,
  normalizeTask,
  TASK_CARD_SELECT_FIELDS,
  type CheckRow,
  type CommentRow,
  type TaskCard,
} from "./task-card-shared";

function parseNumField(s: string): number | undefined {
  const n = Number(s.trim());
  return s.trim() !== "" && Number.isFinite(n) ? n : undefined;
}

export default function ManagerCardDetail({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskCard | null>(null);
  const [checklist, setChecklist] = useState<CheckRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [mentionTargets, setMentionTargets] = useState<
    { id: string; display_name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const openedLogged = useRef(false);
  const taskSnapshot = useRef<TaskCard | null>(null);

  const [mgrTitle, setMgrTitle] = useState("");
  const [mgrDesc, setMgrDesc] = useState("");
  const [mgrStatus, setMgrStatus] = useState("open");
  const [mgrPriority, setMgrPriority] = useState("medium");
  const [mgrDueDate, setMgrDueDate] = useState("");
  const [mgrDueTime, setMgrDueTime] = useState("");
  const [mgrSaving, setMgrSaving] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);

  const [newItemTitle, setNewItemTitle] = useState("");

  const [commentBody, setCommentBody] = useState("");
  const [commentCheckId, setCommentCheckId] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const [guestName, setGuestName] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");
  const [lateCheckout, setLateCheckout] = useState(false);
  const [vip, setVip] = useState(false);
  const [specialRequests, setSpecialRequests] = useState("");
  const [guestNotes, setGuestNotes] = useState("");

  const [dailyLocation, setDailyLocation] = useState("");
  const [dailyFrequency, setDailyFrequency] = useState("");
  const [dailyInstructions, setDailyInstructions] = useState("");

  const [eodShiftLead, setEodShiftLead] = useState("");
  const [eodHandoffNotes, setEodHandoffNotes] = useState("");

  const [arrName, setArrName] = useState("");
  const [arrCheckinTime, setArrCheckinTime] = useState("");
  const [arrCheckoutDate, setArrCheckoutDate] = useState("");
  const [arrNights, setArrNights] = useState("");
  const [arrPartySize, setArrPartySize] = useState("");
  const [arrConfirmationNumber, setArrConfirmationNumber] = useState("");
  const [arrSource, setArrSource] = useState("");
  const [arrSpecialRequests, setArrSpecialRequests] = useState("");

  const [stayName, setStayName] = useState("");
  const [stayCheckinDate, setStayCheckinDate] = useState("");
  const [stayCheckoutDate, setStayCheckoutDate] = useState("");
  const [stayNightsRemaining, setStayNightsRemaining] = useState("");
  const [stayPartySize, setStayPartySize] = useState("");
  const [staySpecialRequests, setStaySpecialRequests] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = resolveAuthUser(session);
    if (!user) {
      redirectToLoginUnlessLocalDevBypass();
      return;
    }
    const profileResult = await fetchProfile(supabase, user);
    if (!profileResult.ok) {
      setError(profileResult.failure.message);
      setLoading(false);
      return;
    }
    const profile = profileResult.profile;
    setUserId(user.id);
    setDisplayName(profile.display_name);

    const { data: tRow, error: tErr } = await supabase
      .from("tasks")
      .select(TASK_CARD_SELECT_FIELDS)
      .eq("id", taskId)
      .maybeSingle();

    if (tErr || !tRow) {
      setError(tErr?.message ?? "Card not found or access denied.");
      setTask(null);
      setLoading(false);
      return;
    }

    const t = normalizeTask(tRow as Record<string, unknown>);
    setTask(t);
    taskSnapshot.current = t;
    setMgrTitle(t.title);
    setMgrDesc(t.description ?? "");
    setMgrStatus(t.status);
    setMgrPriority(t.priority);
    setMgrDueDate(t.due_date ?? "");
    setMgrDueTime(t.due_time ?? "");
    const gCtx = t.context.guest as Record<string, unknown> | null | undefined;
    if (gCtx && typeof gCtx === "object") {
      setGuestName(typeof gCtx.guestName === "string" ? gCtx.guestName : "");
      setCheckoutTime(typeof gCtx.checkoutTime === "string" ? gCtx.checkoutTime : "");
      setLateCheckout(gCtx.lateCheckout === true);
      setVip(gCtx.vip === true);
      setSpecialRequests(typeof gCtx.specialRequests === "string" ? gCtx.specialRequests : "");
      setGuestNotes(typeof gCtx.notes === "string" ? gCtx.notes : "");
    } else {
      setGuestName("");
      setCheckoutTime("");
      setLateCheckout(false);
      setVip(false);
      setSpecialRequests("");
      setGuestNotes("");
    }
    const dtCtx = t.context.daily_task as Record<string, unknown> | null | undefined;
    if (dtCtx && typeof dtCtx === "object") {
      setDailyLocation(typeof dtCtx.location === "string" ? dtCtx.location : "");
      setDailyFrequency(typeof dtCtx.frequency === "string" ? dtCtx.frequency : "");
      setDailyInstructions(typeof dtCtx.instructions === "string" ? dtCtx.instructions : "");
    } else {
      setDailyLocation("");
      setDailyFrequency("");
      setDailyInstructions("");
    }
    const eodCtx = t.context.eod_summary as Record<string, unknown> | null | undefined;
    if (eodCtx && typeof eodCtx === "object") {
      setEodShiftLead(typeof eodCtx.shift_lead === "string" ? eodCtx.shift_lead : "");
      setEodHandoffNotes(typeof eodCtx.handoff_notes === "string" ? eodCtx.handoff_notes : "");
    } else {
      setEodShiftLead("");
      setEodHandoffNotes("");
    }
    const igCtx = t.context.incoming_guest as Record<string, unknown> | null | undefined;
    if (igCtx && typeof igCtx === "object") {
      setArrName(typeof igCtx.name === "string" ? igCtx.name : "");
      setArrCheckinTime(typeof igCtx.checkin_time === "string" ? igCtx.checkin_time : "");
      setArrCheckoutDate(typeof igCtx.checkout_date === "string" ? igCtx.checkout_date : "");
      setArrNights(igCtx.nights !== null && igCtx.nights !== undefined ? String(igCtx.nights) : "");
      setArrPartySize(igCtx.party_size !== null && igCtx.party_size !== undefined ? String(igCtx.party_size) : "");
      setArrConfirmationNumber(typeof igCtx.confirmation_number === "string" ? igCtx.confirmation_number : "");
      setArrSource(typeof igCtx.source === "string" ? igCtx.source : "");
      setArrSpecialRequests(typeof igCtx.special_requests === "string" ? igCtx.special_requests : "");
    } else {
      setArrName("");
      setArrCheckinTime("");
      setArrCheckoutDate("");
      setArrNights("");
      setArrPartySize("");
      setArrConfirmationNumber("");
      setArrSource("");
      setArrSpecialRequests("");
    }
    const cgCtx = t.context.current_guest as Record<string, unknown> | null | undefined;
    if (cgCtx && typeof cgCtx === "object") {
      setStayName(typeof cgCtx.name === "string" ? cgCtx.name : "");
      setStayCheckinDate(typeof cgCtx.checkin_date === "string" ? cgCtx.checkin_date : "");
      setStayCheckoutDate(typeof cgCtx.checkout_date === "string" ? cgCtx.checkout_date : "");
      setStayNightsRemaining(cgCtx.nights_remaining !== null && cgCtx.nights_remaining !== undefined ? String(cgCtx.nights_remaining) : "");
      setStayPartySize(cgCtx.party_size !== null && cgCtx.party_size !== undefined ? String(cgCtx.party_size) : "");
      setStaySpecialRequests(typeof cgCtx.special_requests === "string" ? cgCtx.special_requests : "");
    } else {
      setStayName("");
      setStayCheckinDate("");
      setStayCheckoutDate("");
      setStayNightsRemaining("");
      setStayPartySize("");
      setStaySpecialRequests("");
    }

    const [{ data: ch }, { data: cm }, mt] = await Promise.all([
      supabase
        .from("task_checklist_items")
        .select("id, task_id, title, sort_order, done")
        .eq("task_id", taskId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("task_comments")
        .select(
          "id, task_id, user_id, author_display_name, body, image_url, checklist_item_id, created_at",
        )
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
      fetchMentionTargets(supabase),
    ]);

    setChecklist((ch as CheckRow[]) ?? []);
    setComments((cm as CommentRow[]) ?? []);
    setMentionTargets(mt);

    if (!openedLogged.current) {
      openedLogged.current = true;
      void logTaskEvent(
        taskId,
        taskEventType.cardOpened,
        {},
        user.id,
      );
    }

    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) redirectToLoginUnlessLocalDevBypass();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onManagerSave(e: FormEvent) {
    e.preventDefault();
    if (!task || !userId) return;
    setMgrSaving(true);
    setError(null);
    const prev = taskSnapshot.current;

    // Day 35 III.H Scope B — reassignment is now its own discrete action via
    // <ReassignPanel/>, which routes through reassignTask() directly. This
    // form no longer touches staff_id / assignee_name; the panel above does.

    const { error: upErr } = await supabase
      .from("tasks")
      .update({
        title: mgrTitle.trim(),
        description: mgrDesc.trim() || null,
        status: mgrStatus,
        priority: mgrPriority,
        due_date: mgrDueDate.trim() || null,
        due_time: mgrDueTime.trim() || null,
        ...(task.card_type === "housekeeping_turn"
          ? {
              context: {
                ...(task.context ?? {}),
                guest: {
                  guestName: guestName.trim(),
                  checkoutTime: checkoutTime.trim(),
                  lateCheckout: lateCheckout || undefined,
                  vip: vip || undefined,
                  specialRequests: specialRequests.trim(),
                  notes: guestNotes.trim(),
                },
              },
            }
          : {}),
        ...(task.card_type === "dailys"
          ? {
              context: {
                ...(task.context ?? {}),
                daily_task: {
                  ...((task.context.daily_task as Record<string, unknown> | undefined) ?? {}),
                  location: dailyLocation.trim(),
                  frequency: dailyFrequency.trim(),
                  instructions: dailyInstructions.trim(),
                },
              },
            }
          : {}),
        ...(task.card_type === "eod"
          ? {
              context: {
                ...(task.context ?? {}),
                eod_summary: {
                  ...((task.context.eod_summary as Record<string, unknown> | undefined) ?? {}),
                  shift_lead: eodShiftLead.trim(),
                  handoff_notes: eodHandoffNotes.trim(),
                },
              },
            }
          : {}),
        ...(task.card_type === "arrival"
          ? {
              context: {
                ...(task.context ?? {}),
                incoming_guest: {
                  ...((task.context.incoming_guest as Record<string, unknown> | undefined) ?? {}),
                  name: arrName.trim(),
                  checkin_time: arrCheckinTime.trim(),
                  checkout_date: arrCheckoutDate.trim(),
                  nights: parseNumField(arrNights),
                  party_size: parseNumField(arrPartySize),
                  confirmation_number: arrConfirmationNumber.trim(),
                  source: arrSource.trim(),
                  special_requests: arrSpecialRequests.trim(),
                },
              },
            }
          : {}),
        ...(task.card_type === "stayover"
          ? {
              context: {
                ...(task.context ?? {}),
                current_guest: {
                  ...((task.context.current_guest as Record<string, unknown> | undefined) ?? {}),
                  name: stayName.trim(),
                  checkin_date: stayCheckinDate.trim(),
                  checkout_date: stayCheckoutDate.trim(),
                  nights_remaining: parseNumField(stayNightsRemaining),
                  party_size: parseNumField(stayPartySize),
                  special_requests: staySpecialRequests.trim(),
                },
              },
            }
          : {}),
      })
      .eq("id", task.id);
    setMgrSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    if (prev) {
      if (prev.status !== mgrStatus) {
        void logTaskEvent(
          task.id,
          taskEventType.statusChanged,
          { from: prev.status, to: mgrStatus },
          userId,
        );
      }
      // Reassignment logging lives in reassignTask via <ReassignPanel/>.
      // Day 35 III.H Scope B (Day 34 Scope A introduced the helper).
      const prevDue = `${prev.due_date ?? ""}|${prev.due_time ?? ""}`;
      const nextDue = `${mgrDueDate.trim() || ""}|${mgrDueTime.trim() || ""}`;
      if (prevDue !== nextDue) {
        void logTaskEvent(
          task.id,
          taskEventType.dueDateChanged,
          {
            from_date: prev.due_date,
            to_date: mgrDueDate.trim() || null,
            from_time: prev.due_time,
            to_time: mgrDueTime.trim() || null,
          },
          userId,
        );
      }
    }
    router.refresh();
    await load();
  }

  async function toggleCheckItem(row: CheckRow) {
    if (!task || !userId) return;
    const next = !row.done;
    const { error: upErr } = await supabase
      .from("task_checklist_items")
      .update({ done: next })
      .eq("id", row.id);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    void logTaskEvent(
      task.id,
      next ? taskEventType.checklistChecked : taskEventType.checklistUnchecked,
      { checklist_item_id: row.id, title: row.title },
      userId,
    );
    await load();
  }

  async function addChecklistItem(e: FormEvent) {
    e.preventDefault();
    if (!task || !newItemTitle.trim()) return;
    const nextOrder =
      checklist.reduce((m, x) => Math.max(m, x.sort_order), -1) + 1;
    const { error: insErr } = await supabase.from("task_checklist_items").insert({
      task_id: task.id,
      title: newItemTitle.trim(),
      sort_order: nextOrder,
    });
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewItemTitle("");
    await load();
  }

  async function removeCheckItem(id: string) {
    const { error: delErr } = await supabase
      .from("task_checklist_items")
      .delete()
      .eq("id", id);
    if (delErr) setError(delErr.message);
    else await load();
  }

  async function onAddAttachment(e: FormEvent) {
    e.preventDefault();
    if (!task || !userId) return;
    const input = (e.target as HTMLFormElement).elements.namedItem(
      "attach",
    ) as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    setAttachBusy(true);
    setError(null);
    const up = await uploadTaskFile(userId, file);
    if (!up) {
      setError("Upload failed.");
      setAttachBusy(false);
      return;
    }
    const { error: upErr } = await supabase
      .from("tasks")
      .update({ attachment_url: up.publicUrl })
      .eq("id", task.id);
    setAttachBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    void logTaskEvent(
      task.id,
      taskEventType.imageAttached,
      { url: up.publicUrl, scope: "card" },
      userId,
    );
    input.value = "";
    await load();
  }

  async function onPostComment(e: FormEvent) {
    e.preventDefault();
    if (!task || !userId) return;
    const body = commentBody.trim();
    if (!body && !commentFile) return;
    setCommentBusy(true);
    setError(null);
    let imageUrl: string | null = null;
    if (commentFile) {
      const up = await uploadTaskFile(userId, commentFile);
      if (!up) {
        setError("Image upload failed.");
        setCommentBusy(false);
        return;
      }
      imageUrl = up.publicUrl;
    }
    const { error: insErr } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: userId,
      author_display_name: displayName,
      body: body || "(image)",
      image_url: imageUrl,
      checklist_item_id: commentCheckId || null,
    });
    setCommentBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    void logTaskEvent(
      task.id,
      taskEventType.commentAdded,
      { has_image: Boolean(imageUrl), checklist_item_id: commentCheckId || null },
      userId,
    );
    if (imageUrl) {
      void logTaskEvent(
        task.id,
        taskEventType.imageAttached,
        { url: imageUrl, scope: "comment" },
        userId,
      );
    }
    setCommentBody("");
    setCommentFile(null);
    setCommentCheckId("");
    await load();
  }

  if (loading) {
    return (
      <main className="wrap card-page">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (error && !task) {
    return (
      <main className="wrap card-page">
        <p className="error">{error}</p>
        <Link href="/">Back</Link>
      </main>
    );
  }

  if (!task) return null;

  const progress = checklistProgress(checklist);
  const dueShort = task.due_date?.slice(0, 10) ?? "—";

  return (
    <main className="wrap card-page">
      <header className="card-header">
        <Link href="/" className="card-back">
          ← Dispatch home
        </Link>
        <div className="card-header-main">
          <h1 className="card-title-h1 card-title-h1--task">{task.title}</h1>
          <p className="card-header-kicker">
            {displayAssignee(task) || "Unassigned"} ·{" "}
            {task.status.replace("_", " ")} · Due {dueShort}
          </p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      {process.env.NODE_ENV === "development" ? (
        <section className="card-panel card-inspect" aria-label="Test IDs and URL">
          <h3 className="card-h3">Test / debug</h3>
          <dl className="card-inspect-dl">
            <div>
              <dt>Task ID</dt>
              <dd>
                <code className="card-inspect-code">{task.id}</code>
              </dd>
            </div>
            <div>
              <dt>Type · source</dt>
              <dd>
                {task.card_type} · {task.source}
              </dd>
            </div>
            <div>
              <dt>Staff row ID</dt>
              <dd>
                {task.staff_id ? (
                  <code className="card-inspect-code">{task.staff_id}</code>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {task.due_time ? (
              <div>
                <dt>Due time</dt>
                <dd>{task.due_time}</dd>
              </div>
            ) : null}
          </dl>
          <p className="card-inspect-links">
            <span className="card-inspect-muted">Staff execution path:</span>{" "}
            <code className="card-inspect-code">/staff/task/{task.id}</code>
          </p>
        </section>
      ) : null}

      <ReassignPanel
        taskId={task.id}
        currentStaffId={task.staff_id}
        currentStaffName={displayAssignee(task) || null}
        onSuccess={async () => {
          await load();
          router.refresh();
        }}
      />

      <section className="card-panel">
        <form className="card-form" onSubmit={onManagerSave}>
          <label className="card-label">Title</label>
          <input
            className="card-input"
            value={mgrTitle}
            onChange={(e) => setMgrTitle(e.target.value)}
            required
            disabled={mgrSaving}
          />
          <label className="card-label">Description</label>
          <textarea
            className="card-textarea"
            rows={4}
            value={mgrDesc}
            onChange={(e) => setMgrDesc(e.target.value)}
            disabled={mgrSaving}
          />
          <label className="card-label">Status</label>
          <select
            className="card-input"
            value={mgrStatus}
            onChange={(e) => setMgrStatus(e.target.value)}
            disabled={mgrSaving}
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="paused">Paused</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
          <label className="card-label">Priority</label>
          <select
            className="card-input"
            value={mgrPriority}
            onChange={(e) => setMgrPriority(e.target.value)}
            disabled={mgrSaving}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <label className="card-label">Due date</label>
          <input
            className="card-input"
            type="date"
            value={mgrDueDate}
            onChange={(e) => setMgrDueDate(e.target.value)}
            disabled={mgrSaving}
          />
          <label className="card-label">Due time</label>
          <input
            className="card-input"
            type="time"
            value={mgrDueTime}
            onChange={(e) => setMgrDueTime(e.target.value)}
            disabled={mgrSaving}
          />
          {task.card_type === "housekeeping_turn" ? (
            <>
              <label className="card-label">Guest name</label>
              <input
                className="card-input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Smith"
              />
              <label className="card-label">Check-out time</label>
              <input
                className="card-input"
                type="time"
                value={checkoutTime}
                onChange={(e) => setCheckoutTime(e.target.value)}
                disabled={mgrSaving}
              />
              <label className="card-check-label">
                <input
                  type="checkbox"
                  checked={lateCheckout}
                  onChange={(e) => setLateCheckout(e.target.checked)}
                  disabled={mgrSaving}
                />
                Late check-out
              </label>
              <label className="card-check-label">
                <input
                  type="checkbox"
                  checked={vip}
                  onChange={(e) => setVip(e.target.checked)}
                  disabled={mgrSaving}
                />
                VIP guest
              </label>
              <label className="card-label">Special requests</label>
              <textarea
                className="card-textarea"
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Extra pillows"
              />
              <label className="card-label">Guest notes</label>
              <textarea
                className="card-textarea"
                rows={2}
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                disabled={mgrSaving}
                placeholder="Internal notes for housekeeping"
              />
            </>
          ) : null}
          {task.card_type === "dailys" ? (
            <>
              <label className="card-label">Location</label>
              <input
                className="card-input"
                value={dailyLocation}
                onChange={(e) => setDailyLocation(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Lobby"
              />
              <label className="card-label">Frequency</label>
              <input
                className="card-input"
                value={dailyFrequency}
                onChange={(e) => setDailyFrequency(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Daily, Weekly, Monday/Wednesday/Friday"
              />
              <label className="card-label">Instructions</label>
              <textarea
                className="card-textarea"
                rows={4}
                value={dailyInstructions}
                onChange={(e) => setDailyInstructions(e.target.value)}
                disabled={mgrSaving}
                placeholder="Step-by-step instructions for staff"
              />
            </>
          ) : null}
          {task.card_type === "eod" ? (
            <>
              <label className="card-label">Shift lead</label>
              <input
                className="card-input"
                value={eodShiftLead}
                onChange={(e) => setEodShiftLead(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Maria"
              />
              <label className="card-label">Handoff notes</label>
              <textarea
                className="card-textarea"
                rows={4}
                value={eodHandoffNotes}
                onChange={(e) => setEodHandoffNotes(e.target.value)}
                disabled={mgrSaving}
                placeholder="Notes for the closing team"
              />
            </>
          ) : null}
          {task.card_type === "arrival" ? (
            <>
              <label className="card-label">Guest name</label>
              <input
                className="card-input"
                value={arrName}
                onChange={(e) => setArrName(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Johnson"
              />
              <label className="card-label">Check-in time</label>
              <input
                className="card-input"
                type="time"
                value={arrCheckinTime}
                onChange={(e) => setArrCheckinTime(e.target.value)}
                disabled={mgrSaving}
              />
              <label className="card-label">Check-out date</label>
              <input
                className="card-input"
                type="date"
                value={arrCheckoutDate}
                onChange={(e) => setArrCheckoutDate(e.target.value)}
                disabled={mgrSaving}
              />
              <label className="card-label">Nights</label>
              <input
                className="card-input"
                type="number"
                min="1"
                value={arrNights}
                onChange={(e) => setArrNights(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. 2"
              />
              <label className="card-label">Party size</label>
              <input
                className="card-input"
                type="number"
                min="1"
                value={arrPartySize}
                onChange={(e) => setArrPartySize(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. 2"
              />
              <label className="card-label">Confirmation number</label>
              <input
                className="card-input"
                value={arrConfirmationNumber}
                onChange={(e) => setArrConfirmationNumber(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. RES-10042"
              />
              <label className="card-label">Source</label>
              <input
                className="card-input"
                value={arrSource}
                onChange={(e) => setArrSource(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Direct, Expedia"
              />
              <label className="card-label">Special requests</label>
              <textarea
                className="card-textarea"
                rows={3}
                value={arrSpecialRequests}
                onChange={(e) => setArrSpecialRequests(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Extra pillows, crib needed"
              />
            </>
          ) : null}
          {task.card_type === "stayover" ? (
            <>
              <label className="card-label">Guest name</label>
              <input
                className="card-input"
                value={stayName}
                onChange={(e) => setStayName(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Williams"
              />
              <label className="card-label">Check-in date</label>
              <input
                className="card-input"
                type="date"
                value={stayCheckinDate}
                onChange={(e) => setStayCheckinDate(e.target.value)}
                disabled={mgrSaving}
              />
              <label className="card-label">Check-out date</label>
              <input
                className="card-input"
                type="date"
                value={stayCheckoutDate}
                onChange={(e) => setStayCheckoutDate(e.target.value)}
                disabled={mgrSaving}
              />
              <label className="card-label">Nights remaining</label>
              <input
                className="card-input"
                type="number"
                min="1"
                value={stayNightsRemaining}
                onChange={(e) => setStayNightsRemaining(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. 2"
              />
              <label className="card-label">Party size</label>
              <input
                className="card-input"
                type="number"
                min="1"
                value={stayPartySize}
                onChange={(e) => setStayPartySize(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. 2"
              />
              <label className="card-label">Special requests</label>
              <textarea
                className="card-textarea"
                rows={3}
                value={staySpecialRequests}
                onChange={(e) => setStaySpecialRequests(e.target.value)}
                disabled={mgrSaving}
                placeholder="e.g. Extra towels, quiet room"
              />
            </>
          ) : null}
          <button type="submit" disabled={mgrSaving || !mgrTitle.trim()}>
            {mgrSaving ? "Saving…" : "Save card"}
          </button>
        </form>
      </section>

      {task.is_staff_report ? (
        <section className="card-panel card-muted">
          <h3 className="card-h3">Staff report</h3>
          <p>
            Category: {task.report_category ?? "—"} · Queue:{" "}
            {task.report_queue_status}
          </p>
          {task.report_image_url ? (
            <p>
              <a href={task.report_image_url} target="_blank" rel="noreferrer">
                Report image
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      {task.attachment_url ? (
        <section className="card-panel">
          <h3 className="card-h3">Attachment</h3>
          <a href={task.attachment_url} target="_blank" rel="noreferrer">
            View file
          </a>
        </section>
      ) : null}

      <section className="card-panel">
        <h3 className="card-h3">Quick actions</h3>
        <form className="card-attach-form" onSubmit={onAddAttachment}>
          <label className="card-label">Add attachment</label>
          <input name="attach" type="file" accept="image/*,.pdf" />
          <button type="submit" disabled={attachBusy}>
            {attachBusy ? "Uploading…" : "Upload"}
          </button>
        </form>
      </section>

      <section className="card-panel">
        <div className="card-checklist-head">
          <h3 className="card-h3">Checklist</h3>
          <span className="card-progress">{progress}%</span>
        </div>
        {checklist.length === 0 ? (
          <p className="tasks-muted">No checklist items yet.</p>
        ) : (
          <ul className="card-checklist">
            {checklist.map((row) => (
              <li key={row.id} className="card-checklist-item">
                <label className="card-check-label">
                  <input
                    type="checkbox"
                    checked={row.done}
                    onChange={() => void toggleCheckItem(row)}
                  />
                  <span>{row.title}</span>
                </label>
                <button
                  type="button"
                  className="outline card-icon-btn"
                  onClick={() => void removeCheckItem(row.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="card-add-item" onSubmit={addChecklistItem}>
          <input
            className="card-input"
            placeholder="New checklist item"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
          />
          <button type="submit">Add checklist item</button>
        </form>
      </section>

      <section className="card-panel">
        <h3 className="card-h3">Comments</h3>
        <ul className="card-comments">
          {comments.map((c) => (
            <li key={c.id} className="card-comment">
              <div className="card-comment-meta">
                <strong>{c.author_display_name}</strong>
                <span>
                  {new Date(c.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="card-comment-body">{c.body}</p>
              {c.checklist_item_id ? (
                <p className="card-comment-ref">
                  Ref:{" "}
                  {checklist.find((x) => x.id === c.checklist_item_id)?.title ??
                    "checklist item"}
                </p>
              ) : null}
              {c.image_url ? (
                <a href={c.image_url} target="_blank" rel="noreferrer">
                  <img
                    src={c.image_url}
                    alt=""
                    className="card-comment-img"
                  />
                </a>
              ) : null}
            </li>
          ))}
        </ul>

        <form className="card-comment-form" onSubmit={onPostComment}>
          <label className="card-label">Add comment</label>
          {mentionTargets.length > 0 ? (
            <div className="card-mentions">
              <span className="tasks-muted">Mention:</span>
              {mentionTargets.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="outline card-mention-chip"
                  onClick={() =>
                    setCommentBody((b) => `${b}@${m.display_name} `)
                  }
                >
                  @{m.display_name}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            className="card-textarea"
            rows={3}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Plain text; use mention buttons for @manager"
          />
          <label className="card-label">Link to checklist item (optional)</label>
          <select
            className="card-input"
            value={commentCheckId}
            onChange={(e) => setCommentCheckId(e.target.value)}
          >
            <option value="">None</option>
            {checklist.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label className="card-label">Image (optional, one)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCommentFile(e.target.files?.[0] ?? null)}
          />
          <button type="submit" disabled={commentBusy}>
            {commentBusy ? "Posting…" : "Post comment"}
          </button>
        </form>
      </section>
    </main>
  );
}
