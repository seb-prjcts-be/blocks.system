# Tien verbeteringen voor blocks.system

Opgesteld op 2026-11-10, na een read-only studie van de lib op versie 0.6.1
(commit `5787bdd`). Drie agents lazen de kern, de site en de opslag met tests;
de hoofdpunten zijn daarna nagekeken in de code. Regelnummers verwijzen naar
die commit.

## Stand op 2026-11-10

Een eerste ronde is uitgevoerd: alles wat erbij kon komen zonder bestaand
gedrag te wijzigen. `npm run check` slaagt. De ronde is nog niet gecommit. Wat
ze voor de Lucas Gent-site betekent, staat in
[`LUCASGENT-CLONE.md`](LUCASGENT-CLONE.md).

| # | Stand | Gedaan | Nog open |
|---|---|---|---|
| 1 | gedaan | `block(id)`, `blocks()`, `blockOf(element)`, `block.title`, `block.layout` | |
| 2 | grotendeels | Een code op elke fout; `onIssue` meldt stille weigeringen in `add()`, `dock()`, `pin()`, `hydrate()`, `bindSearch()` en `restoreLayout()` | De setters `color` en `variant` controleren nog niet of het block verwijderd is |
| 3 | deels | Raster in `exportLayout()`, `checkLayout()`, melding van overgeslagen id's | Weglaten betekent behouden; een haak om oude versies om te zetten |
| 4 | open | | `blocks.persist()`; een geheugen-backend voor `blocks.storage` |
| 5 | deels | Events `add` en `title`, `batch(fn)` | Waarde voor en na in het detail; opborrelen |
| 6 | gedaan | `destroy()`, ook na `hydrate()` en `bindSearch()` | |
| 7 | open | Alleen: `hydrate()` zegt waarom het niets doet, en is op te ruimen | `data-block-place`, titel uit de kop, CSS voor de eigen klassen, de site inhoud-eerst |
| 8 | open | | Spans per breedte in `add()` |
| 9 | open | | Ankers, `toc()`, zoeken over de catalogus |
| 10 | gedaan | `docs/api.json` uit de types, de bron en de CSS; `llms.txt`; `AGENTS.md`; export `version` | De test die docs en code vergelijkt, kijkt nog alleen naar namen |

Wat open bleef, wijzigt bestaand gedrag of vraagt eerst een ontwerp. De
beslissingen die op Seb wachten staan onderaan in `LUCASGENT-CLONE.md`.

De tekst hieronder is de studie van vóór die ronde. De regelnummers verwijzen
naar commit `5787bdd`.

## De vaststelling

De eigen site gebruikt `hydrate()` niet. Home, handleiding en reference bouwen
elk block met `add()`, `span()` en `place()` in een eigen module, en zonder
JavaScript staat er alleen navigatie. De weg die pagina's eenvoudig moet
maken, kan de eigen documentatie dus nog niet dragen.

## Overzicht

| # | Verbetering | Voor wie | Omvang |
|---|---|---|---|
| 1 | Blocks opvragen en lezen | mens, agent | klein |
| 2 | Foutcodes en redenen | agent, computer | klein |
| 3 | Volledige momentopname | alle drie | middel |
| 4 | Eén bewaarpad | mens, agent | middel |
| 5 | Rijkere events en `batch()` | computer, agent | middel |
| 6 | `destroy()` | computer | middel |
| 7 | `hydrate()` draagt de eigen site | alle drie | groot |
| 8 | Responsieve spans in `add()` | mens, computer | middel |
| 9 | Ankers, inhoudstafel en zoeken | mens, agent | middel |
| 10 | Machine-leesbare API | agent | klein |

Aanbevolen volgorde: eerst 1, 2 en 3. Ze zijn klein en alles daarna leunt
erop. Nummer 7 is de richting waar de lib naartoe wil en het meeste werk.

## 1. Blocks opvragen en lezen

`blocks.get(id)` en `blocks.list()` geven definities uit de catalogus terug,
geen blocks (`blocks.system.mjs:548`). Wie een block later nodig heeft, houdt
zelf een lijst bij. De controller laat span, plaats en titel zetten maar niet
lezen; de enige leesweg is `exportLayout()` filteren. `menu("nieuwe titel")`
zonder opties zet bovendien de knoppen terug op de standaard
(`blocks.system.mjs:2386`).

Voorstel: `blocks.block(id)`, `blocks.blocks()`, een weg van element naar
controller, `block.title` om te lezen en te zetten, en een leesbare
`block.layout`.

