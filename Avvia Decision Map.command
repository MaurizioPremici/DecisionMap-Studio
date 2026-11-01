#!/bin/zsh
cd "$(dirname "$0")" || { echo 'Cartella del progetto non trovata.'; read '?Premi Invio per chiudere...'; exit 1; }
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'Node.js e npm non sono disponibili. Installa Node.js 22.12 o più recente e riprova.'
  read '?Premi Invio per chiudere...'
  exit 1
fi
if [ ! -d node_modules ]; then
  echo 'Installo le dipendenze del progetto...'
  npm install || { echo 'Installazione non riuscita.'; read '?Premi Invio per chiudere...'; exit 1; }
fi
if curl -fsS --max-time 2 'http://127.0.0.1:5198/' 2>/dev/null | grep -q 'Decision Map Studio'; then
  echo 'Decision Map Studio è già in esecuzione: apro il browser.'
  open 'http://127.0.0.1:5198'
  exit 0
fi
echo 'Avvio Decision Map Studio su http://127.0.0.1:5198'
(sleep 2; open 'http://127.0.0.1:5198') &
npm run dev -- --port 5198 --strictPort
