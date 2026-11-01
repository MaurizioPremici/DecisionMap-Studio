# Decision Map Studio

Editor locale per mappe decisionali, alberi, mappe mentali e diagrammi. Funziona nel browser o come applicazione desktop per macOS, Windows e Linux. I progetti restano salvati localmente nell'installazione usata.

## Installazione desktop

Scarica il file per il tuo sistema dalla pagina [Releases di Decision Map Studio](https://github.com/MaurizioPremici/DecisionMap-Studio/releases):

- **Windows:** installer `.exe` (x64).
- **Linux:** `.AppImage` o `.deb` (x64). Rendi eseguibile l'AppImage con `chmod +x nome-file.AppImage`.
- **macOS:** `.dmg` per Apple Silicon (arm64) o Intel (x64).

I pacchetti sono costruiti da GitHub Actions a ogni tag `v*` tramite `electron-builder`. Non sono firmati digitalmente; macOS e Windows possono mostrare un avviso prima dell'apertura. Per portare le mappe dal browser all'app desktop, esportale in JSON dal browser e importale nell'app: i due ambienti hanno archivi locali distinti.

## Compilare dal sorgente

Requisiti: **Node.js 22.12 o successivo** e npm. Scarica il [sorgente della versione v1.1.1](https://github.com/MaurizioPremici/DecisionMap-Studio/tree/v1.1.1) oppure clona il repository. Nella cartella del progetto esegui:

```sh
npm ci
npm run build
npm run dist
```

`npm run dist` crea nella cartella `release/` il pacchetto per il sistema su cui esegui il comando: `.dmg` su macOS, `.exe` su Windows, `.AppImage` e `.deb` su Linux. Per aprire l'app dal sorgente senza creare un installer, usa `npm run desktop`. Per la sola versione web, usa `npm run dev`.

## Avvio della versione web

Su macOS puoi fare doppio clic su `Avvia Decision Map.command` per aprire l'app nel browser su `http://127.0.0.1:5198`. In alternativa, esegui `npm ci` e `npm run dev`, poi apri l'indirizzo locale stampato. Dopo l'installazione delle dipendenze l'app non richiede Internet.

Per produrre la versione statica esegui `npm run build`; i file sono in `dist/`. Per avviare l'app desktop dal codice sorgente esegui `npm run desktop`. Per creare un pacchetto per il sistema corrente esegui `npm run dist`.

## Uso rapido

- Al primo avvio scegli **Progetto vuoto** o **Progetto dimostrativo**.
- Crea un nodo dalla toolbar, con `N` o con il tasto destro sul canvas. Se un nodo è selezionato, il pulsante **Nodo** crea un figlio.
- Seleziona un nodo e usa **+ Figlio**, **+ Fratello** e **+ Genitore** nel pannello. Trascina i nodi per spostarli e usa le maniglie per ridimensionarli.
- Fai doppio clic su un nodo per modificarne il titolo. Il pannello modifica anche testo multilinea, font, forma, colori, bordi e dimensioni.
- Trascina da un punto di connessione a un altro nodo per aggiungere un collegamento di riferimento. La gerarchia padre/figlio è distinta e si gestisce con i pulsanti dedicati.
- Seleziona **Disegna** o premi `D` per annotare liberamente il canvas. Scegli colore e spessore nella piccola barra e premi **Fine** per uscire. I tratti vengono salvati nel progetto, esportati in PNG/SVG e possono essere annullati con `⌘Z`/`Ctrl+Z`.
- Seleziona un tratto già disegnato per cambiarne colore e spessore oppure eliminarlo.
- Il lucchetto nei controlli di zoom blocca nodi, collegamenti, disegno e pannello proprietà; premi di nuovo per sbloccare.
- Seleziona una linea tra genitore e figlio per scegliere il tracciato **Retta**, **Curva** o **Ortogonale** nel pannello delle proprietà.
- Usa `+` e `−` sul nodo per chiudere e aprire i discendenti. **Auto Layout** dispone la gerarchia soltanto quando lo richiedi.
- `⌘Z` annulla, `⌘⇧Z` ripristina, `⌘D` duplica, `⌘C` copia un nodo e `⌘V` incolla; `Delete` elimina la selezione. La ricerca porta al nodo trovato.
- Il salvataggio locale è automatico. Da **Progetti** puoi aprire, rinominare, duplicare, importare ed esportare. Esporta periodicamente un JSON per avere una copia esterna al browser.

L'esportazione PNG/SVG include l'intero grafico visibile, indipendentemente dallo zoom. I file JSON conservano l'intero progetto, compresi nodi chiusi e posizioni. Per mappe enormi il PNG viene ridotto a un lato massimo di 4096 px; l'SVG resta vettoriale.
