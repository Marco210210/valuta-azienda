# Valuta Azienda

Strumento per confrontare offerte di lavoro mettendo insieme due cose:

1. **Criteri qualitativi** che scegli tu (esperienza, crescita, ambiente...), ognuno con un voto da 1 a 10 e un **peso in %** (la somma dovrebbe fare 100).
2. **I numeri reali**: stipendio netto, casa/affitto, spesa, e gli **spostamenti** (resto a casa, auto con km x giorni x EUR/km, oppure treno/abbonamento).

Il programma calcola quanto ti **resta davvero in tasca** ogni mese e lo combina con il punteggio qualitativo per darti una classifica e una scelta consigliata. Puoi anche decidere **quanto pesano i soldi** rispetto alla qualità.

## Come si usa in locale

Servono **Node.js 18+** e npm.

```bash
npm install
npm run dev
```

L'app si apre su `http://localhost:5173`.

Per creare la versione ottimizzata:

```bash
npm run build
npm run preview
```

## Pubblicazione gratis con GitHub Pages

Questo progetto è già pronto per GitHub Pages:

- `vite.config.js` usa `base: '/valuta-azienda/'`, corretto per un repository GitHub chiamato `valuta-azienda`.
- `.github/workflows/deploy.yml` compila e pubblica automaticamente il contenuto di `dist` a ogni push su `main`.

Passaggi:

1. Crea un repository vuoto su GitHub chiamato `valuta-azienda`.
2. Da questa cartella, inizializza git e fai il primo commit:

```bash
git init
git branch -M main
git add .
git commit -m "Initial site"
```

3. Collega il repository remoto, sostituendo `TUO_USERNAME`:

```bash
git remote add origin https://github.com/TUO_USERNAME/valuta-azienda.git
git push -u origin main
```

4. Su GitHub apri il repository, poi vai in **Settings > Pages**.
5. In **Build and deployment**, imposta **Source** su **GitHub Actions**.
6. Aspetta che l'action `Deploy to GitHub Pages` finisca.

Il sito sarà disponibile a:

```text
https://TUO_USERNAME.github.io/valuta-azienda/
```

## Note

- I dati vengono salvati **solo nel tuo browser** (`localStorage`): chiudi e riapri, ritrovi tutto. Niente esce dal tuo computer.
- Il pulsante "Ricomincia dall'esempio" azzera tutto e ricarica i dati di partenza.

## Come viene calcolato il punteggio

- **Costi totali** = casa + spesa + altri costi + trasporti
  (trasporti in auto = km x 2 x giorni in sede x EUR/km; mezzi = costo mensile)
- **Resta in tasca** = stipendio netto - costi totali
- **Punteggio qualità** = media dei voti pesata sui pesi dei criteri (su 10)
- L'economia viene normalizzata tra le aziende (la migliore = 100), la qualità su scala assoluta (voto/10 x 100), e le due parti si combinano con il peso che scegli tu.
