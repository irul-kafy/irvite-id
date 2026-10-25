import { useEffect, useState } from "react";
import { Section } from "./Shared";
import s from "../InvitationTemplate.module.css";
export function Countdown({ datetime }: { datetime: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const target = Date.parse(datetime);
      setRemaining(
        Number.isFinite(target)
          ? Math.max(0, Math.floor((target - Date.now()) / 1000))
          : null,
      );
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [datetime]);
  const values =
    remaining === null
      ? [null, null, null, null]
      : [
          Math.floor(remaining / 86400),
          Math.floor(remaining / 3600) % 24,
          Math.floor(remaining / 60) % 60,
          remaining % 60,
        ];
  return (
    <Section id="countdown" className={s.countdownSection}>
      <div data-reveal>
        <span className={s.eyebrow}>Counting the moments</span>
        <h2>Sampai kita bertemu</h2>
        <div
          className={s.countdown}
          role="timer"
          aria-label="Hitung mundur menuju acara"
        >
          {values.map((n, i) => (
            <div key={i}>
              <strong key={n}>
                {n === null ? "—" : String(n).padStart(2, "0")}
              </strong>
              <span>{["Hari", "Jam", "Menit", "Detik"][i]}</span>
            </div>
          ))}
        </div>
        {remaining === 0 && <p>Hari yang dinantikan telah tiba.</p>}
      </div>
    </Section>
  );
}
