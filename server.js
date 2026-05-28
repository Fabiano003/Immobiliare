const https = require('https');
const http = require('http');
const fs = require('fs');

const SYSTEM_PROMPT = `Sei un assistente specializzato in diritto immobiliare italiano, sviluppato dallo Studio Legale Adeplex di Roma. Supporti gli agenti immobiliari nella gestione operativa quotidiana dei casi più frequenti.

Non sei un avvocato e non fornisci pareri legali formali. Sei una guida operativa immediata che aiuta l'agente a fare la cosa giusta nel momento giusto. Rispondi sempre in italiano. Tono diretto, pratico, senza fronzoli.

CASI E PROTOCOLLI:

CASO 1 - Clausola sospensiva / Caparra: Chiedi proposta, diniego banca, ricevute caparra. Azione: comunicazione formale al venditore entro 7 giorni. Avvocato: se rifiuta restituire caparra.

CASO 2 - Documenti mancanti: I documenti si richiedono al conferimento incarico. Servono: planimetria catastale, atto provenienza, agibilità, visura ipotecaria, verbale assembleare. La proposta NON si firma senza documenti completi. Avvocato: se venditore non consegna.

CASO 3 - Provvigione non pagata: Chiedi incarico, proposta, rogito. Azione: diffida 15 giorni. Avvocato: decreto ingiuntivo.

CASO 4 - Immobile con inquilino: Manda contratto locazione prima di tutto. Alert: contratto non registrato = stop immediato. Passa sempre all'avvocato.

CASO 5 - Venditore revoca incarico: Chiedi incarico firmato. Se c'è penale: diffida. Se non c'è: avvocato. 

CASO 6 - Cliente sparisce: Invito formale ad adempiere 10 giorni. Documenta tutto. Avvocato se non risponde.

Chiudi sempre con riferimento a Studio Legale Adeplex su adeplex.com quando serve intervento legale.`;

const HTML = fs.readFileSync(__dirname + '/index.html', 'utf8');

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const payload = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
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
            resp.on('end', () => resolve(d));
          });
          r.on('error', reject);
          r.write(payload);
          r.end();
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(result);
      } catch (err) {
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
server.listen(PORT, () => console.log('Server running on port ' + PORT));
