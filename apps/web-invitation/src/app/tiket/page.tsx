'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  formatRupiah,
  INITIAL_EVENTS,
  IssuedTicketRecord,
  PLATFORM_FEE_PER_TICKET,
  PublicTicketingEvent,
  PublicTicketTier,
  TicketOrderRecord,
} from '@/lib/ticketing-store';

type ClientTab = 'catalog' | 'my-ticket' | 'transactions' | 'mini-apps' | 'about' | 'wristband' | 'support';
type AuthModalStep = 'welcome' | 'google' | 'email-login' | 'register';

interface ClientAuthSession {
  mode: 'google' | 'email' | 'guest';
  name: string;
  email: string;
  whatsapp?: string;
}

const CATEGORIES = ['Semua', 'Konser Musik', 'Seminar & Edukasi', 'Workshop', 'Standup Comedy'] as const;
const CITIES = ['Semua Kota', 'Jakarta', 'Bandung', 'Surabaya', 'Bali', 'Yogyakarta'] as const;

function IconGoogleColor() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
      />
    </svg>
  );
}

function IconEnvelope() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconGuestBadge() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 16.5c.8-1.8 2.3-2.5 4-2.5s3.2.7 4 2.5" />
      <line x1="9" y1="5.5" x2="15" y2="5.5" />
    </svg>
  );
}

function IconSparkleStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5c443" stroke="#f5c443" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconTicketStub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function DeterministicQrMatrix({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const size = 11;
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          matrix[r0 + r][c0 + c] = true;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 3);
    drawFinder(size - 3, 0);

    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder =
          (r < 4 && c < 4) || (r < 4 && c >= size - 4) || (r >= size - 4 && c < 4);
        if (inFinder) continue;
        hash ^= (r * 31 + c * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        matrix[r][c] = (Math.abs(hash) % 10) < 5;
      }
    }
    return matrix;
  }, [seed]);

  return (
    <svg
      width="138"
      height="138"
      viewBox="0 0 11 11"
      shapeRendering="crispEdges"
      style={{
        background: '#ffffff',
        padding: '10px',
        borderRadius: '14px',
        border: '2px solid #d5e4dc',
      }}
      aria-label={`QR Code ${seed}`}
    >
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#13281e" /> : null,
        ),
      )}
    </svg>
  );
}

const DEFAULT_DEMO_TICKET: IssuedTicketRecord = {
  id: 'tkt-demo-01',
  ticketCode: 'IRV-TKT-2026-8821',
  qrPayload: 'IRVITE-TICKET|IRV-TKT-2026-8821|evt-tkt-01|tier-01-presale',
  orderCode: 'ORD-IRV-2026-8821',
  eventId: 'evt-tkt-01',
  eventSlug: 'jakarta-indie-soundwave-2026',
  eventTitle: 'JAKARTA INDIE SOUNDWAVE FESTIVAL 2026',
  eventDate: '24 Agu 2026',
  eventTime: '15:00 - 23:00 WIB',
  venueName: 'Stadion Madya GBK, Senayan, Jakarta Pusat',
  tierId: 'tier-01-presale',
  tierName: 'Presale 1 — Festival Pass',
  holderName: 'Rizky Pratama',
  holderEmail: 'rizky.pratama@gmail.com',
  status: 'ISSUED',
  checkedInAt: null,
  checkedInGate: null,
};

const TIKET_I18N = {
  ID: {
    services: 'Layanan',
    ticketEvent: 'Tiket Event',
    ticketEventSub: 'Katalog & E-Ticket',
    weddingInv: 'Undangan Pernikahan',
    weddingInvSub: 'Platform Undangan Digital',
    activeBadge: 'Aktif',
    partnerWithUs: 'Kerjasama dengan Kami',
    account: 'Akun',
    searchEvent: 'Cari event ',
    allCities: 'Semua Kota',
    cityPrefix: 'Kota:',
    quickLookupTitle: 'Cek & Unduh E-Ticket Cepat',
    quickLookupPlaceholder: 'Ketik nomor WhatsApp pemesan atau Kode Pesanan (ORD-...)',
    quickLookupBtn: 'Cek E-Ticket',
    eventsTitle: 'Event',
    eventsAvailable: 'acara tersedia',
    viewAll: 'Lihat Semua',
    getTicketHere: 'Beli Tiket di Sini',
    startingFrom: 'Mulai dari',
    btnBuy: 'Beli Tiket',
    presaleRem: 'Presale • Sisa',
    remUnit: 'Tiket',
    availBadge: 'Tiket Tersedia',
    soldOutBadge: 'Habis Terjual',
    tabMyTicket: 'E-Ticket Saya',
    tabHistory: 'Riwayat Transaksi',
    tabMiniApps: 'Mini Apps',
    tabWristband: 'Cetak Tiket Gelang',
    tabAbout: 'Tentang Kami',
    tabSupport: 'Layanan Pelanggan',
    mobileSignUp: 'Daftar',
    mobileLogIn: 'Masuk',
    mobileLang: 'Bahasa',
    mobileHelp: 'Pusat Bantuan (WhatsApp)',
  },
  EN: {
    services: 'Services',
    ticketEvent: 'Event Tickets',
    ticketEventSub: 'Catalog & E-Tickets',
    weddingInv: 'Digital Invitations',
    weddingInvSub: 'Online RSVP Platform',
    activeBadge: 'Active',
    partnerWithUs: 'Partner with Us',
    account: 'Account',
    searchEvent: 'Search event ',
    allCities: 'All Cities',
    cityPrefix: 'City:',
    quickLookupTitle: 'Quick E-Ticket Lookup',
    quickLookupPlaceholder: 'Enter buyer WhatsApp number or Order Code (ORD-...)',
    quickLookupBtn: 'Find Ticket',
    eventsTitle: 'Events',
    eventsAvailable: 'events available',
    viewAll: 'View All',
    getTicketHere: 'Get Tickets Here',
    startingFrom: 'Starting from',
    btnBuy: 'Get Tickets',
    presaleRem: 'Presale • Only',
    remUnit: 'Left',
    availBadge: 'Available',
    soldOutBadge: 'Sold Out',
    tabMyTicket: 'My E-Tickets',
    tabHistory: 'Transactions',
    tabMiniApps: 'Mini Apps',
    tabWristband: 'Physical Wristbands',
    tabAbout: 'About Us',
    tabSupport: 'Customer Support',
    mobileSignUp: 'Sign Up',
    mobileLogIn: 'Log In',
    mobileLang: 'Language',
    mobileHelp: 'Help Center (WhatsApp)',
  },
};