## 2. Foutcodes en redenen

Eén fout heeft een code (`BLOCKS_GRID_TOO_SMALL`). De rest zijn Nederlandse
zinnen zonder code; één zegt nog "building blocks" (`blocks.system.mjs:159`).
Wat stil misgaat:

- `hydrate()` geeft `null` om vijf verschillende redenen (`:2704-2719`).
- `bindSearch()` geeft `false` om twee redenen.
- `dock()` op een gepind block en `pin()` op een gedockt block doen niets.
- Een onbekende optie in `add()` wordt genegeerd.
- De setters `color` en `variant` slaan de controle op een verwijderd block over.

Voorstel: een code op elke fout, een reden bij `null` en `false`, en een
waarschuwing bij een onbekende optie.

## 3. Volledige momentopname

`exportLayout()` bewaart het raster, `rowHeight` en de dockpositie niet
(`blocks.system.mjs:1496`), terwijl `restoreLayout()` het raster nodig heeft.
Bij het terugzetten:

- onbekende id's verdwijnen zonder melding (`:1529`);
- een ontbrekende `minimized`, `docked` of `pinned` telt als `false`, zodat een
  opname met alleen spans alles uit de dock haalt en alle pins wist;
- een andere versie dan 1 gooit een fout, zonder weg om te migreren (`:234`).

Voorstel: raster mee in de opname, weglaten betekent behouden,
`restoreLayout()` geeft terug wat het toepaste en oversloeg, een
`validateLayout()` die niet gooit, en een haak om oude versies om te zetten.

## 4. Eén bewaarpad

Er zijn drie wegen die elkaar niet kennen:

1. `exportLayout()` en `restoreLayout()`: de toepassing bewaart zelf.
2. `hydrate()` schrijft een eigen formaat naar `localStorage`, met alleen
   volgorde, dock en pins (`blocks.system.mjs:2942`). Het heet ook versie 1 maar
   heeft een andere vorm, en verliest spans, plaatsen en minimaliseren.
3. `blocks.storage.mjs` bewaart inhoud en kent de kern niet.

Voorstel: `blocks.persist({ key })` of `blocks.persist({ load, save })`
bovenop de momentopname, ook gebruikt door `hydrate()`. Voor
`blocks.storage` een backend in het geheugen of in `localStorage`; de tests
bouwen nu zelf een namaakmap van vijftig regels (`tests/storage.mjs:10-61`).

## 5. Rijkere events en `batch()`

- Er is geen event voor een toegevoegd block, en niets voor een gewijzigde
  variant, kleur, titel of samenvatting.
- `blocks:change` draagt alleen `{type, id, ids}`, zonder waarde voor en na
  (`blocks.system.mjs:1452`). Ongedaan maken vraagt dus vooraf een opname.
- De events borrelen niet op, dus luisteren op `document` kan niet.
- Eén `restoreLayout()` vuurt een reeks losse events, omdat het de publieke
  setters gebruikt (`:1576-1597`). Vermoedelijk herschrijft `hydrate()` daardoor
  `localStorage` bij elke wissel van breedte; dat is gelezen, niet getest.

Voorstel: een `add`-type, voor en na in het detail, `bubbles: true`, en
`blocks.batch(fn)` dat één samenvattend event geeft en de rijen één keer
herrekent. Dat laatste helpt ook de snelheid: nu rekent elke wijziging het
hele raster opnieuw door.

## 6. `destroy()`

`hydrate()` start een ResizeObserver, een MutationObserver en luisteraars op
het veld; `bindSearch()` zet een toetsluisteraar op het document
(`blocks.system.mjs:2686`). Geen van alle wordt ooit losgemaakt. `attach()`
naar een ander veld gooit zolang er blocks zijn (`:1427`). Dat wringt bij
tests en bij pagina's die van inhoud wisselen.

Voorstel: `blocks.destroy()` dat observers, luisteraars en het veld opruimt.

## 7. `hydrate()` draagt de eigen site

`hydrate()` zet elke plaats op `null` (`blocks.system.mjs:2857`) en kent geen
`data-block-place`, terwijl de drie pagina's van de site vaste plaatsen
gebruiken. Verder:

- De titel komt alleen uit `data-block-title` (`:2756`), terwijl de eerste kop
  altijd verborgen wordt (`:2781`). Je schrijft de titel dus twee keer.
- Er zijn twee schrijfwijzen voor spans: `data-block-span-{modus}` en
  `data-span-columns` met `data-span-rows`.
