# blocks.system development system

Status: canonieke structuur uitgevoerd op 2 augustus 2026.

## Topologie

- `blocks.system.mjs` is de canonieke dependency-free ESM-bron.
- `blocks.system.min.mjs` wordt uitsluitend door `npm run build:min` gemaakt.
- `blocks.system.css` bevat alleen herbruikbare surface-, block- en state-CSS.
- `index.html` is de voordeur met één echt blocks-systeem.
- `docs/index.html` is de levende manual op de canonieke route `/docs/`.
- `docs/api.html` is de volledige, niet-versleepbare reference.
- `examples/<naam>/` is zelfstandig, uitvoerbaar en kopieerbaar.
- `docs/blocks.system.manifest.json` wordt door `npm run manifest` gemaakt.

`docs/shell.mjs` bezit uitsluitend gedeelde docsfuncties: navigatie, actieve
anchors, `nodeFromHtml()` en hele-pixelkwantisering. Home, manual en reference
bezitten elk hun eigen compositie-CSS en ESM; niets daarvan lekt naar de core.

## Publieke routes

| Route | Eigenaar |
|---|---|
| `/` | productbelofte en één levende proof |
| `/docs/` | start, compose, arrange, connect, examples en boundary |
| `/docs/api.html` | exacte API, errors, definition shape en CSS-hooks |
| `/examples/<naam>/` | zelfstandige uitvoer en downloadbare module |

`manual.html`, `system.html`, `examples.html`, de drie oude guidepagina's en
`about.html` zijn blijvende HTTP-200-aliases. Ze vervangen de browserhistory
naar één vast anchor op `/docs/` en houden een gewone fallbacklink.

## Documentatiecontract

Wanneer publiek gedrag verandert, controleer in dezelfde commit:

1. `README.md` en `README_NL.md`;
2. de relevante manual- en referenceblocks;
3. de drie standalone examples;
4. contract-, link- en browsertests;
5. het gegenereerde manifest wanneer exports of versie veranderen.

De stabiele geavanceerde stijlhaken staan in de reference:
`.blocks-system-surface`, `.blocks-system-object`, `.blocks-system-menu`,
`.blocks-system-content` en de publieke `data-*`-states. Docsclasses zijn geen
library-API.

## Lokale verificatie

```powershell
npm install
npm run check
git diff --check
```

`npm run check` bouwt source/min-pariteit en manifest, controleert lokale links
en opent echte Chromium. Home, manual en reference worden gemeten op 1440,
1280, 1024, 800, 390 en 320 CSS-pixels bij DPR 1 en 2. Dezelfde test bedient
drag, keyboard reorder, lock, reset, anchorstatus, canvasresize, videopause en
alle zeven legacy aliases.

Open daarna `http://localhost/blocks.system/`, `/docs/` en
`/docs/api.html` voor de menselijke eindcontrole. Apache draait hier als
`NT AUTHORITY\SYSTEM`; geef eventuele gitcalls vanuit PHP daarom
`-c safe.directory=*` mee.

## Publicatie

Werk volgens de lokale `AGENTS.md`: projectwerk gebeurt hier op `main`, commit
alleen op verzoek en push nooit zonder expliciete toestemming. Voor publicatie:

1. draai `npm run check` en `git diff --check`;
2. stage uitsluitend bedoelde publieke bestanden;
3. push alleen na Sebs expliciete opdracht;
4. verifieer daarna live home, manual, reference, examples en manifest;
5. maak pas een versie-tag wanneer de publieke API klaar is om via jsDelivr te
   pinnen.