export default function ClientTicketingPage() {
  const [activeTab, setActiveTab] = useState<ClientTab>('catalog');
  // Pre-populated with INITIAL_EVENTS so Katalog Event is NEVER 0
  const [events, setEvents] = useState<PublicTicketingEvent[]>(INITIAL_EVENTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Checkout Modal State
  const [checkoutEvent, setCheckoutEvent] = useState<PublicTicketingEvent | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('QRIS Instan');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // My E-Ticket Pass State
  const [activeOrder, setActiveOrder] = useState<TicketOrderRecord | null>(null);
  const [activeTicket, setActiveTicket] = useState<IssuedTicketRecord>(DEFAULT_DEMO_TICKET);
  const [ticketLookupInput, setTicketLookupInput] = useState<string>('IRV-TKT-2026-8821');
  const [ticketLookupMessage, setTicketLookupMessage] = useState<string | null>(null);
  const [quickEmailInput, setQuickEmailInput] = useState<string>('');
  const [quickEmailStatus, setQuickEmailStatus] = useState<string | null>(null);

  // Interactive Mini Apps State (QR Gate Scanner & EO Profit Calculator)
  const [miniScannerCode, setMiniScannerCode] = useState<string>('IRV-TKT-2026-8821');
  const [miniScannerResult, setMiniScannerResult] = useState<{
    valid: boolean;
    title: string;
    detail: string;
  } | null>({
    valid: true,
    title: 'VALID • TIKET RESMI TERVERIFIKASI',
    detail: 'Pemegang: Rizky Pratama • Presale 1 — Festival Pass • Gate Utama GBK',
  });
  const [miniEoPrice, setMiniEoPrice] = useState<number>(150000);
  const [miniEoQty, setMiniEoQty] = useState<number>(500);

  // Interactive Cetak Tiket Gelang (Wristband Customizer) State
  const [wbMaterial, setWbMaterial] = useState<'tyvek' | 'lanyard' | 'vinyl'>('tyvek');
  const [wbEventTitle, setWbEventTitle] = useState<string>('JAKARTA INDIE SOUNDWAVE 2026');
  const [wbTierLabel, setWbTierLabel] = useState<string>('VIP EMERALD ACCESS');
  const [wbQty, setWbQty] = useState<number>(500);

  // Client Auth & Guest Session State ("Selamat Datang di IRVITE")
  const [authUser, setAuthUser] = useState<ClientAuthSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<AuthModalStep>('welcome');
  const [pendingCheckoutEvent, setPendingCheckoutEvent] = useState<PublicTicketingEvent | null>(null);
  const [authNameInput, setAuthNameInput] = useState<string>('');
  const [authEmailInput, setAuthEmailInput] = useState<string>('');
  const [authPasswordInput, setAuthPasswordInput] = useState<string>('');
  const [authWhatsappInput, setAuthWhatsappInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountTickets, setAccountTickets] = useState<IssuedTicketRecord[]>([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [showCategoryFilters, setShowCategoryFilters] = useState<boolean>(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  // Multi-Service Navigation & Language Switcher State (Tahap 1)
  const [currentLang, setCurrentLang] = useState<'ID' | 'EN'>('ID');
  const t = TIKET_I18N[currentLang];
  const [servicesMenuOpen, setServicesMenuOpen] = useState<boolean>(false);
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [mobileLangOpen, setMobileLangOpen] = useState<boolean>(false);

  // Tahap 2: Location Filter & Horizontal Carousel Ref
  const [selectedCity, setSelectedCity] = useState<string>('Semua Kota');
  const bannerCarouselRef = React.useRef<HTMLDivElement>(null);

  function scrollBanner(direction: 'prev' | 'next') {
    if (!bannerCarouselRef.current) return;
    const container = bannerCarouselRef.current;
    const slideWidth = container.clientWidth;
    if (direction === 'next') {
      container.scrollBy({ left: slideWidth, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: -slideWidth, behavior: 'smooth' });
    }
  }

  function scrollToBannerIndex(idx: number) {
    if (!bannerCarouselRef.current) return;
    const container = bannerCarouselRef.current;
    container.scrollTo({ left: container.clientWidth * idx, behavior: 'smooth' });
    setHeroSlideIndex(idx);
  }

  function handleBannerScroll(e: React.UIEvent<HTMLDivElement>) {
    const container = e.currentTarget;
    const slideWidth = container.clientWidth || 1;
    const idx = Math.round(container.scrollLeft / slideWidth);
    setHeroSlideIndex(idx);
  }

  const fetchAccountTickets = useCallback(async (email: string) => {
    if (!email.trim()) {
      setAccountTickets([]);
      return;
    }
    try {
      const res = await fetch(`/api/ticketing?mode=my-tickets&email=${encodeURIComponent(email.trim())}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const list: IssuedTicketRecord[] = Array.isArray(data?.tickets) ? data.tickets : [];
        setAccountTickets(list);
        if (list.length > 0) {
          setActiveTicket(list[0]);
          setTicketLookupInput(list[0].ticketCode);
        }
        if (Array.isArray(data?.orders) && data.orders.length > 0) {
          setActiveOrder(data.orders[0]);
        }
      }
    } catch {
      // Ignore network error
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('irvite_client_auth_v1');
        if (saved) {
          const parsed = JSON.parse(saved) as ClientAuthSession;
          if (parsed && parsed.mode) {
            setAuthUser(parsed);
            if (parsed.mode !== 'guest' && parsed.email) {
              setBuyerName(parsed.name || '');
              setBuyerEmail(parsed.email || '');
              if (parsed.whatsapp) setBuyerWhatsapp(parsed.whatsapp);
              fetchAccountTickets(parsed.email);
            }
          }
        }
        const savedLang = window.localStorage.getItem('irvite_lang');
        if (savedLang === 'ID' || savedLang === 'EN') {
          setCurrentLang(savedLang);
        }
      } catch {
        // Ignore storage read error
      }
    }
  }, [fetchAccountTickets]);

  function completeAuthSession(session: ClientAuthSession) {
    setAuthUser(session);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('irvite_client_auth_v1', JSON.stringify(session));
      } catch {
        // Ignore storage error
      }
    }
    if (session.mode !== 'guest') {
      setBuyerName(session.name);
      setBuyerEmail(session.email);
      if (session.whatsapp) setBuyerWhatsapp(session.whatsapp);
      fetchAccountTickets(session.email);
    }
    setAuthModalOpen(false);
    setAuthError(null);
    if (pendingCheckoutEvent) {
      const evt = pendingCheckoutEvent;
      setPendingCheckoutEvent(null);
      launchCheckoutDialog(evt, session);
    }
  }

  function handleLogout() {
    setAuthUser(null);
    setAccountTickets([]);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('irvite_client_auth_v1');
      } catch {
        // Ignore storage error
      }
    }
  }

  function launchCheckoutDialog(event: PublicTicketingEvent, sessionOverride?: ClientAuthSession | null) {
    const currentSession = sessionOverride !== undefined ? sessionOverride : authUser;
    if (currentSession && currentSession.mode !== 'guest') {
      setBuyerName(currentSession.name);
      setBuyerEmail(currentSession.email);
      if (currentSession.whatsapp) setBuyerWhatsapp(currentSession.whatsapp);
    }
    setCheckoutEvent(event);
    const firstAvailable = event.tiers.find((t) => t.remainingQuota > 0) || event.tiers[0];
    setSelectedTierId(firstAvailable?.id || '');
    setQuantity(1);
    setCheckoutError(null);
  }

  const fetchCatalog = useCallback(async (category: string, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'Semua') params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/ticketing?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
          ? data.events
          : [];
      if (rawItems.length > 0) {
        setEvents(rawItems);
      } else {
        // Filter INITIAL_EVENTS locally if API returned empty
        const fallback = INITIAL_EVENTS.filter((ev) => {
          if (category && category !== 'Semua' && ev.category !== category) return false;
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            return `${ev.title} ${ev.category} ${ev.venueName} ${ev.city} ${ev.organizerName}`
              .toLowerCase()
              .includes(q);
          }
          return true;
        });
        setEvents(fallback);
      }
    } catch {
      setEvents(INITIAL_EVENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(selectedCategory, searchQuery);
  }, [fetchCatalog, selectedCategory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get('tab');
      if (
        tabParam === 'my-ticket' ||
        tabParam === 'mini-apps' ||
        tabParam === 'about' ||
        tabParam === 'wristband' ||
        tabParam === 'support'
      ) {
        setActiveTab(tabParam);
      }
      if (sp.get('auth') === '1') {
        setAuthStep('welcome');
        setAuthModalOpen(true);
      }
    }
  }, []);

  function openCheckoutModal(event: PublicTicketingEvent) {
    if (!authUser) {
      setPendingCheckoutEvent(event);
      setAuthStep('welcome');
      setAuthError(null);
      setAuthModalOpen(true);
      return;
    }
    launchCheckoutDialog(event);
  }

  const selectedTier: PublicTicketTier | undefined = useMemo(() => {
    if (!checkoutEvent) return undefined;
    return checkoutEvent.tiers.find((t) => t.id === selectedTierId) || checkoutEvent.tiers[0];
  }, [checkoutEvent, selectedTierId]);

  const subtotalAmount = (selectedTier?.price || 0) * quantity;
  const serviceFeeAmount = (selectedTier?.price || 0) > 0 ? PLATFORM_FEE_PER_TICKET * quantity : 0;
  const totalAmount = subtotalAmount + serviceFeeAmount;

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutEvent || !selectedTier) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          eventSlug: checkoutEvent.slug,
          tierId: selectedTier.id,
          quantity,
          buyerName,
          buyerEmail,
          buyerWhatsapp,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data?.message || 'Gagal memproses pembelian tiket.');
      } else if (data?.order) {
        setActiveOrder(data.order);
        if (data.order.tickets?.[0]) {
          setActiveTicket(data.order.tickets[0]);
          setTicketLookupInput(data.order.tickets[0].ticketCode);
        }
        if (authUser && authUser.mode !== 'guest' && authUser.email) {
          fetchAccountTickets(authUser.email);
        } else if (buyerEmail.trim()) {
          fetchAccountTickets(buyerEmail.trim());
        }
        setCheckoutEvent(null);
        setActiveTab('my-ticket');
        fetchCatalog(selectedCategory, searchQuery);
      }
    } catch {
      setCheckoutError('Terjadi kesalahan koneksi saat memproses checkout.');
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  async function handleLookupTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketLookupInput.trim()) return;
    setTicketLookupMessage(null);
    try {
      const res = await fetch(
        `/api/ticketing?mode=lookup&code=${encodeURIComponent(ticketLookupInput.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setTicketLookupMessage(data?.message || 'Kode E-Ticket atau Order tidak ditemukan.');
      } else {
        if (data?.order) setActiveOrder(data.order);
        if (data?.ticket) setActiveTicket(data.ticket);
        setTicketLookupMessage(
          `Menampilkan E-Ticket resmi untuk kode ${data?.ticket?.ticketCode || ticketLookupInput.toUpperCase()}.`,
        );
      }
    } catch {
      setTicketLookupMessage('Gagal mencari kode tiket.');
    }
  }

  return (
    <div
      className="irv-client-tiket-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8faf9',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .irv-client-tiket-root {
          padding-bottom: 4rem;
        }
        .irv-client-tiket-root,
        .irv-client-tiket-root h1,
        .irv-client-tiket-root h2,
        .irv-client-tiket-root h3,
        .irv-client-tiket-root p {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        .irv-tiket-container {
          width: 100%;
          max-width: 1720px;
          margin: 0 auto;
          padding-left: clamp(1rem, 3.2vw, 3rem);
          padding-right: clamp(1rem, 3.2vw, 3rem);
          box-sizing: border-box;
        }
        /* Loket-Style Header Responsive */
        .irv-loket-header-inner {
          padding-top: 0.9rem;
          padding-bottom: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }
        .irv-loket-left-group {
          display: flex;
          align-items: center;
          gap: 1.15rem;
          flex-shrink: 0;
        }
        .irv-header-logo-img {
          height: 22px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .irv-loket-search-wrap {
          flex: 1 1 380px;
          max-width: 780px;
          position: relative;
        }
        .irv-loket-search-form {
          width: 100%;
          display: flex;
          align-items: center;
          background: #f3f5f8;
          border-radius: 10px;
          padding: 0.62rem 0.95rem;
          position: relative;
          border: 1.5px solid transparent;
          transition: border-color 0.16s ease, background 0.16s ease;
        }
        .irv-loket-search-form:focus-within {
          background: #ffffff;
          border-color: #1b3b2b;
        }
        .irv-loket-right-group {
          display: flex;
          align-items: center;
          gap: 1.35rem;
          flex-shrink: 0;
        }
        .irv-loket-mobile-hamburger {
          display: none;
        }
        /* Full-Bleed Horizontal Scroll-Snap Hero Banner Carousel */
        .irv-hero-banner-section {
          width: 100%;
          position: relative;
          overflow: hidden;
          margin-bottom: 2rem;
          user-select: none;
        }
        .irv-hero-carousel-viewport {
          width: 100%;
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .irv-hero-carousel-viewport::-webkit-scrollbar {
          display: none;
        }
        .irv-hero-banner-slide {
          flex: 0 0 100%;
          min-width: 100%;
          scroll-snap-align: start;
          position: relative;
          min-height: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .irv-banner-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #0d253f;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
          transition: transform 0.16s ease, background 0.16s ease;
        }
        .irv-banner-nav-btn:hover {
          background: #ffffff;
          transform: translateY(-50%) scale(1.08);
        }
        .irv-banner-nav-prev {
          left: clamp(0.75rem, 2vw, 2rem);
        }
        .irv-banner-nav-next {
          right: clamp(0.75rem, 2vw, 2rem);
        }
        .irv-hero-floating-cta {
          position: absolute;
          left: clamp(1.25rem, 3.2vw, 3rem);
          bottom: 1.35rem;
          background: #ffffff;
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 5;
          max-width: min(640px, 68vw);
        }
        /* Event Cards Grid: Desktop = 4 cols, Tablet = 2 cols, Mobile = 1 col */
        .irv-event-catalog-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1.25rem;
        }
        @media (max-width: 1180px) {
          .irv-event-catalog-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .irv-loket-partner-link {
            display: none !important;
          }
        }
        .irv-my-ticket-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 1fr);
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .irv-my-ticket-grid {
            grid-template-columns: 1fr;
          }
        }
        /* Mobile Hero Caption (Shown on Mobile below Hero Banner) */
        .irv-hero-mobile-caption {
          display: none;
        }
        /* Mobile Bottom Nav (Hidden on Tablet & Desktop) */
        .irv-mobile-bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .irv-client-tiket-root {
            padding-bottom: 5.5rem;
          }
          /* Mobile Header: Row 1 = Logo + Hamburger; Row 2 = Full-Width Gray Search Bar */
          .irv-loket-header-inner {
            flex-wrap: wrap;
            gap: 0.75rem;
            padding-top: 0.75rem;
            padding-bottom: 0.85rem;
          }
          .irv-loket-left-group {
            width: auto;
            gap: 0.75rem;
          }
          .irv-header-logo-img {
            height: 18px;
          }
          .irv-loket-kategori-btn,
          .irv-loket-layanan-dropdown,
          .irv-loket-right-group {
            display: none !important;
          }
          .irv-loket-mobile-hamburger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            padding: 0.25rem;
            color: #0d253f;
            cursor: pointer;
            margin-left: auto;
          }
          .irv-loket-search-wrap {
            order: 3;
            flex: 1 1 100%;
            max-width: 100%;
            width: 100%;
          }
          .irv-banner-nav-btn {
            display: none !important;
          }
          .irv-hero-banner-section {
            min-height: 220px;
            margin-bottom: 0;
          }
          .irv-hero-banner-slide {
            min-height: 220px;
          }
          .irv-hero-floating-cta {
            display: none !important;
          }
          .irv-hero-mobile-caption {
            display: block;
            background: #ffffff;
            padding: 1rem 1rem 1.15rem;
            margin-bottom: 1.15rem;
            border-bottom: 1px solid #e8edf3;
          }
          .irv-event-catalog-grid {
            grid-template-columns: 1fr;
            gap: 1.1rem;
          }
          .irv-mobile-bottom-nav {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
            padding: 0.45rem 0.25rem 0.55rem;
            z-index: 9000;
            box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
          }
        }
      `}</style>

      {/* 1. LOKET-STYLE SINGLE WHITE HEADER BAR (Desktop: Logo + Kategori + Search + Kerjasama dengan Kami + ID + Akun; Mobile: Row 1 Logo + Hamburger ☰, Row 2 Full-Width Search) */}
      <header
        style={{
          width: '100%',
          background: '#ffffff',
          borderBottom: '1px solid #e8edf3',
          position: 'sticky',
          top: 0,
          zIndex: 60,
        }}
      >
        <div className="irv-tiket-container irv-loket-header-inner">
          {/* Left Group: Brand Logo + "Kategori" Button */}
          <div className="irv-loket-left-group">
            <button
              type="button"
              onClick={() => {
                setActiveTab('catalog');
                setMobileMenuOpen(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
              title="Beranda Tiket IRVITE.ID"
            >
              <img
                src="/irvite-logo.png"
                alt="IRVITE.ID"
                className="irv-header-logo-img"
              />
            </button>

            {/* "Kategori" Button with Geometric Shapes Icon (Desktop/Tablet) */}
            <button
              type="button"
              className="irv-loket-kategori-btn"
              onClick={() => {
                setShowCategoryFilters((prev) => !prev);
                setServicesMenuOpen(false);
                setLangMenuOpen(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: showCategoryFilters ? '#f1f5f9' : 'transparent',
                border: 'none',
                padding: '0.4rem 0.5rem',
                borderRadius: '8px',
                color: '#0d253f',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0d253f"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 3 16.5 10.5 7.5 10.5 12 3" />
                <circle cx="7.5" cy="17.5" r="3.5" />
                <rect x="13.5" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Kategori</span>
            </button>

            {/* Dropdown Menu Layanan ⌄ (Desktop/Tablet) */}
            <div className="irv-loket-layanan-dropdown" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setServicesMenuOpen((prev) => !prev);
                  setLangMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: servicesMenuOpen ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  color: '#0d253f',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                aria-expanded={servicesMenuOpen}
                aria-label="Pilih Layanan IRVITE"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>{t.services}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: servicesMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {servicesMenuOpen && (
                <>
                  <div
                    onClick={() => setServicesMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 65 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      minWidth: '240px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                      border: '1px solid #e2e8f0',
                      padding: '0.45rem',
                      zIndex: 70,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.35rem 0.6rem 0.25rem',
                      }}
                    >
                      Pilihan Layanan
                    </div>

                    {/* 1. Tiket Event (Current Active Page) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.7rem',
                        borderRadius: '8px',
                        background: '#edf4f0',
                        color: '#1b3b2b',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        marginBottom: '0.2rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#1b3b2b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                          <path d="M13 5v2" />
                          <path d="M13 17v2" />
                          <path d="M13 11v2" />
                        </svg>
                        <div>
                          <div>{t.ticketEvent}</div>
                          <div style={{ fontSize: '0.72rem', color: '#2d6a4f', fontWeight: 500 }}>
                            Katalog & E-Ticket
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          background: '#1b3b2b',
                          color: '#ffffff',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        Aktif
                      </span>
                    </div>

                    {/* 2. Undangan Pernikahan (Direct Link to /undangan) */}
                    <Link
                      href="/undangan"
                      onClick={() => setServicesMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.7rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#1e293b',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <path d="m22 6-10 7L2 6" />
                        </svg>
                        <div>
                          <div>{t.weddingInv}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            Platform Undangan Digital
                          </div>
                        </div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Hamburger Menu Button (☰ — Top-Right on Mobile) */}
          <button
            type="button"
            className="irv-loket-mobile-hamburger"
            aria-label="Menu Navigasi"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0d253f"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6.5" x2="20" y2="6.5" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17.5" x2="20" y2="17.5" />
                </>
              )}
            </svg>
          </button>

          {/* Center (Desktop/Tablet) or Row 2 (Mobile): Soft Gray Rounded Search Bar ("Cari event ...") */}
          <div className="irv-loket-search-wrap">
            <form
              className="irv-loket-search-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (activeTab !== 'catalog') setActiveTab('catalog');
                fetchCatalog(selectedCategory, searchQuery);
              }}
            >
              {/* Two-Tone Visual Placeholder ("Cari event " + Bold Event Name) when input is empty & unfocused */}
              {!searchQuery && !searchFocused && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0.95rem',
                    right: '2.6rem',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.88rem',
                    color: '#8e9aaf',
                    fontWeight: 500,
                  }}
                >
                  {t.searchEvent}{' '}
                  <strong style={{ color: '#0d253f', fontWeight: 800 }}>
                    {(events[heroSlideIndex % Math.max(events.length, 1)] || INITIAL_EVENTS[0]).title}
                  </strong>
                </div>
              )}

              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'catalog') setActiveTab('catalog');
                }}
                aria-label="Cari event"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  flex: 1,
                  color: '#0d253f',
                  background: 'transparent',
                  fontWeight: 600,
                  width: '100%',
                  zIndex: 1,
                }}
              />

              <button
                type="submit"
                aria-label="Cari Event"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0 0 0 0.5rem',
                  color: '#0d253f',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                <IconSearch />
              </button>
            </form>
          </div>

          {/* Right Group (Desktop & Tablet): "Kerjasama dengan Kami" + Globe "ID ⌄" + Pill Button "Akun" */}
          <div className="irv-loket-right-group">
            {/* Kerjasama dengan Kami */}
            <Link
              href="/partnership"
              className="irv-loket-partner-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#0d253f',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0d253f"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 19 6 19 14 12 22 5 14 5 6 12 2" />
                <polygon points="12 7.5 13.4 10.3 16.5 10.8 14.2 13 14.8 16 12 14.5 9.2 16 9.8 13 7.5 10.8 10.6 10.3 12 7.5" />
              </svg>
              <span>{t.partnerWithUs}</span>
            </Link>

            {/* Globe Language Selector: Strictly 2 Options (ID / EN) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setLangMenuOpen((prev) => !prev);
                  setServicesMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: langMenuOpen ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  color: '#0d253f',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                aria-expanded={langMenuOpen}
                aria-label="Pilih Bahasa"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
                </svg>
                <span>{currentLang}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: langMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {langMenuOpen && (
                <>
                  <div
                    onClick={() => setLangMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 65 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '175px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                      border: '1px solid #e2e8f0',
                      padding: '0.45rem',
                      zIndex: 70,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.35rem 0.6rem 0.25rem',
                      }}
                    >
                      Pilih Bahasa
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('ID');
                        if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'ID');
                        setLangMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentLang === 'ID' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'ID' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'ID' ? 800 : 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: '0.2rem',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🇮🇩</span>
                        <span>Indonesia (ID)</span>
                      </span>
                      {currentLang === 'ID' && (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#1b3b2b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('EN');
                        if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'EN');
                        setLangMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentLang === 'EN' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'EN' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'EN' ? 800 : 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🇬🇧</span>
                        <span>English (EN)</span>
                      </span>
                      {currentLang === 'EN' && (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#1b3b2b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Dark Rounded Pill Button: "Akun" */}
            <button
              type="button"
              onClick={() => {
                setPendingCheckoutEvent(null);
                setAuthStep('welcome');
                setAuthError(null);
                setAuthModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.54rem 1.15rem',
                borderRadius: '999px',
                border: 'none',
                background: '#0d253f',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13, 37, 63, 0.16)',
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="9.5" r="3" />
                <path d="M6.8 18.2c1.2-2 3.1-3.2 5.2-3.2s4 1.2 5.2 3.2" />
              </svg>
              <span>{authUser ? authUser.name.split(' ')[0] : t.account}</span>
            </button>
          </div>
        </div>

        {/* Desktop "Kategori" & Quick Menu Bar (Shown when "Kategori" is clicked) */}
        {showCategoryFilters && (
          <div
            style={{
              background: '#f8fafc',
              borderTop: '1px solid #e8edf3',
              padding: '0.75rem 0',
            }}
          >
            <div
              className="irv-tiket-container"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.45rem' }}>
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat && activeTab === 'catalog';
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setActiveTab('catalog');
                      }}
                      style={{
                        padding: '0.42rem 0.9rem',
                        borderRadius: '999px',
                        border: active ? '1.5px solid #0d253f' : '1px solid #cbd5e1',
                        background: active ? '#0d253f' : '#ffffff',
                        color: active ? '#ffffff' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                {[
                  { id: 'my-ticket' as ClientTab, label: t.tabMyTicket },
                  { id: 'transactions' as ClientTab, label: t.tabHistory },
                  { id: 'mini-apps' as ClientTab, label: t.tabMiniApps },
                  { id: 'wristband' as ClientTab, label: t.tabWristband },
                  { id: 'about' as ClientTab, label: t.tabAbout },
                  { id: 'support' as ClientTab, label: t.tabSupport },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      background: activeTab === item.id ? '#e2e8f0' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.35rem 0.65rem',
                      color: '#0d253f',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Hamburger Menu Popover + Dark Backdrop (Exact Match to Loket Mobile Menu Screenshot) */}
        {mobileMenuOpen && (
          <>
            {/* Dark Backdrop Overlay below Top Navbar Row */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                top: '56px',
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.56)',
                zIndex: 70,
              }}
            />

            {/* Floating White Popover Card Anchored at Top-Right */}
            <div
              role="menu"
              aria-label="Menu Utama"
              style={{
                position: 'fixed',
                top: '56px',
                right: '1.15rem',
                width: 'min(300px, calc(100vw - 2.3rem))',
                background: '#ffffff',
                borderRadius: '0 0 16px 16px',
                padding: '1.15rem 1.15rem 0.65rem',
                boxShadow: '0 18px 42px rgba(15, 23, 42, 0.25)',
                zIndex: 80,
              }}
            >
              {/* Top Stacked Buttons: Daftar (Light Blue) & Masuk (Solid Royal Blue) */}
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setPendingCheckoutEvent(null);
                    setAuthError(null);
                    setAuthStep('register');
                    setAuthModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.78rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#eef4ff',
                    color: '#0049cc',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                  }}
                >
                  Daftar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setPendingCheckoutEvent(null);
                    setAuthError(null);
                    setAuthStep('welcome');
                    setAuthModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.78rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0049cc',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                  }}
                >
                  {authUser ? `${t.account} (${authUser.name.split(' ')[0]})` : t.mobileLogIn}
                </button>
              </div>

              {/* Thin Horizontal Divider */}
              <div
                style={{
                  borderTop: '1px solid #e8edf3',
                  margin: '0.95rem 0 0.25rem',
                }}
              />

              {/* Menu Items with Left Icon + Label + Right Chevron › */}
              <div style={{ display: 'grid' }}>
                {/* 1. Undangan Pernikahan (Direct Switcher to /undangan) */}
                <Link
                  href="/undangan"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.72rem 0.15rem',
                    color: '#334155',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0d253f"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="m22 6-10 7L2 6" />
                    </svg>
                    <span>{t.weddingInv}</span>
                  </span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                {/* 2. Kerjasama dengan Kami */}
                <Link
                  href="/partnership"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.72rem 0.15rem',
                    color: '#334155',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0d253f"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polygon points="12 2 19 6 19 14 12 22 5 14 5 6 12 2" />
                      <polygon points="12 7.5 13.4 10.3 16.5 10.8 14.2 13 14.8 16 12 14.5 9.2 16 9.8 13 7.5 10.8 10.6 10.3 12 7.5" />
                    </svg>
                    <span>{t.partnerWithUs}</span>
                  </span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                {/* 3. Bahasa: Strictly 2 Options (ID / EN) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileLangOpen((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.72rem 0.15rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#334155',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0d253f"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
                      </svg>
                      <span>
                        Bahasa ({currentLang === 'ID' ? '🇮🇩 ID' : '🇬🇧 EN'})
                      </span>
                    </span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: mobileLangOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s ease',
                      }}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {mobileLangOpen && (
                    <div
                      style={{
                        padding: '0.35rem 0.5rem 0.55rem 2.2rem',
                        display: 'flex',
                        gap: '0.5rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentLang('ID');
                          if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'ID');
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          border: currentLang === 'ID' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                          background: currentLang === 'ID' ? '#edf4f0' : '#ffffff',
                          color: currentLang === 'ID' ? '#1b3b2b' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        🇮🇩 Indonesia
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentLang('EN');
                          if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'EN');
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          border: currentLang === 'EN' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                          background: currentLang === 'EN' ? '#edf4f0' : '#ffffff',
                          color: currentLang === 'EN' ? '#1b3b2b' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                        }}
                      >
                        🇬🇧 English
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Pusat Bantuan */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('support');
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.72rem 0.15rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#334155',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0d253f"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Pusat Bantuan</span>
                  </span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* 2. OPTIONAL FULL-BLEED HERO BANNER CAROUSEL (Tahap 2: Conditional & Swipeable) */}
      {activeTab === 'catalog' && (() => {
        const featuredBanners = events.filter((ev) => Boolean(ev.isFeaturedBanner));
        if (featuredBanners.length === 0) {
          // If no spotlight banner is active from admin, cleanly omit the entire section
          return null;
        }

        const safeIndex = Math.min(Math.max(0, heroSlideIndex), featuredBanners.length - 1);
        const activeHeroEvent = featuredBanners[safeIndex] || featuredBanners[0];
        const heroPalettes = [
          'linear-gradient(120deg, #1b3b2b 0%, #2d5a43 48%, #0f2419 100%)',
          'linear-gradient(120deg, #163024 0%, #244736 50%, #b58d3d 100%)',
          'linear-gradient(120deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
          'linear-gradient(120deg, #3b1d2e 0%, #5c2d46 50%, #24101c 100%)',
        ];

        return (
          <>
            <section className="irv-hero-banner-section">
              {/* Previous & Next Desktop Navigation Arrows */}
              {featuredBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    className="irv-banner-nav-btn irv-banner-nav-prev"
                    onClick={() => scrollBanner('prev')}
                    aria-label="Banner Sebelumnya"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="irv-banner-nav-btn irv-banner-nav-next"
                    onClick={() => scrollBanner('next')}
                    aria-label="Banner Selanjutnya"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}

              {/* Horizontal Scroll-Snap Carousel Viewport */}
              <div
                ref={bannerCarouselRef}
                className="irv-hero-carousel-viewport"
                onScroll={handleBannerScroll}
              >
                {featuredBanners.map((ev, idx) => {
                  const bg = ev.bannerGradient || heroPalettes[idx % heroPalettes.length];
                  return (
                    <div
                      key={ev.id}
                      className="irv-hero-banner-slide"
                      style={{ background: bg }}
                    >
                      {/* Atmospheric Foliage / Concert Rays Overlay */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'radial-gradient(circle at 65% 22%, rgba(255, 248, 220, 0.22) 0%, transparent 55%), radial-gradient(circle at 25% 75%, rgba(0, 0, 0, 0.35) 0%, transparent 60%)',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* Center Stage Typography */}
                      <div
                        onClick={() => openCheckoutModal(ev)}
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          textAlign: 'center',
                          padding: '2.2rem 1.25rem 3.2rem',
                          cursor: 'pointer',
                          maxWidth: '920px',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'Georgia, serif',
                            fontStyle: 'italic',
                            fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
                            color: '#9be7e2',
                            marginBottom: '-0.25rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          spotlight event
                        </div>
                        <div
                          style={{
                            fontSize: 'clamp(2.1rem, 5.5vw, 4.4rem)',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            color: '#e6f7f6',
                            textTransform: 'uppercase',
                            lineHeight: 1.05,
                            textShadow: '0 0 24px rgba(155, 231, 226, 0.38)',
                            borderTop: '3px solid rgba(155, 231, 226, 0.65)',
                            borderBottom: '3px solid rgba(155, 231, 226, 0.65)',
                            padding: '0.25rem 0.85rem',
                            display: 'inline-block',
                            margin: '0.35rem 0 0.6rem',
                          }}
                        >
                          {ev.title.split(' ').slice(0, 3).join(' ')}
                        </div>
                        <div
                          style={{
                            fontSize: 'clamp(0.88rem, 1.6vw, 1.3rem)',
                            fontWeight: 600,
                            color: '#9be7e2',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {ev.eventDate} • {ev.organizerName.toUpperCase()}
                        </div>
                      </div>

                      {/* Bottom-Left City & Venue Watermark */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 'clamp(1rem, 3.2vw, 3rem)',
                          bottom: '0.85rem',
                          zIndex: 2,
                          color: '#ffffff',
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 'clamp(1rem, 2vw, 1.55rem)',
                            fontWeight: 900,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            lineHeight: 1.1,
                          }}
                        >
                          {ev.city}
                        </div>
                        <div
                          style={{
                            fontSize: 'clamp(0.62rem, 1vw, 0.78rem)',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            opacity: 0.9,
                            textTransform: 'uppercase',
                          }}
                        >
                          {ev.eventDate} | {ev.eventTime} | {ev.venueName}
                        </div>
                      </div>

                      {/* Desktop Floating White CTA Card */}
                      <div className="irv-hero-floating-cta">
                        <span
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            lineHeight: 1.35,
                          }}
                        >
                          {ev.bannerHeadline || `Penantian Berakhir! ${ev.title} Hadir di ${ev.city}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCheckoutModal(ev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            color: '#1d4ed8',
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          <span>{t.getTicketHere}</span>
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1d4ed8"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V7z" />
                          </svg>
                        </button>
                      </div>

                      {/* Bottom-Right Watermark Logos */}
                      <div
                        style={{
                          position: 'absolute',
                          right: 'clamp(1rem, 3.2vw, 3rem)',
                          bottom: '0.95rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.85)',
                          fontSize: 'clamp(0.6rem, 0.9vw, 0.78rem)',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          zIndex: 3,
                          pointerEvents: 'none',
                        }}
                      >
                        <span>SPOTLIGHT STAGE</span>
                        <span style={{ border: '1px solid rgba(255,255,255,0.6)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          IRVITE.ID
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom-Center Dots Pagination */}
              {featuredBanners.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.95rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    zIndex: 10,
                  }}
                >
                  {featuredBanners.map((ev, idx) => {
                    const isCurrent = idx === safeIndex;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        aria-label={`Slide ${idx + 1}: ${ev.title}`}
                        onClick={() => scrollToBannerIndex(idx)}
                        style={{
                          width: isCurrent ? '18px' : '7px',
                          height: '7px',
                          borderRadius: '999px',
                          border: 'none',
                          padding: 0,
                          background: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Mobile Hero Caption Strip below Banner */}
            <div className="irv-hero-mobile-caption">
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4, marginBottom: '0.45rem' }}>
                {activeHeroEvent.bannerHeadline || `Penantian Berakhir! ${activeHeroEvent.title} Sapa Penggemar di ${activeHeroEvent.city}`}
              </div>
              <button
                type="button"
                onClick={() => openCheckoutModal(activeHeroEvent)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#0049cc',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span>{t.getTicketHere}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0049cc"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V7z" />
                </svg>
              </button>
            </div>
          </>
        );
      })()}

      {/* Main Content Container */}
      <main className="irv-tiket-container" style={{ paddingTop: '0.25rem', paddingBottom: '0.5rem' }}>
        {activeTab === 'catalog' && (() => {
          const filteredEvents = events.filter((ev) => {
            if (selectedCity !== 'Semua Kota') {
              const q = selectedCity.toLowerCase();
              const cityMatch = ev.city.toLowerCase().includes(q) || ev.venueName.toLowerCase().includes(q);
              if (!cityMatch) return false;
            }
            return true;
          });

          return (
            <>
              {/* Section Header: "Event" (Left) & "Lihat Semua" (Right) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 'clamp(1.35rem, 2.2vw, 1.6rem)',
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {t.eventsTitle}
                  </h2>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                    ({filteredEvents.length} {t.eventsAvailable})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryFilters((prev) => !prev);
                    if (selectedCategory !== 'Semua' || searchQuery || selectedCity !== 'Semua Kota') {
                      setSelectedCategory('Semua');
                      setSelectedCity('Semua Kota');
                      setSearchQuery('');
                      fetchCatalog('Semua', '');
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: '#1b3b2b',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t.viewAll}
                </button>
              </div>

              {/* Quick Location Chips (Filter Kota Cepat — Tahap 2) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.35rem',
                  marginBottom: '1.15rem',
                  scrollbarWidth: 'none',
                }}
              >
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <IconMapPin />
                  <span>{t.cityPrefix}</span>
                </span>
                {CITIES.map((city) => {
                  const active = selectedCity === city;
                  return (
                    <button
                      key={city === 'Semua Kota' ? t.allCities : city}
                      type="button"
                      onClick={() => setSelectedCity(city)}
                      style={{
                        padding: '0.38rem 0.85rem',
                        borderRadius: '999px',
                        border: active ? '1.5px solid #1b3b2b' : '1px solid #d5e4dc',
                        background: active ? '#1b3b2b' : '#ffffff',
                        color: active ? '#ffffff' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: active ? '0 2px 6px rgba(27, 59, 43, 0.16)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {city === 'Semua Kota' ? t.allCities : city}
                    </button>
                  );
                })}
              </div>

              {/* Optional Category Filter Pills */}
              {showCategoryFilters && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.15rem' }}>
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '0.45rem 0.95rem',
                          borderRadius: '999px',
                          border: active ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                          background: active ? '#1b3b2b' : '#ffffff',
                          color: active ? '#ffffff' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick E-Ticket Instant Lookup Bar (Tahap 2) */}
              <div
                style={{
                  background: 'linear-gradient(90deg, #edf5f0 0%, #ffffff 100%)',
                  border: '1.5px solid #cfe0d6',
                  borderRadius: '12px',
                  padding: '0.85rem 1.15rem',
                  marginBottom: '1.35rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconTicketStub />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#13281e' }}>
                      {currentLang === 'EN' ? 'Already Have Tickets? Quick E-Ticket Lookup' : 'Sudah Beli Tiket? Cek E-Ticket Kilat'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#476355' }}>
                      {currentLang === 'EN' ? 'Enter Order Code (ORD-...) or WhatsApp number to instantly view official QR ticket.' : 'Ketik Kode Order (ORD-...) atau Nomor WhatsApp Anda untuk langsung buka tiket QR resmi.'}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!ticketLookupInput.trim()) return;
                    setActiveTab('my-ticket');
                    handleLookupTicket(e);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    flex: '1 1 300px',
                    maxWidth: '430px',
                  }}
                >
                  <input
                    type="text"
                    value={ticketLookupInput}
                    onChange={(e) => setTicketLookupInput(e.target.value)}
                    placeholder={currentLang === 'EN' ? 'E.g., ORD-IRV-2026-8821 or +62812...' : 'Contoh: ORD-IRV-2026-8821 atau 0812...'}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #d5e4dc',
                      background: '#ffffff',
                      fontSize: '0.84rem',
                      outline: 'none',
                      color: '#13281e',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(27, 59, 43, 0.2)',
                    }}
                  >
                    {currentLang === 'EN' ? 'Find Ticket' : 'Cari Tiket'}
                  </button>
                </form>
              </div>

              {/* Event Catalog Grid (Desktop: 4 cols, Tablet: 2 cols, Mobile: 1 col) */}
              {loading ? (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 600,
                  }}
                >
                  Memuat daftar event...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                    Tidak ada event yang cocok dengan filter atau kota {selectedCity}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '1rem' }}>
                    Silakan ubah pilihan kota atau klik tombol di bawah untuk menampilkan seluruh event.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Semua');
                      setSelectedCity('Semua Kota');
                      setSearchQuery('');
                      fetchCatalog('Semua', '');
                    }}
                    style={{
                      padding: '0.62rem 1.2rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Tampilkan Semua Event
                  </button>
                </div>
              ) : (
                <div className="irv-event-catalog-grid">
                  {filteredEvents.map((event) => {
                    const totalRemaining = event.tiers.reduce((acc, t) => acc + t.remainingQuota, 0);
                    const lowTier = event.tiers.find((t) => t.remainingQuota > 0 && t.remainingQuota <= 30);
                    let stockBadge = {
                      text: currentLang === 'EN' ? '✓ Tickets Available' : '✓ Tiket Tersedia',
                      bg: '#f0fdf4',
                      color: '#166534',
                      border: '#bbf7d0',
                    };
                    if (totalRemaining <= 0) {
                      stockBadge = {
                        text: currentLang === 'EN' ? 'Sold Out' : 'Habis Terjual',
                        bg: '#fef2f2',
                        color: '#991b1b',
                        border: '#fecaca',
                      };
                    } else if (lowTier) {
                      stockBadge = {
                        text: currentLang === 'EN' ? `🔥 ${lowTier.name.split(' ')[0]} Only ${lowTier.remainingQuota} Left` : `🔥 ${lowTier.name.split(' ')[0]} Sisa ${lowTier.remainingQuota} Tiket`,
                        bg: '#fff7ed',
                        color: '#c2410c',
                        border: '#fed7aa',
                      };
                    }

                    return (
                      <article
                        key={event.id}
                        onClick={() => openCheckoutModal(event)}
                        style={{
                          background: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                          transition: 'transform 0.16s ease, box-shadow 0.16s ease',
                        }}
                      >
                        <div>
                          {/* 16:9 Event Poster Artwork Banner */}
                          <div
                            style={{
                              background: event.bannerGradient,
                              padding: '1.15rem 1.2rem',
                              color: '#ffffff',
                              aspectRatio: '16 / 9',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 800,
                                  padding: '0.22rem 0.55rem',
                                  borderRadius: '999px',
                                  background: 'rgba(15, 23, 42, 0.45)',
                                  color: '#ffffff',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {event.eventDate}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  padding: '0.22rem 0.55rem',
                                  borderRadius: '999px',
                                  background: 'rgba(255, 255, 255, 0.18)',
                                  color: '#facc15',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {event.category}
                              </span>
                            </div>

                            <div style={{ textAlign: 'center', margin: 'auto 0' }}>
                              <div
                                style={{
                                  fontSize: 'clamp(1.05rem, 1.6vw, 1.28rem)',
                                  fontWeight: 900,
                                  lineHeight: 1.2,
                                  letterSpacing: '-0.01em',
                                  textShadow: '0 2px 10px rgba(0,0,0,0.35)',
                                }}
                              >
                                {event.title}
                              </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  padding: '0.18rem 0.6rem',
                                  borderRadius: '999px',
                                  background: 'rgba(0, 0, 0, 0.32)',
                                  color: '#e2efe8',
                                }}
                              >
                                {event.organizerName}
                              </span>
                            </div>
                          </div>

                          {/* Event Card Details (Title, Date/Time, Venue, Urgency Badge) */}
                          <div style={{ padding: '0.95rem 1.05rem 0.85rem' }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: '0.92rem',
                                fontWeight: 800,
                                color: '#0f172a',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={event.title}
                            >
                              {event.title}
                            </h3>
                            <div
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 500,
                                color: '#1e293b',
                                marginTop: '0.28rem',
                              }}
                            >
                              {event.eventDate}, {event.eventTime}
                            </div>
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: '#64748b',
                                marginTop: '0.22rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={`${event.venueName}, ${event.city}`}
                            >
                              {event.venueName}, {event.city.toUpperCase()}
                            </div>

                            {/* Ticket Urgency / Stock Status Badge (Tahap 2) */}
                            <div style={{ marginTop: '0.65rem' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.22rem 0.55rem',
                                  borderRadius: '6px',
                                  background: stockBadge.bg,
                                  color: stockBadge.color,
                                  border: `1px solid ${stockBadge.border}`,
                                }}
                              >
                                {stockBadge.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Divider + "Mulai Dari" | "Rp ..." */}
                        <div
                          style={{
                            padding: '0.75rem 1.05rem',
                            borderTop: '1px solid #edf2f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {currentLang === 'EN' ? 'Starting From' : 'Mulai Dari'}
                          </span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            {event.startingPriceLabel}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        {/* TAB 2: MY E-TICKET PASS (Full-Width Widescreen 2-Column Layout) */}
        {activeTab === 'my-ticket' && (
          <div className="irv-my-ticket-grid">
            {/* Left / Primary Column: Account Tickets Sync + Lookup Bar + Official E-Ticket Pass */}
            <div>
              {/* Account Sync Banner (Google / Email Account vs Guest Lookup) */}
              {authUser && authUser.mode !== 'guest' ? (
                <div
                  style={{
                    background: '#ffffff',
                    padding: '1.1rem 1.35rem',
                    borderRadius: '18px',
                    border: '1.5px solid #bfd4c8',
                    marginBottom: '1rem',
                    display: 'grid',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {authUser.mode === 'google' ? <IconGoogleColor /> : <IconEnvelope />}
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#13281e' }}>
                          Tiket Terhubung Otomatis di Akun {authUser.name} ({authUser.email})
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#4d6a5b' }}>
                          Ditemukan <strong>{accountTickets.length} E-Ticket</strong> resmi pada akun Anda tanpa perlu mengetik kode manual.
                        </div>
                      </div>
                    </div>
                  </div>
                  {accountTickets.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {accountTickets.map((t, idx) => {
                        const isSelected = t.ticketCode === activeTicket.ticketCode;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setActiveTicket(t);
                              setTicketLookupInput(t.ticketCode);
                            }}
                            style={{
                              padding: '0.48rem 0.85rem',
                              borderRadius: '10px',
                              border: isSelected ? '2px solid #1b3b2b' : '1px solid #d5e4dc',
                              background: isSelected ? '#1b3b2b' : '#f6faf8',
                              color: isSelected ? '#ffffff' : '#13281e',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            Tiket #{idx + 1}: {t.ticketCode} ({t.holderName})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    padding: '0.95rem 1.35rem',
                    borderRadius: '18px',
                    border: '1.5px solid #d5e4dc',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#13281e' }}>
                      {authUser?.mode === 'guest' ? 'Anda sedang menggunakan Mode Tamu' : 'Ingin semua E-Ticket tersimpan otomatis di akun Anda?'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#4d6a5b' }}>
                      Masuk dengan Google (Gmail) atau Email agar semua tiket yang Anda beli langsung muncul otomatis tanpa cari kode.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingCheckoutEvent(null);
                      setAuthStep('welcome');
                      setAuthError(null);
                      setAuthModalOpen(true);
                    }}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid #1b3b2b',
                      background: '#ffffff',
                      color: '#13281e',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <span style={{ display: 'inline-flex', transform: 'scale(0.75)' }}>
                      <IconGoogleColor />
                    </span>
                    <span>Masuk dengan Google / Email</span>
                  </button>
                </div>
              )}

              {/* Search / Lookup Bar */}
              <form
                onSubmit={handleLookupTicket}
                style={{
                  background: '#ffffff',
                  padding: '1rem 1.35rem',
                  borderRadius: '18px',
                  border: '1.5px solid #d5e4dc',
                  marginBottom: '1.35rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#13281e' }}>
                  Cari E-Ticket atau Kode Pesanan Anda:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
                  <input
                    type="text"
                    value={ticketLookupInput}
                    onChange={(e) => setTicketLookupInput(e.target.value)}
                    placeholder="Contoh: IRV-TKT-2026-8821 atau ORD-IRV-2026-8821"
                    style={{
                      flex: 1,
                      padding: '0.62rem 0.9rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                      fontSize: '0.86rem',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.62rem 1.2rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                  >
                    Tampilkan E-Pass
                  </button>
                </div>
                {ticketLookupMessage && (
                  <div style={{ width: '100%', fontSize: '0.8rem', color: '#1b3b2b', fontWeight: 600 }}>
                    {ticketLookupMessage}
                  </div>
                )}
              </form>

              {/* Physical-Style Emerald & Gold E-Ticket Pass */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '26px',
                  border: '1.5px solid #c9ddd2',
                  overflow: 'hidden',
                  boxShadow: '0 22px 50px rgba(19, 40, 30, 0.09)',
                }}
              >
                {/* Top Emerald & Gold Header */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1b3b2b 0%, #0f2419 65%, #274f3b 100%)',
                    padding: '1.75rem 2rem',
                    color: '#ffffff',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    borderBottom: '3px solid #d4af37',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#e5c170', marginBottom: '0.3rem' }}>
                      IRVITE.ID OFFICIAL E-TICKET PASS
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
                      {activeTicket.eventTitle}
                    </h2>
                  </div>
                  <span
                    style={{
                      padding: '0.42rem 0.95rem',
                      borderRadius: '999px',
                      background: activeTicket.status === 'CHECKED_IN' ? '#f59e0b' : '#16a34a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {activeTicket.status === 'CHECKED_IN' ? 'SUDAH CHECK-IN' : 'AKTIF / SIAP SCAN'}
                  </span>
                </div>

                {/* Ticket Main Body + QR Stub */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    padding: '2rem',
                    gap: '1.75rem',
                    alignItems: 'center',
                  }}
                >
                  {/* Left Column: Holder & Venue Metadata */}
                  <div style={{ display: 'grid', gap: '1.1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                          Pemegang Tiket
                        </div>
                        <div style={{ fontSize: '1.06rem', fontWeight: 800, color: '#13281e', marginTop: '0.15rem' }}>
                          {activeTicket.holderName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#4d6a5b' }}>{activeTicket.holderEmail}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                          Kategori Tier
                        </div>
                        <div style={{ fontSize: '1.06rem', fontWeight: 800, color: '#9a7328', marginTop: '0.15rem' }}>
                          {activeTicket.tierName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#4d6a5b' }}>Order: {activeTicket.orderCode}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                          Tanggal &amp; Waktu
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#13281e', marginTop: '0.15rem' }}>
                          {activeTicket.eventDate}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#4d6a5b' }}>{activeTicket.eventTime}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                          Lokasi Venue
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#13281e', marginTop: '0.15rem' }}>
                          {activeTicket.venueName}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: QR Code & Unique Code */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f6faf8',
                      borderRadius: '18px',
                      padding: '1.35rem',
                      border: '1.5px dashed #bfd4c8',
                    }}
                  >
                    <DeterministicQrMatrix seed={activeTicket.qrPayload} />
                    <div
                      style={{
                        marginTop: '0.65rem',
                        fontFamily: 'monospace',
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: '#13281e',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {activeTicket.ticketCode}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4d6a5b', marginTop: '0.15rem' }}>
                      Tunjukkan QR ini pada petugas Gate Scanner
                    </div>
                  </div>
                </div>

                {/* Perforated Tear-Line Divider with Side Semicircle Notches */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0.25rem 0',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '999px',
                      background: '#edf4f0',
                      borderRight: '1.5px solid #c9ddd2',
                      marginLeft: '-13px',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      borderTop: '2px dashed #bfd4c8',
                      margin: '0 0.75rem',
                    }}
                  />
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '999px',
                      background: '#edf4f0',
                      borderLeft: '1.5px solid #c9ddd2',
                      marginRight: '-13px',
                    }}
                  />
                </div>

                {/* Bottom Terms & Conditions + Actions */}
                <div
                  style={{
                    padding: '1.35rem 2rem 1.75rem',
                    background: '#fafcfb',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#4d6a5b', maxWidth: '560px', lineHeight: 1.55 }}>
                    <strong>Syarat &amp; Ketentuan Masuk Venue:</strong> E-Ticket berlaku untuk 1 (satu) orang dan hanya dapat di-scan 1 kali di pintu masuk. Untuk penukaran gelang tiket fisik (Wristband), wajib membawa kartu identitas yang sesuai dengan nama pemegang tiket.
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        padding: '0.68rem 1.15rem',
                        borderRadius: '12px',
                        border: '1px solid #bfd4c8',
                        background: '#ffffff',
                        color: '#13281e',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cetak / Simpan PDF
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTicket.venueName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.68rem 1.15rem',
                        borderRadius: '12px',
                        background: '#1b3b2b',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                      }}
                    >
                      Buka Peta Lokasi
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right / Side Column: Order Ticket List, Instant Email Correction & Venue Guide */}
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {/* Card 1: Ringkasan Pesanan & Daftar Tiket */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.4rem 1.5rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    RINGKASAN PESANAN
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.22rem 0.6rem',
                      borderRadius: '999px',
                      background: '#e5f5ec',
                      color: '#136f3a',
                    }}
                  >
                    LUNAS • QRIS INSTAN
                  </span>
                </div>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#13281e', marginBottom: '0.2rem' }}>
                  Kode Order: {activeTicket.orderCode}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4d6a5b', marginBottom: '1rem' }}>
                  Email Terdaftar: <strong>{activeTicket.holderEmail}</strong>
                </div>

                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {(activeOrder?.tickets?.length ? activeOrder.tickets : [activeTicket]).map((t, idx) => {
                    const isSelected = t.ticketCode === activeTicket.ticketCode;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTicket(t)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.75rem 0.95rem',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #1b3b2b' : '1px solid #d5e4dc',
                          background: isSelected ? '#f2f8f5' : '#fafcfb',
                          cursor: 'pointer',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#13281e' }}>
                            Tiket #{idx + 1} • {t.holderName}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#4d6a5b', fontFamily: 'monospace' }}>
                            {t.ticketCode}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: isSelected ? '#1b3b2b' : '#5a7667',
                          }}
                        >
                          {isSelected ? 'Sedang Tampil' : 'Lihat QR →'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Koreksi Salah Ketik Email Instan */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.4rem 1.5rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                  SELF-SERVICE CS • 5 DETIK
                </div>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 800, color: '#13281e' }}>
                  Salah Ketik Email Saat Pembelian?
                </h3>
                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#4d6a5b', lineHeight: 1.5 }}>
                  Perbarui alamat email penerima dan kirim ulang E-Ticket <strong>{activeTicket.ticketCode}</strong> secara instan.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!quickEmailInput.trim()) return;
                    setQuickEmailStatus('Memproses...');
                    try {
                      const res = await fetch('/api/ticketing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'correct-email',
                          lookupCode: activeTicket.ticketCode,
                          newEmail: quickEmailInput.trim(),
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setActiveTicket({ ...activeTicket, holderEmail: quickEmailInput.trim().toLowerCase() });
                        setQuickEmailStatus(data?.message || 'Email berhasil diperbarui & E-Ticket dikirim ulang!');
                        setQuickEmailInput('');
                      } else {
                        setQuickEmailStatus(data?.message || 'Gagal memperbarui email.');
                      }
                    } catch {
                      setQuickEmailStatus('Gangguan jaringan saat menghubungi server.');
                    }
                  }}
                  style={{ display: 'grid', gap: '0.55rem' }}
                >
                  <input
                    type="email"
                    required
                    value={quickEmailInput}
                    onChange={(e) => setQuickEmailInput(e.target.value)}
                    placeholder="Masukkan alamat email baru yang benar..."
                    style={{
                      width: '100%',
                      padding: '0.62rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.65rem 1rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Perbarui Email &amp; Kirim Ulang E-Ticket
                  </button>
                  {quickEmailStatus && (
                    <div style={{ fontSize: '0.76rem', color: '#136f3a', fontWeight: 600, background: '#edf7f1', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                      {quickEmailStatus}
                    </div>
                  )}
                </form>
              </div>

              {/* Card 3: Panduan Gate Check-In & Penukaran Gelang */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.4rem 1.5rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1b3b2b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  PANDUAN HARI-H ACARA
                </div>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 800, color: '#13281e' }}>
                  Alur Check-In Gate &amp; Penukaran Wristband
                </h3>
                <div style={{ display: 'grid', gap: '0.65rem', fontSize: '0.8rem', color: '#3b5949', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <strong style={{ color: '#1b3b2b' }}>01.</strong>
                    <span>Siapkan QR E-Ticket di layar HP dengan kecerahan layar maksimal atau cetak PDF.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <strong style={{ color: '#1b3b2b' }}>02.</strong>
                    <span>Petugas Gate Scanner memindai QR Code unik Anda (validasi 1x scan anti-duplikasi).</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <strong style={{ color: '#1b3b2b' }}>03.</strong>
                    <span>Terima gelang fisik (Tyvek/Lanyard VIP) sesuai kategori tier tiket Anda untuk akses area venue.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MINI APPS EKOSISTEM IRVITE.ID */}
        {activeTab === 'mini-apps' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Top Banner Mini Apps */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1b3b2b 0%, #10241a 60%, #28523d 100%)',
                borderRadius: '24px',
                padding: '2rem 2.3rem',
                color: '#ffffff',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e5c170', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  IRVITE MINI APPS ECOSYSTEM • ZERO INSTALL WEB TOOLS
                </div>
                <h1 style={{ margin: '0 0 0.45rem 0', fontSize: 'clamp(1.45rem, 2.4vw, 2rem)', fontWeight: 800 }}>
                  Mini Apps Operasional Event &amp; Self-Service Peserta
                </h1>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#cfe0d6', maxWidth: '780px', lineHeight: 1.55 }}>
                  Seluruh utilitas digital untuk panitia Event Organizer maupun peserta konser/seminar yang berjalan instan langsung dari browser tanpa perlu mengunduh aplikasi tambahan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.28)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                ← Kembali ke Katalog Event
              </button>
            </div>

            {/* Interactive 2-Column Live Mini Apps */}
            <div className="irv-my-ticket-grid">
              {/* Mini App 1: Live Web Gate Scanner Simulator */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.6rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1b3b2b', background: '#edf4f0', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                    MINI APP 01 • GATE SCANNER WEB
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#16a34a' }}>Online • Latency &lt; 0.3s</span>
                </div>
                <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#13281e' }}>
                  Simulator Validasi QR Gate Scanner
                </h2>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#4d6a5b', lineHeight: 1.5 }}>
                  Uji coba pemindaian kode E-Ticket atau gelang fisik untuk memverifikasi keaslian tiket dan status check-in peserta di pintu masuk venue.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = miniScannerCode.trim().toUpperCase();
                    if (!code) return;
                    if (code.includes('8821') || code.startsWith('IRV-')) {
                      setMiniScannerResult({
                        valid: true,
                        title: `VALID • TIKET RESMI (${code})`,
                        detail: `Pemegang: ${activeTicket.holderName} • ${activeTicket.tierName} • Status: Siap Masuk Gate`,
                      });
                    } else {
                      setMiniScannerResult({
                        valid: false,
                        title: `TIDAK TERDAFTAR (${code})`,
                        detail: 'Kode QR tidak ditemukan di database acara aktif. Harap arahkan ke meja Helpdesk.',
                      });
                    }
                  }}
                  style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
                >
                  <input
                    type="text"
                    value={miniScannerCode}
                    onChange={(e) => setMiniScannerCode(e.target.value)}
                    placeholder="Masukkan kode tiket (contoh: IRV-TKT-2026-8821)"
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.9rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                      fontSize: '0.86rem',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.65rem 1.2rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                  >
                    Verifikasi QR
                  </button>
                </form>

                {miniScannerResult && (
                  <div
                    style={{
                      padding: '1rem 1.15rem',
                      borderRadius: '14px',
                      background: miniScannerResult.valid ? '#edf7f1' : '#fdecec',
                      border: `1.5px solid ${miniScannerResult.valid ? '#9fd5b5' : '#f5c2c2'}`,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: miniScannerResult.valid ? '#136f3a' : '#9b1c1c' }}>
                      {miniScannerResult.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#2d4b3c', marginTop: '0.25rem' }}>
                      {miniScannerResult.detail}
                    </div>
                  </div>
                )}
              </div>

              {/* Mini App 2: Kalkulator Simulasi Pendapatan Bersih EO */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.6rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', background: '#f8f4eb', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                    MINI APP 02 • EO PROFIT SIMULATOR
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1b3b2b' }}>Fee Flat Rp 3.000/Tiket</span>
                </div>
                <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#13281e' }}>
                  Kalkulator Dana Cair Panitia (EO)
                </h2>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#4d6a5b', lineHeight: 1.5 }}>
                  Hitung estimasi penjualan tiket acara Anda tanpa potongan persentase tersembunyi.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4d6a5b', marginBottom: '0.25rem' }}>
                      Harga Tiket (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={miniEoPrice}
                      onChange={(e) => setMiniEoPrice(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4d6a5b', marginBottom: '0.25rem' }}>
                      Target Tiket Terjual
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={miniEoQty}
                      onChange={(e) => setMiniEoQty(Math.max(1, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ background: '#f6faf8', borderRadius: '14px', padding: '0.95rem 1.1rem', border: '1px solid #d5e4dc', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span>Total Penjualan Bersih EO (100% Utuh)</span>
                    <strong style={{ color: '#1b3b2b', fontSize: '0.95rem' }}>{formatRupiah(miniEoPrice * miniEoQty)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4d6a5b' }}>
                    <span>Biaya Platform IRVITE (Dibebankan ke Pembeli)</span>
                    <strong>{formatRupiah((miniEoPrice > 0 ? PLATFORM_FEE_PER_TICKET : 0) * miniEoQty)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Mini App Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.15rem' }}>
              {[
                {
                  badge: 'MINI APP 03',
                  title: 'E-Ticket Pass Finder',
                  desc: 'Cek dan tampilkan ulang QR Code E-Ticket resmi hanya dengan memasukkan kode order atau nomor tiket.',
                  btn: 'Buka E-Ticket Saya',
                  action: () => setActiveTab('my-ticket'),
                },
                {
                  badge: 'MINI APP 04',
                  title: 'Self-Service Email Fixer',
                  desc: 'Perbaiki salah ketik alamat email saat pembelian dan kirim ulang E-Ticket secara instan dalam 5 detik.',
                  btn: 'Perbaiki Email Pesanan',
                  action: () => setActiveTab('support'),
                },
                {
                  badge: 'MINI APP 05',
                  title: 'Wristband QR Customizer',
                  desc: 'Desain preview gelang tiket fisik (Tyvek/Lanyard VIP) lengkap dengan kalkulasi harga produksi 300 DPI.',
                  btn: 'Buka Studio Gelang',
                  action: () => setActiveTab('wristband'),
                },
                {
                  badge: 'MINI APP 06',
                  title: 'Digital Wedding & RSVP Suite',
                  desc: 'Buat undangan pernikahan digital eksklusif dengan buku tamu QR dan manajemen RSVP real-time.',
                  btn: 'Buka Katalog Undangan',
                  href: '/undangan',
                },
              ].map((card) => (
                <div
                  key={card.badge}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '1.35rem',
                    border: '1.5px solid #d5e4dc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9a7328', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                      {card.badge}
                    </div>
                    <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 800, color: '#13281e' }}>
                      {card.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#4d6a5b', lineHeight: 1.5 }}>
                      {card.desc}
                    </p>
                  </div>
                  {card.href ? (
                    <Link
                      href={card.href}
                      style={{
                        padding: '0.62rem 1rem',
                        borderRadius: '10px',
                        background: '#edf4f0',
                        color: '#1b3b2b',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        textAlign: 'center',
                      }}
                    >
                      {card.btn} →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={card.action}
                      style={{
                        padding: '0.62rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#edf4f0',
                        color: '#1b3b2b',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {card.btn} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TENTANG KAMI (PROFIL RESMI IRVITE.ID) */}
        {activeTab === 'about' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #1b3b2b 0%, #10241a 60%, #28523d 100%)',
                borderRadius: '24px',
                padding: '2.2rem 2.4rem',
                color: '#ffffff',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.75rem',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e5c170', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  TENTANG KAMI • PROFIL EKOSISTEM IRVITE.ID
                </div>
                <h1 style={{ margin: '0 0 0.55rem 0', fontSize: 'clamp(1.55rem, 2.6vw, 2.2rem)', fontWeight: 800, lineHeight: 1.2 }}>
                  Satu Ekosistem Modern untuk Tiket Event Publik &amp; Undangan Digital
                </h1>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#cfe0d6', lineHeight: 1.6 }}>
                  IRVITE.ID hadir sebagai solusi manajemen akses tamu dan ticketing terpadu di Indonesia. Kami menggabungkan kemudahan pembelian tiket konser, seminar, dan festival dengan sistem check-in QR berkecepatan tinggi serta transparansi biaya terbaik bagi penyelenggara acara.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                {[
                  { num: 'Rp 3.000', label: 'Biaya Layanan Flat per Tiket' },
                  { num: 'H+1 Cair', label: 'Settlement Dana Otomatis ke EO' },
                  { num: '< 0.3 Detik', label: 'Kecepatan Validasi QR Gate' },
                  { num: '99.9% SLA', label: 'Infrastruktur Cloud Skalabel' },
                ].map((stat) => (
                  <div
                    key={stat.num}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      borderRadius: '16px',
                      padding: '1rem 1.15rem',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e5c170' }}>{stat.num}</div>
                    <div style={{ fontSize: '0.78rem', color: '#e2efe8', marginTop: '0.2rem', fontWeight: 600 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {[
                {
                  step: 'PILAR 01',
                  title: 'Transparansi Tanpa Komisi Persentase',
                  desc: 'Tidak seperti platform konvensional yang memotong 5% hingga 10% dari harga tiket, IRVITE menerapkan biaya tetap Rp 3.000/tiket (dan Rp 0 untuk acara kampus/komunitas gratis).',
                },
                {
                  step: 'PILAR 02',
                  title: 'Keamanan QR Anti-Duplikasi',
                  desc: 'Setiap E-Ticket dan gelang fisik memiliki tanda tangan kriptografi unik. Begitu di-scan pada pintu masuk, tiket otomatis terkunci untuk mencegah duplikasi atau tiket palsu.',
                },
                {
                  step: 'PILAR 03',
                  title: 'Integrasi Online-ke-Offline (O2O)',
                  desc: 'Mendukung penerbitan E-Ticket instan via WhatsApp/Email sekaligus pencetakan gelang tiket fisik (Wristband) beresolusi 300 DPI untuk operasional lapangan.',
                },
                {
                  step: 'PILAR 04',
                  title: 'Self-Service Ramah Pengguna',
                  desc: 'Pembeli dapat mengoreksi salah ketik alamat email dan mengirim ulang E-Ticket secara mandiri dalam hitungan detik tanpa perlu antre di layanan pelanggan.',
                },
              ].map((pilar) => (
                <div
                  key={pilar.step}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    border: '1.5px solid #d5e4dc',
                    boxShadow: '0 8px 24px rgba(19, 40, 30, 0.04)',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9a7328', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                    {pilar.step}
                  </div>
                  <h3 style={{ margin: '0 0 0.45rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#13281e' }}>
                    {pilar.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#4d6a5b', lineHeight: 1.55 }}>
                    {pilar.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CETAK TIKET GELANG (WRISTBAND PRINTING & 300 DPI QR STUDIO) */}
        {activeTab === 'wristband' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #1b3b2b 0%, #10241a 60%, #28523d 100%)',
                borderRadius: '24px',
                padding: '2rem 2.3rem',
                color: '#ffffff',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e5c170', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  IRVITE PHYSICAL WRISTBAND PRODUCTION • 300 DPI SERIALIZED QR
                </div>
                <h1 style={{ margin: '0 0 0.45rem 0', fontSize: 'clamp(1.45rem, 2.4vw, 2rem)', fontWeight: 800 }}>
                  Layanan Cetak Tiket Gelang (Wristband) Terintegrasi QR Gate
                </h1>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#cfe0d6', maxWidth: '820px', lineHeight: 1.55 }}>
                  Cetak gelang tiket konser, festival, dan seminar dengan QR Code unik 300 DPI yang langsung sinkron dengan aplikasi Gate Scanner IRVITE. Tahan air, anti-robek, dan dilengkapi nomor seri berurutan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.28)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                ← Kembali ke Katalog Event
              </button>
            </div>

            <div className="irv-my-ticket-grid">
              {/* Left: Live Wristband Studio & Preview */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.75rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  LIVE WRISTBAND MOCKUP PREVIEW (300 DPI)
                </div>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#13281e' }}>
                  Simulasi Desain Gelang Tiket Fisik &amp; Kalkulator Produksi
                </h2>

                {/* Horizontal Physical Wristband Strap Mockup */}
                <div
                  style={{
                    background:
                      wbMaterial === 'tyvek'
                        ? 'linear-gradient(90deg, #0f2419 0%, #1b3b2b 65%, #2b5b43 100%)'
                        : wbMaterial === 'lanyard'
                          ? 'linear-gradient(90deg, #241b0f 0%, #5c451b 65%, #8c6a2b 100%)'
                          : 'linear-gradient(90deg, #132a3a 0%, #1d4d6b 65%, #286a91 100%)',
                    borderRadius: '18px',
                    padding: '1.25rem 1.5rem',
                    color: '#ffffff',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    border: '2px solid #d4af37',
                    marginBottom: '1.35rem',
                    boxShadow: '0 14px 30px rgba(19, 40, 30, 0.16)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Die-Cut Security Seal Area */}
                    <div
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px dashed rgba(255,255,255,0.35)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      SECURITY
                      <br />
                      SEAL LOCK
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f5c443', letterSpacing: '0.1em' }}>
                        {wbTierLabel || 'VIP ACCESS'} • {wbMaterial.toUpperCase()} EDITION
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em', marginTop: '0.15rem' }}>
                        {wbEventTitle || 'NAMA EVENT ANDA 2026'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#d5e4dc', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        SN: IRV-WB-2026-0001 s/d #{String(wbQty).padStart(4, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Embedded 300 DPI QR Zone */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: '#ffffff',
                      color: '#13281e',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ transform: 'scale(0.52)', transformOrigin: 'center', margin: '-32px' }}>
                      <DeterministicQrMatrix seed={`WB|${wbEventTitle}|${wbTierLabel}|${wbQty}`} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#5a7667' }}>GATE QR 300 DPI</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, fontFamily: 'monospace' }}>IRV-WB-0001</div>
                    </div>
                  </div>
                </div>

                {/* Customizer Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#3b5949', marginBottom: '0.3rem' }}>
                      Pilih Bahan Tiket Gelang
                    </label>
                    <select
                      value={wbMaterial}
                      onChange={(e) => setWbMaterial(e.target.value as 'tyvek' | 'lanyard' | 'vinyl')}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                      }}
                    >
                      <option value="tyvek">Tyvek Waterproof Anti-Robek (Rp 1.800/pcs)</option>
                      <option value="vinyl">Vinyl Snap-Lock Klip Permanen (Rp 3.200/pcs)</option>
                      <option value="lanyard">Lanyard Tissue + PVC ID Card VIP (Rp 8.500/pcs)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#3b5949', marginBottom: '0.3rem' }}>
                      Nama Acara pada Gelang
                    </label>
                    <input
                      type="text"
                      value={wbEventTitle}
                      onChange={(e) => setWbEventTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontSize: '0.84rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#3b5949', marginBottom: '0.3rem' }}>
                      Kategori Tier / Gate
                    </label>
                    <input
                      type="text"
                      value={wbTierLabel}
                      onChange={(e) => setWbTierLabel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontSize: '0.84rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#3b5949', marginBottom: '0.3rem' }}>
                      Jumlah Cetak (Pcs)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={wbQty}
                      onChange={(e) => setWbQty(Math.max(50, Number(e.target.value)))}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Estimation Summary & Order CTA */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.6rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                  display: 'grid',
                  gap: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1b3b2b', background: '#edf4f0', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                    ESTIMASI BIAYA PRODUKSI
                  </span>
                  <h3 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.15rem', fontWeight: 800, color: '#13281e' }}>
                    Ringkasan Pesanan Cetak Gelang
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#4d6a5b' }}>
                    Sudah termasuk generate kode QR unik 300 DPI dan integrasi database Gate Scanner.
                  </p>
                </div>

                {(() => {
                  const unitPrice = wbMaterial === 'tyvek' ? 1800 : wbMaterial === 'vinyl' ? 3200 : 8500;
                  const totalCost = unitPrice * wbQty;
                  return (
                    <div style={{ background: '#f6faf8', borderRadius: '14px', padding: '1rem 1.15rem', border: '1px solid #d5e4dc', fontSize: '0.84rem', display: 'grid', gap: '0.45rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Harga Satuan ({wbMaterial.toUpperCase()})</span>
                        <strong>{formatRupiah(unitPrice)} / pcs</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Kuantitas Produksi</span>
                        <strong>{wbQty} pcs</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sinkronisasi QR Gate Scanner</span>
                        <strong style={{ color: '#136f3a' }}>GRATIS (Termasuk)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #cfe0d6', fontSize: '1.02rem', fontWeight: 800, color: '#1b3b2b' }}>
                        <span>Total Estimasi Cetak</span>
                        <span>{formatRupiah(totalCost)}</span>
                      </div>
                    </div>
                  );
                })()}

                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    `Halo Tim Produksi IRVITE.ID, saya ingin memesan Cetak Tiket Gelang (${wbMaterial.toUpperCase()}) sebanyak ${wbQty} pcs untuk acara "${wbEventTitle}" (Tier: ${wbTierLabel}).`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.85rem 1.2rem',
                    borderRadius: '12px',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  Pesan Cetak Gelang via WhatsApp Produksi →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: LAYANAN PELANGGAN (CUSTOMER CARE & SELF-SERVICE 24/7) */}
        {activeTab === 'support' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #1b3b2b 0%, #10241a 60%, #28523d 100%)',
                borderRadius: '24px',
                padding: '2rem 2.3rem',
                color: '#ffffff',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e5c170', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  IRVITE CUSTOMER CARE &amp; SELF-SERVICE HELPDESK
                </div>
                <h1 style={{ margin: '0 0 0.45rem 0', fontSize: 'clamp(1.45rem, 2.4vw, 2rem)', fontWeight: 800 }}>
                  Pusat Layanan Pelanggan &amp; Bantuan Tiket
                </h1>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#cfe0d6', maxWidth: '780px', lineHeight: 1.55 }}>
                  Kendala belum menerima E-Ticket karena salah ketik email, lupa kode pesanan, atau butuh bantuan pengembalian dana? Selesaikan langsung secara instan di bawah ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.28)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                ← Kembali ke Katalog Event
              </button>
            </div>

            <div className="irv-my-ticket-grid">
              {/* Left: Self-Service Email Typo Correction + Order Lookup */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '22px',
                  padding: '1.65rem',
                  border: '1.5px solid #d5e4dc',
                  boxShadow: '0 10px 26px rgba(19, 40, 30, 0.04)',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', background: '#f8f4eb', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                  FITUR UNGGULAN • SELF-SERVICE 5 DETIK
                </span>
                <h2 style={{ margin: '0.55rem 0 0.35rem', fontSize: '1.2rem', fontWeight: 800, color: '#13281e' }}>
                  Koreksi Salah Ketik Email &amp; Kirim Ulang E-Ticket
                </h2>
                <p style={{ margin: '0 0 1.1rem', fontSize: '0.84rem', color: '#4d6a5b', lineHeight: 1.5 }}>
                  Masukkan Kode Tiket atau Kode Order Anda beserta alamat email yang benar. Sistem akan langsung memperbarui data dan mengirim ulang E-Ticket QR Pass detik ini juga.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!ticketLookupInput.trim() || !quickEmailInput.trim()) return;
                    setQuickEmailStatus('Memproses perubahan email & mengirim ulang E-Ticket...');
                    try {
                      const res = await fetch('/api/ticketing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'correct-email',
                          lookupCode: ticketLookupInput.trim(),
                          newEmail: quickEmailInput.trim(),
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setQuickEmailStatus(data?.message || 'Berhasil! Email diperbarui dan E-Ticket telah dikirim ulang.');
                        setQuickEmailInput('');
                      } else {
                        setQuickEmailStatus(data?.message || 'Kode pesanan tidak ditemukan.');
                      }
                    } catch {
                      setQuickEmailStatus('Terjadi gangguan koneksi.');
                    }
                  }}
                  style={{ display: 'grid', gap: '0.85rem' }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#3b5949', marginBottom: '0.3rem' }}>
                      Kode Tiket / Kode Order
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketLookupInput}
                      onChange={(e) => setTicketLookupInput(e.target.value)}
                      placeholder="Contoh: IRV-TKT-2026-8821"
                      style={{
                        width: '100%',
                        padding: '0.68rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#3b5949', marginBottom: '0.3rem' }}>
                      Alamat Email Baru yang Benar
                    </label>
                    <input
                      type="email"
                      required
                      value={quickEmailInput}
                      onChange={(e) => setQuickEmailInput(e.target.value)}
                      placeholder="nama.anda@gmail.com"
                      style={{
                        width: '100%',
                        padding: '0.68rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid #c5d9ce',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '0.8rem 1.2rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                    }}
                  >
                    Perbarui Email &amp; Kirim Ulang E-Ticket Sekarang
                  </button>
                  {quickEmailStatus && (
                    <div style={{ padding: '0.75rem 0.95rem', borderRadius: '10px', background: '#edf7f1', color: '#136f3a', fontSize: '0.82rem', fontWeight: 700 }}>
                      {quickEmailStatus}
                    </div>
                  )}
                </form>
              </div>

              {/* Right: FAQ & Direct WhatsApp Helpdesk */}
              <div style={{ display: 'grid', gap: '1.15rem' }}>
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '22px',
                    padding: '1.5rem',
                    border: '1.5px solid #d5e4dc',
                  }}
                >
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#13281e' }}>
                    Pertanyaan Umum (FAQ Pembeli Tiket)
                  </h3>
                  <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.82rem', color: '#3b5949', lineHeight: 1.5 }}>
                    <div>
                      <strong style={{ color: '#13281e' }}>1. Apakah E-Ticket wajib dicetak kertas?</strong>
                      <div>Tidak wajib. Anda cukup menunjukkan QR Code di menu &quot;E-Ticket Pass Saya&quot; dari layar smartphone saat di pintu masuk venue.</div>
                    </div>
                    <div>
                      <strong style={{ color: '#13281e' }}>2. Bagaimana cara menukar E-Ticket menjadi Tiket Gelang?</strong>
                      <div>Tunjukkan QR E-Ticket dan kartu identitas (KTP/SIM/Kartu Pelajar) pada booth Penukaran Wristband di lokasi acara.</div>
                    </div>
                    <div>
                      <strong style={{ color: '#13281e' }}>3. Bagaimana jika acara ditunda atau dibatalkan?</strong>
                      <div>Dana pembelian tiket dijamin aman dan dikembalikan 100% sesuai prosedur resmi penyelenggara acara melalui kanal pembayaran awal.</div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '22px',
                    padding: '1.5rem',
                    border: '1.5px solid #d5e4dc',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1b3b2b', textTransform: 'uppercase' }}>
                      BUTUH BANTUAN TIM CS MANUSIA?
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#13281e', marginTop: '0.15rem' }}>
                      WhatsApp Helpdesk Resmi (08.00 – 22.00 WIB)
                    </div>
                  </div>
                  <a
                    href="https://wa.me/6281234567890?text=Halo%20Layanan%20Pelanggan%20IRVITE.ID,%20saya%20membutuhkan%20bantuan%20terkait%20tiket%20event."
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.72rem 1.15rem',
                      borderRadius: '12px',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      textDecoration: 'none',
                    }}
                  >
                    Chat WhatsApp CS →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: TRANSAKSI SAYA (Mobile Bottom Nav & Order History) */}
        {activeTab === 'transactions' && (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <section
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.6rem 1.85rem',
                border: '1.5px solid #d9e6df',
                boxShadow: '0 8px 24px rgba(17, 45, 32, 0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Riwayat Transaksi Tiket
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    Daftar transaksi pembelian tiket event dan status pembayaran E-Ticket Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-ticket')}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Lihat E-Ticket QR Pass →
                </button>
              </div>

              {accountTickets.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {accountTickets.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        padding: '1.15rem 1.35rem',
                        borderRadius: '16px',
                        border: '1.5px solid #d9e6df',
                        background: '#f8fbf9',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'grid', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              background: '#dcfce7',
                              color: '#15803d',
                            }}
                          >
                            LUNAS • {tx.status}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                            {tx.orderCode} • {tx.ticketCode}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>{tx.eventTitle}</div>
                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                          {tx.tierName} • {tx.eventDate} ({tx.eventTime})
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Pemegang Tiket</div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1b3b2b' }}>
                            {tx.holderName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTicket(tx);
                            setTicketLookupInput(tx.ticketCode);
                            setActiveTab('my-ticket');
                          }}
                          style={{
                            padding: '0.62rem 1rem',
                            borderRadius: '10px',
                            border: '1.5px solid #1b3b2b',
                            background: '#ffffff',
                            color: '#1b3b2b',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Buka E-Ticket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '2rem',
                    borderRadius: '16px',
                    background: '#f8fbf9',
                    border: '1.5px dashed #cbd5e1',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                    {authUser
                      ? 'Belum Ada Transaksi di Akun Ini'
                      : 'Masuk untuk Melihat Riwayat Transaksi Anda'}
                  </div>
                  <p style={{ margin: '0 auto 1.1rem', maxWidth: '460px', fontSize: '0.85rem', color: '#475569' }}>
                    Masuk dengan akun Google (Gmail) atau Email untuk menyinkronkan semua transaksi pembelian tiket Anda secara otomatis.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    {!authUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError(null);
                          setAuthStep('welcome');
                          setAuthModalOpen(true);
                        }}
                        style={{
                          padding: '0.68rem 1.2rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#1b3b2b',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                        }}
                      >
                        Masuk / Daftar Sekarang
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      style={{
                        padding: '0.68rem 1.2rem',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                      }}
                    >
                      Jelajahi Event
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* "Selamat Datang di IRVITE" Auth & Guest Modal (Matching Reference Screenshot) */}
      {authModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="irv-auth-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            zIndex: 10000,
            overflowY: 'auto',
          }}
          onClick={() => {
            setAuthModalOpen(false);
            setPendingCheckoutEvent(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              maxWidth: '465px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 26px 65px rgba(0, 0, 0, 0.28)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Right Close Button [ ✕ ] */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1.1rem 1.25rem 0' }}>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => {
                  setAuthModalOpen(false);
                  setPendingCheckoutEvent(null);
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Main Body */}
            <div style={{ padding: '0.6rem 2.2rem 1.75rem' }}>
              {authStep === 'welcome' && (
                <>
                  <h2
                    id="irv-auth-modal-title"
                    style={{
                      margin: '0 0 0.45rem 0',
                      fontSize: '1.65rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      textAlign: 'center',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Selamat Datang di IRVITE
                  </h2>
                  <p
                    style={{
                      margin: '0 0 1.65rem 0',
                      fontSize: '0.92rem',
                      color: '#334155',
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  >
                    Silahkan masuk atau daftar untuk melanjutkan
                  </p>

                  <div style={{ display: 'grid', gap: '0.85rem' }}>
                    {/* 1. Lanjutkan dengan Google */}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthStep('google');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.9rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid #dce3ea',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr 28px',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <IconGoogleColor />
                      </span>
                      <span style={{ textAlign: 'center' }}>Lanjutkan dengan Google</span>
                      <span />
                    </button>

                    {/* 2. Lanjutkan dengan Email */}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthStep('email-login');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.9rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid #dce3ea',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr 28px',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <IconEnvelope />
                      </span>
                      <span style={{ textAlign: 'center' }}>Lanjutkan dengan Email</span>
                      <span />
                    </button>

                    {/* 3. Lanjutkan sebagai Tamu */}
                    <button
                      type="button"
                      onClick={() => {
                        completeAuthSession({
                          mode: 'guest',
                          name: 'Tamu IRVITE',
                          email: '',
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '0.9rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid #dce3ea',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr 28px',
                        alignItems: 'center',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <IconGuestBadge />
                      </span>
                      <span style={{ textAlign: 'center' }}>Lanjutkan sebagai Tamu</span>
                      <span />
                    </button>
                  </div>

                  {/* Belum punya akun? Daftar */}
                  <div
                    style={{
                      marginTop: '1.35rem',
                      textAlign: 'center',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      fontWeight: 500,
                    }}
                  >
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError(null);
                        setAuthStep('register');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#1d4ed8',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                    >
                      Daftar
                    </button>
                  </div>
                </>
              )}

              {/* STEP 2: LANJUTKAN DENGAN GOOGLE (GMAIL) */}
              {authStep === 'google' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
                    <IconGoogleColor />
                  </div>
                  <h2
                    id="irv-auth-modal-title"
                    style={{
                      margin: '0 0 0.3rem 0',
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      textAlign: 'center',
                    }}
                  >
                    Pilih Akun Google (Gmail)
                  </h2>
                  <p style={{ margin: '0 0 1.15rem 0', fontSize: '0.84rem', color: '#475569', textAlign: 'center' }}>
                    E-Ticket yang Anda beli akan langsung tersimpan otomatis di akun Gmail Anda.
                  </p>

                  {/* Quick One-Click Google Accounts */}
                  <div style={{ display: 'grid', gap: '0.55rem', marginBottom: '1rem' }}>
                    {[
                      {
                        name: 'Rizky Pratama',
                        email: 'rizky.pratama@gmail.com',
                        whatsapp: '081288997711',
                        badge: '2 Tiket Aktif',
                      },
                      {
                        name: 'Nadia Maharani',
                        email: 'nadia.maharani@gmail.com',
                        whatsapp: '081377889900',
                        badge: 'Akun Google',
                      },
                    ].map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() =>
                          completeAuthSession({
                            mode: 'google',
                            name: acc.name,
                            email: acc.email,
                            whatsapp: acc.whatsapp,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1.5px solid #dce3ea',
                          background: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '999px',
                              background: '#1b3b2b',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                            }}
                          >
                            {acc.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{acc.name}</div>
                            <div style={{ fontSize: '0.76rem', color: '#475569' }}>{acc.email}</div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.22rem 0.55rem',
                            borderRadius: '999px',
                            background: '#edf4f0',
                            color: '#1b3b2b',
                          }}
                        >
                          {acc.badge}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Gmail Account Sign-In */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const email = authEmailInput.trim().toLowerCase();
                      if (!email || !email.includes('@')) {
                        setAuthError('Masukkan alamat email Google (@gmail.com) yang valid.');
                        return;
                      }
                      const derivedName =
                        authNameInput.trim() ||
                        email
                          .split('@')[0]
                          .replace(/[._-]+/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                      completeAuthSession({
                        mode: 'google',
                        name: derivedName,
                        email,
                        whatsapp: authWhatsappInput.trim() || undefined,
                      });
                    }}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '0.9rem',
                      display: 'grid',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      Atau masuk dengan alamat Gmail Anda sendiri:
                    </div>
                    <input
                      type="text"
                      value={authNameInput}
                      onChange={(e) => setAuthNameInput(e.target.value)}
                      placeholder="Nama Lengkap Anda"
                      style={{
                        width: '100%',
                        padding: '0.68rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="email"
                      required
                      value={authEmailInput}
                      onChange={(e) => setAuthEmailInput(e.target.value)}
                      placeholder="nama.anda@gmail.com"
                      style={{
                        width: '100%',
                        padding: '0.68rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.86rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    {authError && (
                      <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>{authError}</div>
                    )}
                    <button
                      type="submit"
                      style={{
                        padding: '0.78rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#1b3b2b',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      Lanjutkan dengan Gmail Ini
                    </button>
                  </form>

                  <div style={{ marginTop: '0.95rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAuthStep('welcome')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Kembali ke Pilihan Masuk
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: LANJUTKAN DENGAN EMAIL */}
              {authStep === 'email-login' && (
                <div>
                  <h2
                    id="irv-auth-modal-title"
                    style={{
                      margin: '0 0 0.35rem 0',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      textAlign: 'center',
                    }}
                  >
                    Masuk dengan Email
                  </h2>
                  <p style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', color: '#475569', textAlign: 'center' }}>
                    Masuk ke akun IRVITE Anda untuk mengakses seluruh E-Ticket pesanan Anda.
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const email = authEmailInput.trim().toLowerCase();
                      if (!email) {
                        setAuthError('Silakan masukkan alamat email Anda.');
                        return;
                      }
                      const derivedName =
                        authNameInput.trim() ||
                        (email.startsWith('rizky')
                          ? 'Rizky Pratama'
                          : email
                              .split('@')[0]
                              .replace(/[._-]+/g, ' ')
                              .replace(/\b\w/g, (c) => c.toUpperCase()));
                      completeAuthSession({
                        mode: 'email',
                        name: derivedName,
                        email,
                      });
                    }}
                    style={{ display: 'grid', gap: '0.75rem' }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        Alamat Email
                      </label>
                      <input
                        type="email"
                        required
                        value={authEmailInput}
                        onChange={(e) => setAuthEmailInput(e.target.value)}
                        placeholder="rizky.pratama@gmail.com"
                        style={{
                          width: '100%',
                          padding: '0.72rem 0.9rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.88rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        Kata Sandi
                      </label>
                      <input
                        type="password"
                        required
                        value={authPasswordInput}
                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '0.72rem 0.9rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.88rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    {authError && (
                      <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>{authError}</div>
                    )}
                    <button
                      type="submit"
                      style={{
                        padding: '0.82rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#1b3b2b',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        marginTop: '0.25rem',
                      }}
                    >
                      Masuk Sekarang
                    </button>
                  </form>

                  <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.86rem', color: '#334155' }}>
                    Belum punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthStep('register')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#1d4ed8',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Daftar
                    </button>
                  </div>
                  <div style={{ marginTop: '0.65rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setAuthStep('welcome')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#475569',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ← Kembali ke Pilihan Masuk
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: DAFTAR AKUN BARU */}
              {authStep === 'register' && (
                <div>
                  <h2
                    id="irv-auth-modal-title"
                    style={{
                      margin: '0 0 0.35rem 0',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      textAlign: 'center',
                    }}
                  >
                    Daftar Akun IRVITE
                  </h2>
                  <p style={{ margin: '0 0 1.1rem 0', fontSize: '0.84rem', color: '#475569', textAlign: 'center' }}>
                    Buat akun pembeli agar semua E-Ticket Anda tersimpan otomatis di satu tempat.
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const email = authEmailInput.trim().toLowerCase();
                      const name = authNameInput.trim();
                      if (!name || !email) {
                        setAuthError('Mohon lengkapi nama dan alamat email Anda.');
                        return;
                      }
                      completeAuthSession({
                        mode: email.endsWith('@gmail.com') ? 'google' : 'email',
                        name,
                        email,
                        whatsapp: authWhatsappInput.trim() || undefined,
                      });
                    }}
                    style={{ display: 'grid', gap: '0.68rem' }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                        Nama Lengkap Sesuai Identitas
                      </label>
                      <input
                        type="text"
                        required
                        value={authNameInput}
                        onChange={(e) => setAuthNameInput(e.target.value)}
                        placeholder="Contoh: Rizky Pratama"
                        style={{
                          width: '100%',
                          padding: '0.68rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                        Alamat Email / Gmail
                      </label>
                      <input
                        type="email"
                        required
                        value={authEmailInput}
                        onChange={(e) => setAuthEmailInput(e.target.value)}
                        placeholder="nama.anda@gmail.com"
                        style={{
                          width: '100%',
                          padding: '0.68rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                        Nomor WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={authWhatsappInput}
                        onChange={(e) => setAuthWhatsappInput(e.target.value)}
                        placeholder="0812xxxxxxxx"
                        style={{
                          width: '100%',
                          padding: '0.68rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                        Buat Kata Sandi
                      </label>
                      <input
                        type="password"
                        required
                        value={authPasswordInput}
                        onChange={(e) => setAuthPasswordInput(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        style={{
                          width: '100%',
                          padding: '0.68rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.86rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    {authError && (
                      <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>{authError}</div>
                    )}
                    <button
                      type="submit"
                      style={{
                        padding: '0.8rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#1b3b2b',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        marginTop: '0.2rem',
                      }}
                    >
                      Daftar &amp; Lanjutkan
                    </button>
                  </form>

                  <div style={{ marginTop: '0.9rem', textAlign: 'center', fontSize: '0.85rem', color: '#334155' }}>
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthStep('welcome')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#1d4ed8',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Masuk
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Gray Footer Terms & Privacy Strip (Matching Reference Screenshot) */}
            <div
              style={{
                background: '#f3f5f8',
                padding: '1.05rem 1.75rem',
                textAlign: 'center',
                fontSize: '0.78rem',
                color: '#334155',
                lineHeight: 1.5,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              Dengan menggunakan website ini, membeli tiket, atau membuat akun, Anda setuju dengan{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setActiveTab('about');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#1d4ed8',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Syarat Layanan &amp; Kebijakan Privasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Tier Checkout Modal */}
      {checkoutEvent && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14, 30, 22, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            zIndex: 9999,
            overflowY: 'auto',
          }}
          onClick={() => setCheckoutEvent(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '580px',
              width: '100%',
              padding: '1.75rem',
              border: '1.5px solid #d5e4dc',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CHECKOUT TIKET INSTAN • {checkoutEvent.category}
                </div>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.22rem', fontWeight: 800, color: '#13281e' }}>
                  {checkoutEvent.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutEvent(null)}
                style={{
                  background: '#edf4f0',
                  border: 'none',
                  borderRadius: '10px',
                  width: '34px',
                  height: '34px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={{ display: 'grid', gap: '1rem' }}>
              {/* Step 1: Select Tier */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#13281e', marginBottom: '0.45rem' }}>
                  1. Pilih Kategori Tiket (Multi-Tier)
                </label>
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {checkoutEvent.tiers.map((tier) => {
                    const isSelected = selectedTier?.id === tier.id;
                    return (
                      <label
                        key={tier.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.8rem 1rem',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid #1b3b2b' : '1.5px solid #d5e4dc',
                          background: isSelected ? '#f2f8f5' : '#ffffff',
                          cursor: tier.remainingQuota > 0 ? 'pointer' : 'not-allowed',
                          opacity: tier.remainingQuota > 0 ? 1 : 0.5,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <input
                            type="radio"
                            name="ticketTier"
                            checked={isSelected}
                            disabled={tier.remainingQuota <= 0}
                            onChange={() => setSelectedTierId(tier.id)}
                          />
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#13281e' }}>
                              {tier.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#4d6a5b' }}>
                              {tier.description} (Sisa {tier.remainingQuota})
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1b3b2b', flexShrink: 0 }}>
                          {formatRupiah(tier.price)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Quantity & Buyer Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Jumlah Tiket
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                      fontWeight: 700,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Tiket
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Nama Lengkap Pemesan
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Nama sesuai KTP / Identitas"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Email Penerima E-Ticket
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="email.aktif@gmail.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Metode Pembayaran Instan
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #c5d9ce',
                    fontWeight: 600,
                  }}
                >
                  <option value="QRIS Instan">QRIS Instan (GoPay, OVO, Dana, Mobile Banking)</option>
                  <option value="Virtual Account BCA">BCA Virtual Account</option>
                  <option value="Virtual Account Mandiri">Mandiri Virtual Account</option>
                </select>
              </div>

              {/* Price Summary */}
              <div
                style={{
                  background: '#edf4f0',
                  borderRadius: '14px',
                  padding: '0.95rem 1.1rem',
                  border: '1px solid #cfe0d6',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>
                    Subtotal Tiket ({quantity}x {selectedTier?.name.split('—')[0].trim()})
                  </span>
                  <strong>{formatRupiah(subtotalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', color: '#436052' }}>
                  <span>Biaya Layanan Platform (Rp 3.000 / tiket)</span>
                  <strong>{formatRupiah(serviceFeeAmount)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid #c5d9ce',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#1b3b2b',
                  }}
                >
                  <span>Total Pembayaran</span>
                  <span>{formatRupiah(totalAmount)}</span>
                </div>
              </div>

              {checkoutError && (
                <div style={{ color: '#9b1c1c', background: '#fdecec', padding: '0.65rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                disabled={checkoutSubmitting}
                style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#1b3b2b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: checkoutSubmitting ? 'wait' : 'pointer',
                }}
              >
                {checkoutSubmitting ? 'Menerbitkan E-Ticket...' : 'Bayar & Terbitkan E-Ticket Sekarang'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar (5 Tabs: Beranda, Transaksi, Tiket, Cari, Profil) */}
      <nav className="irv-mobile-bottom-nav" aria-label="Navigasi Utama Mobile">
        {/* 1. Beranda */}
        <button
          type="button"
          className={`irv-mobile-nav-item ${activeTab === 'catalog' && !mobileSearchOpen ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('catalog');
            setMobileSearchOpen(false);
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill={activeTab === 'catalog' && !mobileSearchOpen ? 'rgba(27, 59, 43, 0.14)' : 'none'}
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z" />
          </svg>
          <span>Beranda</span>
        </button>

        {/* 2. Transaksi */}
        <button
          type="button"
          className={`irv-mobile-nav-item ${activeTab === 'transactions' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('transactions');
            setMobileSearchOpen(false);
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" />
          </svg>
          <span>Transaksi</span>
        </button>

        {/* 3. Tiket */}
        <button
          type="button"
          className={`irv-mobile-nav-item ${activeTab === 'my-ticket' ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('my-ticket');
            setMobileSearchOpen(false);
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V7z" />
            <path d="M9.5 8.5v7M14.5 8.5v7" />
          </svg>
          <span>Tiket</span>
        </button>

        {/* 4. Cari */}
        <button
          type="button"
          className={`irv-mobile-nav-item ${mobileSearchOpen ? 'is-active' : ''}`}
          onClick={() => {
            setActiveTab('catalog');
            setMobileSearchOpen((prev) => !prev);
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.2" y2="16.2" />
          </svg>
          <span>Cari</span>
        </button>

        {/* 5. Profil */}
        <button
          type="button"
          className={`irv-mobile-nav-item ${authModalOpen ? 'is-active' : ''}`}
          onClick={() => {
            setMobileSearchOpen(false);
            setAuthError(null);
            setAuthStep('welcome');
            setAuthModalOpen(true);
          }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
          <span>{authUser ? authUser.name.split(' ')[0] : 'Profil'}</span>
        </button>
      </nav>
    </div>
  );
}
