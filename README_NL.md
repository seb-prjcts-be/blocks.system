# blocks.system

**[Open site](https://seb-prjcts-be.github.io/blocks.system/)** · **[Handleiding](https://seb-prjcts-be.github.io/blocks.system/docs/guide.html)** · **[Voorbeelden](https://seb-prjcts-be.github.io/blocks.system/docs/examples.html)**

`blocks.system` is een kleine ESM-first browserlibrary voor individueel
adresseerbare objecten. Een block kan HTML, SVG, canvas, een custom element,
een iframe, native controls of adaptergestuurde inhoud bevatten.

De kern kent geen p5.js, waves, framework of renderer. Die kunnen als
optionele adapters worden aangesloten zonder de library te wijzigen.

## Installeren

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@main/blocks.system.css">

<script type="module">
  import { system } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@main/blocks.system.min.mjs";
</script>
```

Gebruik een release-tag in plaats van `@main` wanneer reproduceerbaar gedrag
belangrijk is.

## Snel starten

```html
<div id="veld"></div>

<script type="module">
  import { system } from "./blocks.system.mjs";

  blocks.system.attach("#veld");
  blocks.system.setGrid(4, 2);
  blocks.system.snap = true;
  blocks.system.draggable = true;

  const block = blocks.system.add("<p>hallo</p>");
  block.menu("test", true);
  block.color = "red";
  block.span(2, 1);
  block.place(3, 2);
</script>
```

De import exposeert dezelfde singleton als `window.blocks.system`. Algemene
eigenschappen staan onder `blocks.system`; eigenschappen van één object staan
onder het teruggegeven `block`.

## Inhoud

`blocks.system.add(content)` aanvaardt:

- een HTML-string;
- een DOM-node, waaronder canvas, SVG, iframe en custom elements;
- een functie die een HTML-string of DOM-node teruggeeft.

Een HTML-string wordt bewust als HTML geïnterpreteerd. Gebruik alleen vertrouwde
inhoud of bouw zelf een DOM-node.

## Grid

`setGrid(x, y)` gebruikt aantallen kolommen en rijen. `attach()` aanvaardt een
CSS-selector of DOM-element en neemt nooit stilzwijgend `document.body` over.

`block.span(x, y)` laat één object hele rastereenheden innemen. De standaard is
`1, 1`; een span moet binnen het huidige raster passen.

`block.place(x, y)` gebruikt kolom- en rijcoördinaten vanaf één. Blocks zonder
plaats behouden de automatische gridflow; expliciet geplaatste blocks mogen
niet overlappen. Laat een block ongeplaatst wanneer de versleepbare volgorde
zijn positie moet bepalen.

Blocks behouden standaard de oorspronkelijke tussenruimte van `6px`. Stel
`--blocks-gap` op het gekoppelde veld in wanneer een compositie wil afwijken.

De stylesheet levert de volledige out-of-the-box-compositie: zwarte blocks,
warme papier- en veldkleuren, een menu van `22px` en `7px` inhoudsruimte. Iedere
afwijking is de verantwoordelijkheid van de gebruiker via CSS-variabelen of
specifiekere CSS.

```js
blocks.system.attach("#veld");
blocks.system.setGrid(3, 2);
blocks.system.snap = true;
blocks.system.draggable = true;
```

Met verslepen ingeschakeld is de menubalk het handvat. Controls in de inhoud
behouden hun normale pointergedrag.

Ieder menu kan standaard minimaliseren. Daarbij verdwijnt de inhoud, maar blijven
de ingestelde span en positie gereserveerd; herstellen kan dus nooit met een
ander block botsen. Inhoud scrollt binnen het block zodra ze niet meer past.

```js
block.menu("preview", { close: true, minimize: true });
block.minimized = true;
block.minimized = false;
```

De oudere vorm `block.menu("preview", true)` blijft geldig en betekent een
minimaliseerbaar menu met sluitknop. Gebruik `minimize: false` om de knop weg te
laten. De basisstylesheet bevat geen animatie; motion hoort in een aparte,
optionele stylesheet.

Nieuwe blocks krijgen één stabiele willekeurige monochrome variant. `regular`
heeft dubbel zoveel kans als `inverse`, zodat de normale zwart-op-papier-
compositie dominant blijft. Zuivere RGB/CMY-varianten zijn ingebouwd, maar
blijven expliciet:

```js
blocks.system.variant = "random"; // standaard voor nieuwe blocks

const automatisch = blocks.system.add(content);
const inverse = blocks.system.add(content, { variant: "inverse" });
automatisch.variant = "blue";
```

Ingebouwd zijn `regular`, `inverse`, `red`, `green`, `blue`, `cyan`, `magenta`
en `yellow`. Eigen lowercase kebab-case-namen werken via CSS op
`[data-block-variant="..."]`. Bij mouseover verschijnt de oorspronkelijke
dikkere binnenlijn zonder dat het block verschuift.

Externe fonts blijven opt-in. Geef een stylesheet-URL en de bijbehorende
fontfamilie op; dezelfde URL wordt maar één keer toegevoegd. Zet `font` opnieuw
op `null` om de CSS-standaard en systeemfallback te gebruiken.

```js
blocks.system.font = {
  href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&display=swap",
  family: "Oswald"
};
```

## Adapters

Een adapter heeft minstens `mount()` nodig. `unmount()`, `ready()` en
`snippet()` zijn optioneel.

```js
blocks.system.registerAdapter("melding", {
  mount({ host, block, settings }) {
    const node = document.createElement("p");
    node.textContent = `${block.label}: ${settings.text}`;
    host.appendChild(node);
    return node;
  }
});

blocks.system.register({
  id: "welkom",
  label: "welkom",
  adapter: "melding",
  medium: "html",
  defaults: { text: "hallo" }
});
```

## Publieke API

- `blocks.system.attach(target)`
- `blocks.system.setGrid(columns, rows)`
- `blocks.system.snap`
- `blocks.system.draggable`
- `blocks.system.font`
- `blocks.system.variant` / `blocks.system.variants`
- `blocks.system.add(content, options)`
- `blocks.system.register(definition)`
- `blocks.system.registerAdapter(id, adapter)`
- `blocks.system.list()` / `get()` / `listAdapters()`
- `blocks.system.mount()` / `unmount()` / `remount()`
- `blocks.system.snippet()` / `address()`
- `block.menu(name, options)` / `block.minimized` / `block.span(x, y)` / `block.place(x, y)` / `block.variant` / `block.color` / `block.remove()`

## Ontwikkelen

```powershell
npm install
npm run check
```

`npm run check` bouwt de minified ESM-versie opnieuw, genereert het manifest en
controleert contract, bron/min-pariteit, documentatie en links.

## Documentatiecontract

API-wijzigingen moeten in dezelfde commit landen in `README.md`,
`README_NL.md`, `docs/guide.html`, `docs/api.html`, voorbeelden, tests en
`docs/blocks.system.manifest.json`.

MIT-licentie. Ontwikkeld door Sebastien Vanblaere.
