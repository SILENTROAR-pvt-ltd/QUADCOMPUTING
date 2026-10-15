'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/utils/chunk-error';

interface Props {
  children: React.ReactNode;
  /** What is on screen ("billing", "kitchen"...), shown to the host and sent with the error report. */
  label: string;
  /** Changing this (the host opens another tab) clears a previous error, so one broken view never traps the console. */
  resetKey: string;
}

interface State {
  error: Error | null;
  componentStack: string;
}

/**
 * Keeps a crash in one workspace view from blanking the whole host console. The sidebar, the other tabs and the staff
 * alerts stay up; the broken view shows a plain message with Retry. The exact component stack goes to Sentry, and to
 * the browser console in development, so the cause can be found instead of guessed.
 */
export class WorkspaceErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const componentStack = info.componentStack || '';
    this.setState({ componentStack });
    // The page is older than the deployed version (or the connection dropped mid-load): fetch the new files, once.
    if (isChunkLoadError(error) && reloadOnceForChunkError()) return;
    console.error(`[Workspace] the "${this.props.label}" view crashed`, error, componentStack);
    try {
      Sentry.captureException(error, { tags: { workspace: this.props.label }, extra: { componentStack } });
    } catch {
      // Reporting must never throw inside an error boundary.
    }
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null, componentStack: '' });
  }

  private retry = () => {
    // A failed on-demand load is remembered, so trying again in place cannot succeed: reload the page.
    if (isChunkLoadError(this.state.error)) window.location.reload();
    else this.setState({ error: null, componentStack: '' });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (isChunkLoadError(this.state.error)) {
      return (
        <div role="alert" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Updated</p>
          <h2 className="mt-2 text-xl font-semibold text-neutral-950">Reload to continue</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            Quad Computing was updated while this page was open. Your orders, bills and tables are safe. Reload to load the new version.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 cursor-pointer"
          >
            Reload page
          </button>
        </div>
      );
    }
    return (
      <div role="alert" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Something went wrong</p>
        <h2 className="mt-2 text-xl font-semibold text-neutral-950">This section could not be shown</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
          Your orders, bills and tables are safe. The rest of the console still works. Try again, or open another section and come back.
        </p>
        <button
          type="button"
          onClick={this.retry}
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 cursor-pointer"
        >
          Try again
        </button>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="mt-5 max-h-48 overflow-auto rounded-xl bg-neutral-50 p-3 text-[11px] leading-snug text-neutral-600">
            {`${this.state.error.message}${this.state.componentStack}`}
          </pre>
        )}
      </div>
    );
  }
}

export default WorkspaceErrorBoundary;
