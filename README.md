# OWEN TOXICO XMD — Bot WhatsApp multi-device

Site d'appairage + bot WhatsApp (recherche web, anti-spam) basé sur [Baileys](https://github.com/WhiskeySockets/Baileys).

## Installation

```bash
npm install
npm start
```

Le serveur démarre sur `http://localhost:3000`.

## Utilisation

1. Ouvre `http://localhost:3000` dans un navigateur.
2. Choisis le pays, entre le numéro WhatsApp à connecter (le tien, ou celui du bot).
3. Un code d'appairage à 8 caractères s'affiche.
4. Sur le téléphone : **WhatsApp → Paramètres → Appareils liés → Lier un appareil → Lier avec un numéro de téléphone** → saisir le code.
5. Une fois connecté, le numéro répond aux commandes dans les chats :
   - `.menu` — liste des commandes
   - `.ping` — test de vie
   - `.search <question>` — recherche web (via l'API DuckDuckGo, sans clé requise)
   - Anti-spam automatique dans les groupes : les liens envoyés par des non-admins sont supprimés (3 avertissements avant exclusion).

## Structure du projet

```
src/
  server.js              → serveur Express + Socket.io (API d'appairage, statut temps réel)
  lib/sessionManager.js   → connexion Baileys, un socket par numéro, reconnexion auto
  lib/messageHandler.js   → routage des messages entrants (commandes + anti-spam)
  commands/search.js      → commande .search
  commands/antispam.js    → logique anti-lien / anti-flood
public/
  index.html, style.css, script.js → interface d'appairage
session/                  → identifiants WhatsApp persistés (un dossier par numéro)
```

## Personnaliser

- **Ajouter une commande** : crée un fichier dans `src/commands/`, importe-le et ajoute un `case` dans le `switch` de `messageHandler.js`.
- **Changer le moteur de recherche** : remplace le contenu de `commands/search.js` par l'appel à l'API de ton choix (Bing, Serper, Google Custom Search…).
- **Persister les avertissements anti-spam** : `commands/antispam.js` utilise une `Map` en mémoire ; pour un usage multi-groupes en production, remplace-la par une vraie base (SQLite, Redis…).

## Important

- Ce bot utilise le **protocole WhatsApp multi-appareils non officiel**. WhatsApp peut suspendre des numéros qui envoient un volume de messages inhabituel ou qui sont signalés — utilise un numéro dédié, pas ton numéro personnel principal, et reste raisonnable sur le volume de messages automatisés.
- Le dossier `session/` contient les identifiants de connexion de chaque numéro : ne le partage jamais et ajoute-le à `.gitignore` si tu mets ce projet sous Git.
