# Zelfdocumenterende docs — uitgevoerd compositiecontract

Status: canoniek sinds 2 augustus 2026.

## Eén zin

De handleiding is één levende `blocks.system`-compositie waarin uitleg, code,
media, voorbeelden en referentie directe blocks zijn, zodat de interface zelf
toont wat het systeem kan.

## Beeldgrammatica

- de cirkel staat voor levende toestand en interactie;
- de rechthoek staat voor informatie, code en inhoud;
- de driehoek staat voor richting en volgende actie;
- lege surface-ruimte maakt hiërarchie en ritme zichtbaar;
- alleen echte blockranden tonen het raster: geen getekende gridachtergrond;
- zwart, warm papier en veldgrijs dragen de compositie; CMY is de beschikbare
  accentfamilie, maar binnen één zichtbare surface spreekt hoogstens één inkt.
  De huidige canonieke compositie gebruikt magenta.

Instrument Sans draagt de docs. De Oswald-import blijft als commentaar in
`style.css` bewaard voor vergelijking, maar is geen actieve docsdependency.

## Structuur

Home bevat vijf directe blocks en veel gerichte leegte. De manual bevat
vijftien directe blocks met vaste anchors. De reference bevat zes directe,
niet-versleepbare lookupblocks. Standalone examples blijven losse uitvoer; ze
worden niet als een tweede docsgrid genest.

## Interactiecontract

- dragging staat standaard aan op home en manual;
- de menuheader is pointer-, touch- en toetsenbordhandle;
- pijltoetsen herschikken DOM- en leesvolgorde en sturen `blocks:reorder`;
- lock en reset zijn omkeerbaar;
- de pagina scrollt natuurlijk; alleen code en referentielijsten scrollen
  lokaal;
- canvas volgt contentbox én DPR;
- video pauzeert bij minimaliseren, verwijderen en page-exit;
- smooth anchor scrolling respecteert reduced motion.

Vrije-celcollision, ghosting en persistence zijn geen publieke belofte. De
deterministische publieke laag blijft `block.place(x, y)` tot een even sterk
keyboard- en collisioncontract bewezen is.

## Geavanceerde CSS-hooks

De publieke reference deelt bewust `.blocks-system-surface`,
`.blocks-system-object`, `.blocks-system-menu`, `.blocks-system-content`,
`[data-block-object]`, `[data-block-variant]`, `[data-block-minimized]` en
`[data-draggable]`. Page-specifieke `.home-*`, `.manual-*` en `.reference-*`
classes blijven interne compositiedetails.

De volledige meetbare acceptatie staat in `VISUAL-ACCEPTANCE.md`; inhoudelijk
eigenaarschap en legacy aliases staan in `CONTENT-MANIFEST.md`.
