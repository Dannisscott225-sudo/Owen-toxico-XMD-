const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com|t\.me\/)/i;

// Compteur d'avertissements par utilisateur (en mémoire ; à remplacer par une
// vraie base de données pour un usage en production sur plusieurs groupes)
const warnings = new Map();

/**
 * Retourne { action: "none" | "delete" | "kick", reason }
 * Ne s'applique jamais aux admins du groupe (à vérifier avant l'appel).
 */
function checkMessage(senderId, text) {
  if (!text) return { action: "none" };

  if (LINK_REGEX.test(text)) {
    const count = (warnings.get(senderId) || 0) + 1;
    warnings.set(senderId, count);

    if (count >= 3) {
      warnings.delete(senderId);
      return { action: "kick", reason: "Trop de liens envoyés malgré les avertissements." };
    }
    return { action: "delete", reason: `Lien non autorisé (avertissement ${count}/3).` };
  }

  return { action: "none" };
}

function resetWarnings(senderId) {
  warnings.delete(senderId);
}

module.exports = { checkMessage, resetWarnings };
