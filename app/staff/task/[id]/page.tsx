"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ArrivalsCard from "./ArrivalsCard";
import DailysCard from "./DailysCard";
import DeparturesCard from "./DeparturesCard";
import EODCard from "./EODCard";
import StartOfDayCard from "./StartOfDayCard";
import StayoversCard from "./StayoversCard";
import ChecklistDrillDown from "./ChecklistDrillDown";
import { resolveChecklist } from "@/lib/checklists/resolve";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import ProfileLoadError from "@/app/profile-load-error";
import {
  displayAssignee,
  normalizeTask,
  TASK_CARD_SELECT_FIELDS,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import {
  redirectToLoginUnlessLocalDevBypass,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import {
  fetchProfile,
  mayAccessStaffRoutes,
  shouldUseManagerHome,
  type ProfileFetchFailure,
} from "@/lib/profile";
import {
  completeCard,
  openCard,
  pauseCard,
  requestHelp,
  resumeCard,
  toggleChecklistItem,
} from "@/lib/orchestration";
import {
  addNote,
  listNotesForTask,
  NOTE_DEFAULTS,
  type NoteRow,
} from "@/lib/notes";
import {
  addMaintenanceIssue,
  listMaintenanceIssuesForTask,
  MAINTENANCE_DEFAULTS,
  type MaintenanceIssueRow,
} from "@/lib/maintenance";
import { canWrapShift, clockOut } from "@/lib/clock-in";
import NoteComposeForm from "./NoteComposeForm";
import MaintenanceComposeForm from "./MaintenanceComposeForm";
import { supabase } from "@/lib/supabase";
// Day 40 III.E + V.G — photo pipeline. uploadTaskFile uploads into the
// task-files bucket using the auth.uid()/timestamp-rand.<ext> path
// convention (see cards_mvp.sql:377-382). On a successful note/maintenance
// post with a file attached, we also fire taskEventType.imageAttached so
// the per-task event panel on /admin/tasks/[id] surfaces the attach.
import {
  uploadTaskFile,
  logTaskEvent,
  taskEventType,
  withTaskEventSchema,
} from "@/lib/task-events";
import {
  checklistCompletionPercent,
  loadStaffExecutionChecklist,
  type ExecutionChecklistItem,
} from "@/lib/staff-task-execution-checklist";
import {
  getCurrentReservationForRoom,
  getNextIncomingReservationForRoom,
  type Reservation,
} from "@/lib/reservations";

function roomFromTitle(title: string | null): string | null {
  if (!title) return null;
  const m = title.match(/\broom\s*#?\s*(\d+)\b/i);
  return m ? m[1] : null;
}

function displayRoom(task: TaskCard): string {
  const n = task.room_number?.trim();
  if (n) return n;
  return roomFromTitle(task.title) ?? "—";
}

function formatDueTime(iso: string | null): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return iso;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  const day = String(iso).slice(0, 10);
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function priorityLabel(p: string): string {
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Medium";
}

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function checklistInteractionDisabled(status: string): boolean {
  return status === "done" || status === "blocked" || status === "paused";
}

export default function StaffTaskExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] =
    useState<ProfileFetchFailure | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [task, setTask] = useState<TaskCard | null>(null);
  const [checklist, setChecklist] = useState<ExecutionChecklistItem[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<
    MaintenanceIssueRow[]
  >([]);

  // Master plan V.A BR4 — reservation fallback for X-430 brief guest fields.
  // Loaded in parallel with notes/maintenance/checklist when the task has a
  // room_number AND a card_type that surfaces guest fields. Cards consume as
  // optional props; each card falls back to the reservation row only when its
  // task.context.{outgoing,incoming,current}_guest subkey is missing/empty.
  // currentReservation is shared between D-430 (as "outgoing") and S-430
  // (as "current") — same DB row, different framing in the brief.
  const [currentReservation, setCurrentReservation] =
    useState<Reservation | null>(null);
  const [incomingReservation, setIncomingReservation] =
    useState<Reservation | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Notes compose state — body + the three taxonomy fields per master plan
  // III.A. note_type starts blank so the submit button stays disabled until
  // the user picks one (required field). Status defaults to "Just Noting"
  // and assigned-to defaults to "Employee" — both sticky between submits
  // (LinkedIn-comment pattern; only the body clears on Post).
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState("");
  const [noteStatus, setNoteStatus] = useState<string>(NOTE_DEFAULTS.status);
  const [noteAssignedTo, setNoteAssignedTo] = useState<string>(
    NOTE_DEFAULTS.assignedTo,
  );
  const [noteBusy, setNoteBusy] = useState(false);
  // Day 40 III.E + V.G — optional photo on the note compose. Cleared on
  // successful post alongside the body (sticky-filters pattern preserved).
  const [noteFile, setNoteFile] = useState<File | null>(null);

  // Maintenance compose state — body is OPTIONAL (the schema allows null
  // body), unlike notes where body is required. Submit gates on the three
  // required taxonomy fields (location/item/type), each starting "" so the
  // submit button stays disabled until they're picked. Severity defaults to
  // 'Normal' and is sticky between submits (LinkedIn-comment pattern; only
  // body clears on Post). Master plan III.B + Global Rules R12-R17.
  const [maintBody, setMaintBody] = useState("");
  const [maintLocation, setMaintLocation] = useState("");
  const [maintItem, setMaintItem] = useState("");
  const [maintType, setMaintType] = useState("");
  const [maintSeverity, setMaintSeverity] = useState<string>(
    MAINTENANCE_DEFAULTS.severity,
  );
  const [maintBusy, setMaintBusy] = useState(false);
  // Day 40 III.E + V.G — optional photo on the maintenance compose. Cleared
  // on successful post alongside the body.
  const [maintFile, setMaintFile] = useState<File | null>(null);
  const [helpBusy, setHelpBusy] = useState(false);
  const [doneBusy, setDoneBusy] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Phase 2b — cross-staff EOD activation gate. wrapBlockedBy is the list
  // of clocked-in staff names who haven't started their EOD card yet.
  // canWrapKnown gates the Wrap Shift button until the first fetch returns
  // (otherwise the user could click in the brief window before the gate
  // resolves). Fail-open semantics: gate fetch failure → blockedBy=[] →
  // wrap proceeds.
  const [wrapBlockedBy, setWrapBlockedBy] = useState<string[]>([]);
  const [canWrapKnown, setCanWrapKnown] = useState(false);
  const [canWrapBusy, setCanWrapBusy] = useState(false);

  const openCardRunForTaskId = useRef<string | null>(null);
  const prevRouteTaskIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);

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
      setProfileFailure(profileResult.failure);
      return;
    }
    const profile = profileResult.profile;
    if (shouldUseManagerHome(profile)) {
      window.location.replace("/");
      return;
    }
    if (!mayAccessStaffRoutes(profile)) {
      window.location.replace("/");
      return;
    }

    setUserId(user.id);
    setStaffId(profile.staff_id ?? null);
    setDisplayName(profile.display_name);

    if (!id) {
      setLoadError("Missing task id.");
      setReady(true);
      return;
    }

    const { data: tRow, error: tErr } = await supabase
      .from("tasks")
      .select(TASK_CARD_SELECT_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (tErr || !tRow) {
      setLoadError(tErr?.message ?? "Task not found or access denied.");
      setTask(null);
      setChecklist([]);
      setNotes([]);
      setReady(true);
      return;
    }

    const t = normalizeTask(tRow as Record<string, unknown>);
    setTask(t);

    // Notes load against public.notes via lib/notes.ts (master plan III.A).
    // Replaces the legacy task_comments fetch from Phase 3 — task_comments
    // table stays in place but new compose writes go to public.notes only.
    //
    // Maintenance load against public.maintenance_issues via
    // lib/maintenance.ts (master plan III.B — Day 33 Phase 1+2). Fetched
    // in parallel; failures degrade gracefully via lib's listMaintenance-
    // IssuesForTask warn-and-return-[] handler.
    //
    // Reservation fallbacks (master plan V.A BR4) — fetched only when the
    // task has a room_number AND the card_type surfaces guest fields:
    //   housekeeping_turn → both current (outgoing) + next-incoming
    //   arrival           → next-incoming
    //   stayover          → current
    // Failures degrade to null (the card's brief stays at "—" placeholders,
    // same as today). The cards consume these as optional props and only
    // use them when their context guest subkey is missing/empty.
    const ctLower = t.card_type.toLowerCase();
    const room = t.room_number?.trim() || null;
    const isDeparture =
      ctLower === "housekeeping_turn" ||
      ctLower.includes("departure") ||
      ctLower.includes("checkout");
    const isArrival =
      ctLower === "arrival" ||
      ctLower.includes("arrival") ||
      ctLower.includes("checkin");
    const isStayover =
      ctLower === "stayover" ||
      ctLower.includes("stayover") ||
      ctLower.includes("stay_over");
    const needsCurrent = !!room && (isDeparture || isStayover);
    const needsIncoming = !!room && (isDeparture || isArrival);

    const [noteRows, maintRows, chItems, currentRes, incomingRes] =
      await Promise.all([
        listNotesForTask(supabase, id),
        listMaintenanceIssuesForTask(supabase, id),
        loadStaffExecutionChecklist(supabase, id).catch((e: Error) => {
          console.warn("[staff-task-exec checklist]", e.message);
          return [] as ExecutionChecklistItem[];
        }),
        needsCurrent && room
          ? getCurrentReservationForRoom(room).catch((e: Error) => {
              console.warn("[staff-task-exec reservation:current]", e.message);
              return null;
            })
          : Promise.resolve(null),
        needsIncoming && room
          ? getNextIncomingReservationForRoom(room).catch((e: Error) => {
              console.warn("[staff-task-exec reservation:incoming]", e.message);
              return null;
            })
          : Promise.resolve(null),
      ]);

    setNotes(noteRows);
    setMaintenanceItems(maintRows);
    setChecklist(chItems);
    setCurrentReservation(currentRes);
    setIncomingReservation(incomingRes);

    setReady(true);
  }, [id]);

  /** Only clear open-card guard when navigating to a different task (not on Strict Mode remount). */
  useEffect(() => {
    const prev = prevRouteTaskIdRef.current;
    if (prev !== null && prev !== id) {
      openCardRunForTaskId.current = null;
    }
    prevRouteTaskIdRef.current = id;
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ready || !task || !userId || !id) return;
    if (openCardRunForTaskId.current === id) return;
    openCardRunForTaskId.current = id;
    void (async () => {
      setInlineError(null);
      const r = await openCard(supabase, { taskId: id, userId });
      if (!r.ok) {
        setInlineError(r.message);
        return;
      }
      await load();
    })();
  }, [ready, task?.id, userId, id, load]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) redirectToLoginUnlessLocalDevBypass();
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleItem = useCallback(
    async (row: ExecutionChecklistItem) => {
      if (!task || !userId) return;
      if (checklistInteractionDisabled(task.status)) return;
      const next = !row.done;
      setInlineError(null);
      const r = await toggleChecklistItem(supabase, {
        taskId: task.id,
        userId,
        checklistItemId: row.id,
        nextDone: next,
      });
      if (!r.ok) {
        setInlineError(r.message);
        return;
      }
      setChecklist((prev) =>
        prev.map((x) => (x.id === row.id ? { ...x, done: next } : x)),
      );
    },
    [task, userId],
  );

  const onNeedHelp = useCallback(async () => {
    if (!task || !userId) return;
    setHelpBusy(true);
    setInlineError(null);
    const r = await requestHelp(supabase, {
      taskId: task.id,
      userId,
      authorDisplayName: displayName,
    });
    setHelpBusy(false);
    if (!r.ok) {
      setInlineError(r.message);
      return;
    }
    await load();
  }, [task, userId, displayName, load]);

  const onImDone = useCallback(async () => {
    if (!task || !userId) return;
    setDoneBusy(true);
    setInlineError(null);
    const r = await completeCard(supabase, {
      taskId: task.id,
      userId,
      authorDisplayName: displayName,
    });
    if (!r.ok) {
      setDoneBusy(false);
      setInlineError(r.message);
      return;
    }

    // Master plan I.C Phase 2a — Wrap Shift on E-430 also clocks the staff
    // member out. Detected by card_type. Failure here is non-fatal for
    // beta (4-staff property): surface a console warning but still
    // navigate; the staff row stays clocked in until they refresh and
    // wrap again or an admin clocks them out manually. Phase 2b will add
    // the cross-staff EOD activation gate that prevents premature wraps.
    const ct = task.card_type.toLowerCase();
    const isEod = ct === "eod" || ct.includes("end_of_day");
    if (isEod && staffId) {
      const co = await clockOut(supabase, staffId);
      if (!co.ok) {
        console.warn("[wrap-shift] clockOut failed:", co.message);
      }
    }

    setDoneBusy(false);
    router.push("/staff");
  }, [task, userId, staffId, displayName, router]);

  const onPause = useCallback(async () => {
    if (!task || !userId) return;
    setPauseBusy(true);
    setInlineError(null);
    const r = await pauseCard(supabase, { taskId: task.id, userId });
    setPauseBusy(false);
    if (!r.ok) {
      setInlineError(r.message);
      return;
    }
    await load();
  }, [task, userId, load]);

  const onResume = useCallback(async () => {
    if (!task || !userId) return;
    setResumeBusy(true);
    setInlineError(null);
    const r = await resumeCard(supabase, { taskId: task.id, userId });
    setResumeBusy(false);
    if (!r.ok) {
      setInlineError(r.message);
      return;
    }
    await load();
  }, [task, userId, load]);

  // Phase 2b — refresh the EOD activation gate. Re-fetches the cross-staff
  // gate state from public.staff + public.tasks. Called on EOD card load
  // and from a manual Refresh button on the gate panel. No-op on non-EOD
  // cards so we don't pay a query cost for housekeeping turns / arrivals.
  const refreshCanWrap = useCallback(async () => {
    if (!task || !staffId) {
      setCanWrapKnown(true);
      setWrapBlockedBy([]);
      return;
    }
    const ct = task.card_type.toLowerCase();
    const isEod = ct === "eod" || ct.includes("end_of_day");
    if (!isEod) {
      setCanWrapKnown(true);
      setWrapBlockedBy([]);
      return;
    }
    setCanWrapBusy(true);
    const result = await canWrapShift(supabase, staffId);
    setWrapBlockedBy(result.blockedBy);
    setCanWrapKnown(true);
    setCanWrapBusy(false);
  }, [task, staffId]);

  useEffect(() => {
    void refreshCanWrap();
  }, [refreshCanWrap]);

  const onPostNote = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!task || !userId) return;
      const body = noteBody.trim();
      if (!body) return;
      // Required field guard. The submit button is also disabled when this
      // is empty (NoteComposeForm handles that via the `submitDisabled`
      // expression), so this branch is defensive only.
      if (!noteType) {
        setInlineError("Pick a note type before posting.");
        return;
      }
      setNoteBusy(true);
      setInlineError(null);
      // Day 40 III.E + V.G — if a photo was attached, upload first.
      // uploadTaskFile returns null on failure (auth/bucket/storage error).
      // Fail-loud: if the staff member explicitly attached a photo and the
      // upload failed, surface the error and abort the post rather than
      // silently dropping the image and shipping a text-only note.
      let imageUrl: string | null = null;
      if (noteFile) {
        const upload = await uploadTaskFile(userId, noteFile);
        if (!upload) {
          setNoteBusy(false);
          setInlineError(
            "Photo upload failed. Try again, or remove the photo and post the note without it.",
          );
          return;
        }
        imageUrl = upload.publicUrl;
      }
      const r = await addNote(supabase, {
        taskId: task.id,
        authorUserId: userId,
        authorDisplayName: displayName,
        body,
        noteType,
        noteStatus,
        noteAssignedTo,
        imageUrl,
      });
      setNoteBusy(false);
      if (!r.ok) {
        setInlineError(r.message);
        return;
      }
      // Day 40 — fire image_attached task_event when a photo was attached so
      // the admin per-task event panel surfaces it. taskEventType.imageAttached
      // already exists in the v1 vocabulary; this is the first call site.
      if (imageUrl) {
        await logTaskEvent(
          task.id,
          taskEventType.imageAttached,
          withTaskEventSchema({ image_url: imageUrl, source: "note" }),
          userId,
        );
      }
      // Sticky filters: clear body + photo but keep type / status / assigned-to
      // so a housekeeper posting a quick burst of related notes doesn't have to
      // re-pick the dropdowns each time.
      setNoteBody("");
      setNoteFile(null);
      await load();
    },
    [
      task,
      userId,
      displayName,
      noteBody,
      noteType,
      noteStatus,
      noteAssignedTo,
      noteFile,
      load,
    ],
  );

  // Maintenance compose handler — mirrors onPostNote. Three required taxonomy
  // fields gate submit (location/item/type); body is OPTIONAL. Severity
  // always has a default. Sticky filters: clear body but keep dropdowns
  // sticky so a housekeeper filing several issues from the same room
  // doesn't have to re-pick Location each time. Master plan III.B.
  const onPostMaintenance = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!task || !userId) return;
      // Defensive guards — submit button is also disabled when these are
      // empty (MaintenanceComposeForm handles via submitDisabled).
      if (!maintLocation || !maintItem || !maintType) {
        setInlineError(
          "Pick a location, item, and type before posting a maintenance issue.",
        );
        return;
      }
      setMaintBusy(true);
      setInlineError(null);
      // Day 40 III.E + V.G — if a photo was attached, upload first. Same
      // fail-loud pattern as onPostNote.
      let imageUrl: string | null = null;
      if (maintFile) {
        const upload = await uploadTaskFile(userId, maintFile);
        if (!upload) {
          setMaintBusy(false);
          setInlineError(
            "Photo upload failed. Try again, or remove the photo and post the issue without it.",
          );
          return;
        }
        imageUrl = upload.publicUrl;
      }
      const r = await addMaintenanceIssue(supabase, {
        taskId: task.id,
        authorUserId: userId,
        authorDisplayName: displayName,
        body: maintBody,
        location: maintLocation,
        item: maintItem,
        type: maintType,
        severity: maintSeverity,
        imageUrl,
      });
      setMaintBusy(false);
      if (!r.ok) {
        setInlineError(r.message);
        return;
      }
      // Day 40 — fire image_attached task_event when a photo was attached.
      if (imageUrl) {
        await logTaskEvent(
          task.id,
          taskEventType.imageAttached,
          withTaskEventSchema({ image_url: imageUrl, source: "maintenance" }),
          userId,
        );
      }
      // Sticky filters: clear body + photo, keep Location/Item/Type/Severity.
      setMaintBody("");
      setMaintFile(null);
      await load();
    },
    [
      task,
      userId,
      displayName,
      maintBody,
      maintLocation,
      maintItem,
      maintType,
      maintSeverity,
      maintFile,
      load,
    ],
  );

  if (profileFailure) {
    return <ProfileLoadError failure={profileFailure} />;
  }

  if (!ready) {
    return (
      <main className="staff-app staff-task-exec staff-task-exec--work">
        <p className="staff-task-exec-muted staff-task-exec-muted--pad">
          Loading…
        </p>
      </main>
    );
  }

  if (loadError || !task) {
    return (
      <main className="staff-app staff-task-exec staff-task-exec--work">
        <header className="staff-task-exec-top staff-task-exec-top--inset">
          <Link href="/staff" className="staff-task-exec-back">
            ← Tasks
          </Link>
        </header>
        <p className="error staff-task-exec-error">{loadError}</p>
      </main>
    );
  }

  const assignee = displayAssignee(task);
  const progress = checklistCompletionPercent(checklist);
  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";
  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;
  const stepsLocked = checklistInteractionDisabled(task.status);
  const checklistTree = resolveChecklist(task.card_type, task.room_number);

  // Route to card-type-specific views before falling back to generic.
  const ct = task.card_type.toLowerCase();

  if (ct === "start_of_day" || ct.includes("start_of_day") || ct === "sod") {
    return (
      <StartOfDayCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        notes={notes}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
        noteType={noteType}
        setNoteType={setNoteType}
        noteStatus={noteStatus}
        setNoteStatus={setNoteStatus}
        noteAssignedTo={noteAssignedTo}
        setNoteAssignedTo={setNoteAssignedTo}
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteBusy={noteBusy}
        helpBusy={helpBusy}
        doneBusy={doneBusy}
        pauseBusy={pauseBusy}
        resumeBusy={resumeBusy}
        onToggleItem={toggleItem}
        onNeedHelp={onNeedHelp}
        onImDone={onImDone}
        onPause={onPause}
        onResume={onResume}
        onPostNote={onPostNote}
        maintenanceItems={maintenanceItems}
        maintBody={maintBody}
        setMaintBody={setMaintBody}
        maintLocation={maintLocation}
        setMaintLocation={setMaintLocation}
        maintItem={maintItem}
        setMaintItem={setMaintItem}
        maintType={maintType}
        setMaintType={setMaintType}
        maintSeverity={maintSeverity}
        setMaintSeverity={setMaintSeverity}
        maintFile={maintFile}
        setMaintFile={setMaintFile}
        maintBusy={maintBusy}
        onPostMaintenance={onPostMaintenance}
      />
    );
  }

  if (ct === "dailys" || ct === "daily" || ct.includes("daily")) {
    return (
      <DailysCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        notes={notes}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
        noteType={noteType}
        setNoteType={setNoteType}
        noteStatus={noteStatus}
        setNoteStatus={setNoteStatus}
        noteAssignedTo={noteAssignedTo}
        setNoteAssignedTo={setNoteAssignedTo}
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteBusy={noteBusy}
        helpBusy={helpBusy}
        doneBusy={doneBusy}
        pauseBusy={pauseBusy}
        resumeBusy={resumeBusy}
        onToggleItem={toggleItem}
        onNeedHelp={onNeedHelp}
        onImDone={onImDone}
        onPause={onPause}
        onResume={onResume}
        onPostNote={onPostNote}
        maintenanceItems={maintenanceItems}
        maintBody={maintBody}
        setMaintBody={setMaintBody}
        maintLocation={maintLocation}
        setMaintLocation={setMaintLocation}
        maintItem={maintItem}
        setMaintItem={setMaintItem}
        maintType={maintType}
        setMaintType={setMaintType}
        maintSeverity={maintSeverity}
        setMaintSeverity={setMaintSeverity}
        maintFile={maintFile}
        setMaintFile={setMaintFile}
        maintBusy={maintBusy}
        onPostMaintenance={onPostMaintenance}
      />
    );
  }

  if (ct === "eod" || ct.includes("end_of_day") || ct.includes("eod")) {
    return (
      <EODCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        notes={notes}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
        noteType={noteType}
        setNoteType={setNoteType}
        noteStatus={noteStatus}
        setNoteStatus={setNoteStatus}
        noteAssignedTo={noteAssignedTo}
        setNoteAssignedTo={setNoteAssignedTo}
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteBusy={noteBusy}
        helpBusy={helpBusy}
        doneBusy={doneBusy}
        pauseBusy={pauseBusy}
        resumeBusy={resumeBusy}
        onToggleItem={toggleItem}
        onNeedHelp={onNeedHelp}
        onImDone={onImDone}
        onPause={onPause}
        onResume={onResume}
        onPostNote={onPostNote}
        wrapBlockedBy={wrapBlockedBy}
        canWrapKnown={canWrapKnown}
        canWrapBusy={canWrapBusy}
        onRefreshCanWrap={refreshCanWrap}
      />
    );
  }

  if (ct === "stayover" || ct.includes("stayover") || ct.includes("stay_over")) {
    return (
      <StayoversCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        notes={notes}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
        noteType={noteType}
        setNoteType={setNoteType}
        noteStatus={noteStatus}
        setNoteStatus={setNoteStatus}
        noteAssignedTo={noteAssignedTo}
        setNoteAssignedTo={setNoteAssignedTo}
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteBusy={noteBusy}
        helpBusy={helpBusy}
        doneBusy={doneBusy}
        pauseBusy={pauseBusy}
        resumeBusy={resumeBusy}
        onToggleItem={toggleItem}
        onNeedHelp={onNeedHelp}
        onImDone={onImDone}
        onPause={onPause}
        onResume={onResume}
        onPostNote={onPostNote}
        maintenanceItems={maintenanceItems}
        maintBody={maintBody}
        setMaintBody={setMaintBody}
        maintLocation={maintLocation}
        setMaintLocation={setMaintLocation}
        maintItem={maintItem}
        setMaintItem={setMaintItem}
        maintType={maintType}
        setMaintType={setMaintType}
        maintSeverity={maintSeverity}
        setMaintSeverity={setMaintSeverity}
        maintFile={maintFile}
        setMaintFile={setMaintFile}
        maintBusy={maintBusy}
        onPostMaintenance={onPostMaintenance}
        currentReservation={currentReservation}
      />
    );
  }

  if (ct === "arrival" || ct.includes("arrival") || ct.includes("checkin")) {
    return (
      <ArrivalsCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        notes={notes}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
        noteType={noteType}
        setNoteType={setNoteType}
        noteStatus={noteStatus}
        setNoteStatus={setNoteStatus}
        noteAssignedTo={noteAssignedTo}
        setNoteAssignedTo={setNoteAssignedTo}
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteBusy={noteBusy}
        helpBusy={helpBusy}
        doneBusy={doneBusy}
        pauseBusy={pauseBusy}
        resumeBusy={resumeBusy}
        onToggleItem={toggleItem}
        onNeedHelp={onNeedHelp}
        onImDone={onImDone}
        onPause={onPause}
        onResume={onResume}
        onPostNote={onPostNote}
        maintenanceItems={maintenanceItems}
        maintBody={maintBody}
        setMaintBody={setMaintBody}
        maintLocation={maintLocation}
        setMaintLocation={setMaintLocation}
        maintItem={maintItem}
        setMaintItem={setMaintItem}
        maintType={maintType}
        setMaintType={setMaintType}
        maintSeverity={maintSeverity}
        setMaintSeverity={setMaintSeverity}
        maintFile={maintFile}
        setMaintFile={setMaintFile}
        maintBusy={maintBusy}
        onPostMaintenance={onPostMaintenance}
        incomingReservation={incomingReservation}
      />
    );
  }

  // Route housekeeping_turn cards (and any card_type that explicitly names a
  // departure/checkout) to the dedicated visual treatment.
  if (
    ct === "housekeeping_turn" ||
    ct.includes("departure") ||
    ct.includes("checkout")
  ) {
    return (
      <DeparturesCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        notes={notes}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
        noteType={noteType}
        setNoteType={setNoteType}
        noteStatus={noteStatus}
        setNoteStatus={setNoteStatus}
        noteAssignedTo={noteAssignedTo}
        setNoteAssignedTo={setNoteAssignedTo}
        noteFile={noteFile}
        setNoteFile={setNoteFile}
        noteBusy={noteBusy}
        helpBusy={helpBusy}
        doneBusy={doneBusy}
        pauseBusy={pauseBusy}
        resumeBusy={resumeBusy}
        onToggleItem={toggleItem}
        onNeedHelp={onNeedHelp}
        onImDone={onImDone}
        onPause={onPause}
        onResume={onResume}
        onPostNote={onPostNote}
        maintenanceItems={maintenanceItems}
        maintBody={maintBody}
        setMaintBody={setMaintBody}
        maintLocation={maintLocation}
        setMaintLocation={setMaintLocation}
        maintItem={maintItem}
        setMaintItem={setMaintItem}
        maintType={maintType}
        setMaintType={setMaintType}
        maintSeverity={maintSeverity}
        setMaintSeverity={setMaintSeverity}
        maintFile={maintFile}
        setMaintFile={setMaintFile}
        maintBusy={maintBusy}
        onPostMaintenance={onPostMaintenance}
        outgoingReservation={currentReservation}
        incomingReservation={incomingReservation}
      />
    );
  }

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work">
      {showChecklist ? (
        <ChecklistDrillDown
          root={checklistTree}
          onClose={() => setShowChecklist(false)}
        />
      ) : null}
      <div className="staff-task-exec-scroll">
        <header className="staff-task-exec-top staff-task-exec-toolbar">
          <Link href="/staff" className="staff-task-exec-back">
            ← Tasks
          </Link>
          {!taskDone ? (
            <div className="staff-task-exec-toolbar-actions">
              {inProgress ? (
                <button
                  type="button"
                  className="staff-task-exec-linkbtn"
                  onClick={() => void onPause()}
                  disabled={pauseBusy}
                >
                  {pauseBusy ? "…" : "Pause"}
                </button>
              ) : null}
              {paused ? (
                <button
                  type="button"
                  className="staff-task-exec-linkbtn"
                  onClick={() => void onResume()}
                  disabled={resumeBusy}
                >
                  {resumeBusy ? "…" : "Resume"}
                </button>
              ) : null}
            </div>
          ) : null}
        </header>

        <p className="staff-task-exec-room-label">
          Room {displayRoom(task)}
        </p>
        <h1 className="staff-task-exec-title">{task.title}</h1>

        <div
          className="staff-task-exec-meta"
          aria-label="Due time, date, priority, assignee"
        >
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Time</span>
            {formatDueTime(task.due_time)}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>
            ·
          </span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Date</span>
            {formatDueDate(task.due_date)}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>
            ·
          </span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Priority</span>
            {priorityLabel(task.priority)}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>
            ·
          </span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Assignee</span>
            {assignee || "—"}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>
            ·
          </span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Status</span>
            {task.status.replace("_", " ")}
          </span>
        </div>

        {descNote ? (
          <p className="staff-task-exec-desc">{descNote}</p>
        ) : null}

        {inlineError ? (
          <p className="error staff-task-exec-error">{inlineError}</p>
        ) : null}

        <section className="staff-task-exec-section" aria-label="Full checklist">
          <button
            type="button"
            className="staff-task-exec-view-checklist"
            onClick={() => setShowChecklist(true)}
          >
            View full checklist &rsaquo;
          </button>
        </section>

        <section
          className="staff-task-exec-section staff-task-exec-section--progress"
          aria-label="Checklist progress"
        >
          <div className="staff-task-exec-progress-head">
            <span className="staff-task-exec-h2 staff-task-exec-h2--inline">
              Progress
            </span>
            <span className="staff-task-exec-progress-pct">{progress}%</span>
          </div>
          <div
            className="staff-task-exec-progress-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress} percent complete`}
          >
            <div
              className="staff-task-exec-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <section className="staff-task-exec-section" aria-label="Checklist">
          <h2 className="staff-task-exec-h2">Steps</h2>
          {checklist.length === 0 ? (
            <p className="staff-task-exec-muted">No steps for this task yet.</p>
          ) : (
            <ul className="staff-task-exec-steps" role="list">
              {checklist.map((item) => (
                <li key={item.id} className="staff-task-exec-steps__item">
                  <button
                    type="button"
                    className="staff-task-exec-step"
                    onClick={() => void toggleItem(item)}
                    disabled={taskDone || stepsLocked}
                    aria-pressed={item.done}
                  >
                    <span
                      className={
                        item.done
                          ? "staff-task-exec-step-box staff-task-exec-step-box--done"
                          : "staff-task-exec-step-box"
                      }
                      aria-hidden
                    />
                    <span className="staff-task-exec-step-label">
                      {item.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="staff-task-exec-section" aria-label="Notes">
          <h2 className="staff-task-exec-h2">Notes &amp; updates</h2>
          {notes.length === 0 ? (
            <p className="staff-task-exec-muted">No notes yet.</p>
          ) : (
            <ul className="staff-task-exec-notes" role="list">
              {notes.map((n) => (
                <li key={n.id} className="staff-task-exec-note">
                  <div className="staff-task-exec-note-head">
                    <span className="staff-task-exec-note-author">
                      {n.author_display_name || "Team"}
                    </span>
                    <time
                      className="staff-task-exec-note-time"
                      dateTime={n.created_at}
                    >
                      {formatCommentTime(n.created_at)}
                    </time>
                  </div>
                  {/* Taxonomy chips for the new public.notes shape (master plan
                      III.A). Empty strings are defensive — public.notes has
                      NOT NULL constraints on type / assigned-to so empty
                      shouldn't happen, but the legacy fallback may render
                      mid-migration. */}
                  {n.note_type || n.note_status || n.note_assigned_to ? (
                    <div className="staff-task-exec-note-meta">
                      {n.note_type ? (
                        <span className="staff-task-exec-note-chip">
                          {n.note_type}
                        </span>
                      ) : null}
                      {n.note_status ? (
                        <span className="staff-task-exec-note-chip staff-task-exec-note-chip--status">
                          {n.note_status}
                        </span>
                      ) : null}
                      {n.note_assigned_to ? (
                        <span className="staff-task-exec-note-chip staff-task-exec-note-chip--assigned">
                          → {n.note_assigned_to}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="staff-task-exec-note-body">{n.body}</p>
                  {n.image_url ? (
                    <a
                      href={n.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="staff-photo-thumb-link"
                    >
                      <img
                        src={n.image_url}
                        alt=""
                        className="staff-photo-thumb"
                      />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {!taskDone ? (
            <NoteComposeForm
              body={noteBody}
              setBody={setNoteBody}
              noteType={noteType}
              setNoteType={setNoteType}
              noteStatus={noteStatus}
              setNoteStatus={setNoteStatus}
              noteAssignedTo={noteAssignedTo}
              setNoteAssignedTo={setNoteAssignedTo}
              file={noteFile}
              setFile={setNoteFile}
              onSubmit={onPostNote}
              busy={noteBusy}
              className="note-compose--exec"
            />
          ) : null}
        </section>

        <section
          className="staff-task-exec-section"
          aria-label="Maintenance"
        >
          <h2 className="staff-task-exec-h2">Maintenance</h2>
          {maintenanceItems.length === 0 ? (
            <p className="staff-task-exec-muted">No maintenance issues yet.</p>
          ) : (
            <ul className="staff-task-exec-notes" role="list">
              {maintenanceItems.map((m) => (
                <li key={m.id} className="staff-task-exec-note">
                  <div className="staff-task-exec-note-head">
                    <span className="staff-task-exec-note-author">
                      {m.author_display_name || "Team"}
                    </span>
                    <time
                      className="staff-task-exec-note-time"
                      dateTime={m.created_at}
                    >
                      {formatCommentTime(m.created_at)}
                    </time>
                  </div>
                  <div className="staff-task-exec-note-meta">
                    <span className="staff-task-exec-note-chip">
                      {m.location}
                    </span>
                    <span className="staff-task-exec-note-chip">
                      {m.item}
                    </span>
                    <span className="staff-task-exec-note-chip">
                      {m.type}
                    </span>
                    <span
                      className={
                        m.severity === "High"
                          ? "staff-task-exec-note-chip staff-task-exec-note-chip--severity-high"
                          : "staff-task-exec-note-chip staff-task-exec-note-chip--status"
                      }
                    >
                      {m.severity}
                    </span>
                  </div>
                  {m.body ? (
                    <p className="staff-task-exec-note-body">{m.body}</p>
                  ) : null}
                  {m.image_url ? (
                    <a
                      href={m.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="staff-photo-thumb-link"
                    >
                      <img
                        src={m.image_url}
                        alt=""
                        className="staff-photo-thumb"
                      />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {!taskDone ? (
            <MaintenanceComposeForm
              body={maintBody}
              setBody={setMaintBody}
              location={maintLocation}
              setLocation={setMaintLocation}
              item={maintItem}
              setItem={setMaintItem}
              type={maintType}
              setType={setMaintType}
              severity={maintSeverity}
              setSeverity={setMaintSeverity}
              file={maintFile}
              setFile={setMaintFile}
              onSubmit={onPostMaintenance}
              busy={maintBusy}
              className="maint-compose--exec"
            />
          ) : null}
        </section>
      </div>

      <footer className="staff-task-exec-bar" aria-label="Task actions">
        <button
          type="button"
          className="staff-task-exec-bar-btn staff-task-exec-bar-btn--secondary"
          onClick={() => void onNeedHelp()}
          disabled={helpBusy || taskDone}
        >
          {helpBusy ? "…" : "NEED HELP"}
        </button>
        <button
          type="button"
          className="staff-task-exec-bar-btn staff-task-exec-bar-btn--primary"
          onClick={() => void onImDone()}
          disabled={doneBusy || taskDone || paused}
        >
          {taskDone ? "DONE" : doneBusy ? "…" : "I'M DONE"}
        </button>
      </footer>
    </main>
  );
}
