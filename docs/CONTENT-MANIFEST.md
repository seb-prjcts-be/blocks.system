# Canoniek inhoudsmanifest

Status: fase 1 voltooid op 2 augustus 2026. Dit bestand bepaalt vóór de
migratie waar iedere publieke inhoudseenheid thuishoort. Een inhoudseenheid
heeft exact één canonieke eigenaar; andere routes linken ernaar of worden een
alias.

## Canonieke oppervlakken

| Eigenaar | Route | Taak | Maximale inhoud |
|---|---|---|---|
| Voordeur | `/` | Belofte, bewijs en ingang | Eén productzin, drie eigenschappen, één live proef, twee acties |
| Manual | `/docs/` | Leren door het echte systeem te gebruiken | Opening, start, compose, arrange, connect, examples, boundary |
| Reference | `/docs/api.html` | Exact opzoeken | Volledige API, errors, definition shape en stabiele CSS-hooks |
| Uitvoer | `/examples/<naam>/` | Draaien, bekijken en kopiëren | Eén zelfstandig voorbeeld met modulebron en teruglink |
| Source | Repository | Ontwikkelen en verifiëren | Installatie, packagegebruik, tests, licentie en issues |

`/docs/` gebruikt één direct blocks-systeem. De reference gebruikt dezelfde
visuele grammatica, maar geen genest manual- of examples-board.

## Vaste anchors

| Anchor | Betekenis | Canonieke eigenaar |
|---|---|---|
| `#system` | Korte operating model en ingang naar het leerpad | Manualopening |
| `#start` | Installeren, attach, grid en eerste block | Manual |
| `#compose` | Contentvormen, controller en contentmodi | Manual |
| `#arrange` | Span, place, drag, minimize, close, lock en reset | Manual |
| `#connect` | Adapter, runtime, resize en cleanup | Manual |
| `#examples` | Drie zelfstandige uitvoerroutes | Manual |
| `#reference` | Compacte methodenkaart en link naar volledige naslag | Manual |
| `#boundary` | Scope, naam, credits, licentie en bron | Manual |

Deze ids zijn publieke deeplinks. Titels mogen later scherper worden; ids
blijven stabiel.

## Inhoud per eigenaar

### Voordeur `/`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| `blocks.system` | huidige hero | **keep** — enige producttitel |
| Dependency-free browser core voor adresseerbare DOM-objecten | huidige hero/about | **merge** tot één zin |
| `0 dependencies`, `native ESM`, `any DOM content` | huidige hero | **keep** als drie compacte feiten |
| Eén levende surface met echte blocks | huidige live system | **keep**, zonder controlpanelcatalogus |
| “generic core / real DOM / optional adapters” | huidige principles | **merge** tot drie korte regels bij het bewijs |
| CTA `open manual` | huidige guide CTA | **rename** en **keep** |
| CTA `view source` | huidige GitHub-links | **keep** |
| Volledige quick-startcode | huidige homepage | **link** naar `manual#start`, niet dupliceren |
| Adapteruitleg | huidige homepage | **link** naar `manual#connect`, niet dupliceren |
| Getekend hero- en surfacegrid | huidige CSS | **drop** |
| RGB/CMY-paletuitleg | huidige live-systemtekst | **drop** — docs gebruikt één accent |

### Manualopening `#system`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| Cirkel, rechthoek, driehoek | huidige manual | **keep** als eerste directe blocks |
| Eén surface, directe objects, lege ruimte | system/manual | **merge** tot één operating model |
| Drag staat aan; lock en reset zijn omkeerbaar | manual | **keep** |
| Boardformaten en densityselectors | system/examples toolbar | **drop** uit canonieke manualbediening |
| Manifest-JSON als visueel block | system | **move** naar reference/source |

### Manual `#start`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| CSS- en ESM-import | `guide.html`, README | **merge** tot één kopieerbaar voorbeeld |
| Attach expliciete field | `guide.html` | **keep** |
| `setGrid`, `snap`, `draggable` | guide/manual | **keep** |
| Eerste `blocks.add()` | guide/manual | **keep** |
| Naamregel `blocks` / `block…` / `window.blocks.system` | guide/API/about | **keep** hier; reference linkt terug |
| Attach/configure/add-uitleg | guide | **merge** tot drie korte regels |
| Basic-griduitvoer | examples | **link** naar `/examples/basic-grid/` |

### Manual `#compose`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| Trusted HTML string | `guide-blocks.html` | **keep** |
| DOM node/canvas | `guide-blocks.html`, examples | **keep** |
| Factory function/native control | `guide-blocks.html` | **keep** |
| Untrusted tekst gebruikt `textContent` | `guide-blocks.html` | **keep** als veiligheidsnoot |
| HTML, canvas, custom element en video | system/examples/manual | **merge** tot vier directe bewijsblocks |
| `natural`, `contain`, `cover` | manualcontract | **keep** |
| `ResizeObserver` voor runtimepixels | manual | **move** naar `#connect`, hier alleen link |
| Mixed-contentuitvoer | examples | **link** naar `/examples/mixed-content/` |

### Manual `#arrange`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| `menu({ close, minimize })` | guide/API/examples | **keep** |
| `span`, `place`, `variant`, `minimized`, `remove` | guide/API | **merge** tot één controllerblock |
| Header is draghandle; contentcontrols blijven actief | manual/core | **keep** |
| Volledig 3px-hoverkader zonder layoutshift | core/manual | **keep** als live bewijs, niet als uitlegkaart |
| Lock/reset/status | manual | **keep** |
| DOM-volgorde-drag | manual/core | **keep** |
| Vrije celplaatsing, ghost, collision en persistence | donor | **defer** — geen publieke belofte zonder volledige gate |
| Keyboardherordening | nieuw contract | **implement** vóór omschakeling |

