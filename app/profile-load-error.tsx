"use client";

import type { ProfileFetchFailure } from "@/lib/profile";
import SignOutButton from "./sign-out-button";

export default function ProfileLoadError({
  failure,
}: {
  failure: ProfileFetchFailure;
}) {
  return (
    <main className="wrap">
      <h1>Can&apos;t load profile</h1>
      <p className="error">{failure.message}</p>
      <p className="subtitle profile-load-error-meta">
        <code>{failure.reason}</code>
        {failure.supabaseError ? (
          <>
            {" "}
            · <code>{failure.supabaseError}</code>
          </>
        ) : null}
      </p>
      <SignOutButton />
    </main>
  );
}
