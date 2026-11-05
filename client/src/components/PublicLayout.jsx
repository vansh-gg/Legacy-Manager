import { Outlet } from 'react-router-dom';
import { AccessibilityBar } from './AccessibilityBar.jsx';
import { Logo } from './Logo.jsx';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">Skip to main content</a>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <AccessibilityBar />
        </div>
      </header>
      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-base text-muted sm:px-6">
          Digital Legacy Manager — your information is encrypted and only released to the people you choose.
        </div>
      </footer>
    </div>
  );
}

/** Narrow centred card used by login, sign-up and similar pages. */
export function AuthCard({ title, intro, children }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-9">
        <h1 className="text-3xl font-bold">{title}</h1>
        {intro && <p className="mt-2 text-lg text-muted">{intro}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}
