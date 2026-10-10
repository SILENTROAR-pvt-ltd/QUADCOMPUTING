import { FLOW_STEPS, LANES, type FlowStep } from './order-flow-steps';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

function StepCard({ step }: { step: FlowStep }) {
  return (
    <div className="h-full rounded-2xl border border-black/[0.08] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <step.icon aria-hidden="true" className="h-4 w-4 text-black" />
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LANES[step.lane].chip}`}>{step.who}</span>
      </div>
      <h3 className="mt-3 text-[14px] font-semibold text-black">{step.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600">{step.text}</p>
    </div>
  );
}

const Node = ({ n }: { n: number }) => (
  <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full border border-black bg-white text-[12px] font-semibold text-black">{n}</span>
);

export function OrderFlowSection() {
  return (
    <section id="how-it-works" aria-labelledby="flow-title" className={`${SECTION} bg-[#faf9f6]`}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>How it works</p>
        <h2 id="flow-title" className={H2}>From QR scan to closing report.</h2>
        <p className={LEAD}>Follow one order through the system. Guest steps happen in Vibers Connect; venue steps happen in Quad Computing.</p>

        <div className="mt-8 flex flex-wrap gap-2" aria-hidden="true">
          {Object.values(LANES).map((l) => (
            <span key={l.label} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${l.chip}`}>{l.label}</span>
          ))}
        </div>

        {/* Wide screens: a two-lane flow chart. Guests above the timeline, the venue below it. */}
        <div aria-hidden="true" className="mt-10 hidden lg:block">
          <div className="grid grid-cols-6 gap-4">
            {FLOW_STEPS.map((s) => <div key={s.n} className="flex flex-col justify-end">{s.lane === 'guest' && <StepCard step={s} />}</div>)}
          </div>
          <div className="relative my-5 grid grid-cols-6 gap-4">
            <div className="absolute left-[8.33%] right-[8.33%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[#c8a96a] via-zinc-400 to-black" />
            {FLOW_STEPS.map((s) => <div key={s.n} className="flex justify-center"><Node n={s.n} /></div>)}
          </div>
          <div className="grid grid-cols-6 gap-4">
            {FLOW_STEPS.map((s) => <div key={s.n}>{s.lane === 'venue' && <StepCard step={s} />}</div>)}
          </div>
        </div>

        {/* Small screens (and screen readers everywhere): the same steps as an ordered list. */}
        <div className="relative mt-10 lg:mt-0">
          <span aria-hidden="true" className="absolute bottom-4 left-4 top-4 w-px bg-gradient-to-b from-[#c8a96a] via-zinc-400 to-black lg:hidden" />
          <ol className="space-y-4 lg:sr-only">
          {FLOW_STEPS.map((s) => (
            <li key={s.n} className="relative flex gap-4">
              <Node n={s.n} />
              <div className="flex-1">
                <p className="sr-only">{LANES[s.lane].label}</p>
                <StepCard step={s} />
              </div>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
