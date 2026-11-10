# Hoe blocks.system werkt

Een korte kaart van de werking. De functies zelf staan in
[`API-OVERZICHT.md`](API-OVERZICHT.md); hier staat hoe ze samenhangen.

## In één alinea

`blocks.system` zet losse stukken inhoud (HTML, een DOM-element, canvas, SVG)
elk in een eigen kader met een titelbalk, en legt die kaders in één veld. De
JavaScript houdt per block een klein lijstje getallen bij (breedte, hoogte,
plaats, toestand) en schrijft die als CSS-variabelen en `data-*`-attributen op
het element. De CSS doet daarna het eigenlijke plaatsen met CSS Grid. Er zijn
geen afhankelijkheden.

## De bestanden

| Bestand | Rol |
|---|---|
| `blocks.system.mjs` | De kern, één ESM-module. |
| `blocks.system.css` | Veld, block, titelbalk, dock en alle toestanden. |
| `blocks.storage.mjs` | Los, optioneel: inhoud bewaren in JSON-bestanden of via HTTP. |
| `*.min.mjs` | Gemaakt door `npm run build:min`, nooit met de hand. |
| `*.d.ts` | De publieke API als TypeScript-declaraties. |
| `docs/`, `index.html` | De site (home, handleiding, reference). Ze gebruiken de library, de library kent hen niet. |
| `tests/` | Contracttests in Node en layouttests in headless Chrome. |

## De drie lagen in de kern

1. **Catalogus** (`createBlockCatalog`). Een register van *definities* (id,
   label, adapter, medium, defaults) en *adapters* (een `mount()` en optioneel
   `unmount()`, `ready()`, `snippet()`). Hiermee kan je een block op naam
   mounten in een willekeurig element, er een codesnippet van vragen en een
   deeplink (`address(id)`). De `html`-adapter zit erin.
2. **Systeem** (`createBlocksSystem`). Eén veld met zijn raster, de dockrail,
   slepen, bewaren en herstellen. Bevat ook `hydrate()`, `resolveAddress()` en
   `bindSearch()` voor pagina's waar de blocks al in de HTML staan.
3. **Blockcontroller** (`createBlockController`). Het object dat `add()`
   teruggeeft. Het bezit één block: titelbalk en knoppen, span, plaats,
   variant, kleur, minimaliseren, docken, pinnen, verwijderen. Je vraagt het
   later weer op met `block(id)`, `blocks()` of `blockOf(element)`.

De module exporteert daarnaast één gedeeld systeem zonder configuratie
(`system`, ook `window.blocks.system`) en `startBlock()` daarop.

## Wat er gebeurt bij `add()`

1. Is er nog geen veld, dan maakt het systeem er zelf een aan het einde van de
   body.
2. Het id wordt gecontroleerd (kleine letters, cijfers, streepjes) of
   automatisch gekozen (`block-1`, `block-2`, ...).
3. De controller bouwt de schil `.blocks-system-object` met daarin
   `.blocks-system-menu` (titelbalk) en `.blocks-system-content`. Een string
   gaat er als `innerHTML` in, een element met `appendChild`.
4. De variant wordt bepaald. Bij `random` beslist één trekking: eerst het
   kleurdeel (`colorVariation`, een kleur uit `colorArray`), de rest wordt
   verdeeld tussen `regular` en `inverse` (`inversionVariation`).
5. `span` en `place` worden toegepast en de toestand van dat moment wordt de
   basis waar `reset()` naar terugkeert.

## Het raster

Er zijn drie layouts, gekozen bij het aanmaken en daarna niet meer te wisselen:

- `free`: flex, blocks naast elkaar in DOM-volgorde, geen raster.
- `fixed-grid`: elk block kan een vast adres hebben (`place(kolom, rij)`).
- `flow-grid`: geen adressen, de browser plaatst in DOM-volgorde.

Het veld krijgt `--blocks-columns` en `--blocks-rows`, elk block
`--block-span-columns`, `--block-span-rows` en eventueel `--block-column` en
`--block-row`. De CSS vertaalt dat naar `grid-column` en `grid-row`.

`setGrid(kolommen, rijen)` legt de kolommen vast; de rijen zijn een minimum.
Het werkelijke aantal rijen rekent `requiredRows()` uit door de automatische
plaatsing van CSS Grid na te bootsen. Dat gebeurt na elke wijziging
(`syncRows()`). Zonder `rowHeight` delen de rijen de hoogte van het veld; met
`rowHeight` zijn het vaste rijen en groeit het veld mee.

`fitHeight()` meet de echte hoogte van de inhoud en kiest de kleinste rijspan
die past.

## Slepen en formaat

- Slepen begint alleen op de titelbalk, niet op knoppen of links.
- Tijdens het slepen staat de rest stil. Een preview toont de landingsplek.
- `fixed-grid`: bij loslaten krijgt het block de doelcel, en wat in de weg
  staat zakt in zijn eigen kolom omlaag. Daarna wordt de DOM-volgorde rij per
  rij gesorteerd, zodat leesvolgorde en beeld overeenkomen.
