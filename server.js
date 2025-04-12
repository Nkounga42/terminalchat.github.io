const WebSocket = require('ws');
const express = require('express'); 
const { v4: uuidv4 } = require('uuid');

const app = express();
 
const server = app.listen(3000, '192.168.1.78', () => {
  console.log('🌐 Serveur lancé sur http://192.168.1.78:3000');
});

const wss = new WebSocket.Server({ server });

let messages = []; // 🔥 Historique en mémoire

wss.on('connection', ws => {
  ws.id = uuidv4();
  ws.username = null;

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'setUsername') {
        ws.username = msg.username;
        return;
      }

      if (msg.type === 'message') {
        const fullMessage = {
          type: 'message',
          from: ws.username || 'Anonyme',
          id: ws.id,
          content: msg.content,
          sendingTime: msg.sendingTime || new Date().toISOString()
        };

        messages.push(fullMessage); // 📝 On stocke le message

        const payload = JSON.stringify(fullMessage);

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
    } catch (e) {
      console.error('Erreur de message JSON reçu :', data);
      console.error(e);
    }
  });
});

// 📦 Route API pour récupérer les messages
app.get('/messages/json', (req, res) => {
  res.json(messages);
});

// 📂 Sert les fichiers HTML/CSS/JS
app.use(express.static(__dirname));
