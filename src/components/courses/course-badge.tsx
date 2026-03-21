import type { ReactNode } from "react";

type CourseBadgeProps = {
  children: ReactNode;
};

export function CourseBadge({ children }: CourseBadgeProps) {
  return (
    <span className="note-chip rounded-full px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}
