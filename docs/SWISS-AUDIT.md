# Swiss-audit documentatie

Datum: 5 augustus 2026

Scope: homepage, manual, reference en documentatievoorbeelden. De systeem-library bleef read-only.

Drempel: elk kenmerk moet minstens 8/10 halen. Maximum: vijf rondes.

## Beoordelingskader

De audit gebruikt Swiss Design als communicatiesysteem: inhoudshiërarchie, een raster met een functie, asymmetrische spanning, typografische orde, herhaalbare intervallen, mediumgeschiktheid en leesbaarheid. De score beoordeelt de actuele documentatie, niet historische stijlimitatie.

De render is gecontroleerd in Chromium op 1440, 1280, 1024, 800, 390 en 320 px, telkens op DPR 1 en 2. Daarnaast zijn de homepage, manual en reference visueel gecontroleerd op desktop en mobiel.

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

## Gerichte correctie

- Manual: metadata, hoofdstuklinks, code, specimenlabels, kaartcode, vervolglinks en footer zijn naar 11 px gebracht; de compacte factory-actie is op mobiel 10 px.
- Reference: metadata, index, labels en footer zijn 11 px; code is 12 px; gestapelde mobiele veldlabels zijn 9 px en typewaarden 11 px.
- Voorbeelden: de terugkerende kicker-, actie- en notitierollen zijn 11 px.
- Homepage: de drie zeer korte microteksten blijven 9,6–10,4 px. Een vergroting veroorzaakte meetbare clipping op 320 px; behoud scoort hier hoger op functionaliteit, ritme en precisie. Hoog contrast en de uiterst korte tekst houden deze uitzondering leesbaar.
- Raster, plaatsing, inhoud, beelden en systeem-library zijn niet gewijzigd.

## Ronde 2 — heraudit

| Kenmerk | Score | Bewijs |
|---|---:|---|
| Helder | 9 | De drie informatieniveaus — route, instructie, exact contract — blijven direct herkenbaar. |
| Systematisch | 10 | Eén responsieve rastergrammatica bestuurt alle documentatiepagina's. |
| Asymmetrisch | 9 | Ongelijke massa's blijven aan vaste lijnen en spans verankerd. |
| Typografisch | 9 | Schaal, gewicht, positie en lettersoort dragen elk een onderscheiden rol. |
| Functioneel | 10 | Volledige contract-, site- en browsermatrix is groen; geen inhoud wordt afgesneden. |
| Leesbaar | 8 | Langere micro- en coderollen zijn vergroot; hoofdtekst blijft 13 px of groter op mobiel. |
| Modulair | 10 | De 6/3/1-structuur en directe blocks blijven intact en herhaalbaar. |
| Ritmisch | 9 | De vergroting bewaart de bestaande baseline- en hoofdstukcadans. |
| Precies | 9 | Geen horizontale overflow; rastertracks blijven integer en uitzonderingen zijn gemeten. |
| Sober | 9 | De correctie voegt geen kleur, ornament, component of visueel effect toe. |

Resultaat: **alle tien kenmerken halen minstens 8/10 na twee van maximaal vijf rondes**.

## Verificatie

- `npm test`: contract, 13 sitepagina's, 3 voorbeelden en browser-layout groen.
- Browsermatrix: 1440–320 px op DPR 1 en 2, zonder horizontale overflow of afgesneden blockinhoud.
- Handmatige rendercontrole: homepage, manual en reference op 1440 × 1000 en 390 × 844.
- Gebruikte beelden: homepagebeeld `37466849` en manualbeeld `37352130` zijn al door Git bewaard; vijf ongebruikte lokale beelden bleven buiten scope.
