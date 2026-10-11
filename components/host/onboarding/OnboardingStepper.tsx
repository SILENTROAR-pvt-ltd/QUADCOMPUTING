import { Check } from 'lucide-react';
import { STEPS } from './onboarding.constants';

/** The three sign-up steps, with the current one highlighted. */
export function OnboardingStepper({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Sign-up progress">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={s.label} aria-current={current ? 'step' : undefined}
            className={`rounded-2xl border px-3 py-3 transition-colors sm:px-4 ${current ? 'border-neutral-900 bg-white' : 'border-neutral-200 bg-white/60'}`}>
            <div className="flex items-center gap-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done || current ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={`text-sm font-semibold ${current || done ? 'text-neutral-950' : 'text-neutral-500'}`}>{s.label}</span>
            </div>
            <p className="mt-1 hidden pl-[38px] text-xs text-neutral-500 sm:block">{s.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
