# Integratieplan documentatie

Status: goedgekeurd uitvoeringscontract. Seb keurde op 2 augustus 2026 alle
structurele gates goed en vroeg om autonome uitvoering met een herstelbare
commit na iedere fase. Publicatie en push vallen niet onder dat akkoord.

## Actieve uitvoeringsdoelen

- [x] Magenta toevoegen als eerste afzonderlijke accentproef, zonder een tweede
  accentkleur op dezelfde surface of in dezelfde viewport.
- [x] Op de gezamenlijke voorbeeldenpagina ieder block de bestaande echte
  `×`-sluitactie geven; `reset` moet gesloten blocks volledig herstellen.
- [x] Alle verticale documentatie-scrollbars als één neutraal, dun en
  OS-achtig onderdeel vormgeven, zonder accentkleur en met een native fallback
  voor forced-colors.

## Kernbesluit

`blocks.system` krijgt niet één reusachtige pagina en ook geen verzameling
losse mini-sites. Het wordt één visueel en inhoudelijk systeem met drie
taakgerichte oppervlakken:

1. **Voordeur** — wat is het en waarom bestaat het?
2. **Levende handleiding** — hoe begin, bouw, rangschik en verbind je?
3. **Referentie** — wat zijn de exacte API, states en stabiele CSS-hooks?

Alle drie gebruiken dezelfde directe blocks, typografie, geometrie,
interactiegrammatica en lege ruimte. Alleen de informatiedichtheid verschilt.
De zelfstandige voorbeelden blijven bestaan als kopieerbare uitvoer, niet als
vierde documentatiesysteem.

De huidige `docs/manual.html` is hiervoor het fundament. Zij bewijst al het
belangrijkste: één surface, directe blocks, levende HTML/canvas/adapterinhoud,
natuurlijke paginascroll, drag aan, lock/reset, herschaling en een elementair
vormalfabet.

## Noordster

> De handleiding legt het systeem niet alleen uit; haar ordening, ruimte,
> vormen en gedrag zijn zelf het overtuigendste voorbeeld van het systeem.

Elke zichtbare beslissing moet minstens één van deze taken vervullen:

- betekenis verduidelijken;
- bediening voorspelbaar maken;
- ritme of hiërarchie leesbaar maken;
- de gebruiker iets laten proberen;
- bewust ruimte laten.

Als een element geen taak heeft, verdwijnt het.

Leegte is daarbij geen restproduct. Ze is een actief compositie-element dat
een belangrijk block afzondert, een overgang voelbaar maakt en voorkomt dat
iedere cel om aandacht vraagt.

## Ontwerpbronnen vertaald naar regels

| Denkraam | Concrete regel voor `blocks.system` |
|---|---|
| Swiss | Uitlijning, volgorde, typehiërarchie en witruimte dragen de pagina; het raster zelf hoeft niet getekend te worden. |
| Helvetica | Instrument Sans blijft de rustige, neutrale displaystem; Inter blijft het leesschrift en monospace blijft systeemtaal. |
| Paul Rand | De spitsvondigheid ontstaat door schaal, contrast en onverwachte maar logische relaties, nooit door versiering. |
| Bruno Munari | Cirkel, rechthoek en driehoek zijn elementaire, speelse informatietekens met een vaste betekenis. |
| macOS-niveau | Eén grammatica, weinig permanente bediening, progressieve onthulling, onmiddellijk herkenbare state, omkeerbare acties en foutloze details. |

Dit zijn geen stijlcitaten. We nemen geen herkenbare compositie, tekst,
kleurcombinatie, asset, classnaam of bewegingssignatuur van een externe bron
over. Externe referenties zijn alleen een tijdelijke kwaliteitstoets; de code
en documentatie houden geen bronspoor of nabootsing over.

## Diagnose van de huidige informatiearchitectuur

De inhoud is goed, maar de verdeling laat de interne bouwgeschiedenis zien in
plaats van de taak van de lezer:

- `index.html`, `docs/system.html`, `docs/examples.html` en de manual geven elk
  opnieuw een algemene introductie;
