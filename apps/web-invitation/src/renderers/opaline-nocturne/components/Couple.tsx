import type { InvitationData } from "../types";
import { Heading, Ornament, Photo, safeUrl, Section } from "./Shared";
import s from "../InvitationTemplate.module.css";
import { CarvedFrame, Swan } from "./Decor";
export function Couple({ couple }: { couple: InvitationData["couple"] }) {
  return (
    <Section id="couple" className={s.coupleSection}>
      <Heading eyebrow="Two souls under one sky">
        Pemilik Janji
      </Heading>
      <div className={s.coupleGrid}>
        {[couple.bride, couple.groom].map((p, i) => (
          <article
            className={`${s.partner} ${i ? s.partnerReverse : ""}`}
            key={i}
            data-reveal={i ? "right" : "left"}
          >
            <div className={s.partnerPortrait}>
              <CarvedFrame />
              <div className={s.portraitCrop}>
                <Photo image={p.portrait} />
              </div>
              <Ornament side={i ? "right" : "left"} />
              <span className={s.portraitIndex}>0{i + 1}</span>
            </div>
            <div className={s.partnerInfo}>
              <span className={s.eyebrow}>{i ? "The groom" : "The bride"}</span>
              <h3>{p.name}</h3>
              <p>{p.parents}</p>
              {p.social && safeUrl(p.social.url) && (
                <a
                  className={s.textLink}
                  href={safeUrl(p.social.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p.social.label} ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <Swan />
    </Section>
  );
}
