"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ArrivalsCard from "./ArrivalsCard";
import DailysCard from "./DailysCard";
import DeparturesCard from "./DeparturesCard";
import EODCard from "./EODCard";
import StartOfDayCard from "./StartOfDayCard";
import StayoversCard from "./StayoversCard";
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
  type CommentRow,
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
  addTaskComment,
  completeCard,
  openCard,
  pauseCard,
  requestHelp,
  resumeCard,
  toggleChecklistItem,
} from "@/lib/orchestration";
import { supabase } from "@/lib/supabase";
import {
  checklistCompletionPercent,
  loadStaffExecutionChecklist,
  type ExecutionChecklistItem,
} from "@/lib/staff-task-execution-checklist";

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
  const [displayName, setDisplayName] = useState("");

  const [task, setTask] = useState<TaskCard | null>(null);
  const [checklist, setChecklist] = useState<ExecutionChecklistItem[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const [noteBody, setNoteBody] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [doneBusy, setDoneBusy] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);

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
      setComments([]);
      setReady(true);
      return;
    }

    const t = normalizeTask(tRow as Record<string, unknown>);
    setTask(t);

    const [{ data: cm }, chItems] = await Promise.all([
      supabase
        .from("task_comments")
        .select(
          "id, task_id, user_id, author_display_name, body, image_url, checklist_item_id, created_at",
        )
        .eq("task_id", id)
        .order("created_at", { ascending: true }),
      loadStaffExecutionChecklist(supabase, id).catch((e: Error) => {
        console.warn("[staff-task-exec checklist]", e.message);
        return [] as ExecutionChecklistItem[];
      }),
    ]);

    setComments((cm as CommentRow[]) ?? []);
    setChecklist(chItems);

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
    setDoneBusy(false);
    if (!r.ok) {
      setInlineError(r.message);
      return;
    }
    router.push("/staff");
  }, [task, userId, displayName, router]);

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

  const onPostNote = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!task || !userId) return;
      const body = noteBody.trim();
      if (!body) return;
      setNoteBusy(true);
      setInlineError(null);
      const r = await addTaskComment(supabase, {
        taskId: task.id,
        userId,
        authorDisplayName: displayName,
        body,
        imageUrl: null,
        checklistItemId: null,
      });
      setNoteBusy(false);
      if (!r.ok) {
        setInlineError(r.message);
        return;
      }
      setNoteBody("");
      await load();
    },
    [task, userId, displayName, noteBody, load],
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

  // Route to card-type-specific views before falling back to generic.
  const ct = task.card_type.toLowerCase();

  if (ct === "start_of_day" || ct.includes("start_of_day") || ct === "sod") {
    return (
      <StartOfDayCard
        task={task}
        userId={userId}
        displayName={displayName}
        checklist={checklist}
        comments={comments}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
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
        comments={comments}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
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
        comments={comments}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
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
        comments={comments}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
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
        comments={comments}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
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
        comments={comments}
        inlineError={inlineError}
        setInlineError={setInlineError}
        noteBody={noteBody}
        setNoteBody={setNoteBody}
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
      />
    );
  }

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work">
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
          {comments.length === 0 ? (
            <p className="staff-task-exec-muted">No notes yet.</p>
          ) : (
            <ul className="staff-task-exec-notes" role="list">
              {comments.map((c) => (
                <li key={c.id} className="staff-task-exec-note">
                  <div className="staff-task-exec-note-head">
                    <span className="staff-task-exec-note-author">
                      {c.author_display_name || "Team"}
                    </span>
                    <time
                      className="staff-task-exec-note-time"
                      dateTime={c.created_at}
                    >
                      {formatCommentTime(c.created_at)}
                    </time>
                  </div>
                  <p className="staff-task-exec-note-body">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {!taskDone ? (
            <form className="staff-task-exec-note-form" onSubmit={onPostNote}>
              <label className="staff-task-exec-note-label" htmlFor="staff-task-note">
                Add a note
              </label>
              <textarea
                id="staff-task-note"
                className="staff-task-exec-note-input"
                rows={2}
                placeholder="Visible to your team…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="staff-task-exec-note-send"
                disabled={noteBusy || !noteBody.trim()}
              >
                {noteBusy ? "Sending…" : "Post note"}
              </button>
            </form>
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
