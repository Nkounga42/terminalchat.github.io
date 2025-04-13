 
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
const wsUrl = `http://192.168.1.78:3000/Api/messages/json`; // Or similar 
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
usernameForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const enteredUsername = usernameInput.value.trim();
  const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]{1,18}[a-zA-Z0-9])?$/;

  if (!enteredUsername) {
    showError("Erreur : le nom d'utilisateur ne peut pas être vide.");
    return;
  }
  
  if (!usernameRegex.test(enteredUsername) || enteredUsername.length < 3) {
    showError(
      "Erreur : nom d'utilisateur invalide. Utilisez entre 3 et 20 caractères (lettres, chiffres, tirets ou underscores, sans espace, sans commencer/finir par un symbole)."
    );
    return;
  }else{

    username = enteredUsername;
  
    const payload = {
      type: "setUsername",
      username: username,
    };
    ws.send(JSON.stringify(payload));
  
    const coloredUsername = `<span style="color: ${getUserColor(username)}">${username}</span>`;
    printLine(`${arrowSpan} Bienvenue, ${coloredUsername} !`, true);
  }
  


  usernameForm.style.display = "none";
  inputForm.style.display = "flex";
  input.focus();

  initHystory(); // Corrige si c'est initHistory()
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
    messageBox = userSpan + timePart + `<div class='pre-container'><div id="line-numbers">1</div><pre>${prettifyHTML(messageContent)}</pre></div>`;
  }
  
  messageBoxElement.innerHTML = messageBox;
  messageBoxElement.className = "messageBox";
  output.appendChild(messageBoxElement);
}

 
function showError(message) {
  const terminal = document.getElementById("terminal");

  // Supprime le précédent message d'erreur si présent
  const previousError = terminal.querySelector(".error-line");
  if (previousError) terminal.removeChild(previousError);

  const errorLine = document.createElement("div");
  errorLine.className = "error-line ";
  errorLine.innerHTML = `${arrowSpan} <span style="color: red;">${message}</span>`;
  output.appendChild(errorLine);
  output.scrollTop = terminal.scrollHeight;
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
  // Sélectionner tous les conteneurs de message avec du code HTML
  const preContainers = document.querySelectorAll('.pre-container');
  
  preContainers.forEach(container => {
    const pre = container.querySelector('pre');
    const lineNumbers = container.querySelector('#line-numbers');
    
    if (pre && lineNumbers) {
      // Compter le nombre de lignes dans le pre
      const lineCount = pre.textContent.split('\n').length;
      
      // Générer les numéros de ligne
      let numbersText = '';
      for (let i = 1; i <= lineCount; i++) {
        numbersText += i + '\n';
      }
      
      lineNumbers.textContent = numbersText;
    }
  });
}
function beautifyNode(node, indent = 0) {
  const indentStr = '  '.repeat(indent);
  let result = '';

  if (node.nodeType === Node.TEXT_NODE) {
    const trimmed = node.textContent.trim();
    if (trimmed) {
      result += indentStr + trimmed + '\n';
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();
    const attrs = [...node.attributes].map(attr => `${attr.name}="${attr.value}"`).join(' ');
    const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
    result += indentStr + openTag + '\n';

    node.childNodes.forEach(child => {
      result += beautifyNode(child, indent + 1);
    });

    result += indentStr + `</${tagName}>\n`;
  }

  return result;
}

function prettifyHTML(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const body = doc.body;

  let result = '';
  body.childNodes.forEach(child => {
    result += beautifyNode(child);
  });

  return result.trim();
}
 

 

 
updateLineNumbers();

initApp();