- `guide.html`, `guide-blocks.html` en `guide-finish.html` zijn één kort pad dat
  kunstmatig over drie pagina's is verdeeld;
- voorbeelden bestaan als overzicht, als live preview en als zelfstandige
  route, waardoor dezelfde uitleg meermaals eigenaar lijkt te zijn;
- `system`, `examples`, `guide`, `blocks`, `finish` en `manual` mengen
  productnamen, inhoudstypes en processtappen in één menu;
- vier stylesheets tekenen rasterlijnen met gradients. Op verschillende
  breedtes kunnen die visueel uit de pas lopen met echte blockranden;
- de prototypehandleiding heeft al het sterkste model, maar zit nog buiten de
  publieke navigatie.

De oplossing is geen extra pagina, maar duidelijk eigenaarschap per stukje
informatie.

## Definitieve routestructuur

### Publieke hoofdroutes

| Route | Publieke naam | Enige taak |
|---|---|---|
| `/` | `blocks.system` | Korte voordeur met belofte, één levende proef en één ingang naar de manual. |
| `/docs/` | `manual` | Volledig leerpad en levende demonstratie in één directe blocks-compositie. |
| `/docs/api.html` | `reference` | Snelle, volledige en ankerbare naslag in dezelfde blocks-grammatica. |
| repository | `source` | Bron, installatie, issues en ontwikkeling buiten de leerflow. |

De globale navigatie wordt dus: logo/home · manual · reference · source. Geen
`system`, `examples`, `guide` of `about` meer als hoofdnavigatie.

### Zelfstandige uitvoer

`examples/basic-grid/`, `examples/mixed-content/` en
`examples/custom-adapter/` blijven directe, kopieerbare uitvoer. Ze krijgen
een rustige terugweg naar het juiste manualanker, maar geen eigen parallelle
uitlegarchitectuur.

## Keep / merge / alias / verwijderen

| Huidige route | Besluit | Nieuwe eigenaar | Behoud van oude URL |
|---|---|---|---|
| `index.html` | Behouden en sterk inkorten | Voordeur | Ja, canoniek |
| `docs/manual.html` | Promoveren en hernoemen | `/docs/` | Ja, alias naar `/docs/` |
| `docs/system.html` | Inhoud samenvoegen | `manual#system` | Ja, alias naar anker |
| `docs/examples.html` | Overzicht verwijderen; unieke proeven invoegen | `manual#examples` | Ja, alias naar anker |
| `docs/guide.html` | Samenvoegen | `manual#start` | Ja, alias naar anker |
| `docs/guide-blocks.html` | Samenvoegen | `manual#compose` | Ja, alias naar anker |
| `docs/guide-finish.html` | Samenvoegen | `manual#connect` | Ja, alias naar anker |
| `docs/api.html` | Behouden, visueel integreren, label wijzigen | `reference` | Ja, blijft dezelfde URL |
| `docs/about.html` | Samenvoegen | `manual#boundary` en compact colofon | Ja, alias naar anker |
| `examples/*` | Behouden | Uitvoer bij relevante manualstap | Ja, canoniek |
| `docs/development.md` | Behouden als intern contract | Repository | Niet in publieke navigatie |

“Verwijderen” betekent eerst: uit navigatie en dubbel contentbeheer halen.
Legacy HTML-bestanden worden lichte, toegankelijke aliaspagina's met een
canonieke link en een gewone doorklikmogelijkheid. Pas na een volledige
linkaudit en minstens één stabiele publicatie mag dode CSS/JS verdwijnen. De
oude URL's hoeven nooit expres 404 te worden.

## Definitieve leesvolgorde van de manual

### 00 — Opening

- cirkel, rechthoek en driehoek naast elkaar, gelijkwaardig en optisch
  gecentreerd;
- zwart, papier en hoogstens één accentkleur; maximaal één van de drie vormen
  draagt dat accent;
- één zin: wat het systeem doet;
- één duidelijke ingang: `start`;
- geen verklarende kaartjes vóór de gebruiker het systeem gezien heeft.

### 01 — Start

- importeer CSS en ESM;
- maak één surface;
- voeg één echt block toe;
- toon onmiddellijk het resultaat;
- link naar het zelfstandige basic voorbeeld.

