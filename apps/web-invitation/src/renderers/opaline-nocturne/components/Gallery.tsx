import type { ImageAsset } from "../types";
import { Heading, Photo, Section, delay } from "./Shared";
import s from "../InvitationTemplate.module.css";
export function Gallery({ images }: { images: ImageAsset[] }) {
  return (
    <Section id="gallery" className={s.gallerySection}>
      <Heading eyebrow="A constellation of memories">Fragmen Cahaya</Heading>
      <div className={s.gallery}>
        {images.map((image, i) => (
          <figure key={`${image.src}-${i}`} data-reveal="gallery" style={delay(i)}>
            <Photo image={image} />
            <figcaption>
              <span>0{i + 1}</span>
              {image.alt}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className={s.script}>in every night, I would still find you.</p>
    </Section>
  );
}