- `blocks.system.css` heeft geen regel voor de klassen die `hydrate()` zet
  (`blocks-system-heading-hidden`, `-reset`, `-search-results`, `-footnotes`,
  `-page`) en ook niet voor `data-block-addressed`. Een pagina met alleen de
  CSS van de lib toont een dubbele kop en een kale terugzetknop.
- In de kern zitten aannames van één site: een rij van 128 px, de padding van
  `main`, `data-block-role="lead"`.

Voorstel: `data-block-place` en een keuze van layout, de titel uit de kop,
één schrijfwijze voor spans, en CSS voor de eigen klassen. Daarna kan de site
inhoud-eerst worden: leesbare HTML zonder JavaScript, voor crawlers en agents.
Nu heeft alleen de reference een terugval (`docs/api.html:37`).

Daarbij hoort een lader van JSON naar blocks. De omzetting van een item uit
`content.json` naar DOM staat er drie keer: `docs/manual.mjs:233`,
`docs/reference.mjs:45` en als HTML-string in
`tools/render-reference-fallback.mjs:18`.

## 8. Responsieve spans in `add()`

De site regelt een smal scherm door de variabelen van de lib te overschrijven,
met 23 keer `!important` in `docs/style.css`. De toestand in JavaScript en wat
je ziet lopen dan uiteen. Rijen zijn met de hand geteld: `setGrid(6, 48)` in
`docs/manual.mjs:37` en `setGrid(6, 103)` in `docs/reference.mjs:14`.

Spans per breedte en automatisch passen bestaan al, maar alleen binnen
`hydrate()`.

Voorstel: `add({ span: { wide, medium, compact } })` en automatisch passen
voor elk block, zodat het raster zelf het aantal rijen kiest.

## 9. Ankers, inhoudstafel en zoeken

De site zet zelf een anker naast het block-id, voegt aliassen toe en scrolt
zelf naar de hash (`docs/shell.mjs:120-132`). De weg van de lib, `?block=`,
blijft ongebruikt. De hoofdstuklijst staat hard in de code
(`docs/manual.mjs:260-271`).

Zoeken leest alleen met de hand geschreven `[data-search-item]`-elementen
(`blocks.system.mjs:2608`), hoewel `hydrate()` elk block al registreert. In de
kern zitten Nederlandse regels: rangtelwoorden en vraagwoorden (`:421-427`).

Voorstel: `add({ anchor, aliases })`, `blocks.toc()`, `resolveAddress()` die
aliassen kent, `bindSearch({ source: "catalog" })` en de taalregels als optie.

## 10. Machine-leesbare API

Er is geen `llms.txt`, `AGENTS.md` of JSON-overzicht. Een agent moet
attributen, events en CSS-variabelen uit de broncode halen. In geen enkel
document staan: `data-grid-columns`, `data-block-span` zonder modus,
`data-page-section`, `data-block-variant` als invoer en het event
`blocks:content-resize`.

De test die docs en code gelijk houdt, kijkt alleen of een naam ergens
voorkomt (`tests/docs-api-contract.mjs:52`); `id` of `type` slaagt op bijna
elke tekst. `blocks.storage.d.ts` wordt niet meegeteld.

Voorstel: een `api.json` gemaakt uit de `.d.ts` (leden, events met hun detail,
attributen, CSS-variabelen, foutcodes), een korte `llms.txt` met het
markup-contract van `hydrate()` en de testopdrachten, en een geëxporteerde
`version`.

## Buiten de tien

- **Toegankelijkheid.** Het block (`<section>`) heeft geen toegankelijke naam.
  De titel heeft `role="button"` maar doet niets op Enter of spatie. De dock
  draagt het label van de sluitknop. Kopiëren en verplaatsen met het
  toetsenbord melden niets aan een schermlezer.
- **Tests.** `npm test` is één ketting van veertien stappen; de eerste fout
  verbergt de rest. `contract.mjs` en `storage.mjs` lezen de `.min.mjs`, dus
  `build:min` moet eerst draaien. Een `test:node` en `test:browser` en een
  tabel "één test draaien" in `tests/README.md` zouden helpen.
- **Uitgeven.** Een release raakt met de hand een tiental bestanden, en 62
  keer `v0.6.1` of `?v=` in 17 bestanden. Een `tools/release.mjs` kan dat doen.
- **De pin van de consument.** Niets meldt op welke commit de Lucas Gent-site
  staat en wat ze mist.
- **Opslag.** Geen `list`, `delete` of `has`; `load` gooit bij een ontbrekend
  bestand, dus er is geen eerste keer.
