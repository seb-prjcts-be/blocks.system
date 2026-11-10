# Logboek voor de Lucas Gent-clone

De Lucas Gent-site (`C:\server\htdocs\lucasgent_clone_blocks`) laadt deze lib
van jsDelivr op één vaste commit: `BLOCKS_SYSTEM_REF` in `index.php`. Een
wijziging hier bereikt de site dus pas wanneer die regel verandert. Dit bestand
houdt bij wat er sinds de huidige pin veranderde en wat dat voor de site
betekent.

Elke wijziging aan de lib die de site kan raken, komt hier bij. Verzet je de
pin, schrijf dan de nieuwe commit bovenaan en ruim de afgewerkte lijst op.

## Stand

| | |
|---|---|
| Pin in de clone | `5787bdd` (`index.php`, regel 47) |
| Lib sinds die pin | de ronde van 2026-11-10 hieronder |
| Staat van die ronde | geschreven en getest in de lib, **nog niet gecommit** |
| Getest in de clone | nee, zie "Nog te doen" |

## Ronde van 2026-11-10: tien verbeteringen, eerste deel

Uitgangspunt: alles komt erbij, niets van wat de clone gebruikt verandert van
gedrag. Hieronder staat per wijziging wat ik in de clone nagekeken heb. Dat
nakijken was lezen en zoeken in de code van de clone, niet draaien.

### Wat de clone zonder ingreep blijft doen

| Wijziging in de lib | Waarom de clone niets merkt |
|---|---|
| `exportLayout()` geeft ook `grid` terug | De clone leest alleen `.blocks` (`js/vierkant-raster.mjs` regels 60, 71, 238, 308 en `scripts/probe-drag.mjs`). |
| `blocks:change` heeft de nieuwe types `add`, `title` en `batch` | `js/vierkant-raster.mjs` regel 27 werkt met een vaste lijst (`VERANDERINGEN`); onbekende types slaat ze over. `beheer/page-editor.mjs` luistert alleen naar `blocks:reorder`. |
| Elke fout draagt nu `error.code` | De zinnen zijn gelijk gebleven. Ik vond in de clone geen code die op een fouttekst of een foutcode van de lib test. |
| `restoreLayout()` is intern gesplitst in controleren en uitvoeren | Dezelfde controles in dezelfde volgorde, dezelfde events daarna. De clone geeft volledige items door met `version: 1`. |
| Events vertrekken langs één functie, `publish()` | Zelfde events, zelfde detail, zelfde volgorde, nog steeds op het veld en zonder opborrelen. |
| `hydrate()` en `bindSearch()` onthouden hoe ze op te ruimen zijn | Dat gebeurt alleen bij `destroy()`, en de clone roept dat niet aan. |
| `blocks.system.css` | Ongewijzigd. |

Eén zin veranderde: `building blocks verwacht een geldig host-element.` heet nu
`blocks.system verwacht een geldig host-element.` De clone gebruikt die tekst
niet.

### Waar je bij de test op let

- **`add`-events.** `add()` vuurt nu `blocks:change` met type `add`.
  `beheer/page-editor.mjs` regel 1367 roept `blocks.add()` aan terwijl het
  raster luistert. Het raster hoort dat type over te slaan. Klopt dat niet, dan
  zie je het aan een extra herindeling bij het toevoegen van een block in de
  editor.
- **De min-bestanden.** De clone laadt wat `index.php` kiest; kijk na of dat
  `blocks.system.mjs` of `blocks.system.min.mjs` is. Beide zijn opnieuw gebouwd.

### Wat de clone eenvoudiger kan maken

Niet nodig, wel mogelijk zodra de pin verzet is.

| Nu in de clone | Kan worden | Winst |
|---|---|---|
| `blocksPage.controllers.find((c) => c.id === id)` (`beheer/page-editor.mjs` regel 1338) | `blocksPage.blocks.block(id)` | Vindt ook blocks die de editor later met `add()` toevoegde. `controllers` is de lijst van het moment van `hydrate()`. |
| Lus over `blocksPage.controllers` met `remove()` (`beheer/page-editor.mjs` regel 1460) | lus over `blocksPage.blocks.blocks()` | Zelfde reden: neemt ook later toegevoegde blocks mee. |
| De vlag `bezig` rond een reeks `restoreLayout()`-aanroepen (`js/vierkant-raster.mjs`) | `blocks.batch(() => { ... })` | Eén melding na de reeks in plaats van luisteraars die zichzelf moeten negeren. Alleen doen als het de code korter maakt. |
| Geen zicht op stille weigeringen | `createBlocksSystem({ onIssue: console.warn })` tijdens ontwikkelen | Zegt waarom `hydrate()` niets deed of een `dock()` genegeerd werd. |
| Zelf uitzoeken of een opname past | `blocks.checkLayout(opname, { grid })` | Geen `try` rond `restoreLayout()` nodig. |

### Nog te doen

1. Seb: de ronde committen en pushen op main van de lib. Zeg het en het
   gebeurt.
2. Daarna in de clone `BLOCKS_SYSTEM_LOCAL` in `index.php` tijdelijk op `true`
   zetten. De site laadt dan `..\blocks.system` van schijf.
3. `http://localhost/lucasgent_clone_blocks/` openen: een pagina met blocks, de
   kaart, zoeken, een block naar de dock en terug, en in beheer een block
   toevoegen en verslepen.
4. De poort draaien in de clone, met Node 24:

   ```bash
   node scripts/check.mjs
   ```

5. `BLOCKS_SYSTEM_LOCAL` terug op `false`, `BLOCKS_SYSTEM_REF` op de nieuwe
   commit van de lib, de poort nog eens, en dan de clone committen.
6. Hier bovenaan de nieuwe pin invullen.

## Wat bewust niet veranderde

Deze punten uit [`VERBETERINGEN.md`](VERBETERINGEN.md) zouden gedrag wijzigen
waar de clone op steunt. Ze wachten op een beslissing van Seb.

| Punt | Waarom het wacht |
|---|---|
| CSS meeleveren voor `blocks-system-heading-hidden`, `-reset`, `-search-results`, `-footnotes` | De clone heeft daar eigen regels voor in `css/blocks-layer.css`. Een regel in de lib kan die kruisen, zeker als de clone met CSS-lagen werkt. |
| De titel uit de kop halen als `data-block-title` ontbreekt | Een block dat nu bewust een lege titelbalk heeft, zou plots tekst tonen. |
| Events laten opborrelen | Een veld in een block zou zijn events aan het buitenste veld doorgeven. |
| In `restoreLayout()` een ontbrekende `docked`, `pinned` of `minimized` laten betekenen "behouden" | Nu betekent ontbreken `false`. Dat is uitgebracht gedrag. |
| De bewaarvorm van `hydrate()` in `localStorage` | Bezoekers van de site hebben al opgeslagen indelingen in de huidige vorm. |
| `data-block-place` en een vaste layout in `hydrate()` | Raakt de kern van hoe de site haar pagina's legt; vraagt eerst een ontwerp. |
