# Visuele acceptatie

Datum: 2 augustus 2026  
Status: geslaagd voor de canonieke docsstructuur

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
- geen block buiten de gekwantiseerde surface;
- uitsluitend hele CSS-pixels voor tracks en horizontale blockgeometrie;
- 6 / 3 / 1 kolommen op desktop / tablet / telefoon;
- geen getekende achtergrondgridlijnen en geen geneste blocks-surfaces;
- canvasbitmaps volgen de contentbox en DPR;
- manual behoudt 15 directe blocks, reference 6 en home 5;
- reference behoudt canonieke leesvolgorde en alle zes directe anchors;
- lange code en tabellen scrollen lokaal; de pagina zelf scrollt natuurlijk;
- pointerdrag, pointercancel, keyboard reorder, lock, reset, media pause en
  anchorstatus slagen in Chromium.

## Visueel contract

De compositie gebruikt uitsluitend echte blockranden om het raster te tonen.
Leegte is gerichte compositieruimte, geen ontbrekende inhoud. Zwart, warm papier
en veldgrijs dragen alle surfaces; magenta verschijnt alleen als enkel accent.
Er is geen gelijktijdige blauw-geelcombinatie.

De regressieopdracht is `npm run check`. De browsermatrix staat in
`tests/browser-layout.mjs`, zodat dit bewijs herhaalbaar blijft en niet van een
los screenshot afhangt.