### 02 — Compose

- HTML, canvas, afbeelding, video en custom element als directe content;
- `natural`, `contain` en `cover` als expliciete inhoudsmodi;
- span, variant, minimized state en blockcontroller;
- één voorbeeld per contentcontract, niet één voorbeeld per API-regel.

### 03 — Arrange

- drag staat standaard aan;
- de header is de draghandle en het volledige block geeft hoverfeedback;
- lock en reset zijn permanent vindbaar en omkeerbaar;
- huidige veilige DOM-volgorde eerst; vrije celplaatsing, ghost,
  botsingsverdringing en settelen pas na de aparte interactiegate;
- toetsenbordalternatief en touchscroll zijn onderdeel van dezelfde feature,
  geen latere toegankelijkheidspatch.

### 04 — Connect

- adapter alleen wanneer een gewone DOM-node niet volstaat;
- mount, state, resize en cleanup in één levende runtime;
- link naar het zelfstandige adaptervoorbeeld;
- de grens van de generieke core wordt zichtbaar uitgelegd.

### 05 — Reference

- in de manual: compacte methodenkaart en stabiele CSS-hooks;
- op de referentieroute: volledige signatures, defaults, states, fouten en
  directe anchors;
- geen API-tekst kopiëren: de manual verwijst naar de eigenaar.

### 06 — Boundary

- wat de library bewust niet doet;
- naam, oorsprong, credits en licentie;
- bronlink en volgende stap;
- klein colofon, geen aparte marketingpagina.

## Vaste grammatica van de blocks

| Vorm of object | Betekenis | Gebruik |
|---|---|---|
| Rechthoek | Feit of concrete eenheid | Uitleg, code, media, API, output |
| Cirkel | Levende toestand of cyclus | Runtime, interactie, resize, state |
| Driehoek | Richting of handeling | Start, volgende stap, waarschuwing, koppeling |
| Lege ruimte | Ritme en prioriteit | Hoofdstuk scheiden, grote vorm laten ademen |

De vorm mag betekenis versterken, maar nooit de enige drager zijn. Elk gekleurd
of geometrisch teken krijgt ook tekst, een toegankelijke naam of context.

Ieder hoofdstuk gebruikt maximaal vier rollen:

1. een thesisblock;
2. een levende proef;
3. een precies code- of referentieblock;
4. een richtinggevend driehoekblock.

Niet ieder hoofdstuk hoeft alle vier te hebben. Herhaling zonder nieuwe taak
wordt geschrapt.

## Leegtecontract

Leegte wordt niet nagebootst met lege witte cards. Het is werkelijk onbezette
surface en marge.

- op desktop blijft per hoofdstuk een aaneengesloten open gebied van minstens
  één volledige track bij één rij zichtbaar;
- als richtwaarde blijft `30–45%` van een desktopcompositie onbezet; dit is een
  ritmetoets, geen reden om inhoud af te knippen;
- een hoofdblock krijgt aan minstens één zijde vrije ruimte en wordt niet door
  vier gelijkwaardige buren omsloten;
- tekstblocks blijven compact: één gedachte per block en een leesmaat van
  ongeveer `45–55ch`;
- een overgang gebruikt ruimte vóór een extra scheidingslijn of label;
- mobiel simuleert geen lege desktopcellen: daar ontstaat ademruimte door
  verticale marge en een rustige DOM-volgorde;
- lege ruimte krijgt geen hover, rand, schaduw of verborgen bediening.

De regressietest kan bezettingsgraad meten, maar de definitieve toets blijft de
visuele hiërarchie: onmiddellijk moet duidelijk zijn welk object eerst gelezen
of bediend wordt.

## Het onzichtbare raster

### Besluit

Het getekende achtergrondraster verdwijnt uit de canonieke docs. De geometrie
blijft bestaan als ordeningssysteem, maar is alleen leesbaar via:

- uitgelijnde blockranden;
- exact gelijke corridors;
- herhaalde hoogtes en spans;
- bewuste lege ruimte;
- consistente typografische ankers.

`background-image: linear-gradient(...)` hoort daardoor niet meer op de
homepage, manual of reference. Echte blockranden blijven de enige lijnen.

