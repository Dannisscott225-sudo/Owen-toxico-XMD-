const path = require("path");
const fs = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} = require("@whiskeysockets/baileys");

const SESSIONS_DIR = path.join(__dirname, "..", "..", "session");
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// sessionId -> { sock, status, number }
const sessions = new Map();

function sanitizeId(number) {
  return number.replace(/[^0-9]/g, "");
}

/**
 * Démarre (ou reprend) une session pour un numéro donné.
 * onUpdate(sessionId, payload) est appelé à chaque changement d'état
 * (pairingCode, connected, disconnected, message reçu, etc.)
 */
async function startSession(number, onUpdate, handleMessage) {
  const sessionId = sanitizeId(number);
  const sessionPath = path.join(SESSIONS_DIR, sessionId);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Owen Toxico XMD"),
  });

  sessions.set(sessionId, { sock, status: "connecting", number });

  // Si pas encore enregistré, on demande un code d'appairage (au lieu du QR)
  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(sessionId);
      onUpdate(sessionId, { type: "pairingCode", code });
    } catch (err) {
      onUpdate(sessionId, { type: "error", message: err.message });
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      sessions.get(sessionId).status = "connected";
      onUpdate(sessionId, { type: "connected", number });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      sessions.get(sessionId).status = "disconnected";
      onUpdate(sessionId, { type: "disconnected", loggedOut });

      if (!loggedOut) {
        // reconnexion automatique (coupure réseau, etc.)
        startSession(number, onUpdate, handleMessage);
      } else {
        // déconnecté manuellement : on nettoie la session persistée
        fs.rmSync(sessionPath, { recursive: true, force: true });
        sessions.delete(sessionId);
      }
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg?.message || msg.key.fromMe) return;
    try {
      await handleMessage(sock, msg);
    } catch (err) {
      console.error("Erreur handleMessage:", err);
    }
  });

  return sessionId;
}

function disconnectSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  s.sock.logout().catch(() => {});
  return true;
}

function listSessions() {
  return Array.from(sessions.entries()).map(([id, s]) => ({
    id,
    number: s.number,
    status: s.status,
  }));
}

module.exports = { startSession, disconnectSession, listSessions, sanitizeId };
