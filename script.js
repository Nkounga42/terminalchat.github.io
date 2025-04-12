// Gestion du thème
const terminal = document.getElementById("terminal");
const arrowSpan = `<span class="terminal-arrow">>>></span>`;
const savedTheme = ""; //localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;

const themes = {
  light: "",
  dark: "dark-theme",
  blueDark: "theme-dark-blue",
  dracula: "theme-dracula",
  solarizedDark: "theme-solarized-dark",
  solarizedLight: "theme-solarized-light",
  gruvboxLight: "theme-gruvbox-light",
  gruvboxDark: "theme-gruvbox-dark",
  monokaiLight: "theme-monokai-light",
  monokaiDark: "theme-monokai-dark",
  nord: "theme-nord",
  matrix: "theme-matrix",
};

function setTheme(themeName) {
  terminal.className = "";

  terminal.className = themeName;
  console.log(themeName);
  localStorage.setItem("theme", themeName);
}
//setTheme('red-theme')

let username = ""; 
const wsUrl = `ws://${window.location.host}/ws`; // Or similar 192.168.1.78:3000
const ws = new WebSocket(wsUrl);
const userColors = {}; 
const colorPalette = [
  "#ff5555",
  "#55ff55",
  "#5555ff",
  "#ffff55",
  "#ff55ff",
  "#55ffff",
  "#ffaa00",
  "#aa00ff",
  "#00aaff",
  "#aaff00",
]; // Palette de couleurs pour les utilisateurs

const usernameForm = document.getElementById("username-form");
const usernameInput = document.getElementById("username");
const inputForm = document.getElementById("input-form");
const input = document.getElementById("input");
const output = document.getElementById("output");

// Fonction pour obtenir une couleur unique pour chaque utilisateur
function getUserColor(username) {
  if (!userColors[username]) {
    // Génère un index de couleur basé sur le hash du nom d'utilisateur
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorPalette.length;
    userColors[username] = colorPalette[index];
  }
  return userColors[username];
}

// Fonction pour détecter et transformer les URLs en liens
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g || /(www\.[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank">${url}</a>`;
  });
}

// Chargement de l'historique au démarrage

function initHystory() {
  // Récupération de l'historique des messages
  fetch("/Api/messages/json")
    .then((res) => res.json())
    .then((data) => {
      data.forEach((msg) => {
        if (msg.type === "message") {
          printUserMessage(msg.from, msg.content, msg.sendingTime);
        }
      });
    })
    .catch((err) => {
      console.error("Erreur lors du chargement de l'historique :", err);
    });
}
function hasHTML(text) {
  const hasHTML = /<[^>]+>/g.test(text); // Vérifie si le texte contient des balises HTML
  return hasHTML;
}

//Réception des messages en temps réel
ws.addEventListener("message", async (event) => {
  const text =
    event.data instanceof Blob ? await event.data.text() : event.data;
  try {
    const msg = JSON.parse(text);
    if (msg.type === "message") {
      printUserMessage(msg.from, msg.content, msg.sendingTime);
    }
  } catch (e) {
    console.error("Erreur de parsing côté client :", text);
  }
});

ws.addEventListener("open", () => {
  if (username) {
    ws.send(JSON.stringify({ type: "setUsername", username }));
  }
});

// Soumission du nom d'utilisateur
usernameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (usernameInput.value.trim() === "") return;

  username = usernameInput.value.trim();
  ws.send(JSON.stringify({ type: "setUsername", username }));

  printLine(
    `${arrowSpan} Bienvenue, <span style="color: ${getUserColor(
      username
    )}">${username}</span> !`,
    true
  );
  printLine(` `);

  usernameForm.style.display = "none";
  inputForm.style.display = "flex";
  input.focus();
  initHystory();
});

// Envoi d'un message
inputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim() === "") return;
  if (input.value.trim() === "/help") {
    printLine(
      `${arrowSpan} <span class="terminal-banner">Commandes disponibles : </span>`
    );
    printLine(
      `${arrowSpan} <span class="terminal-banner">/help : Afficher cette aide</span>`
    );
  } else if (input.value.trim() === "/clear") {
    output.innerHTML = "";
  } else if (input.value.trim().startsWith("/theme:")) {
    const themeName = input.value.substring(7).trim();
    setTheme(themeName);
    printLine(
      `${arrowSpan} <span class="terminal-banner">Thème actuel : ${terminal.className}</span>`,
      true
    );
  } else if (input.value.trim() === "/theme list") {
    printLine(
      `${arrowSpan} <span class="terminal-banner">Liste des thèmes disponibles : </span>`
    );
    Object.keys(themes).forEach((theme) => {
      printLine(`${arrowSpan} <span class="terminal-banner">${theme}</span>`);
    });
  } else {
    const now = new Date();
    const formattedDate = now.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const message = {
      type: "message",
      content: input.value,
      sendingTime: formattedDate,
    };

    ws.send(JSON.stringify(message));
  }
  input.value = "";
});

function printUserMessage(user, message, time) {
  const userColor = getUserColor(user);
  const userSpan = `<span class="terminal-banner">${arrowSpan} <span style="color: ${userColor}">${user}</span></span>`;
  const timePart = time ? `<span class="terminal-time"> ${time}</span>` : "";
  
  const messageBoxElement = document.createElement("div");
  let messageContent, messageBox
  
  if (!hasHTML(message)) {
    messageContent = linkify(message);
    messageBox = userSpan + timePart + `<div class='message-content'>${messageContent}</div>`;
  } else {
    // Échapper le HTML pour l'afficher comme texte
    messageContent = escapeHtml(message);
    messageBox = userSpan + timePart + `<div class='pre-container'><div id="line-numbers">1</div><pre>${formatCodeText(messageContent)}</pre></div>`;
  }
  
  messageBoxElement.innerHTML = messageBox;
  messageBoxElement.className = "messageBox";
  output.appendChild(messageBoxElement);
}

// Fonction pour échapper les caractères HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printLine(text, isHTML = false) {
  const line = document.createElement("div");
  if (isHTML) {
    line.innerHTML = text;
  } else {
    line.textContent = text;
  }
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function initApp() {
  usernameForm.style.display = "flex";
  inputForm.style.display = "none";
  usernameInput.focus();
}

const pre = document.querySelector('pre');
const lineNumbers = document.getElementById('line-numbers');

function updateLineNumbers() {
  
  // Compter le nombre de lignes dans le output
  const lineCount = pre.textContent.split('\n').length;
  
  // Générer les numéros de ligne
  let numbersText = '';
  for (let i = 1; i <= lineCount; i++) {
    numbersText += i + '\n';
  }
  
  lineNumbers.textContent = numbersText ;
}
function formatCodeText(text) {
  
  // Remplacer les doubles espaces par des espaces insécables
  let formattedText = text.replace(/  /g, ' \u00A0');
  
  // Appliquer la coloration syntaxique basique (exemple)
  formattedText = formattedText.replace(/"(.*?)"/g, '<span class="string">"$1"</span>');
  formattedText = formattedText.replace(/\b(function|if|else|return|var|let|const)\b/g, '<span class="keyword">$1</span>');
  
  // Mettre à jour le contenu
  updateLineNumbers();
  return formattedText;
  
  // Mettre à jour les numéros de ligne
}

// Observer les changements dans l'output pour mettre à jour automatiquement
// const observer = new MutationObserver(updateLineNumbers);
// observer.observe(document.getElementById('output'), {
//   childList: true,
//   subtree: true,
//   characterData: true
// });

 
updateLineNumbers();

initApp();
