import type { InvitationData } from "../types";
import { Flourish, Photo } from "./Shared";
import { AnimatedName, CarvedFrame, Flowers, Lace, Petals, Swan } from "./Decor";
import s from "../InvitationTemplate.module.css";
export function Hero({ data }: { data: InvitationData }) {
  return (
    <section id="opening" className={s.hero}>
      <div className={s.heroVista} data-scene>
      <div className={s.heroScenery} aria-hidden="true" />
      <Petals />
      <div className={s.coverFrame}><CarvedFrame /></div>
      <Flowers position="topLeft" /><Flowers position="topRight" />
      <Flowers position="bottomLeft" /><Flowers position="bottomRight" />
      <div className={s.heroIntro} data-reveal="hero">
        <span className={s.eyebrow}>{data.event.title}</span>
        <p className={s.script}>and so our story begins</p>
        <h2 tabIndex={-1} data-opening-focus>
          <AnimatedName value={data.couple.bride.shortName} />
          <em>&</em>
          <AnimatedName value={data.couple.groom.shortName} second />
        </h2>
        <p>{data.event.statement}</p>
        <span className={s.datePill}>{data.event.dateLabel}</span>
      </div>
      <Lace />
      </div>
      <div className={s.heroPrelude} data-scene>
      <Flowers position="bottomLeft" /><Swan />
      <div className={s.heroFrame} data-reveal="portrait">
        <CarvedFrame />
        <Photo image={data.media.hero} eager />
        <span className={s.frameNote}>the beginning of forever</span>
      </div>
      <div className={s.heroPrayer} data-reveal="prayer">
        <Flourish />
        <p>{data.event.openingText}</p>
        <blockquote>{data.event.prayer}</blockquote>
        {data.event.prayerSource && <cite>{data.event.prayerSource}</cite>}
      </div>
      </div>
    </section>
  );
}
