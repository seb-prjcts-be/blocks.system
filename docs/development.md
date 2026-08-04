# blocks.system development system

Status: canonieke structuur uitgevoerd op 3 augustus 2026.

## Topologie

- `blocks.system.mjs` is de canonieke dependency-free ESM-bron.
- `blocks.system.min.mjs` wordt uitsluitend door `npm run build:min` gemaakt.
- `blocks.system.css` is het afzonderlijk gepubliceerde librarycontract en bevat
  alleen herbruikbare surface-, block- en state-CSS.
- `docs/style.css` is de enige sitecascade voor home, manual, reference en alle
  examples. Iedere canonieke pagina laadt eerst de library-CSS en daarna dit
  consumerbestand, elk exact één keer.
- `docs/alias.css` blijft bewust apart: de zeven kleine redirectpagina's zijn
  een zelfstandige, lichte leveringsroute en laden geen volledige sitecascade.
- `index.html` is de voordeur met één echt blocks-systeem.
- `docs/index.html` is de levende manual op de canonieke route `/docs/`.
- `docs/api.html` is de volledige, niet-versleepbare reference.
- `docs/content.json` bezit alle zichtbare inhoud van de 35 levende docblocks:
  3 op home, 22 in de manual en 10 in de reference. Titels, uitleg, termen,
  toegankelijke labels, links en codevoorbeelden staan daar. De JSON spiegelt
  block-ID's alleen als koppelsleutel; de canonieke ID-lijst, volgorde, layout,
  DOM-opbouw, gedrag en lifecycle blijven bij de betreffende docscompositie.
  Navigatie, paginametadata, toolbars en footers blijven in semantische HTML.
  De library leest dit bestand niet.
- `examples/<naam>/` is zelfstandig, uitvoerbaar en kopieerbaar.
- `docs/blocks.system.manifest.json` wordt door `npm run manifest` gemaakt.

`docs/shell.mjs` bezit uitsluitend gedeelde docsfuncties: navigatie, één
gecachete en streng gevalideerde contentloader en hele-pixelkwantisering. De
loader weigert ontbrekende én ongebruikte block-ID's. De gedeelde CSS-shell
staat onder `.docs-*`; home, manual, reference en examples voegen in
`docs/style.css` alleen hun eigen delta toe. Hun ESM-composities blijven
afzonderlijk en niets daarvan lekt naar de core.

## Publieke routes

| Route | Eigenaar |
|---|---|
| `/` | productbelofte en één levende proof |
| `/docs/` | start, resultaat, layout, kleuren, random variatie en vervolgstappen |
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

## Compositiecontract

- Iedere canonieke docspagina gebruikt één direct blocks-systeem; voeg geen
  geneste grids of overkoepelende vensters toe.
- Cirkel betekent toestand, rechthoek inhoud en driehoek richting.
- Lege ruimte maakt hiërarchie zichtbaar en is geen uitnodiging om extra
  onderdelen toe te voegen.
- De huidige docscompositie kiest zelf cyan, magenta en geel naast zwart, warm
  papier en veldgrijs. Dat CMY-voorbeeld is geen library-palet.
- Paginaspecifieke compositie, kwantisering en mediagedrag blijven buiten de
  librarycore.
- Gedeelde beginstate en menuknoppen worden éénmaal bij `createBlocksSystem()`
  ingesteld; ids, titels en afwijkende layout blijven eigendom van ieder block.
- `colorArray` en `colorVariation` bepalen het kleurdeel van nieuwe `random`
  blocks. `inversionVariation` verdeelt daarna alleen het overblijvende
  monochrome deel tussen `regular` en `inverse`. Ze verkleuren bestaande blocks
  niet. `colorArray` is standaard leeg; een positieve `colorVariation` vereist
  minstens één door de gebruiker gekozen CSS-kleur.
- De library bezit alleen `regular` en `inverse`. Een gekozen gebruikerskleur
  krijgt de generieke `color`-state: de kleur vult het blockpapier, neutrale inkt
  tekent rand en inhoud, en het menu draait die twee om. Zelfgetekende inhoud in
  HTML, canvas of SVG kiest geen eigen steunkleur en blijft neutraal.
- Bewaar een regel hier alleen wanneer de reden niet betrouwbaar uit broncode,
  tests of gitgeschiedenis terug te vinden is.

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
