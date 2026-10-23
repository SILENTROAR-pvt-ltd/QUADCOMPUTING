import { ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';
import { CashbackFlow } from './CashbackFlow';
import { CONTAINER, H2, KICKER, LEAD, TURN } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';

/**
 * Two quiet promises side by side: a safer space (red-flagged guests are not entertained anywhere), and the 7% that comes
 * back to every Viber, said once, plainly, and then shown working in a live ledger and wallet.
 */
export function SaferAndCashback() {
  return (
    <section aria-label="A safer space, and 7% back" className="relative bg-[#ece5d6]/60 py-24 text-[#10231a] sm:py-32">
      <div className={`${CONTAINER} grid gap-16 lg:grid-cols-2 lg:gap-24`}>
        <div>
          <Reveal><p className={KICKER}>A safer space</p></Reveal>
          <Reveal index={1}><h2 className={`${DISPLAY} ${H2}`}>A vibe is precious. <em className={TURN}>We protect it.</em></h2></Reveal>
          <Reveal index={2}>
            <p className={`${LEAD} mt-7`}>
              We red-flag people who have ruined other Vibers&apos; experiences through toxic, intolerable or inappropriate
              behaviour, or through criminal activity.
            </p>
          </Reveal>
          <Reveal index={3}>
            <div className="mt-9 flex items-start gap-4 border border-[#b08d57]/45 bg-[#f5f1e8] p-6">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6d3f]" strokeWidth={1.5} />
              <p className={`${DISPLAY} text-[1.35rem] italic leading-snug`}>Our promise: red-flagged visitors and guests are not entertained at any Vibers Connect property.</p>
            </div>
          </Reveal>
        </div>

        <div className="lg:border-l lg:border-[#10231a]/10 lg:pl-24">
          <Reveal><p className={KICKER}>Built for Vibers</p></Reveal>
          <Reveal index={1}>
            <p className={`${DISPLAY} mt-5 flex items-baseline gap-4`}>
              <span className="text-[4.6rem] font-light leading-none text-[#10231a] sm:text-[5.4rem]">7%</span>
              <span className="text-[1.6rem] font-light italic text-[#8a6d3f]">comes back to you</span>
            </p>
          </Reveal>
          <Reveal index={2}>
            <p className={`${LEAD} mt-6`}>
              Hold your Viber ID, and every expense at a Vibers Connect point earns 7% back: on stay, food,
              get-togethers and more. Watch it work:
            </p>
          </Reveal>
          <Reveal index={3}><CashbackFlow /></Reveal>
        </div>
      </div>
    </section>
  );
}
