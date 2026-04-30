"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  DEV_ROLE_STORAGE_KEY,
  getDevRoleMode,
  isLocalDevHost,
  type DevRoleMode,
} from "@/lib/dev-auth-bypass";

/**
 * Fixed bottom bar — only on local dev hostnames (matches bypass; avoids NODE_ENV bundle quirks).
 */
export default function DevRoleSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<DevRoleMode>("off");

  useEffect(() => {
    if (!isLocalDevHost()) return;
    setMode(getDevRoleMode());
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!isLocalDevHost()) return null;

  function apply(next: DevRoleMode) {
    localStorage.setItem(DEV_ROLE_STORAGE_KEY, next);
    window.location.reload();
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: "#1a1a1a",
        color: "#eee",
        fontSize: 12,
        fontFamily: "ui-monospace, monospace",
        borderTop: "1px solid #444",
      }}
    >
      <span style={{ marginRight: "auto" }}>
        dev: <strong>{mode}</strong>
      </span>
      <button
        type="button"
        onClick={() => apply("off")}
        disabled={mode === "off"}
        style={btnStyle(mode === "off", "#555")}
      >
        Off
      </button>
      <button
        type="button"
        onClick={() => apply("manager")}
        disabled={mode === "manager"}
        style={btnStyle(mode === "manager", "#1d4ed8")}
      >
        Manager
      </button>
      <button
        type="button"
        onClick={() => apply("staff")}
        disabled={mode === "staff"}
        style={btnStyle(mode === "staff", "#15803d")}
      >
        Staff
      </button>
    </div>
  );
}

function btnStyle(active: boolean, bg: string): CSSProperties {
  return {
    padding: "4px 10px",
    cursor: active ? "default" : "pointer",
    opacity: active ? 0.55 : 1,
    background: bg,
    color: "#fff",
    border: "1px solid #666",
    borderRadius: 4,
  };
}
