# blocks.system

**[Handleiding](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)** ·
**[Voorbeelden](https://seb-prjcts-be.github.io/blocks.system/docs/#examples)**

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
    blockDefaults: { menu: { close: true } }
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

`blocks.add(content)` aanvaardt vertrouwde HTML, een DOM-node of een functie die
een van beide teruggeeft. Geef onvertrouwde tekst nooit als HTML door; maak een
node en gebruik `textContent`.

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
Het menu gebruikt neutrale inkt. Andere expliciete variantnamen blijven haken voor je eigen CSS, maar de
library geeft ze geen ingebouwde kleurstijl.

## Einde

Gebruik alleen een adapter wanneer inhoud een mountcyclus, cleanup of
herbruikbare definitie nodig heeft. De kern krijgt nooit rendererspecifieke
kennis.

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
- Gedeeld systeem: `attach`, `setGrid`, `snap`, `draggable`, `font`, `variant`,
  `variants`, `colorArray`, `colorVariation`, `inversionVariation`, `add`.
- Definities: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Levenscyclus: `mount`, `unmount`, `remount`, `snippet`, `address`.
- Eén block: `menu`, `minimized`, `span`, `place`, `flow`, `variant`, `color`, `remove`.

Toegankelijke menulabels volgen de documenttaal (`nl` of Engels) en zijn
overschrijfbaar via `createBlocksSystem({ labels: { move, minimize, restore,
close } })`. Bij een vergrendelde layout verdwijnen menuheaders uit de
toetsenbordvolgorde; hun minimaliseer- en sluitknoppen blijven bereikbaar.

`blockDefaults.menu` geeft ieder nieuw block dezelfde menuknoppen. Geef ieder
block zijn eigen `title`; gebruik `menu: false` of een lokaal `menu`-object in
`add()` voor een uitzondering.

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
Trackpad- en wheelscroll boven gewone blockinhoud blijft de pagina scrollen;
alleen echt overlopende binneninhoud scrollt eerst lokaal.
De gemeten werking en grenzen staan duurzaam in
[`docs/DRAG-BEHAVIOR.md`](docs/DRAG-BEHAVIOR.md).

Bekijk de [volledige API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
voor argumenten en returnwaarden.

## Ontwikkelen

```powershell
npm install
npm run check
```

`npm run check` bouwt de minified module en het manifest opnieuw en controleert
daarna API, docs, voorbeelden, lokale links en de echte showcase-layout in
headless Chrome. Stel `CHROME_PATH` in wanneer Chrome of Edge niet op een
standaardlocatie staat.

MIT-licentie. Ontwikkeld door Sebastien Vanblaere.
