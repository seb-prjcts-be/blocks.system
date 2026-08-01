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

  const block = blocks.system.add("<p>hallo</p>");
  block.menu("test", true);
  block.color = "red";
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

```js
blocks.system.attach("#veld");
blocks.system.setGrid(3, 2);
blocks.system.snap = true;
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
- `blocks.system.add(content, options)`
- `blocks.system.register(definition)`
- `blocks.system.registerAdapter(id, adapter)`
- `blocks.system.list()` / `get()` / `listAdapters()`
- `blocks.system.mount()` / `unmount()` / `remount()`
- `blocks.system.snippet()` / `address()`
- `block.menu(name, close)` / `block.color` / `block.remove()`

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
