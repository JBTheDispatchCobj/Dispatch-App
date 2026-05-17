"use client";

// app/admin/table/page.tsx
//
// Day 54 chase #6 — placeholder route for the "Table" tile in the new admin
// Daily Brief. Bryan's spec: "active to-do list map of the property" —
// future interface not yet built. This route exists so the brief's tap
// target resolves to a real page instead of 404'ing.
//
// Replace this stub with the real table view when the spec lands.

import Link from "next/link";

export default function AdminTablePlaceholderPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--page-bg, #E6DFCD)",
        color: "#2C1608",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(44,22,8,0.55)",
        }}
      >
        Property Table
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.6px",
          textAlign: "center",
          maxWidth: 360,
        }}
      >
        Active to-do map &mdash; coming soon.
      </h1>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: "rgba(44,22,8,0.62)",
          maxWidth: 320,
          textAlign: "center",
        }}
      >
        This is where the property-wide active task map will live. Wired up
        once the interface is built.
      </p>
      <Link
        href="/admin"
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#2C1608",
          textDecoration: "none",
          marginTop: 12,
          padding: "8px 18px",
          border: "1px solid rgba(44,22,8,0.20)",
          borderRadius: 999,
          background: "#FFFFFF",
        }}
      >
        &larr; Back to admin
      </Link>
    </main>
  );
}
