import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as QRCode from 'qrcode';
import type { WASocket, ConnectionState } from '@whiskeysockets/baileys';
import { PrismaService } from '../database/prisma.service';
import { ClientPortalService } from './client-portal.service';

export interface WaSessionInfo {
  status: 'disconnected' | 'connecting' | 'needs_qr' | 'connected';
  phoneNumber: string | null;
  pushName: string | null;
  qrCodeDataUrl: string | null;
  connectedAt: string | null;
}

export interface WaQueueStatus {
  status: 'idle' | 'running' | 'paused' | 'break' | 'completed' | 'stopped';
  total: number;
  sentCount: number;
  failedCount: number;
  currentIndex: number;
  currentGuest: {
    id: string;
    name: string;
    phoneNumber: string;
  } | null;
  countdownSeconds: number;
  breakCountdownSeconds: number;
  startedAt: string | null;
}

interface ActiveWaSession {
  sock: WASocket | null;
  status: 'disconnected' | 'connecting' | 'needs_qr' | 'connected';
  qrCodeDataUrl: string | null;
  phoneNumber: string | null;
  pushName: string | null;
  connectedAt: string | null;
  lastActive: Date;
}

interface ActiveWaQueue {
  status: 'idle' | 'running' | 'paused' | 'break' | 'completed' | 'stopped';
  eventId: string;
  targetGuestIds: string[];
  pacing: 'relaxed' | 'standard' | 'fast';
  useSpintax: boolean;
  enableBatchBreak: boolean;
  currentIndex: number;
  sentCount: number;
  failedCount: number;
  countdownSeconds: number;
  breakCountdownSeconds: number;
  startedAt: string;
  timer: NodeJS.Timeout | null;
  shouldStop: boolean;
}

