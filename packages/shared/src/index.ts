export enum SessionStatus {
  CONNECTED = 'CONNECTED',
  SCAN_QR = 'SCAN_QR',
  DISCONNECTED = 'DISCONNECTED',
}

export enum MessageSender {
  USER = 'USER',
  BOT = 'BOT',
}

export interface BaileysAuthRecord {
  id: string;
  sessionId: string;
  key: string;
  data: Record<string, unknown>;
}

export interface ConnectionStatus {
  sessionId: string;
  status: SessionStatus;
  qrCode?: string;
}
