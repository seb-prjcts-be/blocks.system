# blocks.system functieoverzicht

Dit is de volledige publieke API zoals `blocks.system.d.ts` en
`blocks.storage.d.ts` ze beschrijven. De exacte argumenten, foutcodes en
CSS-haken staan in de [reference](api.html). De drie functies onder
"Declaratieve pagina's" zitten nog niet in een uitgebrachte versie.

## Module-exports (`blocks.system.mjs`)

| Export | Doet |
|---|---|
| `createBlocksSystem(options?)` | Maakt een geconfigureerd systeem: layout, grid-gedrag, kleuren, labels, adapters en definities. |
| `system` | Het gedeelde zero-config systeem, ook bereikbaar als `window.blocks.system`. |
| `startBlock(content, options?)` | Voegt één blok toe aan het gedeelde systeem; maakt zelf een veld als er geen is. |

## Systeem (`BlocksSystem`)

### Veld en grid

| Functie | Doet |
|---|---|
| `attach(target)` | Koppelt het systeem aan een bestaand element. |
| `setGrid(columns, minRows)` | Legt kolommen vast en zet het minimum aantal rijen; rijen groeien mee met inhoud. |
| `compact()` | Vult gaten in fixed-grid, of trekt blokken omhoog in flow-grid. |
| `fitHeight(ids?)` | Past de rijspan van alle of de gegeven blokken aan aan hun gerenderde hoogte. |
| `add(content, options?)` | Maakt een blok uit HTML, een element of een factory en geeft de controller terug. |

### Layout bewaren en herstellen

| Functie | Doet |
|---|---|
| `exportLayout()` | Geeft inhoudsvrije layoutstaat terug: volgorde, spans, plaatsen, minimized, docked, pinned. |
| `restoreLayout(layout, options?)` | Zet een bewaarde layout terug, optioneel met een ander grid. |
| `saveBaseline()` | Maakt de huidige staat het doel van `reset()`. |
| `reset()` | Zet alle blokken terug naar de baseline en publiceert één `reset`-event. |

### Definities en adapters

| Functie | Doet |
|---|---|
| `register(definition, options?)` | Registreert een blokdefinitie in de catalogus. |
| `registerAdapter(id, adapter, options?)` | Registreert een adapter die definities kan mounten. |
| `listAdapters()` | Namen van alle adapters. |
| `list(filters?)` | Definities, filterbaar op `query`, `adapter`, `medium` en `category`. |
| `get(id)` | Eén definitie of `null`. |

### Lifecycle van definities

| Functie | Doet |
|---|---|
| `mount(id, target, overrides?)` | Mount een definitie via haar adapter in een doelelement. |
| `unmount(target)` | Haalt een gemount blok weer weg. |
| `remount(id, target, overrides?)` | Unmount en mount in één stap. |
| `snippet(id, overrides?)` | Geeft de codesnippet van een definitie terug. |
| `address(id)` | Geeft de deeplink-URL van een blok terug. |

### Declaratieve pagina's

| Functie | Doet |
|---|---|
| `hydrate(target, options?)` | Maakt van HTML-blokken in een veld levende blokken met responsive spans, auto-fit, deeplinks en bezoekersopslag. Geeft het veld terug met een `blocksPage`-object. |
| `resolveAddress(options?)` | Scrolt naar en markeert het blok uit `?block=` of de hash. |
| `bindSearch(options?)` | Koppelt live filteren met diakritiek-ongevoelige ranking aan een zoekveld en tegels. |

Het `blocksPage`-object van een gehydrateerd veld biedt `currentLayout()`,
`applyComposition(pageLayout)` en `fitContent()`.

### Eigenschappen

Leesbaar: `columns`, `rows`, `layout`, `variants`, `labels`, `field`.

Leesbaar en schrijfbaar: `rowHeight`, `dockPosition`, `draggable`,
`resizable`, `font`, `variant`, `colorArray`, `colorVariation`,
`inversionVariation`.

## Blokcontroller (`BlockController`)

| Lid | Doet |
|---|---|
| `menu(name, options?)` | Stelt titelbalk en menuknoppen in. |
| `dock(value?)` | Verplaatst het blok naar of uit de dockrail zonder te verwijderen. |
| `pin(value?)` | Markeert als favoriet; favorieten blijven vooraan en negeren `dock()`. |
| `summary(content)` | Korte inhoud voor de dockchip, of `null` om te wissen. |
| `span(columns, rows)` | Grootte in gridunits. |
| `place(column, row)` | Vaste positie in fixed-grid. |
| `fitHeight()` | Past de rijspan aan aan de inhoud; geeft terug of er iets veranderde. |
| `describe(options?)` | Serialiseert het levende blok tot een registreerbare definitie voor de `html`-adapter. |
| `remove()` | Verwijdert het blok definitief. |

Leesbaar: `id`, `element`, `content`. Leesbaar en schrijfbaar: `color`,
`variant`, `minimized`, `docked`, `pinned`, `draggable`.

## Adapterinterface (`BlockAdapter`)

Een adapter levert `mount(context)` en optioneel `ready(context)`,
`unmount(mounted)` en `snippet(context)`.

## Events op het veld

| Event | Wanneer |
|---|---|
| `blocks:reorder` | Na een verplaatsing met pointer of toetsenbord, met id, modus, indices, posities en richting. |
| `blocks:resize` | Na een spanwijziging via de resize-lijnen, met as, oude en nieuwe grootte. |
| `blocks:change` | Bij `compact`, `dock`, `undock`, `pin`, `unpin`, `minimize`, `restore`, `remove`, `reset`, `layout` en `grid`. |

## Storage-module (`blocks.storage.mjs`)

| Export | Doet |
|---|---|
| `createBlocksStorage(adapter)` | Wikkelt een eigen adapter in de storage-interface met `load(keys?)` en `commit(change)`. |
| `createJsonStorage({ directory, documents })` | Opslag in JSON-bestanden via de File System Access API. |
| `createHttpStorage({ endpoint, fetch? })` | Opslag via een HTTP-endpoint. |
| `BlocksStorageConflictError` | Fout bij een revisieconflict tijdens `commit()`. |

De bron `blocks.system.mjs` bevat daarnaast interne hulpfuncties voor meten,
slepen en rendering. Die zijn niet geëxporteerd en staan hier bewust niet bij.
