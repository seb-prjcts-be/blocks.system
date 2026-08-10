# blocks.system development system

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
- `docs/content.json` bezit de redactionele inhoud van de 52 levende docblocks:
  3 op home, 39 in de manual en 10 in de reference. Titels, uitleg, termen,
  toegankelijke labels, links en codevoorbeelden staan daar. De JSON spiegelt
  block-ID's alleen als koppelsleutel; de canonieke ID-lijst, volgorde, layout,
  DOM-opbouw, gedrag en lifecycle blijven bij de betreffende docscompositie.
  Zelfgetekende visuals (de ELI10-canvasstappen), media-assetpaden en berekende
  interactiestatus blijven bewust compositie- of gedragscode. Navigatie,
  paginametadata, toolbars en footers blijven in semantische HTML. De library
  leest dit bestand niet.
- `examples/<naam>/` is zelfstandig, uitvoerbaar en kopieerbaar.

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

`npm run test:types` compileert hetzelfde consumentenfixture met Node16- en
bundler-resolutie. Voeg een publieke API-wijziging daar toe wanneer de
declaraties of package-exports mee veranderen.

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
  krijgt de generieke `color`-state: de kleur tekent uitsluitend het blockkader
  en de menubalk. Het hoverkader hergebruikt voor elke variant `--block-color`:
  zwart bij `regular`, licht bij `inverse` en de gekozen gebruikerskleur bij
  `color`. Blockpapier, tekst en zelfgetekende inhoud in HTML, canvas of SVG
  blijven neutraal. Voor een gebruikerskleur kiest de library tussen de neutrale
  systeeminkt en het systeempapier op basis van de sterkste contrastverhouding.
- Bewaar een regel hier alleen wanneer de reden niet betrouwbaar uit broncode,
  tests of gitgeschiedenis terug te vinden is.

## Lokale verificatie

```powershell
npm install
npm run check
git diff --check
```

`npm run check` bouwt source/min-pariteit, controleert lokale links
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

`package.json` heeft `private`: true: dit project is geen npm-package en mag
niet via npm publiceren. De publieke distributieroute is een GitHub-release-tag
die jsDelivr voor ESM en CSS kan leveren.

1. draai `npm run check` en `git diff --check`;
2. stage uitsluitend bedoelde publieke bestanden;
3. push alleen na Sebs expliciete opdracht;
4. verifieer daarna live home, manual, reference en examples;
5. maak pas een versie-tag wanneer de publieke API klaar is om via jsDelivr te
   pinnen.

`v0.2.0` is de huidige onveranderlijke publieke release. De Pages-manual,
reference en voorbeelden draaien rechtstreeks op `main` en labelen dat daarom
zichtbaar als `main · unreleased`. Alleen installatiesnippets gebruiken de
stabiele tag. `docs/release.mjs` is de canonieke bron voor die scheiding:
`sourceRef`, `releaseStatus`, `packageVersion`, `stableRef` en `nextRelease`.

- ESM: `https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.2.0/blocks.system.mjs`
- CSS: `https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.2.0/blocks.system.css`

De reference documenteert het huidige `main`-contract. De manual gebruikt
datzelfde contract voor de levende demonstraties, maar toont voor installatie
de stabiele `v0.2.0`-snippets hierboven.

De eerstvolgende release moet minstens `v0.3.0` heten. Main bevat sinds BLK-27
een bewuste catalogus-contractbreuk: `listAdapters()` geeft op een vers systeem
`["html"]` in plaats van `[]`, en `registerAdapter("html", …)` vereist voortaan
`{ replace: true }`. Vermeld in de releasenotes ook dat `definition.url` van
vrij metadataveld naar betekenisdragend adresveld voor `address()` is gegaan.
Het versienummer in `package.json` bumpt pas mee op het releasemoment zelf: de
release-driftcontracttest eist dat package-versie en docs-pins in lockstep
bewegen.
