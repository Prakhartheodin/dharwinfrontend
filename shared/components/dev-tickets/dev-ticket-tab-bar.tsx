"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Tickets", href: "/dev-tickets", match: (p: string) => p === "/dev-tickets" },
  { label: "Board", href: "/dev-tickets/board", match: (p: string) => p.startsWith("/dev-tickets/board") },
  { label: "Analytics", href: "/dev-tickets/analytics", match: (p: string) => p.startsWith("/dev-tickets/analytics") },
] as const;

export default function DevTicketTabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Help & Support sections" className="mb-6 border-b border-defaultborder dark:border-white/10">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={
                  "inline-flex items-center px-4 py-2.5 text-[0.8125rem] transition-colors " +
                  (active
                    ? "font-semibold text-defaulttextcolor dark:text-white border-b-2 border-primary -mb-px"
                    : "font-medium text-[#8c9097] dark:text-white/50 hover:text-defaulttextcolor dark:hover:text-white/80")
                }
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