### Geometrisch contract

- basiscorridor: exact `6px`, gelijk aan de librarydefault;
- echte rand: exact `1px` en onderdeel van de boxmaat;
- blockheader: de bestaande `22px` blijft de referentiemaat zolang de
  browsertest geen lees- of touchprobleem aantoont;
- desktopmanual: 6 kolommen;
- tabletmanual: 3 kolommen;
- mobiel: 1 natuurlijke leeskolom in DOM-volgorde;
- desktoprij-quantum: voorlopig `132px` (`6 × 22`), maar content mag nooit voor
  het kunstwerk worden afgeknipt;
- buitenmarges zijn symmetrisch; ongebruikte restpixels komen buiten het board,
  nooit willekeurig tussen kolommen;
- alle objecten gebruiken `box-sizing: border-box`.

Eerst meten we de werkelijke `getBoundingClientRect()`-waarden. Alleen wanneer
kolomranden op de afgesproken viewports fractioneel of ongelijk landen, krijgt
de docslaag een kleine `ResizeObserver`-quantizer:

```text
track = floor((beschikbaar - corridors - buitenranden) / kolommen)
board = kolommen × track + corridors + buitenranden
```

Het board wordt daarna gecentreerd. Deze correctie blijft presentatiecode in
de docs; de generieke library wordt niet vervuild met één redactioneel raster.

### Pixelacceptatie

Op DPR 1 en DPR 2 controleren we minstens 1440, 1280, 1024, 800, 390 en 320px:

- randen, corridors en blockhoeken landen visueel scherp;
- verschil tussen gelijke blockbreedtes: maximaal `0.25 CSS px`;
- verschil tussen de drie optische vormcentra: maximaal `0.25 CSS px`;
- horizontale overflow: maximaal `0.5 CSS px` meetruis;
- hover veroorzaakt exact `0px` layoutverschuiving;
- geen achtergrondgrid, seam, dubbele rand of achtergebleven lijn;
- screenshots worden pas genomen na `document.fonts.ready`.

Niet iedere fractional coordinate is automatisch fout. We corrigeren alleen
wat een zichtbare seam, ongelijke corridor of zachte lijn veroorzaakt.

## Typografie

- Instrument Sans 600: identiteit, hoofdstuktitels en blockheaders;
- Instrument Sans 500: navigatie en compacte acties;
- Inter 400: langere uitleg;
- Consolas / Courier New: code, states, coördinaten en status;
- grote tekst gebruikt weinig gewichten en geen kunstmatige outline;
- regels worden op betekenis afgebroken, niet op decoratieve symmetrie;
- line-height en ruimte volgen een 6px-ritme waar dat de leesbaarheid niet
  schaadt;
- de bewaarde Oswald-import blijft uitsluitend als CSS-commentaar beschikbaar;
- de eerder teruggedraaide kleurproef wordt niet stilzwijgend opnieuw
  ingevoerd. De huidige neutrale papier-, veld- en inktkleuren zijn het
  vertrekpunt; accenttoewijzing gebeurt pas in de visuele gate.

## Kleur

Zwart, warm papier en het huidige grijzige veld dragen vrijwel de volledige
compositie. Kleur is een enkel, precies accent en nooit een paletdemonstratie.

- per publieke surface wordt één accentkleur gekozen;
- magenta is de eerste prototypekeuze voor de manual en de gezamenlijke
  voorbeelden; het is een accent, geen tweede hoofdkleur;
- binnen één viewport zijn nooit twee verschillende accentkleuren tegelijk
  zichtbaar;
- geen block, vormgroep, header of illustratie combineert twee accentkleuren;
- blauw en geel worden expliciet nooit samen gebruikt;
- kleur krijgt geen taak die niet ook door tekst, vorm of state leesbaar is;
- de library mag haar varianten behouden, maar de docs tonen ze niet als een
  gelijktijdige regenboog. Een interactieve variantproef toont maximaal één
  gekozen kleur per keer;
- zwart, wit/papier en grijs gelden als de neutrale dragers, niet als extra
  accentkleuren;
- bij twijfel blijft een object zwart-wit.

