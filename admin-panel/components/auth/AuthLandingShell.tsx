import type { ReactNode } from "react";

type AuthLandingShellProps = {
  badgeLabel: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthLandingShell({
  badgeLabel,
  title,
  description,
  children,
  footer,
}: AuthLandingShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#fbf9ff_0%,#f2f0ff_34%,#eef3ff_68%,#fff9fb_100%)] p-6 sm:p-8">
      <div className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-20 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-[22rem] w-[22rem] rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-10 h-28 w-28 rounded-full bg-rose-200/35 blur-2xl" />

      <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_2px_8px_rgba(15,23,42,0.05),0_18px_58px_rgba(109,40,217,0.16)] backdrop-blur-2xl sm:p-11">
        <div className="pointer-events-none absolute right-8 top-7 h-2 w-2 rounded-full bg-violet-300/80 shadow-[0_0_18px_rgba(167,139,250,0.85)]" />
        <div className="pointer-events-none absolute right-12 top-10 h-1.5 w-1.5 rounded-full bg-indigo-300/80 shadow-[0_0_12px_rgba(129,140,248,0.8)]" />

        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/75 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M12 3l7 3v5c0 4.4-2.9 8.5-7 9.9C7.9 19.5 5 15.4 5 11V6l7-3z"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
          {badgeLabel}
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-xl text-[0.98rem] leading-relaxed text-slate-600 sm:text-lg">{description}</p>

        <div className="mt-9">{children}</div>

        {footer ? <div className="mt-5 text-xs tracking-[0.02em] text-slate-500">{footer}</div> : null}
      </div>
    </main>
  );
}