### Manual `#connect`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| “Stop unless lifecycle is needed” | `guide-finish.html` | **keep** als grenszin |
| `registerAdapter`, `register`, `mount` | guide/API/manual | **merge** tot één levende counter |
| `unmount`, `remount`, cleanup | API/manualcontract | **keep** in reference; manual toont lifecycle |
| Adapter blijft buiten core | homepage/about/guide | **keep** als één zin |
| Canvas/custom `ResizeObserver` | manual | **keep** als levende resizeproef |
| Video controls, preload, contain, pause, cleanup | manualcontract | **keep** als contractblock |
| Custom-adapteruitvoer | examples | **link** naar `/examples/custom-adapter/` |

### Manual `#examples`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| Start small / mix content / extend cleanly | examples | **keep** als drie routes, zonder catalogusintro |
| Live basic variantproef | examples | **merge** in relevante manualblocks |
| Live mixed HTML/canvas/custom | examples | **merge** in `#compose` |
| Live adaptercounter | examples | **merge** in `#connect` |
| Runlink en moduledownload per voorbeeld | examples | **keep** |
| Volledig apart examples-board | examples | **drop** na aliasomschakeling |

### Manual `#reference`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| Compacte methodsamenvatting | huidige manual | **keep** |
| Volledige signatures/defaults/errors | API | **link**, niet kopiëren |
| Publieke CSS-hooks | manualplan | **keep** met één klein voorbeeld |
| Manifestversie en exports | manifest/source | **link** naar manifest en source |

### Manual `#boundary`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| Ontstaan uit zelfstandige visual elements | about | **keep** compact |
| Core kent geen renderer/p5/waves | about/home | **merge** tot één grensblock |
| Naam en publieke namespace | about/API | **merge** met naamregel uit `#start` via link |
| Zero runtime dependencies | about/home | **keep**, niet opnieuw uitleggen |
| Concept/direction en AI collaboration | about | **keep** in colofon |
| MIT en source | footers/about | **keep** één keer |
| Oude p5.waves docs-topologie | about/development | **drop** uit publieke inhoud |
| Volledig RGB/CMY-sitepalet | about | **drop** uit publieke inhoud |

### Reference `/docs/api.html`

| Inhoudseenheid | Bron | Besluit |
|---|---|---|
| Shared-systemleden | API | **keep** volledig en ankerbaar |
| Blockcontrollerleden | API | **keep** volledig en ankerbaar |
| Definitions/adapters | API | **keep** volledig en ankerbaar |
| Definition shape | API | **keep** |
| Errors | API | **keep** |
| Defaultwaarden en returntypes | bron/manifest/API | **verify** tegen echte ESM tijdens migratie |
| Stabiele CSS-hooks | plan/manual | **add** |
| Installatie- en leeruitleg | guides | **link** naar manual, niet kopiëren |

### Standalone examples

| Route | Eigen inhoud | Teruglink |
|---|---|---|
| `/examples/basic-grid/` | Vier blocks, minimize, drag en één magenta variant | `/docs/#start` en `/docs/#arrange` |
| `/examples/mixed-content/` | HTML, canvas en custom element met één magenta accent | `/docs/#compose` |
| `/examples/custom-adapter/` | Gemonteerde counteradapter | `/docs/#connect` |

De modulebron blijft downloadbaar. Algemene uitleg en principes verhuizen naar
de manual; de uitvoerroutes bewijzen alleen dat de code zelfstandig draait.

## Legacy routes

| Huidige route | Canonieke bestemming | Aliasanker |
|---|---|---|
| `/docs/manual.html` | `/docs/` | `#system` |
| `/docs/system.html` | `/docs/` | `#system` |
| `/docs/examples.html` | `/docs/` | `#examples` |
| `/docs/guide.html` | `/docs/` | `#start` |
| `/docs/guide-blocks.html` | `/docs/` | `#compose` |
| `/docs/guide-finish.html` | `/docs/` | `#connect` |
| `/docs/about.html` | `/docs/` | `#boundary` |

Aliaspagina's bevatten een canonical link, korte uitleg, directe gewone link
en `location.replace()` die query en doelanker niet laat ontsporen. Ze blijven
HTTP 200 op statische hosting.

## README-eigenaarschap

- README en README_NL blijven package-ingangen voor installatie, minimale code,
  API-samenvatting, testen en licentie.
- Leerlinks worden `manual`, `reference` en `examples`; de drie oude
  guidepaginalinks verdwijnen.
- Uitgebreide contentvormen, adapters en CSS-customization worden niet in beide
  READMEs én de manual onderhouden: de README vat samen en linkt.
- `blocks` voor het systeem en `block…` voor controllers blijft verplicht.

## Dekkingsgate

- Alle huidige unieke API-leden blijven in de reference.
- Alle drie zelfstandige voorbeelden blijven bereikbaar en downloadbaar.
- Veiligheidsnoot over untrusted tekst blijft behouden.
- Boundary, naam, credits, MIT en source blijven behouden.
- Iedere legacy route heeft exact één bestemming.
- Verwijderde inhoud is uitsluitend duplicaat, verouderde topologie of een
  ingetrokken kleur-/gridpresentatie.

Daarmee is niets unieks eigenaarloos en heeft niets twee canonieke eigenaars.
