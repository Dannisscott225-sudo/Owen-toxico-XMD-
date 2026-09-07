const axios = require("axios");

/**
 * Recherche simple via l'API Instant Answer de DuckDuckGo (pas de clé API requise).
 * Pour des résultats plus riches, on peut brancher une vraie API de recherche
 * (Bing, Serper, etc.) ici en changeant juste cette fonction.
 */
async function search(query) {
  const url = "https://api.duckduckgo.com/";
  const { data } = await axios.get(url, {
    params: { q: query, format: "json", no_html: 1, skip_disambig: 1 },
    timeout: 8000,
  });

  if (data.AbstractText) {
    return `*${data.Heading || query}*\n\n${data.AbstractText}\n\n${data.AbstractURL || ""}`.trim();
  }

  if (Array.isArray(data.RelatedTopics) && data.RelatedTopics.length > 0) {
    const first = data.RelatedTopics.find((t) => t.Text);
    if (first) return `*${query}*\n\n${first.Text}\n\n${first.FirstURL || ""}`.trim();
  }

  return `Aucun résultat clair trouvé pour "${query}". Essaie de reformuler ta recherche.`;
}

module.exports = { search };
