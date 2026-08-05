# Swiss-audit documentatie

Datum: 5 augustus 2026

Scope: homepage, manual, reference en documentatievoorbeelden. De systeem-library bleef read-only.

Drempel: elk kenmerk moet minstens 8/10 halen. Maximum: vijf rondes.

## Beoordelingskader

De audit gebruikt Swiss Design als communicatiesysteem: inhoudshiërarchie, een raster met een functie, asymmetrische spanning, typografische orde, herhaalbare intervallen, mediumgeschiktheid en leesbaarheid. De score beoordeelt de actuele documentatie, niet historische stijlimitatie.

De render is gecontroleerd in Chromium op 1920, 1440, 1280, 1024, 901, 900, 800, 561, 560, 487, 390 en 320 px. De bestaande browsermatrix controleert haar vaste breedtes telkens op DPR 1 en 2; gerichte geometriechecks bewaken daarnaast de tussenliggende grensgevallen.

## Ronde 1 — nulmeting

| Kenmerk | Score | Kernbevinding |
|---|---:|---|
| Helder | 9 | Home, manual en reference hebben elk één ondubbelzinnige hoofdroute. |
| Systematisch | 9 | Het gedeelde 6/3/1-raster ordent pagina, hoofdstuk en block. |
| Asymmetrisch | 9 | Grote titelmassa en compacte informatievelden vormen gecontroleerde spanning. |
| Typografisch | 9 | Instrument Sans draagt de architectuur; monospace markeert code en metadata. |
| Functioneel | 9 | Navigatie, anchors, natuurlijke paginascroll en lokale code-overflow werken. |
| Leesbaar | 7 | Langere metadata- en coderollen zakken op mobiel tot 8–10 px. |
| Modulair | 10 | De blocks zijn directe, herhaalbare modules op één gedeeld oppervlak. |
| Ritmisch | 9 | Rijhoogte, hoofdstukruimte en terugkerende type-intervallen geven een vaste cadans. |
| Precies | 8 | Uitlijning en integer rastertracks zijn sterk; microtype is nog te krap gekalibreerd. |
| Sober | 9 | Zwart, warm wit, grijs en doelgerichte voorbeeldkleur blijven terughoudend. |

Conclusie: alleen `leesbaar` haalt de drempel niet. De compositie, inhoud en rasterlogica hoeven niet te veranderen.

## Gerichte correctie na ronde 1

- Manual: metadata, hoofdstuklinks, code, specimenlabels, kaartcode, vervolglinks en footer zijn naar 11 px gebracht; de compacte factory-actie is op mobiel 10 px.
- Reference: metadata, index, labels en footer zijn 11 px; code is 12 px; gestapelde mobiele veldlabels zijn 9 px en typewaarden 11 px.
- Voorbeelden: de terugkerende kicker-, actie- en notitierollen zijn 11 px.
- Homepage: de drie zeer korte microteksten blijven 9,6–10,4 px. Een vergroting veroorzaakte meetbare clipping op 320 px; behoud scoort hier hoger op functionaliteit, ritme en precisie. Hoog contrast en de uiterst korte tekst houden deze uitzondering leesbaar.
- Raster, plaatsing, inhoud, beelden en systeem-library zijn niet gewijzigd.

## Ronde 2 — eerste heraudit

| Kenmerk | Score | Bewijs |
|---|---:|---|
| Helder | 9 | De drie informatieniveaus — route, instructie, exact contract — blijven direct herkenbaar. |
| Systematisch | 10 | Eén responsieve rastergrammatica bestuurt alle documentatiepagina's. |
| Asymmetrisch | 9 | Ongelijke massa's blijven aan vaste lijnen en spans verankerd. |
| Typografisch | 9 | Schaal, gewicht, positie en lettersoort dragen elk een onderscheiden rol. |
| Functioneel | 7 | De vaste browsermatrix is groen, maar controleert het trusted-HTML-specimen niet op tekstintersecties. |
| Leesbaar | 6 | Op 1920 px overlapt de specimenkop het label; rond 561 px wordt een woord horizontaal afgesneden. |
| Modulair | 10 | De 6/3/1-structuur en directe blocks blijven intact en herhaalbaar. |
| Ritmisch | 9 | De vergroting bewaart de bestaande baseline- en hoofdstukcadans. |
| Precies | 6 | De uiterste desktopmaat en de overgang tussen 3 en 1 kolom ontbreken in de gerichte geometriecontrole. |
| Sober | 9 | De correctie voegt geen kleur, ornament, component of visueel effect toe. |

Conclusie: ronde 2 is achteraf niet geldig als eindronde. Een gebruikersscreenshot toont het gemiste 1920 px-geval en start een derde ronde.

## Gerichte correctie na ronde 2

- De maximale specimenkop daalt van 64 naar 48 px. Op 1920 px verandert de volledige overlap van het 13,19 px hoge label in 17,19 px vrije verticale ruimte.
- Tussen 561 en 620 px gebruikt het inhoudsdrieluik de volle manualbreedte. De gemeten horizontale clipping op 561 px daalt van 14 naar 0 px.
- Alleen `docs/style.css` verandert; inhoud, beelden, blockdefinities en systeem-library blijven intact.

