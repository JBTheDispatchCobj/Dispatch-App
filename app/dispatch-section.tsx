"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activityType, logActivity } from "@/lib/activity-log";
import { supabase } from "@/lib/supabase";

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DispatchSection() {
  const [day] = useState(() => localDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [draftItem, setDraftItem] = useState("");
  const [saveLine, setSaveLine] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("dispatch_day")
      .select("brief, watchlist")
      .eq("day", day)
      .maybeSingle();

    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }
    if (data) {
      setBrief(data.brief ?? "");
      setWatchlist(Array.isArray(data.watchlist) ? data.watchlist : []);
    } else {
      setBrief("");
      setWatchlist([]);
    }
    setLoading(false);
  }, [day]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setSaving(true);
    setError(null);
    setSaveLine("Saving...");
    const trimmed = watchlist.map((s) => s.trim()).filter(Boolean);
    const { error: upError } = await supabase.from("dispatch_day").upsert(
      {
        day,
        brief: brief.trim(),
        watchlist: trimmed,
      },
      { onConflict: "day" },
    );
    setSaving(false);
    if (upError) {
      setSaveLine(null);
      setError(upError.message);
      return;
    }
    setWatchlist(trimmed);
    void logActivity(
      activityType.dispatchSaved,
      `Dispatch saved for ${day}`,
    );
    setSaveLine("Saved");
    savedTimerRef.current = setTimeout(() => {
      setSaveLine(null);
      savedTimerRef.current = null;
    }, 2500);
  }

  function addItem() {
    const t = draftItem.trim();
    if (!t) return;
    setWatchlist((prev) => [...prev, t]);
    setDraftItem("");
  }

  function removeItem(index: number) {
    setWatchlist((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <>
      <h2>Dispatch</h2>
      <p className="dispatch-date" aria-live="polite">
        {day}
      </p>

      {loading ? (
        <p className="dispatch-muted">Loading…</p>
      ) : (
        <>
          {error ? <p className="error">{error}</p> : null}

          <div className="dispatch-block">
            <label className="dispatch-label" htmlFor="dispatch-brief">
              Daily brief
            </label>
            <textarea
              id="dispatch-brief"
              className="dispatch-textarea"
              rows={4}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={saving}
              placeholder="What matters today…"
            />
          </div>

          <div className="dispatch-block">
            <span className="dispatch-label">Watchlist</span>
            <ul className="dispatch-watchlist">
              {watchlist.length === 0 ? (
                <li className="dispatch-muted">No items yet.</li>
              ) : (
                watchlist.map((item, i) => (
                  <li key={`${i}-${item.slice(0, 24)}`}>
                    <span className="dispatch-watchlist-text">{item}</span>
                    <button
                      type="button"
                      className="dispatch-remove outline"
                      onClick={() => removeItem(i)}
                      disabled={saving}
                      aria-label={`Remove: ${item}`}
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="dispatch-add-row">
              <input
                type="text"
                className="dispatch-add-input"
                value={draftItem}
                onChange={(e) => setDraftItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Add a watch item"
                disabled={saving}
                aria-label="New watchlist item"
              />
              <button
                type="button"
                className="outline"
                onClick={addItem}
                disabled={saving}
              >
                Add
              </button>
            </div>
          </div>

          <button
            type="button"
            className="dispatch-save"
            disabled={saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saveLine ? (
            <p className="dispatch-save-status" aria-live="polite">
              {saveLine}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