@Injectable()
export class ClientPortalWaService implements OnModuleDestroy {
  private readonly logger = new Logger(ClientPortalWaService.name);
  private readonly sessions = new Map<string, ActiveWaSession>();
  private readonly queues = new Map<string, ActiveWaQueue>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientPortalService: ClientPortalService,
  ) {}

  onModuleDestroy() {
    // Gracefully clean up all sockets and timers
    for (const [, queue] of this.queues.entries()) {
      if (queue.timer) clearTimeout(queue.timer);
    }
    for (const [, session] of this.sessions.entries()) {
      if (session.sock) {
        try {
          session.sock.end(undefined);
        } catch {
          // Ignore
        }
      }
    }
    this.queues.clear();
    this.sessions.clear();
  }

  /**
   * Resolves a writable directory for auth state.
   * On Vercel / AWS Lambda, process.cwd() is read-only (/var/task),
   * so we gracefully fallback to os.tmpdir().
   */
  private getStorageBaseDir(): string {
    const candidates = [
      path.join(process.cwd(), 'storage', 'wa-sessions'),
      path.join(os.tmpdir(), 'irvite-wa-sessions'),
    ];

    for (const dir of candidates) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const probeFile = path.join(dir, `.probe_${Date.now()}`);
        fs.writeFileSync(probeFile, 'ok');
        fs.unlinkSync(probeFile);
        return dir;
      } catch {
        // try next candidate
      }
    }

    const fallback = path.join(os.tmpdir(), 'irvite-wa-sessions');
    try {
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
    } catch {
      // ignore
    }
    return fallback;
  }

  private getSessionDir(eventId: string): string {
    const baseDir = this.getStorageBaseDir();
    const sessionDir = path.join(baseDir, `event_${eventId}`);
    try {
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    return sessionDir;
  }

  /**
   * Generates a Spintax variation in natural Indonesian to prevent duplicate blast detection
   */
  public generateSpintaxText(
    guestName: string,
    eventTitle: string,
    canonicalUrl: string,
    variantIndex = 0,
    customGreeting?: string | null,
  ): string {
    if (customGreeting && customGreeting.trim()) {
      return [
        `Kepada Yth. Bapak/Ibu/Saudara/i ${guestName},`,
        '',
        customGreeting.trim(),
        '',
        'Silakan buka tautan undangan digital kami:',
        canonicalUrl,
        '',
        'Terima kasih.',
      ].join('\n');
    }

    const variations = [
      // 0: Formal & Sopan
      [
        `Kepada Yth. Bapak/Ibu/Saudara/i ${guestName},`,
        '',
        `Tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir di momen bahagia kami: ${eventTitle}.`,
        '',
        'Informasi lengkap acara serta konfirmasi kehadiran (RSVP) dapat diakses melalui tautan resmi berikut:',
        canonicalUrl,
        '',
        'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir serta memberikan doa restu.',
        '',
        'Terima kasih.',
      ],
      // 1: Hangat & Penuh Syukur
      [
        `Salam hangat untuk ${guestName},`,
        '',
        `Dengan penuh rasa syukur dan sukacita, kami mengundang Anda untuk turut merayakan perayaan bahagia kami: ${eventTitle}.`,
        '',
        'Detail susunan acara dan konfirmasi kehadiran dapat dilihat langsung melalui tautan undangan digital:',
        canonicalUrl,
        '',
        'Kehadiran serta untaian doa restu Anda menjadi pelengkap kebahagiaan kami.',
        '',
        'Terima kasih banyak atas perhatian dan doanya.',
      ],
      // 2: Sahabat & Keluarga
      [
        `Kepada ${guestName} & Keluarga,`,
        '',
        `Menjelang hari bahagia kami: ${eventTitle}, kami sangat mengharapkan kehadiran Anda sekeluarga untuk berbagi kebahagiaan bersama kami.`,
        '',
        'Silakan membuka tautan undangan berikut untuk melihat informasi lengkap:',
        canonicalUrl,
        '',
        'Besar harapan kami dapat berjumpa dan bersilaturahmi di hari istimewa tersebut.',
        '',
        'Terima kasih.',
      ],
      // 3: Ringkas & Elegan
      [
        `Yth. ${guestName},`,
        '',
        `Kami mengundang Anda untuk menghadiri perayaan istimewa kami: ${eventTitle}.`,
        '',
        'Tautan undangan digital dan RSVP:',
        canonicalUrl,
        '',
        'Doa restu dan kehadiran Anda adalah kehormatan bagi kami. Terima kasih.',
      ],
    ];

    const selected = variations[Math.abs(variantIndex) % variations.length];
    return selected.join('\n');
  }

  /**
   * Normalizes an Indonesian phone number to E.164 without plus: 0812 -> 62812
   */
  public normalizePhone(rawPhone?: string | null): string | null {
    if (!rawPhone) return null;
    let digits = rawPhone.replace(/[^0-9]/g, '');
    if (!digits) return null;
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = '628' + digits.slice(1);
    }
    return digits.length >= 9 ? digits : null;
  }

  /**
   * Get current WhatsApp connection status for an event
   */
  async getSessionStatus(eventId: string, key?: string): Promise<WaSessionInfo> {
    await this.clientPortalService.getPortalData(eventId, key);

    const existing = this.sessions.get(eventId);
    if (!existing) {
      // Check if session directory exists on disk with saved credentials
      const sessionDir = this.getSessionDir(eventId);
      if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        // Automatically wake up existing saved session
        void this.initBaileysSocket(eventId, false);
        return {
          status: 'connecting',
          phoneNumber: null,
          pushName: null,
          qrCodeDataUrl: null,
          connectedAt: null,
        };
      }

      return {
        status: 'disconnected',
        phoneNumber: null,
        pushName: null,
        qrCodeDataUrl: null,
        connectedAt: null,
      };
    }

    return {
      status: existing.status,
      phoneNumber: existing.phoneNumber,
      pushName: existing.pushName,
      qrCodeDataUrl: existing.qrCodeDataUrl,
      connectedAt: existing.connectedAt,
    };
  }

  /**
   * Connect or refresh QR code for an event
   */
  async connectSession(eventId: string, key?: string): Promise<WaSessionInfo> {
    try {
      await this.clientPortalService.getPortalData(eventId, key);
      return await this.initBaileysSocket(eventId, true);
    } catch (err) {
      this.logger.error(`Error in connectSession for event ${eventId}: ${err}`);
      if (err instanceof UnauthorizedException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException(
        (err as Error)?.message || 'Gagal menyiapkan QR Code WhatsApp. Silakan klik coba lagi.',
      );
    }
  }

  /**
   * Request an 8-character Pairing Code for smartphone users
   * Allows linking WhatsApp without scanning a QR code from a camera!
   */
  async requestPairingCode(
    eventId: string,
    key: string | undefined,
    phoneNumber: string,
  ): Promise<{ pairingCode: string }> {
    await this.clientPortalService.getPortalData(eventId, key);

    const cleanPhone = this.normalizePhone(phoneNumber);
    if (!cleanPhone) {
      throw new BadRequestException(
        'Nomor WhatsApp tidak valid. Masukkan nomor dengan awalan 08... atau 628...',
      );
    }

    // Initialize socket without waiting for QR code
    await this.initBaileysSocket(eventId, false);

    const session = this.sessions.get(eventId);
    if (!session?.sock) {
      throw new BadRequestException('Gagal menyiapkan koneksi WhatsApp untuk kode pairing.');
    }

    // Wait up to 3.5 seconds for connection handshake
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      const listener = (u: Partial<ConnectionState>) => {
        if (u.qr || u.connection === 'open') finish();
      };
      session.sock?.ev.on('connection.update', listener);
      setTimeout(finish, 3200);
    });

    try {
      const rawCode = await session.sock.requestPairingCode(cleanPhone);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      this.logger.log(`Pairing code generated for event ${eventId}: ${formattedCode}`);
      return { pairingCode: formattedCode };
    } catch (err) {
      this.logger.error(`Error requesting pairing code for ${cleanPhone}: ${err}`);
      throw new BadRequestException(
        'Gagal meminta kode pairing. Pastikan nomor sudah terdaftar di WhatsApp dan coba lagi.',
      );
    }
  }

  /**
   * Dynamically loads Baileys ESM module
   */
  private async loadBaileys() {
    // Literal dynamic import: preserved by TS (module: nodenext) and statically
    // traceable by Vercel's file tracer so the package is bundled in production.
    return await import('@whiskeysockets/baileys');
  }

  /**
   * Initializes or restarts the Baileys multi-device socket for this event.
   * If waitForQr is true, awaits the first QR event (up to 4.5s) so the response
   * immediately contains the QR image data URL without polling delay.
   */
  private async initBaileysSocket(eventId: string, waitForQr = true): Promise<WaSessionInfo> {
    let sessionState = this.sessions.get(eventId);
    if (!sessionState) {
      sessionState = {
        sock: null,
        status: 'connecting',
        qrCodeDataUrl: null,
        phoneNumber: null,
        pushName: null,
        connectedAt: null,
        lastActive: new Date(),
      };
      this.sessions.set(eventId, sessionState);
    }

    if (sessionState.sock && sessionState.status === 'connected') {
      return {
        status: sessionState.status,
        phoneNumber: sessionState.phoneNumber,
        pushName: sessionState.pushName,
        qrCodeDataUrl: null,
        connectedAt: sessionState.connectedAt,
      };
    }

    try {
      const baileys = await this.loadBaileys();
      const sessionDir = this.getSessionDir(eventId);

      const { state, saveCreds } = await baileys.useMultiFileAuthState(sessionDir);

      if (sessionState.sock) {
        try {
          sessionState.sock.end(undefined);
        } catch {
          // ignore
        }
        sessionState.sock = null;
      }

      sessionState.status = 'connecting';
      sessionState.lastActive = new Date();

      const silentLogger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => silentLogger,
      };

      const makeWASocket = baileys.default || (baileys as any).makeWASocket;
      const sock = makeWASocket({
        auth: state,
        logger: silentLogger as any,
        printQRInTerminal: false,
        browser: ['Irvite Undangan Digital', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      sessionState.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 300,
              color: {
                dark: '#163026',
                light: '#ffffff',
              },
            });
            sessionState.qrCodeDataUrl = qrDataUrl;
            sessionState.status = 'needs_qr';
            this.logger.log(`New QR generated for event ${eventId}`);
          } catch (qrErr) {
            this.logger.error(`Error generating QR code for ${eventId}: ${qrErr}`);
          }
        }

        if (connection === 'open') {
          sessionState.status = 'connected';
          sessionState.qrCodeDataUrl = null;
          sessionState.connectedAt = new Date().toISOString();

          // Extract phone number from sock.user.id
          if (sock.user?.id) {
            const rawJid = sock.user.id.split(':')[0];
            sessionState.phoneNumber = `+${rawJid}`;
          }
          if (sock.user?.name) {
            sessionState.pushName = sock.user.name;
          }

          this.logger.log(
            `WhatsApp connected for event ${eventId} (${sessionState.phoneNumber})`,
          );
        } else if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect =
            statusCode !== baileys.DisconnectReason?.loggedOut;

          this.logger.warn(
            `Connection closed for event ${eventId}, code: ${statusCode}, shouldReconnect: ${shouldReconnect}`,
          );

          if (statusCode === baileys.DisconnectReason?.loggedOut) {
            sessionState.status = 'disconnected';
            sessionState.phoneNumber = null;
            sessionState.pushName = null;
            sessionState.qrCodeDataUrl = null;
            sessionState.sock = null;
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch {
              // ignore
            }
          } else if (shouldReconnect) {
            sessionState.status = 'connecting';
          } else {
            sessionState.status = 'disconnected';
          }
        }
      });

      if (waitForQr) {
        // Await the QR generation (or open connection) for up to 4.5 seconds
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };

          const listener = (u: Partial<ConnectionState>) => {
            if (u.qr || u.connection === 'open') {
              finish();
            }
          };

          sock.ev.on('connection.update', listener);
          setTimeout(finish, 4500);
        });
      }

      return {
        status: sessionState.status,
        phoneNumber: sessionState.phoneNumber,
        pushName: sessionState.pushName,
        qrCodeDataUrl: sessionState.qrCodeDataUrl,
        connectedAt: sessionState.connectedAt,
      };
    } catch (err) {
      this.logger.error(`Failed to initialize Baileys for ${eventId}: ${err}`);
      sessionState.status = 'disconnected';
      sessionState.sock = null;
      throw new BadRequestException(
        'Gagal menginisialisasi koneksi WhatsApp: ' +
          ((err as Error)?.message || 'Terjadi kesalahan sistem'),
      );
    }
  }

  /**
   * Disconnects / logouts the session and cleans up disk credentials
   */
  async disconnectSession(eventId: string, key?: string): Promise<{ success: boolean }> {
    await this.clientPortalService.getPortalData(eventId, key);

    const sessionState = this.sessions.get(eventId);
    if (sessionState?.sock) {
      try {
        await sessionState.sock.logout();
      } catch {
        try {
          sessionState.sock.end(undefined);
        } catch {
          // ignore
        }
      }
    }

    this.sessions.delete(eventId);

    // Stop active queue if running
    this.stopQueue(eventId);

    const sessionDir = this.getSessionDir(eventId);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err) {
        this.logger.error(`Error deleting session dir for ${eventId}: ${err}`);
      }
    }

    return { success: true };
  }

  /**
   * Send a single message to a phone number using the active WhatsApp socket
   */
  async sendDirectMessage(
    eventId: string,
    phoneNumber: string,
    messageText: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    const session = this.sessions.get(eventId);
    if (!session?.sock || session.status !== 'connected') {
      throw new BadRequestException(
        'WhatsApp pengirim belum terhubung. Silakan scan QR atau hubungkan WhatsApp terlebih dahulu.',
      );
    }

    const cleanPhone = this.normalizePhone(phoneNumber);
    if (!cleanPhone) {
      throw new BadRequestException('Nomor telepon tidak valid.');
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      const result = await session.sock.sendMessage(jid, { text: messageText });
      return { success: true, messageId: result?.key?.id ?? undefined };
    } catch (err) {
      this.logger.error(`Error sending message to ${cleanPhone}: ${err}`);
      throw new BadRequestException(
        `Gagal mengirim WhatsApp ke ${cleanPhone}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Send an invitation directly to a single guest, mark as sent, and update database.
   * Can be driven step-by-step from the client portal UI.
   */
  async sendGuestDirectMessage(
    eventId: string,
    guestId: string,
    key?: string,
    originUrl?: string,
    variantIndex = 0,
  ): Promise<{ success: boolean; guestId: string; guestName: string; isWaSent: boolean }> {
    const portalData = await this.clientPortalService.getPortalData(eventId, key);

    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      include: { invitation: true },
    });

    if (!guest || guest.eventId !== eventId) {
      throw new NotFoundException('Tamu tidak ditemukan.');
    }

    if (!guest.phoneNumber) {
      throw new BadRequestException(`Tamu ${guest.name} tidak memiliki nomor WhatsApp.`);
    }

    const session = this.sessions.get(eventId);
    if (!session?.sock || session.status !== 'connected') {
      throw new BadRequestException(
        'WhatsApp pengirim belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu.',
      );
    }

    const uniqueCode = guest.invitation?.uniqueCode || '';
    const canonicalUrl = `${originUrl || 'https://irvite.id'}/to/${uniqueCode}`;
    const message = this.generateSpintaxText(
      guest.name,
      portalData.event.title,
      canonicalUrl,
      variantIndex || 0,
      guest.customGreeting,
    );

    await this.sendDirectMessage(eventId, guest.phoneNumber, message);

    if (guest.invitation) {
      await this.prisma.invitation.update({
        where: { id: guest.invitation.id },
        data: {
          status: guest.invitation.status === 'PENDING' ? 'SENT' : guest.invitation.status,
        },
      });
    }

    return {
      success: true,
      guestId: guest.id,
      guestName: guest.name,
      isWaSent: true,
    };
  }

  /**
   * Start server-side auto queue for an event
   */
  async startQueue(
    eventId: string,
    key: string | undefined,
    options: {
      targetGuestIds: string[];
      pacing: 'relaxed' | 'standard' | 'fast';
      useSpintax: boolean;
      enableBatchBreak: boolean;
      originUrl: string;
    },
  ): Promise<WaQueueStatus> {
    const portalData = await this.clientPortalService.getPortalData(eventId, key);

    const session = this.sessions.get(eventId);
    if (!session?.sock || session.status !== 'connected') {
      throw new BadRequestException(
        'WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu.',
      );
    }

    if (!options.targetGuestIds || options.targetGuestIds.length === 0) {
      throw new BadRequestException('Daftar tamu penerima kosong.');
    }

    // Stop any existing queue
    this.stopQueue(eventId);

    const queue: ActiveWaQueue = {
      status: 'running',
      eventId,
      targetGuestIds: options.targetGuestIds,
      pacing: options.pacing || 'relaxed',
      useSpintax: options.useSpintax ?? true,
      enableBatchBreak: options.enableBatchBreak ?? true,
      currentIndex: 0,
      sentCount: 0,
      failedCount: 0,
      countdownSeconds: 0,
      breakCountdownSeconds: 0,
      startedAt: new Date().toISOString(),
      timer: null,
      shouldStop: false,
    };

    this.queues.set(eventId, queue);

    // Kick off queue in background
    void this.processQueueNext(eventId, portalData.event.title, options.originUrl);

    return this.getQueueStatus(eventId);
  }

  /**
   * Get queue status
   */
  getQueueStatus(eventId: string): WaQueueStatus {
    const queue = this.queues.get(eventId);
    if (!queue) {
      return {
        status: 'idle',
        total: 0,
        sentCount: 0,
        failedCount: 0,
        currentIndex: 0,
        currentGuest: null,
        countdownSeconds: 0,
        breakCountdownSeconds: 0,
        startedAt: null,
      };
    }

    return {
      status: queue.status,
      total: queue.targetGuestIds.length,
      sentCount: queue.sentCount,
      failedCount: queue.failedCount,
      currentIndex: queue.currentIndex,
      currentGuest: null,
      countdownSeconds: queue.countdownSeconds,
      breakCountdownSeconds: queue.breakCountdownSeconds,
      startedAt: queue.startedAt,
    };
  }

  /**
   * Control queue (pause, resume, stop)
   */
  controlQueue(eventId: string, action: 'pause' | 'resume' | 'stop'): WaQueueStatus {
    const queue = this.queues.get(eventId);
    if (!queue) {
      return this.getQueueStatus(eventId);
    }

    if (action === 'pause') {
      queue.status = 'paused';
      if (queue.timer) clearTimeout(queue.timer);
    } else if (action === 'resume') {
      if (queue.status === 'paused') {
        queue.status = 'running';
        // Resume next step
        const event = this.prisma.event.findUnique({
          where: { id: eventId },
          select: { title: true },
        });
        void event.then((ev) => {
          if (ev) void this.processQueueNext(eventId, ev.title, '');
        });
      }
    } else if (action === 'stop') {
      this.stopQueue(eventId);
    }

    return this.getQueueStatus(eventId);
  }

  private stopQueue(eventId: string) {
    const queue = this.queues.get(eventId);
    if (queue) {
      queue.shouldStop = true;
      queue.status = 'stopped';
      if (queue.timer) clearTimeout(queue.timer);
      this.queues.delete(eventId);
    }
  }

  /**
   * Internal queue runner: sends one guest, pauses with human delay, advances
   */
  private async processQueueNext(eventId: string, eventTitle: string, originUrl: string) {
    const queue = this.queues.get(eventId);
    if (!queue || queue.shouldStop || queue.status === 'paused') return;

    if (queue.currentIndex >= queue.targetGuestIds.length) {
      queue.status = 'completed';
      return;
    }

    // Check batch break (45s rest every 30 messages)
    if (
      queue.enableBatchBreak &&
      queue.sentCount > 0 &&
      queue.sentCount % 30 === 0 &&
      queue.status !== 'break'
    ) {
      queue.status = 'break';
      queue.breakCountdownSeconds = 45;

      const countdownInterval = setInterval(() => {
        queue.breakCountdownSeconds -= 1;
        if (queue.breakCountdownSeconds <= 0 || queue.shouldStop) {
          clearInterval(countdownInterval);
          queue.status = 'running';
          void this.processQueueNext(eventId, eventTitle, originUrl);
        }
      }, 1000);
      return;
    }

    const currentGuestId = queue.targetGuestIds[queue.currentIndex];
    const guest = await this.prisma.guest.findUnique({
      where: { id: currentGuestId },
      include: { invitation: true },
    });

    if (guest && guest.phoneNumber && guest.invitation) {
      const canonicalUrl = `${originUrl || 'https://irvite.id'}/to/${guest.invitation.uniqueCode}`;
      const message = this.generateSpintaxText(
        guest.name,
        eventTitle,
        canonicalUrl,
        queue.useSpintax ? queue.currentIndex : 0,
        guest.customGreeting,
      );

      try {
        await this.sendDirectMessage(eventId, guest.phoneNumber, message);
        queue.sentCount += 1;

        // Persist WA status in database
        await this.prisma.invitation.update({
          where: { guestId: guest.id },
          data: {
            status:
              guest.invitation.status === 'PENDING'
                ? 'SENT'
                : guest.invitation.status,
          },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send WA to guest ${guest.name} (${guest.phoneNumber}): ${err}`,
        );
        queue.failedCount += 1;
      }
    } else {
      queue.failedCount += 1;
    }

    queue.currentIndex += 1;

    if (queue.currentIndex >= queue.targetGuestIds.length) {
      queue.status = 'completed';
      return;
    }

    // Calculate randomized delay based on pacing
    let delaySec = 12;
    if (queue.pacing === 'relaxed') {
      delaySec = Math.floor(Math.random() * 7) + 12; // 12-18s
    } else if (queue.pacing === 'standard') {
      delaySec = Math.floor(Math.random() * 5) + 8; // 8-12s
    } else if (queue.pacing === 'fast') {
      delaySec = Math.floor(Math.random() * 4) + 5; // 5-8s
    }

    queue.countdownSeconds = delaySec;

    // Countdown tick
    const tickInterval = setInterval(() => {
      queue.countdownSeconds -= 1;
      if (
        queue.countdownSeconds <= 0 ||
        queue.shouldStop ||
        queue.status === 'paused'
      ) {
        clearInterval(tickInterval);
        if (!queue.shouldStop && queue.status === 'running') {
          void this.processQueueNext(eventId, eventTitle, originUrl);
        }
      }
    }, 1000);
  }
}