Rust wint altijd van volledigheid. Een tweede accent wordt verwijderd, niet
“in balans gebracht” met nog een derde kleur.

## Navigatie en state

- globale navigatie blijft kort: home, manual, reference, source;
- de manual gebruikt ankers `#start`, `#compose`, `#arrange`, `#connect`,
  `#reference` en `#boundary`;
- de actieve sectie wordt typografisch gemarkeerd, niet met een tweede kader;
- refresh met een anker brengt het juiste hoofdstuk in beeld;
- focus wordt nooit verborgen achter de vaste navigatie;
- dragvolgorde is persoonlijk, maar de canonieke leesvolgorde blijft met reset
  onmiddellijk herstelbaar;
- layout lock en reset hebben tekst, state en toetsenbordfocus;
- permanente bediening blijft beperkt tot wat de huidige state werkelijk
  verandert.

## Scroll, video, herschaling en drag

### Scroll

- het document zelf draagt het leerpad;
- geen volledig board met eigen verticale scrollbar;
- alleen code, lange tabellen of een echte naslaglijst mogen intern scrollen;
- `scroll-margin-top` voorkomt dat ankers onder de navigatie verdwijnen;
- touchscroll blijft werken buiten een actieve draghandle.
- verticale scrollbars zijn dun, neutraal en afgerond zoals een rustig
  OS-overlayelement; track en hoek blijven transparant;
- de scrollbar gebruikt nooit magenta of een andere accentkleur;
- forced-colors herstelt de native systeemweergave.

### Video

- native controls;
- poster en captions wanneer echte video-inhoud wordt gepubliceerd;
- `preload="none"` totdat de gebruiker afspeelt;
- expliciete `contain`-modus als de volledige frame-inhoud moet blijven staan;
- pauzeren wanneer het block wordt geminimaliseerd of verwijderd;
- adaptercleanup verwijdert listeners en runtime-state;
- zonder captions of inhoud blijft video een contractdemo, geen loze decoratie.

### Herschaling

- gewone DOM-inhoud gebruikt natuurlijke layout;
- canvas en custom runtimes gebruiken een adaptergebonden `ResizeObserver`;
- CSS-maat en interne bitmapresolutie worden beide getest;
- `contain` en `cover` worden niet impliciet uit het bestandstype afgeleid;
- een minimized/hersteld block herberekent zijn runtime één keer na herstel.

### Drag

- standaard aan, zoals de library nu belooft;
- alleen de header start drag; controls in de content blijven bruikbaar;
- volledig blockkader reageert op hover/focus zonder maatverschuiving;
- `pointerup`, `pointercancel`, lock, reset en viewportwisseling ruimen elke
  dragstate op;
- toetsenbordactie verplaatst in logische stappen en meldt de nieuwe positie;
- vrije celplaatsing wordt pas geïntegreerd als botsing, verkleinen, touch,
  keyboard en persistence samen slagen.
- voorbeeldblocks tonen naast minimaliseren ook de echte `×`-sluitactie;
  sluiten actualiseert de live status en `reset` bouwt het oorspronkelijke
  block met span, plaats en minimized state opnieuw op.

## Publieke CSS-hooks voor gevorderden

De reference krijgt één expliciet blok met alleen bewust stabiele hooks:

- `.blocks-system-surface`
- `.blocks-system-object`
- `.blocks-system-menu`
- `.blocks-system-content`
- `[data-block-object]`
- `[data-block-variant]`
- `[data-block-minimized]`
- `[data-draggable]`

Docsclasses, tijdelijke dragclasses en interne meetclasses zijn geen publieke
API. Voor iedere gepubliceerde hook tonen we: doel, toegestane override, state
en één klein CSS-voorbeeld. Een hook die we niet willen onderhouden, wordt niet
gedocumenteerd.

## Technische grens

### Librarycore

Blijft generiek: surface, blockcontroller, grid, state, dragcontract en
adapters. Geen manualhoofdstukken, kleurverhaal, Munari-vormen of routegedrag
in `blocks.system.css` of `blocks.system.mjs`.

### Gedeelde docslaag

Eén kleine shell wordt eigenaar van:

