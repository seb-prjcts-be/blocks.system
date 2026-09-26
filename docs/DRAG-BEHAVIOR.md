# Draggedrag en librarycontract

## Waarom de neerwaartse herschikking natuurlijk voelt

Het voorbeeld combineert meerdere kleine regels; geen enkele regel verklaart
het gevoel alleen.

1. Het block blijft exact onder het oorspronkelijke grijppunt. De cursor trekt
   het block niet plots naar zijn midden.
2. De doelcel gebruikt de linkerbovenhoek van het gesleepte block en
   `Math.round`: de magneet wisselt pas na een halve rasterstap.
3. Horizontaal wordt de doelcel binnen het board begrensd; neerwaarts mag het
   board groeien.
4. Tijdens drag verandert de compositie niet. Alleen het vrije block en de
   doelcel bewegen, zodat er geen target onder de cursor wegloopt.
5. Een vrije doelcel is gestippeld. Een botsing wordt sterker gevuld, krijgt
   een volle rand en toont `↓`.
6. De drop heeft prioriteit. Overlappende blocks worden van boven naar onder
   verwerkt en zakken telkens één rij tot ze vrij zijn. Hun kolom verandert
   niet en de cascade bewaart daardoor de ruimtelijke logica.
7. Pas bij loslaten settelen het dropblock en alle verdrongen blocks samen in
   160 ms met `cubic-bezier(.2,.8,.2,1)`.

## Vertaling naar blocks.system

### Met `layout: "fixed-grid"`

- de library meet de werkelijk gerenderde uniforme gridtracks en gaps;
- het block volgt de pointer vrij vanuit het oorspronkelijke grijppunt;
- de preview houdt in de flow tijdelijk de oorsprong bezet, maar wordt visueel
  naar de gekwantiseerde doelcel vertaald; andere blocks blijven dus pixelvast;
- bij drop wordt de doelcel vastgelegd en zakt iedere botsing kolomvast omlaag;
- de DOM-volgorde wordt daarna rij-voor-rij gesorteerd zodat lees- en
  toetsenbordvolgorde de zichtbare compositie volgen;
- pointer en pijltoetsen gebruiken hetzelfde collisionmodel en sturen
  `blocks:reorder`;
- de 160 ms settlement gebruikt de Web Animations API en wordt volledig
  overgeslagen bij `prefers-reduced-motion: reduce`.

### Met `layout: "free"` of `layout: "flow-grid"`

Er bestaan geen vaste collisioncoördinaten. De library behoudt daar een
stabiele DOM-reorder: geldige landingsslots worden vooraf gemeten, de preview
beweegt zonder live reflow en de nieuwe volgorde wordt pas op drop vastgelegd.
`free` rendert met flex; `flow-grid` gebruikt dezelfde DOM-volgorde in het grid.

## Scrollcontract

Drag start uitsluitend op de menuheader. Trackpad- en wheelscroll boven een
block blijven daarom gewone paginascroll. `.blocks-system-content` en de lange
manualcode gebruiken `overscroll-behavior: auto`: echt overlopende inhoud
scrollt eerst lokaal en ketent aan haar grens weer door naar de pagina.

## Grenzen

- De fixed-grid-berekening veronderstelt het uniforme raster dat `setGrid(x, y)`
  maakt. Een consumer die zelf niet-uniforme tracks oplegt, valt buiten dit
  dragcontract.
- `exportLayout()` en `restoreLayout()` leveren alleen contentvrije
  layoutstatus. Opslag tussen paginaladingen blijft verantwoordelijkheid van de
  consumer.
- De layoutmodus ligt vast bij creatie. `place()` is uitsluitend geldig in
  fixed-grid; flow-grid-blocks krijgen nooit een vast adres.

## Regressiebewijs

Wat de testsuite in echte Chromium aantoont (`npm test`):

- `tests/browser-layout.mjs`: keyboardbeweging in het manual-raster, de
  pointer-capture-fallback in de vrije layout, dock en undock, minimize,
  remove en compact, kopieerfeedback en de gedeelde cascade op 1440–320 px;
- `tests/height-model.mjs`: rijen die groeien en krimpen bij spans, plaatsen,
  toetsenbordverplaatsing, minimaliseren en docken, `rowHeight`, en een
  dockrail die het eerste block niet bedekt;
- `tests/consumer-grid.mjs`: de atomaire rasterwissel, de vaste foutcode,
  verborgen blocks bij meten en slepen, en undocken op een bezette cel;
- `tests/auto-fit.mjs`: de inhoudsmeting van `fitHeight()`.

Nog niet in deze repo geautomatiseerd: de pointerdrag in fixed-grid zelf
(preview, `↓`-collisionpreview, kolomvaste duwcascade, landing op de getoonde
cel) en het wheel/trackpad-gedrag boven blockinhoud. De consument
`lucasgent_clone_blocks` bewijst de pointerdrag wel in `scripts/probe-drag.mjs`;
`tests/flow-grid.html` is een handmatige proef voor resize.
