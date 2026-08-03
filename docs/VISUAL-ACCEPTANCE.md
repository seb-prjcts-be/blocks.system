# Visuele acceptatie

Datum: 3 augustus 2026
Status: geslaagd voor de vereenvoudigde canonieke docsstructuur

## Matrix

De echte Chromium-layouttest opent home, manual en reference op:

- 1440 × 1000;
- 1280 × 900;
- 1024 × 900;
- 800 × 900;
- 390 × 844;
- 320 × 720.

Iedere viewport draait op DPR 1 en DPR 2. Dat zijn 36 afzonderlijke
surface-metingen, naast de interactie- en standalone-exampletests.

## Harde acceptatiepunten

- geen horizontale pagina-overflow;
- geen block buiten zijn surface;
- manual en reference gebruiken uitsluitend hele CSS-pixels voor tracks en
  horizontale blockgeometrie;
- home gebruikt 6 / 3 / 3 kolommen op desktop / tablet / telefoon; manual en
  reference gebruiken 6 / 3 / 1;
- alleen home toont zijn constructieve achtergrondgrid; manual en reference
  tonen uitsluitend echte blockranden en geen geneste blocks-surfaces;
- canvasbitmaps volgen de contentbox en DPR;
- home bevat 2 directe blocks, manual 13 en reference 6;
- de drie vormen staan in één direct block, delen één optische lijn en benoemen
  hun betekenis als state / circle, content / rectangle en direction / triangle;
- reference behoudt canonieke leesvolgorde en alle zes directe anchors;
- reference-tabellen worden onder 560 px leesbare gestapelde rijen; lange code
  scrollt lokaal en de pagina zelf scrollt natuurlijk;
- een vergrendelde surface verwijdert de niet-werkende menuheader uit de
  tabvolgorde; toegankelijke standaardlabels volgen de documenttaal;
- pointerdrag, pointercancel, keyboard reorder, lock, reset, media pause en
  anchorstatus slagen in Chromium; `blocks:reorder` behoudt één vaste detailvorm.

## Visueel contract

Leegte is gerichte compositieruimte, geen ontbrekende inhoud. De home maakt het
constructieraster zichtbaar; de inhoudspagina's gebruiken alleen echte
blockranden. Zwart, warm papier en veldgrijs dragen alle surfaces; magenta
verschijnt alleen als enkel accent. Er is geen gelijktijdige
blauw-geelcombinatie.

De regressieopdracht is `npm run check`. De browsermatrix staat in
`tests/browser-layout.mjs`, zodat dit bewijs herhaalbaar blijft en niet van een
los screenshot afhangt.
