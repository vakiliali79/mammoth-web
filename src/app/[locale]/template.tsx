import type { ReactNode } from "react";

/** Re-mounts on navigation, giving every page a soft entrance. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
