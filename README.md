# Fab o foundry?

Sito statico per il project work di Business Management (Ingegneria Meccanica, a.a. 2026/27) su STMicroelectronics. Contiene due strumenti interattivi (make or buy e leva operativa) e una tabella di confronto tra ST, NVIDIA e TSMC.

Non serve installare nulla: sono tre file (`index.html`, `style.css`, `app.js`) che il browser apre direttamente. Il sito usa internet solo per scaricare Chart.js e i font; i calcoli avvengono nel browser.

## Come pubblicarlo su GitHub Pages

Serve un account GitHub gratuito. Il repository deve essere **pubblico**: con il piano gratuito GitHub Pages funziona solo così.

### 1. Crea il repository

1. Accedi a [github.com](https://github.com) e clicca **New** (o il `+` in alto a destra, poi **New repository**).
2. In **Repository name** scrivi `fab-o-foundry`.
3. Scegli **Public**.
4. Clicca **Create repository**. Non serve aggiungere README o altri file.

### 2. Carica i file

1. Nella pagina del repository appena creato clicca **uploading an existing file** (oppure **Add file → Upload files**).
2. Trascina dentro `index.html`, `style.css`, `app.js` e `README.md`.
3. `index.html` deve stare **nella cartella principale** del repository, non dentro una sottocartella.
4. In fondo alla pagina clicca **Commit changes**.

*Alternativa da terminale*, dalla cartella con i file:

```bash
git init -b main
git add index.html style.css app.js README.md
git commit -m "Sito Fab o foundry?"
git remote add origin https://github.com/TUO-UTENTE/fab-o-foundry.git
git push -u origin main
```

### 3. Attiva GitHub Pages

1. Nel repository clicca **Settings** (scheda in alto).
2. Nel menu a sinistra clicca **Pages**.
3. In **Build and deployment**, alla voce **Source**, scegli **Deploy from a branch**.
4. In **Branch** scegli `main` e la cartella `/ (root)`, poi clicca **Save**.

### 4. Ottieni il link pubblico

1. Aspetta uno o due minuti, poi ricarica la pagina **Settings → Pages**.
2. In alto compare il messaggio **Your site is live at …** con il link.
3. Il link ha questa forma, con il tuo nome utente GitHub al posto di `TUO-UTENTE`:

   ```
   https://TUO-UTENTE.github.io/fab-o-foundry/
   ```

4. Apri il link, controlla che grafici e cursori funzionino e copialo nel project work.

## Come aggiornare il sito

- **Dal sito GitHub:** apri il file, clicca la matita (**Edit**), modifica e clicca **Commit changes**. Dopo uno o due minuti la pagina pubblica si aggiorna.
- **Dal terminale:** modifica i file, poi `git add .`, `git commit -m "Aggiornamento"` e `git push`.

## Come inserire i dati reali nella tabella di confronto (Sezione 3)

Apri `app.js` e cerca `COMPARISON_DATA` all'inizio del file. Ogni riga ha tre valori (`st`, `nvidia`, `tsmc`): sostituisci `null` con il dato scritto come testo.

```js
{ id: 'revenue', label: 'Ricavi', values: { st: '13,3 mld $', nvidia: null, tsmc: null } },
```

Per un link nella riga **Fonte** usa un oggetto:

```js
st: { text: 'Bilancio 2024', url: 'https://…' }
```

Le celle con `null` mostrano «—». Inserisci sempre anche **anno di riferimento** e **fonte** dei dati.

## Provarlo sul proprio computer

Basta aprire `index.html` con un doppio clic. Se preferisci un piccolo server locale, dalla cartella con i file:

```bash
python3 -m http.server 8000
```

e apri `http://localhost:8000`.

## Se qualcosa non funziona

- **Errore 404 sul link:** aspetta qualche minuto dopo il primo salvataggio; controlla che il repository sia pubblico, che in **Settings → Pages** sia selezionato il branch `main` con cartella `/ (root)` e che `index.html` sia nella cartella principale.
- **Pagina senza stile o senza grafici:** verifica la connessione a internet (Chart.js e font arrivano da cdnjs e Google Fonts) e che i nomi dei file siano esattamente `style.css` e `app.js`, tutti minuscoli.
- **Modifiche che non si vedono:** ricarica la pagina forzando la cache (`Ctrl+Shift+R`, su Mac `Cmd+Shift+R`).

## Note sui contenuti

- I parametri dei due strumenti sono **illustrativi**: mostrano il meccanismo economico, non stimano i costi reali di ST.
- Gli unici dati reali sono quelli di ST per il 2024 e il 2025, con la fonte indicata nella pagina.
- Riferimenti teorici: R. Coase, *The Nature of the Firm* (1937); O. Williamson, *The Economic Institutions of Capitalism* (1985).
