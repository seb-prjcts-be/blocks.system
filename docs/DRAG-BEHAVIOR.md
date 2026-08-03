# Draggedrag — donoronderzoek en librarycontract

Status: lokaal uitgevoerd op 3 augustus 2026.

## Onderzocht voorbeeld

Het gedrag is vergeleken met:

- `C:\server\htdocs\buiilding_blocks_elements\elements\micrographic-grid.html`
- `C:\server\htdocs\buiilding_blocks_elements\elements\micrographic-grid.js`

Die bestanden waren al lokaal gewijzigd en zijn voor dit werk uitsluitend
gelezen en in de browser bediend.

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

### Met `snap = true`

- de library meet de werkelijk gerenderde uniforme gridtracks en gaps;
- het block volgt de pointer vrij vanuit het oorspronkelijke grijppunt;
- de preview houdt in de flow tijdelijk de oorsprong bezet, maar wordt visueel
  naar de gekwantiseerde doelcel vertaald; andere blocks blijven dus pixelvast;
- bij drop wordt de doelcel vastgelegd en zakt iedere botsing kolomvast omlaag;
- de DOM-volgorde wordt daarna rij-voor-rij gesorteerd zodat lees- en
  toetsenbordvolgorde de zichtbare compositie volgen;
- pointer en pijltoetsen gebruiken hetzelfde collisionmodel en sturen
  `blocks:reorder`;
- `block.flow()` wist de vaste coördinaten en herstelt CSS auto-flow;
- de 160 ms settlement gebruikt de Web Animations API en wordt volledig
  overgeslagen bij `prefers-reduced-motion: reduce`.

### Met `snap = false`

Er bestaan geen rastercellen of collisioncoördinaten. De library behoudt daar
een stabiele DOM-/flexreorder: geldige landingsslots worden vooraf gemeten, de
preview beweegt zonder live reflow en de nieuwe volgorde wordt pas op drop
vastgelegd.

## Scrollcontract

Drag start uitsluitend op de menuheader. Trackpad- en wheelscroll boven een
block blijven daarom gewone paginascroll. `.blocks-system-content` en de lange
manualcode gebruiken `overscroll-behavior: auto`: echt overlopende inhoud
scrollt eerst lokaal en ketent aan haar grens weer door naar de pagina.

## Grenzen

- De snapberekening veronderstelt het uniforme raster dat `setGrid(x, y)`
  maakt. Een consumer die zelf niet-uniforme tracks oplegt, valt buiten dit
  dragcontract.
- Een drop bewaart coördinaten binnen de huidige runtime, maar niet tussen
  paginaladingen. Persistence blijft verantwoordelijkheid van de consumer.
- `flow()` herstelt auto-flow; het herstelt niet automatisch een vroegere
  persoonlijke volgorde of opgeslagen compositie.

## Regressiebewijs

`tests/browser-layout.mjs` controleert in echte Chromium onder meer:

- een monotone neerwaartse preview zonder target-jagen;
- pixelvaste buren tijdens drag;
- gestippelde vrije preview en volle `↓`-collisionpreview;
- exacte landing op de getoonde cel;
- kolomvaste neerwaartse collisioncascade;
- gezamenlijke settlement, pointerevent, keyboardbeweging, cleanup en reset;
- paginascroll met wheel/trackpad boven zowel blockinhoud als dragheader.
