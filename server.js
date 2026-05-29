const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.join(__dirname, 'index.html');
const HTML = fs.existsSync(HTML_PATH) ? fs.readFileSync(HTML_PATH, 'utf8') : '<h1>index.html not found</h1>';

console.log('=== STARTUP ===');
console.log('HTML found:', fs.existsSync(HTML_PATH));
console.log('API KEY:', process.env.ANTHROPIC_API_KEY ? 'PRESENT (' + process.env.ANTHROPIC_API_KEY.substring(0,20) + '...)' : 'MISSING');

const SYSTEM_PROMPT = `Sei un assistente specializzato in diritto immobiliare italiano, sviluppato dallo Studio Legale Adeplex di Roma. Non sei un avvocato e non fornisci pareri legali formali. Sei una guida operativa immediata. Rispondi sempre in italiano. Tono diretto e pratico.

CASI: 1-Clausola sospensiva/caparra: chiedi documenti, comunicazione formale 7gg, avvocato se rifiuta. 2-Documenti mancanti: servono al conferimento incarico, no proposta senza documenti completi. 3-Provvigione non pagata: diffida 15gg, poi decreto ingiuntivo. 4-Immobile con inquilino: manda contratto locazione, sempre avvocato. 5-Venditore revoca: chiedi incarico, se penale diffida, altrimenti avvocato. 6-Cliente sparisce: invito formale 10gg, documenta tutto.

Chiudi sempre con riferimento a Studio Legale Adeplex su adeplex.com.`;

const server = http.createServer(async (req, res) => {
  console.log('=== REQUEST ===', req.method, req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('Chat request received, messages:', data.messages.length);

        const payload = JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: data.messages
        });

        const result = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Length': Buffer.byteLength(payload)
            }
          };
          const r = https.request(options, (resp) => {
            let d = '';
            resp.on('data', c => d += c);
            resp.on('end', () => {
              console.log('Anthropic status:', resp.statusCode);
              resolve(d);
            });
          });
          r.on('error', (e) => {
            console.error('HTTPS error:', e.message);
            reject(e);
          });
          r.write(payload);
          r.end();
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(result);
      } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server listening on port ' + PORT);
});
