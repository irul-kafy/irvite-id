"use client";
import { useState } from "react";
import type {
  GiftAccount,
  InvitationData,
  InvitationTemplateProps,
} from "../types";
import { Heading, Section } from "./Shared";
import s from "../InvitationTemplate.module.css";
import { Fan } from "./Decor";
export function Gift({
  config,
  onCopy,
}: {
  config: InvitationData["gifts"];
  onCopy?: NonNullable<InvitationTemplateProps["callbacks"]>["onCopyGift"];
}) {
  const [status, setStatus] = useState("");
  const [copying, setCopying] = useState<string | null>(null);
  async function copy(account: GiftAccount) {
    if (copying) return;
    setCopying(account.id);
    setStatus("");
    try {
      if (onCopy) await onCopy(account);
      else if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(account.number);
      else throw new Error("Clipboard unavailable");
      setStatus(`Nomor ${account.provider} berhasil disalin.`);
    } catch {
      setStatus(
        "Belum bisa menyalin otomatis. Silakan pilih dan salin nomor rekening di bawah.",
      );
    } finally {
      setCopying(null);
    }
  }
  return (
    <Section id="gift" className={s.giftSection}>
      <Fan />
      <Heading
        eyebrow="A little token of love"
        description={config.description}
      >
        {config.title}
      </Heading>
      <div className={s.giftGrid}>
        {config.accounts.map((account) => (
          <article className={s.bankCard} key={account.id} data-reveal="gift">
            <span className={s.bankKind}>
              {account.kind === "bank" ? "BANK TRANSFER" : "E-WALLET"}
            </span>
            <h3>{account.provider}</h3>
            <span className={s.accountNumber}>{account.number}</span>
            <p>a.n. {account.owner}</p>
            <button
              className={s.buttonOutline}
              onClick={() => copy(account)}
              disabled={copying !== null}
            >
              Salin Nomor <span aria-hidden="true">⧉</span>
            </button>
            <span aria-hidden="true" className={s.bankFlourish}>
              ❦
            </span>
          </article>
        ))}
      </div>
      <p className={s.formStatus} role="status">
        {status}
      </p>
      {config.address && (
        <div className={s.giftAddress} data-reveal>
          <span className={s.eyebrow}>Kirim tanda kasih</span>
          <h3>{config.address.recipient}</h3>
          <p>{config.address.address}</p>
        </div>
      )}
    </Section>
  );
}