- fonts en docs-tokens;
- globale navigatie;
- boardgeometrie;
- lock/reset/status;
- anker- en focusgedrag;
- eventuele pixelquantization;
- gedeelde toegankelijkheidsregels.

### Paginalaag

Alleen unieke content en compositie. Geen tweede navimplementatie en geen
gekopieerde uitleg. We voegen geen framework of dependency toe.

`docs/development.md` wordt tegelijk bijgewerkt: de oude beschrijving van
parallelle docsboards en geneste examples is na de integratie niet langer de
waarheid.

## Migratie in veilige fasen

### Fase 0 — Beslissing vastzetten

- dit plan samen nalopen;
- drie oppervlakken en definitieve labels goedkeuren;
- kleur- en vormcontract bevestigen;
- nog niets verwijderen.

**Gate: geslaagd op 2 augustus 2026.** Seb keurde de architectuur, volgorde en
autonome uitvoering expliciet goed.

### Fase 1 — Inhoudsmanifest

- ieder uniek stuk tekst, code, voorbeeld en gedrag krijgt exact één eigenaar;
- doublures worden gemarkeerd als `merge`, `link` of `drop`;
- huidige URL en toekomstig anker worden vastgelegd;
- README en README_NL krijgen een eigen migratieregel.

**Gate: geslaagd op 2 augustus 2026.** `docs/CONTENT-MANIFEST.md` kent iedere
inhoudseenheid, legacy route en README-verwijzing exact één canonieke eigenaar
toe; alleen duplicaten, verouderde topologie en ingetrokken presentatie worden
geschrapt.

### Fase 2 — Gedeelde shell en onzichtbaar raster

- manual blijft de geïsoleerde proeftuin;
- achtergrondgradients verwijderen uit het prototype;
- typografie, corridors, randen en restpixels meten;
- globale en lokale navigatie vereenvoudigen;
- corebestanden blijven ongemoeid.

**Gate: geslaagd op 2 augustus 2026.** De manual gebruikt de gedeelde
vierdelige navigatie, tekent geen achtergrondgrid meer en quantiseert haar
docs-only tracks tot hele CSS-pixels; de core blijft ongewijzigd.

### Fase 3 — Inhoud samenvoegen

- start, compose, arrange, connect, reference en boundary één voor één vullen;
- na ieder hoofdstuk ontbrekende inhoud en doublures opnieuw controleren;
- voorbeelden direct op de gedeelde surface, nooit als genest docsgrid;
- lange reference blijft op de aparte maar visueel identieke route.

**Gate: geslaagd op 2 augustus 2026.** De voordeur bewijst het systeem met vijf
directe blocks en gerichte leegte; de manual bezit het volledige leerpad met
stabiele anchors; de aparte reference bezit het volledige API-contract. Geen
van de drie canonieke surfaces bevat een genest of getekend grid.

### Fase 4 — Interacties harden

- pointerdrag, touch, keyboard, lock en reset;
- canvas/custom resize;
- video lifecycle;
- minimized/herstel;
- vrije celplaatsing alleen als de donor veilig in echte blockcontrollers kan
  landen.

**Gate: geslaagd op 2 augustus 2026.** Pointerdrag en touch blijven het
bestaande headercontract gebruiken; gefocuste headers herschikken met de vier
pijltjestoetsen en krijgen hetzelfde volledige kader. Lock/reset, actieve
anchors, canvas-resize en pause-on-minimize/remove/page-exit zijn in echte
Chrome getest. Een vrije-celmodus wordt bewust niet publiek beloofd: expliciete
`place(x, y)`-coordinaten blijven de deterministische laag tot collision- en
toetsenbordgedrag voor vrije cellen even sterk bewezen zijn.

### Fase 5 — Parallelle vergelijking

- oude en nieuwe routes naast elkaar beoordelen;
- desktop, tablet, mobiel, DPR 1 en DPR 2;
- inhoudsdekking, rust, snelheid, foutstates en directe links vergelijken;
- screenshots alleen als regressiebewijs, niet als ontwerpproces op zich.

