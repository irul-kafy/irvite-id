import type { Guest, InvitationData } from "../types";
import { Flourish, Photo } from "./Shared";
import { CarvedFrame, Flowers, Lace, Petals } from "./Decor";
import s from "../InvitationTemplate.module.css";
export function Opening({
  data,
  guest,
  leaving,
  onOpen,
}: {
  data: InvitationData;
  guest?: Guest;
  leaving: boolean;
  onOpen: () => void;
}) {
  return (
    <section
      className={`${s.opening} ${leaving ? s.openingLeaving : ""}`}
      aria-label="Sampul undangan"
    >
      <Photo image={data.media.cover} className={s.coverScenery} eager />
      <Petals />
      <div className={s.coverFrame}><CarvedFrame /></div>
      <Flowers position="topLeft" /><Flowers position="topRight" />
      <Flowers position="bottomLeft" /><Flowers position="bottomRight" />
      <div className={s.coverContent}>
        <span className={s.eyebrow}>{data.event.title}</span>
        <p className={s.script}>a fairytale of our own</p>
        <h1>
          {data.couple.bride.shortName}
          <span>&</span>
          {data.couple.groom.shortName}
        </h1>
        <p className={s.coverDate}>{data.event.dateLabel}</p>
        <Flourish />
        <div className={s.guestGreeting}>
          <span>Kepada yang terkasih</span>
          <strong>
            {guest?.kind === "personal" && guest.name
              ? guest.name
              : "Bapak / Ibu / Saudara / i"}
          </strong>
        </div>
        <button className={s.button} onClick={onOpen} disabled={leaving}>
          Buka Undangan <span aria-hidden="true">↗</span>
        </button>
        <small className={s.coverBrand}>irvite.id</small>
      </div>
      <Lace />
    </section>
  );
}