## Ronde 3 — eindaudit

| Kenmerk | Score | Bewijs |
|---|---:|---|
| Helder | 9 | Route, instructie en specimen blijven direct herkenbaar zonder concurrerende tekstlagen. |
| Systematisch | 10 | De rastergrammatica bevat nu ook een expliciete, inhoudsgedreven toestand voor 561–620 px. |
| Asymmetrisch | 9 | De typografische massa blijft links verankerd en behoudt gecontroleerde spanning. |
| Typografisch | 9 | De kop blijft dominant op 48 px, terwijl label en footer zelfstandig leesbaar blijven. |
| Functioneel | 10 | Alle gemeten breedtes hebben nul horizontale en verticale contentoverflow. |
| Leesbaar | 9 | Label, kop en footer hebben overal positieve tussenruimte; geen woord wordt afgesneden. |
| Modulair | 10 | Het drieluik blijft uit drie directe blocks bestaan en wisselt alleen responsief van span. |
| Ritmisch | 9 | De desktopkop past binnen zijn track; de smalle overgang krijgt een rustige verticale cadans. |
| Precies | 10 | 1920 en het 561/560-breakpoint zijn numeriek gemeten naast de vaste regressiematrix. |
| Sober | 9 | De correctie gebruikt alleen schaal en span; er komt geen ornament of extra interface bij. |

Resultaat: **alle tien kenmerken halen minstens 8/10 na drie van maximaal vijf rondes**.

## Verificatie

- `npm run check`: minificatie, manifest, contract, 13 sitepagina's, 3 voorbeelden en browser-layout groen.
- Bestaande browsermatrix: 1920–320 px op DPR 1 en 2, zonder horizontale overflow of afgesneden blockinhoud.
- Gerichte specimenmatrix: 1920, 1440, 1024, 901, 900, 800, 561, 560, 487, 390 en 320 px; nergens tekstintersectie of contentoverflow.
- Gebruikte beelden: homepagebeeld `37466849` en manualbeeld `37352130` zijn al door Git bewaard; vijf ongebruikte lokale beelden bleven buiten scope.

## Ronde 4 — didactische heraudit van de manual

Aanleiding: de eerste drie delen vormden een leerroute, maar daarna werden inverse, kleur, layout en random variatie te vroeg of tegelijk ingezet. De manual is daarom herordend zonder de library of het gedeelde raster te wijzigen.

| Kenmerk | Score | Bewijs |
|---|---:|---|
| Helder | 10 | Elk genummerd hoofdstuk introduceert nog maar één begrippenfamilie; de masthead noemt de volledige route. |
| Systematisch | 10 | De volgorde is nu content → menu → layout → appearance → random → practice; eerdere voorbeelden blijven regular. |
| Asymmetrisch | 9 | De bestaande mastheadspanning en ongelijke 4/2- en 4/1/1-spans blijven aan het gedeelde raster verankerd. |
| Typografisch | 9 | Instrument Sans, monospacecode, compacte titelbalken en vaste specimenrollen houden duidelijke semantische niveaus. |
| Functioneel | 10 | Menu-aan/uit, `block.menu()`, minimize/restore/remove, drag, toetsenbord, snap, `flow()`, variants en kleur zijn zichtbaar of uitvoerbaar. |
| Leesbaar | 9 | Desktop en mobiel hebben geen tekstoverlap, afgesneden blockinhoud of horizontale pagina-overflow. |
| Modulair | 10 | Alle voorbeelden blijven directe blocks op één gedeeld oppervlak; de randomvergelijkingen introduceren geen geneste systemen. |
| Ritmisch | 9 | Ieder hoofdhoofdstuk begint na één open rasterrij; subproeven binnen random sluiten direct op hun uitleg aan. |
| Precies | 10 | Inverse verschijnt voor het eerst in hoofdstuk 05; de twee kansen worden afzonderlijk op 0, 0.5 en 1 getoond en pas daarna gecombineerd. |
| Sober | 10 | De dertien identieke `Final review.`-kaarten en decoratieve inversevarianten zijn verwijderd; kleur verschijnt alleen waar zij wordt uitgelegd. |

Resultaat: **alle tien kenmerken halen minstens 8/10 na vier van maximaal vijf rondes**.

## Verificatie ronde 4

- `node tests/site.mjs`: groen; 13 pagina's en 3 voorbeelden.
- `node tests/browser-layout.mjs`: groen op 1440–320 px, DPR 1 en 2; de twee random-mini-grids en hun gecombineerde proef worden geometrisch gecontroleerd.
- Lokale Playwright-inspectie: desktop 1440 × 900 en mobiel 390 × 844; reading order, eerste inverse, responsive mini-grids en zichtbare menuacties gecontroleerd.
- `npm test`: groen bij de afsluitende run.
- `npm run check`: build en manifest zijn groen, maar de bestaande niet-deterministische minified contrasttest kan falen doordat haar testsysteem `variant: "regular"` niet vastzet; deze librarytest bleef buiten de docs-opdracht.
- Librarybestanden en vijf ongebruikte lokale beelden bleven ongewijzigd.