**Gate: geslaagd op 2 augustus 2026.** `docs/VISUAL-ACCEPTANCE.md` legt de
herhaalbare matrix vast. Home, manual en reference slagen op 1440, 1280, 1024,
800, 390 en 320 CSS-pixels, telkens bij DPR 1 en 2. De matrix controleert
overflow, hele-pixelgeometrie, directe blocks, lokale overflow, anchors,
canvasbitmap en natuurlijke paginascroll.

### Fase 6 — Publieke omschakeling

- `/docs/` wordt canoniek;
- hoofdnav en READMEs wijzen naar de nieuwe eigenaars;
- oude routes worden aliases;
- site-, browser- en linktests veranderen mee;
- pas na groen resultaat komt publicatie in aanmerking.

**Gate: geslaagd op 2 augustus 2026.** `/docs/` is de canonieke levende manual;
hoofdnav, READMEs, reference en standalone examples wijzen naar hun eigenaar.
Zeven oude routes blijven HTTP-200-aliases met canonical, leesbare fallback en
`location.replace()` naar het juiste vaste anchor. Queryfragmenten verdwijnen
uit de canonieke URL. Linktest, echte Chromium-aliastest, `npm run check` en
`git diff --check` zijn groen.

### Fase 7 — Opruimen

- ongebruikte CSS/JS en dubbele content verwijderen;
- legacy aliaspagina's behouden zolang externe links ze nodig kunnen hebben;
- docscontract en STATUS actualiseren;
- commit/push alleen op expliciet verzoek.

## Regressiematrix

### Structuur

- exact één canonieke eigenaar per inhoudseenheid;
- geen geneste blocks-systemen in de docs;
- geen doodlopende routes;
- legacy URL's antwoorden en wijzen correct door;
- manualanchors zijn stabiel en deelbaar.

### Beeld

- geen getekend achtergrondgrid in de drie canonieke oppervlakken;
- per zichtbare viewport maximaal één niet-neutrale accentkleur;
- blauw en geel verschijnen nergens samen;
- cirkel → rechthoek → driehoek blijft de openingsvolgorde;
- gelijke velden en optische middellijn;
- geen horizontale overflow of afgesneden tekst;
- geen layoutshift door hover, fontload of minimized state;
- focus en dragstate zijn zichtbaar in zwart-wit én kleur.

### Gedrag

- drag start standaard aan;
- header draghandle, contentcontrols blijven klikbaar;
- lock en reset herstellen betrouwbare state;
- keyboard en pointer leveren dezelfde logische ordening;
- pagina scrollt natuurlijk;
- canvas schaalt intern en extern;
- video gebruikt controls, contain en terughoudend preload;
- cleanup laat geen listeners of dragstate achter.

### Kwaliteit

- `npm run check`;
- `git diff --check`;
- echte lokale HTTP-routes via Apache;
- browsertest op de afgesproken viewports en DPR's;
- handmatige typografische inspectie na geladen fonts;
- geen wijziging van de librarycore zonder apart API-besluit.

## Wat we bewust niet doen

- geen framework, CMS of docs-generator toevoegen;
- geen zichtbare Swiss-rasterlijnen als stijleffect;
- geen externe stijl nabouwen;
- geen API verstoppen in hover-only of drag-only bediening;
- geen oude URL's abrupt breken;
- geen vrije drag publiceren zonder keyboard- en collisioncontract;
- geen kleur of animatie gebruiken om structurele onduidelijkheid te maskeren;
- geen publicatie, commit of push tijdens de planfase.

## Eerste gezamenlijke beslisgate

We lopen eerst alleen deze vier punten door, in deze volgorde:

1. **Architectuur:** voordeur + manual + reference, met examples als uitvoer.
2. **Samenvoeging:** zes manualhoofdstukken en de route-eigenaars hierboven.
3. **Beeld:** onzichtbaar raster, drie betekenisvolle vormen, huidige kleuren als
   vertrekpunt.
4. **Migratie:** eerst parallel bouwen en meten; pas daarna nav omschakelen en
   dubbele code opruimen.

Na akkoord start fase 1 met het inhoudsmanifest. Dat is de eerste concrete
implementatiestap en nog steeds omkeerbaar.
