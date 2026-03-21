import type { ReactNode } from "react";

type CourseBadgeProps = {
  children: ReactNode;
};

export function CourseBadge({ children }: CourseBadgeProps) {
  return (
    <span className="rounded-full border border-amber-300/70 bg-amber-100/70 px-2.5 py-1 text-xs font-medium text-amber-900">
      {children}
    </span>
  );
}
