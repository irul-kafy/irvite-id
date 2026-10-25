import type { InvitationTemplateProps, WeddingEvent } from "../types";
import { Heading, Photo, safeUrl, Section, delay } from "./Shared";
import s from "../InvitationTemplate.module.css";
export function Events({
  events,
  locale,
  onOpenMaps,
}: {
  events: WeddingEvent[];
  locale: string;
  onOpenMaps?: NonNullable<InvitationTemplateProps["callbacks"]>["onOpenMaps"];
}) {
  return (
    <Section id="events" className={s.eventsSection}>
      <Heading
        eyebrow="Meet us beneath the evening sky"
        description="Dengan penuh kebahagiaan, kami menantikan kehadiran dan doa restu Anda."
      >
        Jejak Hari Bahagia
      </Heading>
      <div className={s.eventGrid}>
        {events.map((event, i) => {
          const date = new Date(`${event.date}T12:00:00Z`);
          const valid = Number.isFinite(date.getTime());
          return (
            <article
              className={s.eventCard}
              key={event.id}
              data-reveal="event"
              style={delay(i)}
            >
              <span className={s.eventNumber}>0{i + 1} / THE CELEBRATION</span>
              {event.image && (
                <Photo image={event.image} className={s.venueImage} />
              )}
              <h3>{event.title}</h3>
              <div className={s.eventDate}>
                <strong>{valid ? date.getUTCDate() : "—"}</strong>
                <span>
                  {valid
                    ? new Intl.DateTimeFormat(locale, {
                        weekday: "long",
                        timeZone: "UTC",
                      }).format(date)
                    : event.date}
                  <br />
                  {valid
                    ? new Intl.DateTimeFormat(locale, {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(date)
                    : ""}
                </span>
              </div>
              <p className={s.eventTime}>
                {event.startTime}
                {event.endTime ? ` — ${event.endTime}` : ""}
              </p>
              <h4>{event.venue}</h4>
              <p>{event.address}</p>
              {safeUrl(event.mapsUrl) && (
                <a
                  className={s.buttonOutline}
                  href={safeUrl(event.mapsUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={
                    onOpenMaps
                      ? (e) => {
                          e.preventDefault();
                          onOpenMaps(event);
                        }
                      : undefined
                  }
                >
                  Lihat Lokasi <span aria-hidden="true">↗</span>
                </a>
              )}
            </article>
          );
        })}
      </div>
    </Section>
  );
}
