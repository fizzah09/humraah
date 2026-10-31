'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Floating assistant button on every screen (PRD F1). */
export default function AssistantFab() {
  const path = usePathname();
  if (path === '/assistant' || path === '/practice') return null;
  return (
    <Link
      href="/assistant"
      aria-label="Open Humraah assistant"
      className="assistant-fab fixed z-40 end-4 bottom-24 lg:bottom-8 h-16 w-16 rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(11,122,75,0.35)] grid place-items-center hover:bg-primaryDark transition-colors"
    >
      <span className="absolute inset-0 rounded-full bg-primaryLight/40 animate-ping" aria-hidden />
      <svg aria-hidden width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative">
        <path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zM5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </Link>
  );
}
