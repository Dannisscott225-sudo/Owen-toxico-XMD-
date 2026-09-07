const socket = io();

const countrySelect = document.getElementById("country");
const prefixEl = document.getElementById("prefix");
const form = document.getElementById("pairForm");
const submitBtn = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const codeBox = document.getElementById("codeBox");
const codeValue = document.getElementById("codeValue");
const sessionList = document.getElementById("sessionList");

countrySelect.addEventListener("change", () => {
  prefixEl.textContent = "+" + countrySelect.value;
});

function setStatus(state, text) {
  statusEl.hidden = false;
  statusDot.className = "dot dot--" + state;
  statusText.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawNumber = document.getElementById("number").value.replace(/\D/g, "");
  const fullNumber = countrySelect.value + rawNumber;

  submitBtn.disabled = true;
  codeBox.hidden = true;
  setStatus("pending", "Connexion au serveur…");

  try {
    const res = await fetch("/api/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: fullNumber }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error", data.error || "Une erreur est survenue.");
      submitBtn.disabled = false;
      return;
    }
    setStatus("pending", "En attente du code d'appairage…");
  } catch (err) {
    setStatus("error", "Impossible de joindre le serveur.");
    submitBtn.disabled = false;
  }
});

function renderSessions(sessions) {
  if (!sessions || sessions.length === 0) {
    sessionList.innerHTML = '<li class="sessions__empty">Aucun numéro connecté pour l\'instant.</li>';
    return;
  }
  sessionList.innerHTML = sessions
    .map(
      (s) => `
      <li>
        <span>+${s.number}</span>
        <span class="pill ${s.status === "connected" ? "pill--connected" : ""}">${s.status}</span>
      </li>`
    )
    .join("");
}

socket.on("session:list", renderSessions);

socket.on("session:update", (payload) => {
  if (payload.type === "pairingCode") {
    codeBox.hidden = false;
    codeValue.textContent = payload.code;
    setStatus("pending", "Code généré — saisis-le dans WhatsApp.");
  }

  if (payload.type === "connected") {
    setStatus("ok", `Numéro +${payload.number.replace(/\D/g, "")} connecté avec succès.`);
    codeBox.hidden = true;
    submitBtn.disabled = false;
    form.reset();
  }

  if (payload.type === "disconnected") {
    setStatus("error", payload.loggedOut ? "Session déconnectée." : "Connexion perdue, nouvelle tentative…");
    submitBtn.disabled = false;
  }

  if (payload.type === "error") {
    setStatus("error", payload.message);
    submitBtn.disabled = false;
  }

  // Rafraîchit la liste des numéros connectés
  fetch("/api/sessions").then((r) => r.json()).then(renderSessions);
});
