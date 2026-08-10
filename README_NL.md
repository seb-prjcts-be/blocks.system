# blocks.system

**[Home](https://seb-prjcts-be.github.io/blocks.system/)** ·
**[Handleiding](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)** ·
**[Voorbeelden](https://seb-prjcts-be.github.io/blocks.system/docs/#next)**

`blocks.system` is een dependencyvrije ESM-browserkern voor individueel
adresseerbare HTML, SVG, canvas, custom elements en adaptergestuurde inhoud.

## Start

```html
<link rel="stylesheet" href="./blocks.system.css">
<div id="blocks-field"></div>

<script type="module">
  import { createBlocksSystem } from "./blocks.system.mjs";

  const blocks = createBlocksSystem({
    snap: true,
    colorArray: ["cyan", "magenta", "yellow"],
    colorVariation: 0.2,
    inversionVariation: 0.5,
    blockDefaults: { menu: { minimize: true, close: true } }
  });

  blocks.attach("#blocks-field");
  blocks.setGrid(4, 2);

  const blockHallo = blocks.add("<p>hallo</p>", {
    id: "block-hallo",
    title: "hallo"
  });
  blockHallo.span(2, 1);
  blockHallo.place(1, 1);
</script>
```

De naamgeving is bewust: `blocks` is het geconfigureerde systeem; iedere
teruggegeven controller begint met `block`. Voor gebruik zonder configuratie
exporteert de module ook het gedeelde `system`, globaal als
`window.blocks.system`.

`colorVariation` geldt alleen voor nieuwe blocks waarvan de variant uit `random`
wordt bepaald: `0.2` geeft de CSS-kleuren uit `colorArray` twintig procent van het
bereik. `inversionVariation: 0.5` maakt de helft van de overige monochrome
blocks `inverse`; de andere helft blijft `regular`. Standaard is kleur `0` en
inversie `1 / 3`, gelijk aan de eerdere zwart-witverdeling. Een expliciete
blockvariant wint altijd en bestaande blocks verkleuren nooit achteraf.

`colorArray` is volledig van de gebruiker. De array aanvaardt CSS-kleurwaarden
zoals namen, hex, `rgb()` of `var()` en is standaard `[]`; voor een positieve
`colorVariation` moet je dus minstens één kleur opgeven. De CMY-array hierboven
is alleen de keuze van dit voorbeeld. De library bezit geen RGB/CMY-palet.

## Midden

`blocks.add(content)` aanvaardt vertrouwde HTML, een object uit de DOM
(bijvoorbeeld een element) of een functie die een van beide teruggeeft. Geef
onvertrouwde tekst nooit als HTML door; maak een element en gebruik
`textContent`.

Eén `block…`-controller bezit het menu, de span, plaats, variant,
minimaliseerstatus en verwijdering van één object:

```js
const blockCanvas = blocks.add(document.createElement("canvas"), {
  id: "block-canvas",
  title: "canvas"
});
blockCanvas.span(2, 1);
blockCanvas.place(2, 1);
blockCanvas.variant = "inverse";
blockCanvas.minimized = false;
blockCanvas.color = "#222";
blockCanvas.remove();
```

De ingebouwde varianten zijn `regular` en `inverse`. Een kleur uit je array
gebruikt één generieke `color`-state: de gekozen kleur tekent het blockkader en
de menubalk, terwijl het blockpapier en de gerenderde inhoud neutraal blijven.
Het menu kiest automatisch de systeeminkt of het systeempapier met het sterkste
contrast tegen de gekozen kleur. Bij versleepbare blocks hergebruikt het
hoverkader de huidige blockrandkleur, ook bij inverse en gebruikerskleuren.
Andere expliciete variantnamen blijven haken voor je eigen CSS, maar de
library geeft ze geen ingebouwde kleurstijl.

## Einde

Gebruik alleen een adapter wanneer inhoud een mountcyclus, cleanup of
herbruikbare definitie nodig heeft. De kern krijgt nooit rendererspecifieke
kennis.

Een ingebouwde `html`-adapter mount en snippet definities met vertrouwde
`markup` — dezelfde vertrouwensgrens als `add(content)`. Een definitie mag ook
de `url` dragen van de pagina waar het block woont; `address(id)` linkt dan
naar die pagina in plaats van naar de gedeelde `catalogUrl`. Een levend
`add()`-block serialiseert zichzelf naar zo'n definitie met
`block.describe({ url })`, zodat een andere pagina het kan registreren
(bijvoorbeeld via `createBlocksSystem({ blocks })`) en de echte inhoud toont in
plaats van een parafrase. Registreer alleen definities uit bronnen die je
vertrouwt: de `markup` van een definitie wordt overal als HTML geïnjecteerd,
dus registreer nooit ongecontroleerd opgeslagen of door gebruikers aangeleverde
definities.

```js
blocks.registerAdapter("block-melding", {
  mount({ host, settings }) {
    const blockMeldingNode = document.createElement("p");
    blockMeldingNode.textContent = settings.text;
    host.appendChild(blockMeldingNode);
    return blockMeldingNode;
  }
});

blocks.register({
  id: "block-welkom",
  label: "welkom",
  adapter: "block-melding",
  medium: "html",
  defaults: { text: "hallo" }
});
```

## API-overzicht

- Aanmaak: `createBlocksSystem({ snap, draggable, variant, colorArray, colorVariation, inversionVariation, blockDefaults })`.
- Gedeeld systeem: `attach`, `setGrid`, `compact`, `columns`, `rows`, `snap`, `draggable`, `font`, `variant`,
  `variants`, `colorArray`, `colorVariation`, `inversionVariation`, `add`.
- Definities: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Levenscyclus: `mount`, `unmount`, `remount`, `snippet`, `address`.
- Eén block: `menu`, `minimized`, `span`, `place`, `flow`, `describe`, `variant`, `color`, `remove`.

Toegankelijke menulabels volgen de documenttaal (`nl` of Engels) en zijn
overschrijfbaar via `createBlocksSystem({ labels: { move, minimize, restore,
close } })`. Bij een vergrendelde layout verdwijnen menuheaders uit de
toetsenbordvolgorde; hun minimaliseer- en sluitknoppen blijven bereikbaar.

`blockDefaults.menu` geeft ieder nieuw block dezelfde menuknoppen. `title` is
optioneel: zonder titel heeft het menu geen zichtbare titel, terwijl het block-
`id` de toegankelijke fallbacknaam voor de knoppen blijft. Gebruik `menu: false`
om de volledige balk weg te laten, of een lokaal `menu`-object voor een
uitzondering.

Verslepen via de menubalk van een block staat standaard aan. Tijdens het slepen
toont een magnetische preview waar het block zal landen, terwijl de andere
blocks stilstaan. Met `snap = true` blijft een vrije doelcel gestippeld; een
bezette neerwaartse doelcel wordt vol met een `↓`. Bij loslaten behouden de
verdrongen blocks hun kolom en settelen ze samen omlaag. `flow()` zet een
ruimtelijk verplaatst block terug in CSS auto-flow. Focus dezelfde header en
gebruik de pijltjestoetsen voor dezelfde rasterbeweging zonder pointer. Na een
pointer- of toetsverplaatsing vuurt de surface `blocks:reorder` met één vaste
detailvorm: `id`, `input`, `mode`, `key`, indices, rasterposities en richting.
Zet `blocks.draggable = false` om de layout te vergrendelen.

Gebruik `blocks.compact()` alleen wanneer je expliciet gaten wil vullen. De
methode houdt ieder geplaatst block in zijn kolom en bewaart de verticale
volgorde van blocks met overlappende kolommen; het ingestelde raster verkleint
niet stilzwijgend. `block.minimized` blijft inklappen op dezelfde plaats.
Bij `remove()` komt de vroegere rasterruimte van het geplaatste block vrij. Als
daardoor een rij volledig onbewoond wordt, mag een later passend block naar die
rij opschuiven; bewust lege compositieruimte blijft leeg. Gebruik `compact()`
wanneer je andere resterende verticale gaten expliciet wil sluiten. Het veld vuurt
`blocks:change` voor `compact`, `minimize`, `restore` en `remove`.
Trackpad- en wheelscroll boven gewone blockinhoud blijft de pagina scrollen;
alleen echt overlopende binneninhoud scrollt eerst lokaal.
De gemeten werking en grenzen staan duurzaam in
[`docs/DRAG-BEHAVIOR.md`](docs/DRAG-BEHAVIOR.md).

Bekijk de [huidige `main`-API-reference (nog niet uitgebracht)](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
voor argumenten en returnwaarden. Stabiele installatiesnippets blijven tot de
volgende release vastgepind op de onveranderlijke tag `v0.2.0`.

## Gecontroleerde status

Op 2026-08-08 bevat de huidige `main`-werkmap de gedocumenteerde publieke
werking: blocks aanmaken en beheren, menu's, gridlayout,
snap- en toetsenbordbeweging, `compact()`, varianten en toevalskleur,
adapters, events, TypeScript-declaraties, home, manual, reference en drie
uitvoerbare voorbeelden.

Lokaal geslaagd:

- `npm run check`: minified ESM, contracten, TypeScript, pagina's,
  links, voorbeelden en responsieve browser-layoutchecks.
- `npm run test:presentation`: presentatie- en publieke paginastructuurchecks.
- Apache/XAMPP: `/`, `/docs/` en `/examples/` geven elk HTTP 200.

`v0.2.0` is de recentste onveranderlijke publieke release, beschikbaar via de
GitHub-release-tag. `main` kan later, nog niet uitgebracht werk bevatten; gebruik
het niet als onveranderlijke distributieverwijzing.

## Ontwikkelen

```powershell
npm install
npm run check
```

`npm run check` bouwt de minified module opnieuw en controleert
daarna API, docs, voorbeelden, lokale links en de echte showcase-layout in
headless Chrome. Stel `CHROME_PATH` in wanneer Chrome of Edge niet op een
standaardlocatie staat.

MIT-licentie. Ontwikkeld door Sebastien Vanblaere.
