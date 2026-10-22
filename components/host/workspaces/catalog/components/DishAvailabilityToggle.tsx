'use client';

interface DishAvailabilityToggleProps {
  name: string;
  on: boolean;
  busy?: boolean;
  onToggle: () => void;
}

/** A dish's on/off switch for the guest menu: on shows it to guests, off hides it without deleting anything. */
export function DishAvailabilityToggle({ name, on, busy, onToggle }: DishAvailabilityToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${name} on the guest menu`}
      title={on ? 'Guests see this dish. Tap to take it off the menu.' : 'Hidden from guests. Tap to put it back on the menu.'}
      onClick={onToggle}
      disabled={busy}
      className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-[11px] font-semibold transition-colors disabled:cursor-wait ${
        on ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-neutral-200 bg-neutral-100 text-neutral-500'
      }`}
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-neutral-300'}`}>
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </span>
      {on ? 'On menu' : 'Off menu'}
    </button>
  );
}
