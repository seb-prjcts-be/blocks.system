# Zelfdocumenterende docs — werkmodel

Status: lokale ontwerprichting en prototypecontract. De bestaande publieke
routes blijven staan tot een browservergelijking en expliciete keuze.

## Eén zin

De handleiding is één levende `blocks.system`-compositie waarin uitleg, code,
media, voorbeelden en referentie directe blocks zijn en de interface daardoor
zelf toont wat het systeem kan.

## Wat de huidige pagina's worden

| Huidige route | Unieke taak | Richting in de gedeelde compositie |
|---|---|---|
| `index.html` | Publieke ingang en showcase | Voorlopig afzonderlijke voordeur |
| `docs/system.html` | Visuele systeemkaart | Visuele ruggengraat van de nieuwe handleiding |
| `docs/examples.html` | Werkende HTML-, canvas- en adaptervoorbeelden | Directe live voorbeeldblocks, geen tweede catalogus |
| `docs/guide.html` | Attach, grid en eerste block | `start`-zone |
| `docs/guide-blocks.html` | Contentvormen en blockcontroller | `compose`-zone |
| `docs/guide-finish.html` | Optionele adapter | `connect`-zone |
| `docs/api.html` | Volledige referentie | Compact `reference`-block met uitklapbare details |
| `docs/about.html` | Grens, naam, oorsprong en credits | Identiteits- en colofonblocks |
| `examples/*` | Kopieerbare zelfstandige bron | Blijft bestaan, maar niet als hoofdnavigatie |

De werklabels zijn `start`, `compose`, `connect` en `reference`. Ze zijn nog
geen definitieve productnamen; de naamaudit vergelijkt ze met de werkelijke
handelingen en met `blocks`/`block` in de API.

## Beeldgrammatica

Vormen zijn functioneel, niet decoratief.

| Vorm | Betekenis |
|---|---|
| Rechthoek | Uitleg, code, API of een concrete inhoudseenheid |
| Cirkel | Levende toestand, cyclus, runtime of interactief voorbeeld |
| Driehoek | Richting, actie, overgang of volgende stap |
| Lege rastercel | Ritme, hiërarchie en bewust niet ingevulde ruimte |

Instrument Sans draagt de grote typografie. Inter blijft leesschrift en de
monospace blijft code en systeeminformatie. Zwart en papier domineren; primaire
RGB/CMY-kleuren markeren alleen een functie of uitzondering.

De opening zet cirkel, rechthoek en driehoek als drie gelijkwaardige tekens op
één rij: optisch in balans, met één rustige papierkleur en zonder illustratieve
vulling. De Munari-referentie zit in de elementaire helderheid en speelse
precisie, niet in het nabouwen van één bestaand werk.

## Interactiecontract

- Alle informatieblocks staan direct op één surface; geen geneste grids.
- De pagina scrollt voor het leespad. Alleen code en echte referentielijsten
  krijgen doelbewuste interne scroll.
- De compositie start versleepbaar en heeft een zichtbare `layout lock` en
  `reset`.
- Fase 1 gebruikt de bestaande veilige DOM-volgorde-drag van de core op
  automatisch geplaatste blocks.
- Fase 2 oogst vrije celplaatsing, magnetische ghost, botsingsverdringing en
  settelen uit `buiilding_blocks_elements/elements/micrographic-grid.js`.
- Touch mag pagina-scroll buiten een actieve handle niet blokkeren.
- Iedere sleepactie krijgt een toetsenbordalternatief voordat de oude docs
  kunnen verdwijnen.

## Inhoud en herschaling

Er zijn drie expliciete contentmodi nodig:

1. `natural`: tekst en controls vloeien natuurlijk mee met het block.
2. `contain`: het volledige beeld, video, SVG of canvas blijft zichtbaar.
3. `cover`: media mag worden bijgesneden om het block te vullen.

Canvas en custom runtimes hebben daarnaast een adaptergebonden
`ResizeObserver` nodig om hun interne resolutie opnieuw te berekenen. Video
heeft afspraken nodig voor controls, poster, captions, preload, pauzeren en
cleanup. Dit blijft uit de generieke core zolang een gewone DOM-node volstaat.

## Bestaande drag/snap-donor

`micrographic-grid.js` bevat al het bruikbare gedragsmodel: `{ w, h, col, row }`,
`firstFree`, overlapdetectie, vrije pointerdrag, magnetische ghost,
`pushDown`, `settleUp`, groeiende boardhoogte, dichtheid, formaatkeuze,
toevoegen, reseeden en verwijderen.

Voor hergebruik moeten de vaste pixelcellen, ontbrekende `pointercancel`,
touchblokkering, ontbrekende keyboard/persistence/lock en overlap na het
verkleinen van een board eerst worden opgelost. Het uiteindelijke model moet
met echte blockcontrollers werken in plaats van een parallelle tegelstaat.

## CSS-hooks voor gevorderden

De levende handleiding toont voorlopig deze kandidaten als publieke
stijlhaken: `.blocks-system-surface`, `.blocks-system-object`,
`.blocks-system-menu` en `.blocks-system-content`. De bestaande state-attributen
`[data-block-object]`, `[data-block-variant]`, `[data-block-minimized]` en
`[data-draggable]` zijn preciezere haken voor één object of toestand.

Voor publicatie volgt nog een audit: alleen haken die we bewust stabiel willen
houden komen in de definitieve handleiding. Tijdelijke docsclasses en interne
dragclasses worden niet stilzwijgend onderdeel van de publieke API.

## Gate voor vervanging

De bestaande docs verdwijnen pas wanneer het prototype aantoonbaar:

- alle unieke inhoud zonder doublures bevat;
- op desktop, tablet en mobiel een logisch leespad heeft;
- drag, lock, reset, scroll en herschaling betrouwbaar uitvoert;
- zonder muis bruikbaar blijft;
- directe URL's voor kernonderdelen behoudt;
- en visueel rustiger en duidelijker is dan de huidige routes.
