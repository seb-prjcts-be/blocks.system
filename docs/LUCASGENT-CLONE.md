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
| Pin in de clone | `73036ee` (`index.php`, regel 47), sinds 2026-11-10 |
| Vorige pin | `5787bdd` |
| Clone-commit van de pin | `0fe06c9`, **nog niet gepusht** |
| Lib sinds de pin | alleen documentatie: dit logboek |

De ronde hieronder zit dus in de pin. Ze blijft staan als naslag tot de
volgende ronde.

## Uitslag van de test (2026-11-10, PRJCTS01)

Eerst lokaal: met `BLOCKS_SYSTEM_LOCAL = true` laadde de clone de lib van
schijf op commit `73036ee`. Daarna op de pin zelf, van jsDelivr; de bestanden
daar zijn byte voor byte gelijk aan die op schijf.

- **Poort, lokaal:** `node scripts/check.mjs` met Node 24.16: alle 9
  controles groen. Daarin zitten 28 pagina's op 4 breedtes, de kaart, een echte
  blockdrag, de redactietransactie met herstel en een foutloze console.
- **Poort, op de pin:** de eerste keer 8 van 9. De controle "lopende tekst na
  een afbeelding" in `scripts/check-navigatie.mjs` (regel 483) wacht hoogstens
  twee seconden op het bewaren in de editor en haalde dat niet. Die controle
  slaagde daarna twee keer apart, en de volledige poort erna was 9 van 9. Het
  is dus een hapering in de tijd, geen fout in de lib; ze staat hier omdat ze
  kan terugkomen.
- **In de browser:** de startpagina, `praktisch` en `kaart` laden zonder
  consolefouten. Een block naar de dock en terug geeft de events `dock` en
  `undock` en dezelfde indeling als voordien. Zoeken op de kaart geeft
  treffers. `blocksPage.blocks.block(id)` geeft voor elk block dezelfde
  controller als `blocksPage.controllers`.
- **Niet met de hand bekeken:** de editor in beheer (block toevoegen en
  verslepen). De poort dekt de redactie en de blockdrag wel.

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

1. Seb: de clone pushen (commit `0fe06c9`). Zeg het en het gebeurt.
2. De editor in beheer eens met de hand bekijken: een block toevoegen en
   verslepen.

### Zo verzet je de pin een volgende keer

1. Main van de lib pushen; jsDelivr leest van GitHub.
2. In de clone `BLOCKS_SYSTEM_REF` in `index.php` op de nieuwe commit zetten.
3. De poort draaien in de clone, met Node 24. Ze meet dan de pin zelf:

   ```bash
   node scripts/check.mjs
   ```

4. De clone committen, en hier bovenaan de nieuwe pin invullen.

Wil je de lib eerst lokaal proberen: zet `BLOCKS_SYSTEM_LOCAL` in `index.php`
tijdelijk op `true`. De site laadt dan `..\blocks.system` van schijf. Commit
die schakelaar nooit op `true`.

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
