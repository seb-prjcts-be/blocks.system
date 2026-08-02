# blocks.system

**[Start](https://seb-prjcts-be.github.io/blocks.system/docs/guide.html)** ·
**[Blocks](https://seb-prjcts-be.github.io/blocks.system/docs/guide-blocks.html)** ·
**[Einde](https://seb-prjcts-be.github.io/blocks.system/docs/guide-finish.html)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)** ·
**[Voorbeelden](https://seb-prjcts-be.github.io/blocks.system/docs/examples.html)**

`blocks.system` is een dependencyvrije ESM-browserkern voor individueel
adresseerbare HTML, SVG, canvas, custom elements en adaptergestuurde inhoud.

## Start

```html
<link rel="stylesheet" href="./blocks.system.css">
<div id="blocks-field"></div>

<script type="module">
  import { system as blocks } from "./blocks.system.mjs";

  blocks.attach("#blocks-field");
  blocks.setGrid(4, 2);
  blocks.snap = true;
  blocks.draggable = true;

  const blockHallo = blocks.add("<p>hallo</p>", {
    id: "block-hallo"
  });
  blockHallo.menu("hallo", { close: true });
  blockHallo.span(2, 1);
  blockHallo.place(1, 1);
</script>
```

De naamgeving is bewust: `blocks` is het gedeelde systeem; iedere teruggegeven
controller begint met `block`. Het globale browserequivalent is
`window.blocks.system`.

## Midden

`blocks.add(content)` aanvaardt vertrouwde HTML, een DOM-node of een functie die
een van beide teruggeeft. Geef onvertrouwde tekst nooit als HTML door; maak een
node en gebruik `textContent`.

Eén `block…`-controller bezit het menu, de span, plaats, variant,
minimaliseerstatus en verwijdering van één object:

```js
const blockCanvas = blocks.add(document.createElement("canvas"), {
  id: "block-canvas"
});
blockCanvas.menu("canvas", { close: true, minimize: true });
blockCanvas.span(2, 1);
blockCanvas.place(2, 1);
blockCanvas.variant = "blue";
blockCanvas.minimized = false;
blockCanvas.color = "rgb(0, 0, 255)";
blockCanvas.remove();
```

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

- Gedeeld systeem: `attach`, `setGrid`, `snap`, `draggable`, `font`, `variant`,
  `variants`, `add`.
- Definities: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Levenscyclus: `mount`, `unmount`, `remount`, `snippet`, `address`.
- Eén block: `menu`, `minimized`, `span`, `place`, `variant`, `color`, `remove`.

Verslepen via de menubalk van een block staat standaard aan. Zet
`blocks.draggable = false` om de layout te vergrendelen.

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
