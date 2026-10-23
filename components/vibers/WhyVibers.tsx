import { Reveal } from './Reveal';
import { EcosystemDeck } from './EcosystemDeck';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';

/** Why Vibers Connect exists: not a tech product, an ecosystem with a culture; its three parts as a deck to play with. */
export function WhyVibers() {
  return (
    <section id="why" aria-labelledby="why-title" className={`${SECTION} overflow-hidden bg-[#ece5d6]/60 text-[#10231a]`}>
      <div aria-hidden="true" className="absolute -right-48 top-24 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.3),transparent_65%)]" />
      <div className={`${CONTAINER} relative`}>
        <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <Reveal><p className={KICKER}>Why Vibers Connect</p></Reveal>
            <Reveal index={1}>
              <h2 id="why-title" className={`${DISPLAY} ${H2}`}>Not just a tech solution. <em className={TURN}>A Viber-cultured ecosystem.</em></h2>
            </Reveal>
          </div>
          <Reveal index={2}>
            <p className={LEAD}>
              One place where Vibers find each other, and where the space, the fun and the people already understand the vibe.
            </p>
          </Reveal>
        </div>
        <Reveal index={3} className="mt-10 sm:mt-14">
          <EcosystemDeck />
        </Reveal>
      </div>
    </section>
  );
}