- `free` en `flow-grid`: slepen verandert alleen de DOM-volgorde.
- Met focus op de titelbalk doen de pijltjestoetsen hetzelfde.
- Formaat wijzigen met de rechter- of onderrand bestaat alleen in `flow-grid`
  met `resizable: true`.
- De landing duurt 160 ms en valt weg bij `prefers-reduced-motion`.

Meer in [`DRAG-BEHAVIOR.md`](DRAG-BEHAVIOR.md).

## Toestanden van een block

| Toestand | Wat het doet |
|---|---|
| gedockt | Het block verhuist naar de dockrail (boven of onder) en laat geen ruimte achter. Standaard de sluitknop. Omkeerbaar. |
| gepind | Favoriet. Blijft in `flow-grid` vooraan en kan niet gedockt worden. |
| geminimaliseerd | Alleen de titelbalk blijft, één rij hoog. Opt-in. |
| `hidden` | Het gewone HTML-attribuut haalt het block uit het raster. |
| verwijderd | Definitief, via `remove()` of `menu.close: true`. |

## Events en bewaren

Het veld vuurt drie events: `blocks:reorder` (verplaatst), `blocks:resize`
(span gewijzigd met de rand) en `blocks:change` (al het andere, zoals
toevoegen, docken, pinnen en verwijderen). Alle drie vertrekken langs één
functie, `publish()`. `batch(fn)` houdt ze tegen tot `fn` klaar is en meldt
ze dan als één `blocks:change` van het type `batch`.

`exportLayout()` geeft alleen layout terug, nooit inhoud: het raster, de
volgorde, spans, plaatsen en toestand per id. `checkLayout()` zegt vooraf of
een opname past, zonder iets te wijzigen. `restoreLayout()` zet zo'n momentopname terug,
alles of niets: past ze niet in het raster, dan verandert er niets. De kern
bewaart zelf niets; de toepassing luistert naar de events en kiest waar het
heen gaat. Alleen `hydrate()` schrijft zelf naar `localStorage`.

## `hydrate()`: blocks die al in de HTML staan

1. Zoekt `[data-content-page]` en zijn directe `[data-content-block]`-kinderen.
2. Vervangt de bron door een veld met hetzelfde `id` en voegt elk kind toe met
   `add()`. Elk block wordt ook als definitie geregistreerd, zodat zoeken en
   deeplinks werken.
3. Kiest per breedte een modus (`wide`, `medium` of `compact`) en leest
   raster en spans uit `data-grid-*` en `data-block-span-*`.
4. Past elk block aan zijn inhoud aan en doet dat opnieuw bij een andere
   breedte, een gewijzigde inhoud of een geladen afbeelding.
5. Bewaart volgorde, dock en pins van de bezoeker in `localStorage` en toont
   een terugzetknop zolang er iets bewaard is.
6. Springt naar het block uit `?block=` of `#id`.

Wat nog niet in een uitgebrachte versie zit, staat in
[`releases/unreleased.md`](releases/unreleased.md).

## Fouten, meldingen en opruimen

Elke fout loopt langs `coded()` en draagt een vaste code op `error.code`. Wat
het systeem stil weigert of overslaat, gaat langs `report()` naar de optie
`onIssue`; zonder die optie gebeurt er niets extra.

`hydrate()` en `bindSearch()` zetten elk een opruimer klaar. `destroy()`
roept die aan, verwijdert de blocks en laat het veld los. Een gehydrateerde
pagina krijgt daarbij haar oorspronkelijke HTML terug.

## Voor machines

[`api.json`](api.json) beschrijft de publieke API als data: leden, opties,
events, foutcodes, attributen, klassen en CSS-variabelen. Het wordt gemaakt
door `tools/render-api.mjs` uit de `.d.ts`, de bron en de CSS, en een test
bewaakt dat het gelijk loopt. `llms.txt` in de root is de korte ingang voor
een agent.

## De opslagmodule

`blocks.storage.mjs` staat los van de kern. Ze geeft twee backends hetzelfde
contract: `load(keys)` levert documenten en een revisie, `commit()` bewaart
documenten en nieuwe bestanden tegen die revisie. Is de revisie verouderd, dan
stopt het met `BlocksStorageConflictError` in plaats van nieuwer werk te
overschrijven. `createJsonStorage` schrijft naar een map via de File System
Access API, `createHttpStorage` praat met een endpoint. Aanmelden, rechten en
validatie blijven bij de toepassing.

## Uitgeven

Geen npm. Een git-tag op GitHub, geleverd door jsDelivr. De laatste tag en de
stappen staan in [`development.md`](development.md). De Lucas Gent-site wijst naar een commit via `BLOCKS_SYSTEM_REF`, dus
een wijziging hier en het verzetten van die verwijzing horen samen.

`npm run check` bouwt de minified modules en draait alle tests.
