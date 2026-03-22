"use client";

import { useState, useTransition } from "react";

export function LogoutButton() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });

        const payload = (await response.json().catch(() => null)) as { logoutUrl?: string; error?: string } | null;

        if (!response.ok || !payload?.logoutUrl) {
          setErrorMessage(payload?.error ?? "Logout failed.");
          return;
        }

        window.location.assign(payload.logoutUrl);
      } catch {
        setErrorMessage("Logout failed.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="rounded-full border border-[var(--line)] bg-[rgba(255,253,247,0.88)] px-4 py-2 text-sm font-medium text-stone-700 hover:border-[var(--ink)] hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Logging out..." : "Log out"}
      </button>
      {errorMessage ? <p className="text-xs text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
