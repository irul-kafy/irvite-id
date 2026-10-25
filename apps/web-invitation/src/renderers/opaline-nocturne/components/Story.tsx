import type { InvitationData } from "../types";
import { Heading, Photo, Section } from "./Shared";
import s from "../InvitationTemplate.module.css";
export function Story({
  chapters,
  image,
}: {
  chapters: InvitationData["story"];
  image?: InvitationData["media"]["story"];
}) {
  return (
    <Section id="story" className={s.storySection}>
      <Heading eyebrow="Written in the little moments">Cerita Kita</Heading>
      <div className={s.storyScene}>
        <Photo image={image} className={s.storyBackdrop} />
        <div className={s.storyChapters}>
          {chapters.map((chapter, i) => (
            <article
              className={s.storyCard}
              key={`${chapter.year}-${i}`}
              data-reveal="story"
            >
              <span className={s.storyYear}>{chapter.year}</span>
              <h3>{chapter.title}</h3>
              <p>{chapter.description}</p>
              {chapter.image && <Photo image={chapter.image} />}
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
