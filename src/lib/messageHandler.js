const { search } = require("../commands/search");
const antispam = require("../commands/antispam");

const PREFIX = ".";

function extractText(msg) {
  const m = msg.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ""
  );
}

const MENU = `*OWEN TOXICO XMD — Commandes*

${PREFIX}menu — affiche ce message
${PREFIX}ping — vérifie que le bot répond
${PREFIX}search <question> — recherche une info sur le web

Dans les groupes, les liens envoyés par des non-admins sont automatiquement filtrés (anti-spam).`;

async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  const sender = msg.key.participant || msg.key.remoteJid;
  const text = extractText(msg).trim();

  // --- Anti-spam (groupes uniquement) ---
  if (isGroup) {
    const meta = await sock.groupMetadata(from);
    const isAdmin = meta.participants.some(
      (p) => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
    );

    if (!isAdmin) {
      const result = antispam.checkMessage(sender, text);

      if (result.action === "delete") {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, {
          text: `@${sender.split("@")[0]} ${result.reason}`,
          mentions: [sender],
        });
        return;
      }

      if (result.action === "kick") {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.groupParticipantsUpdate(from, [sender], "remove");
        await sock.sendMessage(from, {
          text: `@${sender.split("@")[0]} a été exclu : ${result.reason}`,
          mentions: [sender],
        });
        return;
      }
    }
  }

  // --- Commandes ---
  if (!text.startsWith(PREFIX)) return;

  const [cmdRaw, ...rest] = text.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  const args = rest.join(" ");

  switch (cmd) {
    case "menu":
      await sock.sendMessage(from, { text: MENU }, { quoted: msg });
      break;

    case "ping":
      await sock.sendMessage(from, { text: "Pong ! Le bot est en ligne." }, { quoted: msg });
      break;

    case "search": {
      if (!args) {
        await sock.sendMessage(from, { text: `Utilisation : ${PREFIX}search <ta question>` }, { quoted: msg });
        break;
      }
      const result = await search(args);
      await sock.sendMessage(from, { text: result }, { quoted: msg });
      break;
    }

    default:
      // Commande inconnue : on ignore silencieusement pour éviter le bruit
      break;
  }
}

module.exports = { handleMessage };
