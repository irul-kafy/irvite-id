import type { InvitationData } from "../types";
import { Flourish, Photo } from "./Shared";
import s from "../InvitationTemplate.module.css";
import { CarvedFrame, Flowers, Lace, Swan } from "./Decor";
export function Closing({ data }: { data: InvitationData }) {
  return (
    <section id="closing" className={s.closing}>
      <Photo image={data.media.closing} className={s.closingPhoto} />
      <Flowers position="topLeft" /><Flowers position="bottomRight" /><Swan reverse />
      <div className={s.closingContent} data-reveal="closing">
        <CarvedFrame />
        <p className={s.script}>with all our love,</p>
        <h2>Terima Kasih</h2>
        <p>{data.event.closingMessage}</p>
        <Flourish />
        <h3>
          {data.couple.bride.shortName}
          <em>&</em>
          {data.couple.groom.shortName}
        </h3>
        <p className={s.eyebrow}>{data.event.dateLabel}</p>
      </div>
      <footer className={s.brand}>
        crafted with love · <span>irvite.id</span>
      </footer>
      <Lace />
    </section>
  );
}
