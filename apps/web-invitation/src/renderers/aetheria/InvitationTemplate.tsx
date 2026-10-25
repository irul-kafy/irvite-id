'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { InvitationTemplateProps, ImageAsset, GiftAccount } from './types';
import s from './InvitationTemplate.module.css';
const crystalIsland = '/templates/aetheria/images/crystal-island.png';

function safeUrl(src?: string) {
  if (!src) return undefined;
  try { const url = new URL(src); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
function safeAsset(src?: string) {
  return src && (/^\/(?!\/)/.test(src) || /^\.\.?\//.test(src) || /^blob:https?:\/\//.test(src)) ? src : safeUrl(src);
}
function Photo({image, eager = false, className = ''}: {image?: ImageAsset; eager?: boolean; className?: string}) {
  return image && safeAsset(image.src) ? <img className={className} src={safeAsset(image.src)} alt={image.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" style={{objectPosition:image.position,transform:`scale(${Math.max(1,Math.min(4,image.zoom ?? 1))})`,transformOrigin:image.position}}/> : null;
}
function Mark({children}: {children: ReactNode}) { return <span className={s.eyebrow}>{children}</span>; }
function Butterfly({index}: {index: number}) {
  return <span className={s.butterfly} style={{'--i':index} as CSSProperties}><svg viewBox="0 0 80 60"><g><path d="M40 30C6 -16 -9 15 14 32C-2 58 25 68 40 34Z"/></g><g><path d="M40 30C74 -16 89 15 66 32C82 58 55 68 40 34Z"/></g><path d="M40 22V45" fill="none" stroke="currentColor" strokeWidth="2"/></svg></span>;
}
function Magic({islands = false}: {islands?: boolean}) {
  return <div className={s.magic} aria-hidden="true">
    <div className={s.nebula}/><div className={s.mist}/>
    {Array.from({length:24},(_,i)=><i className={s.spark} key={i} style={{left:`${(i*43+7)%100}%`,top:`${(i*23+9)%97}%`,'--i':i} as CSSProperties}/>)}
    {[0,1,2].map(i=><Butterfly index={i} key={i}/>)}
    <span className={s.comet}/><span className={`${s.comet} ${s.cometTwo}`}/>
    {islands && <><img className={s.island} src={crystalIsland} alt=""/><img className={`${s.island} ${s.islandSmall}`} src={crystalIsland} alt=""/></>}
  </div>;
}
function Countdown({datetime}: {datetime: string}) {
  const [seconds,setSeconds]=useState<number | null>(null);
  useEffect(()=>{const tick=()=>setSeconds(Math.max(0,Math.floor((Date.parse(datetime)-Date.now())/1000)));tick();const id=window.setInterval(tick,1000);return()=>clearInterval(id);},[datetime]);
  const values = seconds === null ? [null,null,null,null] : [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
  return <div className={s.countdown} role="timer" aria-label="Hitung mundur menuju acara">{values.map((value,i)=><div key={i}><strong>{value===null?'—':String(value).padStart(2,'0')}</strong><span>{['Hari','Jam','Menit','Detik'][i]}</span></div>)}</div>;
}
export default function InvitationTemplate({data,guest={kind:'general'},theme,rsvpSlot,wishesSlot,callbacks}: InvitationTemplateProps) {
  const [opened,setOpened]=useState(false);
  const [coverGone,setCoverGone]=useState(false);
  const [paused,setPaused]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [notice,setNotice]=useState('');
  const [lightbox,setLightbox]=useState<number | null>(null);
  const root=useRef<HTMLDivElement>(null);
  const hero=useRef<HTMLElement>(null);
  const audio=useRef<HTMLAudioElement>(null);
  const galleryDialog=useRef<HTMLDialogElement>(null);
  const enabled=(key:keyof NonNullable<typeof data.features>)=>data.features?.[key]!==false;
  useEffect(()=>{if(coverGone)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[coverGone]);
  useEffect(()=>{if(!opened)return;const id=window.setTimeout(()=>{setCoverGone(true);hero.current?.focus({preventScroll:true});},1100);return()=>clearTimeout(id);},[opened]);
  useEffect(()=>{
    if(!opened || !root.current)return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.setAttribute('data-visible','true');observer.unobserve(entry.target);}}),{threshold:0.08});
    root.current.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));return()=>observer.disconnect();
  },[opened,data]);
  useEffect(()=>{
    if(!root.current)return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.setAttribute('data-awake',String(entry.isIntersecting))),{rootMargin:'100px'});
    root.current.querySelectorAll(`.${s.magic}`).forEach(el=>observer.observe(el));
    return()=>observer.disconnect();
  },[opened,coverGone,data]);
  useEffect(()=>{if(lightbox!==null)galleryDialog.current?.showModal();},[lightbox]);
  useEffect(()=>{if(!enabled('music') && audio.current){audio.current.pause();setPlaying(false);}},[data.features?.music]);
  async function toggleMusic(){if(!audio.current)return;try{if(playing){audio.current.pause();setPlaying(false);callbacks?.onMusicChange?.(false);}else{await audio.current.play();setPlaying(true);callbacks?.onMusicChange?.(true);}}catch{setNotice('Musik belum dapat diputar. Periksa berkas audio.');}}
  function open(){setOpened(true);window.scrollTo({top:0,behavior:'instant'});callbacks?.onOpen?.();}
  async function copy(account:GiftAccount){try{if(callbacks?.onCopyGift)await callbacks.onCopyGift(account);else await navigator.clipboard.writeText(account.number);setNotice('Nomor rekening berhasil disalin.');}catch{setNotice(`Silakan salin nomor rekening secara manual: ${account.number}`);}}
  const nav=[['couple','Mempelai'],['story','Kisah'],['events','Acara'],['gallery','Galeri'],['gift','Gift']] as const;
  return <div ref={root} className={s.root} style={theme} data-paused={paused}>
    {!coverGone && <section className={`${s.cover} ${opened?s.depart:''}`} aria-label="Sampul undangan" inert={opened}>
      <Photo image={data.media.cover} className={s.coverWorld} eager/>
      <Magic islands/>
      <div className={s.coverTop}><span>AETHERIA</span><span>A LOVE BEYOND WORLDS</span></div>
      <div className={s.portal} aria-hidden="true"><i/><i/><i/><span>✧</span></div>
      <div className={s.coverCopy}><Mark>{data.event.title}</Mark><h1>{data.couple.bride.shortName}<em>&</em>{data.couple.groom.shortName}</h1><p className={s.coverDate}>{data.event.dateLabel}</p>
        <p className={s.guest}>Kepada Yth.<br/><strong>{guest.kind==='personal'&&guest.name ? guest.name : 'Bapak / Ibu / Saudara/i'}</strong></p>
        <button className={s.enter} onClick={open}><span>Buka gerbang cerita</span><span aria-hidden="true">↗</span></button>
        <small>SEBUAH AWAL. SELAMANYA.</small>
      </div>
      <span className={s.coverFoot}>irvite.id</span>
    </section>}
    {opened && <main>
      <section ref={hero} tabIndex={-1} id="home" className={s.hero}>
        <Photo image={data.media.background ?? data.media.cover} eager className={s.world}/><Magic islands/>
        <header className={s.masthead}><span>AETHERIA <i>✧</i></span><span>THE WEDDING CHAPTER<br/>{data.event.dateLabel}</span></header>
        <div className={s.heroCopy}><Mark>In every world, I choose you</Mark><h2><span>{data.couple.bride.shortName}</span><em>& {data.couple.groom.shortName}</em></h2><p>{data.event.statement}</p><a className={s.textLink} href="#beginning">Jelajahi cerita kami <span>↓</span></a></div>
        <div className={s.heroBottom}><span>01 / THE BEGINNING</span><span>DITULIS OLEH TAKDIR · DIRAWAT OLEH CINTA</span></div>
      </section>
      <section id="beginning" className={`${s.section} ${s.intro}`}>
        <span className={s.orbit} aria-hidden="true"/>
        <div className={s.introPhoto} data-reveal="unveil"><Photo image={data.media.hero}/><span>OUR OWN LITTLE UNIVERSE</span></div>
        <div className={s.introCopy} data-reveal="rise"><Mark>The first page of forever</Mark><h2>Segala jalan<br/>membawa kami<br/><em>ke sini.</em></h2><p>{data.event.openingText}</p>{enabled('countdown')&&<Countdown datetime={data.event.datetime}/>}</div>
      </section>
      {enabled('couple')&&<section id="couple" className={`${s.section} ${s.couple}`}>
        <Magic/><header className={s.sectionHead} data-reveal="rise"><Mark>02 / Two souls, one universe</Mark><h2>Dua jiwa.<br/><em>Satu semesta.</em></h2></header>
        <div className={s.partners}>{(['bride','groom'] as const).map((key,i)=><article key={key} className={s.partner} data-reveal={i?'right':'left'}><div className={s.portrait}><Photo image={data.couple[key].portrait}/><span className={s.portraitNumber}>0{i+1}</span></div><div className={s.partnerCopy}><Mark>{i?'The groom':'The bride'}</Mark><h3>{data.couple[key].name}</h3><p>{data.couple[key].parents}</p>{safeUrl(data.couple[key].social?.url)&&<a href={safeUrl(data.couple[key].social?.url)} target="_blank" rel="noreferrer">{data.couple[key].social?.label} ↗</a>}</div></article>)}</div>
        <span className={s.joining} aria-hidden="true">&</span>
      </section>}
      <section className={`${s.section} ${s.prayer}`}><div className={s.prayerStar} aria-hidden="true">✧</div><div data-reveal="soft"><Mark>A wish upon a star</Mark><blockquote>“{data.event.prayer}”</blockquote><p>{data.event.prayerSource}</p></div><Magic/></section>
      {enabled('story')&&<section id="story" className={`${s.section} ${s.story}`}><header className={s.sectionHead} data-reveal="rise"><Mark>03 / Written in the stars</Mark><h2>Peta menuju<br/><em>selamanya.</em></h2></header><div className={s.storyMap}>{data.story.map((item,i)=><article key={i} data-reveal={i%2?'right':'left'}><span className={s.storyDot}>✦</span><span className={s.storyYear}>{item.year}</span><div><h3>{item.title}</h3><p>{item.description}</p>{item.image&&<Photo image={item.image}/>}</div></article>)}</div><div className={s.storyWindow} data-reveal="unveil"><Photo image={data.media.story}/><span>Every path led to you.</span></div></section>}
      {enabled('events')&&<section id="events" className={`${s.section} ${s.events}`}><Photo image={data.media.background ?? data.media.cover} className={s.eventWorld}/><Magic islands/><header className={s.sectionHead} data-reveal="rise"><Mark>04 / Meet us where the magic begins</Mark><h2>Hari ketika<br/><em>kisah dimulai.</em></h2></header><div className={s.eventList}>{data.events.map((event,i)=><article key={event.id} className={s.event} data-reveal="rise"><span className={s.eventIndex}>0{i+1}</span><div><Mark>{event.date}</Mark><h3>{event.title}</h3><p className={s.time}>{event.startTime}{event.endTime&&` — ${event.endTime}`}</p><h4>{event.venue}</h4><p>{event.address}</p>{event.image&&<div className={s.venuePhoto}><Photo image={event.image}/></div>}{safeUrl(event.mapsUrl)&&<a className={s.textLink} href={safeUrl(event.mapsUrl)} onClick={()=>callbacks?.onOpenMaps?.(event)} target="_blank" rel="noreferrer">Buka Google Maps <span>↗</span></a>}</div></article>)}</div></section>}
      {enabled('gallery')&&<section id="gallery" className={`${s.section} ${s.gallerySection}`}><header className={s.galleryHead} data-reveal="rise"><div><Mark>05 / Fragments of forever</Mark><h2>Yang ingin<br/><em>kami simpan.</em></h2></div><p>Sekumpulan detik kecil,<br/>berarti untuk selamanya.</p></header><div className={s.gallery}>{data.gallery.map((image,i)=><figure key={i} data-reveal={i%3===0?'unveil':'rise'}><button aria-label={`Perbesar foto ${i+1}: ${image.alt}`} onClick={()=>setLightbox(i)}><Photo image={image}/><span aria-hidden="true">↗</span></button><figcaption><span>{String(i+1).padStart(2,'0')}</span>{image.alt}</figcaption></figure>)}</div></section>}
      {enabled('rsvp')&&guest.kind==='personal'&&rsvpSlot&&<section id="rsvp" className={`${s.section} ${s.rsvp}`}><div data-reveal="left"><Mark>Your place in our story</Mark><h2>{data.rsvp.title}</h2><p>{data.rsvp.description}</p></div><div className={s.hostSlot} data-reveal="right">{rsvpSlot}</div></section>}
      {enabled('gift')&&<section id="gift" className={`${s.section} ${s.gift}`}><div className={s.giftIntro} data-reveal="left"><span className={s.gem} aria-hidden="true">◇</span><Mark>A little kindness, a lasting light</Mark><h2>{data.gifts.title}</h2><p>{data.gifts.description}</p></div><div data-reveal="right">{data.gifts.accounts.map(account=><article className={s.bank} key={account.id}><span className={s.bankIcon} aria-hidden="true">✧</span><Mark>{account.provider}</Mark><strong>{account.number}</strong><p>a.n. {account.owner}</p><button className={s.textLink} onClick={()=>copy(account)}>Salin nomor rekening <span>↗</span></button></article>)}{data.gifts.address&&<article className={s.bank}><h3>{data.gifts.address.recipient}</h3><p>{data.gifts.address.address}</p></article>}</div></section>}
      {enabled('wishes')&&<section id="wishes" className={`${s.section} ${s.wishes}`}><header className={s.sectionHead} data-reveal="rise"><Mark>Little lights for our journey</Mark><h2>{data.wishes.title}</h2><p>{data.wishes.description}</p></header>{wishesSlot?<div className={s.hostSlot}>{wishesSlot}</div>:<div className={s.wishList}>{data.wishes.items.map(wish=><blockquote key={wish.id} data-reveal="soft"><span aria-hidden="true">✦</span><p>{wish.message}</p><footer>{wish.name}<small>{wish.dateLabel}</small></footer></blockquote>)}</div>}</section>}
      <section className={`${s.section} ${s.closing}`}><Photo image={data.media.closing} className={s.closingPhoto}/><Magic/><div data-reveal="soft"><Mark>And so, our forever begins</Mark><h2>Di setiap dunia,<br/><em>selalu kamu.</em></h2><p>{data.event.closingMessage}</p><h3>{data.couple.bride.shortName} & {data.couple.groom.shortName}</h3><a href="#home" className={s.textLink}>Kembali ke awal ↑</a></div><footer>crafted with love <span>irvite.id</span></footer></section>
      <nav className={s.nav} aria-label="Navigasi undangan"><a href="#home" aria-label="Awal">✧</a>{nav.filter(([key])=>enabled(key)).map(([key,label])=><a href={`#${key}`} key={key}>{label}</a>)}</nav>
    </main>}
    <div className={s.controls}><button onClick={()=>setPaused(p=>!p)} aria-pressed={paused} aria-label={paused?'Aktifkan animasi':'Jeda animasi'}>{paused?'▷':'Ⅱ'}</button>{enabled('music')&&safeAsset(data.music?.src)&&<><audio ref={audio} src={safeAsset(data.music?.src)} loop preload="none"/><button onClick={toggleMusic} aria-pressed={playing} aria-label={playing?'Jeda musik':'Putar musik'}>♫</button></>}</div>
    {notice&&<div className={s.notice} role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Tutup pemberitahuan">×</button></div>}
    <dialog ref={galleryDialog} className={s.lightbox} onClose={()=>setLightbox(null)} onClick={e=>{if(e.target===e.currentTarget)galleryDialog.current?.close();}}><button onClick={()=>galleryDialog.current?.close()} aria-label="Tutup foto">×</button>{lightbox!==null&&<><Photo image={data.gallery[lightbox]}/><p>{data.gallery[lightbox]?.alt}</p></>}</dialog>
  </div>;
}
