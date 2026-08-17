# blocks.system

**[Home](https://seb-prjcts-be.github.io/blocks.system/)** ·
**[Handleiding](https://seb-prjcts-be.github.io/blocks.system/docs/)** ·
**[API](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)**

`blocks.system` is een dependencyvrije ESM-browserkern voor individueel
adresseerbare HTML, SVG, canvas, custom elements en adaptergestuurde inhoud.

## Start

```html
<link rel="stylesheet" href="./blocks.system.css">
<div id="blocks-field"></div>

<script type="module">
  import { createBlocksSystem } from "./blocks.system.mjs";

  const blocks = createBlocksSystem({
    layout: "fixed-grid",
    colorArray: ["cyan", "magenta", "yellow"],
    colorVariation: 0.2,
    inversionVariation: 0.5
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
blockCanvas.place(3, 1);
blockCanvas.variant = "inverse";
blockCanvas.minimized = false;
blockCanvas.color = "#222";
blockCanvas.remove();
```

### Automatische flow en persoonlijke layout

Gebruik `layout: "flow-grid"` wanneer blocks wel een startgrootte maar geen vast
adres nodig hebben. De browser plaatst ze dan in DOM-volgorde zonder gaten
achteraf dicht te vullen. Voeg ze in de gewenste startvolgorde toe; sorteren op
titel blijft een keuze van de toepassing:

```js
const blocks = createBlocksSystem({
  layout: "flow-grid",
  resizable: true,
  variant: "regular"
});

blocks.attach("#blocks-field").setGrid(4, 6);

const collator = new Intl.Collator(document.documentElement.lang, {
  numeric: true,
  sensitivity: "base"
});

for (const item of [...items].sort((a, b) => collator.compare(a.title, b.title))) {
  blocks.add(item.content, { id: item.id, title: item.title }).span(...item.span);
}
```

Verslepen verandert in deze modus de volgorde. Versleep de dunne rechter- of
onderrand om de span in volledige rastereenheden aan te passen; met focus doen
de pijltjestoetsen hetzelfde. Minimaliseren behoudt de titelbalk maar geeft de
extra rijen vrij, zodat volgende blocks automatisch opschuiven.

`exportLayout()` geeft alleen layoutstatus terug—de gekozen modus, id's,
volgorde, spans, vaste plaatsen waar van toepassing en minimaliseerstatus, nooit blockinhoud. Daarom past
`localStorage` goed voor een persoonlijke layout in één browser. Bewaar de
standaard per rol in de toepassing en herstel daarna de lokale afwijking met
een sleutel per rol:

```js
const rol = document.body.dataset.role || "student";
const opslagSleutel = `blocks.system:dashboard:${rol}`;

try {
  const opgeslagenLayout = localStorage.getItem(opslagSleutel);
  if (opgeslagenLayout) blocks.restoreLayout(JSON.parse(opgeslagenLayout));
} catch (error) {
  console.warn("De opgeslagen blocklayout is genegeerd.", error);
}

function bewaarLayout() {
  localStorage.setItem(opslagSleutel, JSON.stringify(blocks.exportLayout()));
}

for (const eventNaam of ["blocks:reorder", "blocks:resize", "blocks:change"]) {
  blocks.field.addEventListener(eventNaam, bewaarLayout);
}
```

`localStorage` hoort bij één browserprofiel en is geen accountdatabase. Gebruik
pas een serveropslag zoals SQLite wanneer layout of inhoud aangemelde personen
over meerdere apparaten moet volgen, gedeeld wordt of centraal beheer nodig
heeft. De kern blijft in beide gevallen opslagneutraal.

De ingebouwde varianten zijn `regular` en `inverse`; inverse wisselt papier en
inkt over het inhoudsvlak. Een kleur uit je array gebruikt één generieke
`color`-state en vult alleen de titelbalk, terwijl het blockpapier en de
gerenderde inhoud neutraal blijven. Het menu kiest automatisch de systeeminkt
of het systeempapier met het sterkste contrast tegen de gekozen kleur. Elk
block behoudt dezelfde dunne zwarte begrenzing en krijgt hetzelfde sterkere
zwarte kader bij mouseover of toetsenbordfocus. Andere expliciete
variantnamen blijven haken voor je eigen CSS, maar de library geeft ze geen
ingebouwde kleurstijl.

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

- Aanmaak: `createBlocksSystem({ layout, draggable, resizable, variant, colorArray, colorVariation, inversionVariation, blockDefaults })`.
- Gedeeld systeem: `attach`, `setGrid`, `compact`, `exportLayout`, `restoreLayout`, `columns`, `rows`, `layout`, `draggable`, `resizable`, `font`, `variant`,
  `variants`, `colorArray`, `colorVariation`, `inversionVariation`, `add`.
- Definities: `register`, `registerAdapter`, `list`, `get`, `listAdapters`.
- Levenscyclus: `mount`, `unmount`, `remount`, `snippet`, `address`.
- Eén block: `menu`, `minimized`, `draggable`, `span`, `place`, `describe`, `variant`, `color`, `remove`.

Toegankelijke menulabels volgen de documenttaal (`nl` of Engels) en zijn
overschrijfbaar via `createBlocksSystem({ labels: { move, resize, minimize, restore,
close } })`. Bij een vergrendelde layout verdwijnen menuheaders uit de
toetsenbordvolgorde; hun minimaliseer- en sluitknoppen blijven bereikbaar.

Ieder nieuw block krijgt standaard minimaliseren en sluiten. `title` is
optioneel: zonder titel heeft de titelbalk geen zichtbare tekst, terwijl het
block-`id` de toegankelijke fallbacknaam voor de knoppen blijft. Gebruik
`menu: false` om de volledige titelbalk weg te laten, of `blockDefaults.menu` en
een lokaal `menu`-object voor uitzonderingen.

Verslepen via de menubalk van een block staat standaard aan. Tijdens het slepen
toont een magnetische preview waar het block zal landen, terwijl de andere
blocks stilstaan. In `fixed-grid` blijft een vrije doelcel gestippeld; een
bezette neerwaartse doelcel wordt vol met een `↓`. Bij loslaten behouden de
verdrongen blocks hun kolom en settelen ze samen omlaag. In `flow-grid`
verandert slepen alleen de DOM-volgorde en krijgen blocks nooit vaste adressen. Focus dezelfde header en
gebruik de pijltjestoetsen voor dezelfde rasterbeweging zonder pointer. Na een
pointer- of toetsverplaatsing vuurt de surface `blocks:reorder` met één vaste
detailvorm: `id`, `input`, `mode`, `key`, indices, rasterposities en richting.
Zet `blocks.draggable = false` om de hele layout te vergrendelen, of
`block.draggable = false` om één block vast te zetten.

Gebruik `blocks.compact()` alleen wanneer je in `fixed-grid` expliciet gaten
wil vullen. De
methode houdt ieder geplaatst block in zijn kolom en bewaart de verticale
volgorde van blocks met overlappende kolommen; het ingestelde raster verkleint
niet stilzwijgend. Daar blijft `block.minimized` inklappen op dezelfde plaats;
in `flow-grid` behoudt het één titelbalkrij en schuiven latere blocks omhoog.
Bij `remove()` veranderen de adressen van andere fixed-grid-blocks nooit; het
gat blijft bewust bestaan totdat de toepassing `compact()` aanroept. In
flow-grid herschikt verwijdering vanzelf door de DOM-volgorde. Het veld vuurt
`blocks:change` voor `compact`, `minimize`, `restore` en `remove`.
Trackpad- en wheelscroll boven gewone blockinhoud blijft de pagina scrollen;
alleen echt overlopende binneninhoud scrollt eerst lokaal.
De gemeten werking en grenzen staan duurzaam in
[`docs/DRAG-BEHAVIOR.md`](docs/DRAG-BEHAVIOR.md).

Bekijk de [API-reference](https://seb-prjcts-be.github.io/blocks.system/docs/api.html)
voor argumenten en returnwaarden. Publieke installatiesnippets zijn op de
onveranderlijke `v0.4.2` vastgezet, dezelfde bron die de uitgebrachte docs
vermelden.

## Gecontroleerde status

Op 2026-08-17 bevat release `v0.4.2` de gedocumenteerde publieke werking: één
onveranderlijk layoutmodel, beweging in fixed- en flow-grid, flow-grid-resize,
layoutopslag, minimalisering, `compact()`, adapters, events,
TypeScript-declaraties, home, manual en reference.

Lokaal geslaagd:

- Minified ESM, runtimecontracten, TypeScript, docs/API-contracten, presentatie,
  gegenereerde fallback en package-inhoud.
- Apache/XAMPP: home, manual, reference en de flow-grid-proef geven elk HTTP 200.
- Gerichte browserchecks dekken de fixed-grid-documentatie en flow-grid-volgorde,
  resize, minimalisering en layoutherstel.

`v0.4.2` is de recentste onveranderlijke publieke release. De correctie van de
releasegrens staat in [`docs/releases/v0.4.2.md`](docs/releases/v0.4.2.md); de
documentatiefixes staan in [`docs/releases/v0.4.1.md`](docs/releases/v0.4.1.md)
en de eerdere breaking changes en migratienotities blijven in
[`docs/releases/v0.4.0.md`](docs/releases/v0.4.0.md).
De `v0.4.0`-lijn verving `snap` plus `placement` door één onveranderlijke `layout`:
`free`, `fixed-grid` of `flow-grid`. Verwijderde opties stoppen meteen
met hun exacte vervanging, zodat geen hybride layout meer kan ontstaan.

## Ontwikkelen

```powershell
npm install
npm run check
```

`npm run check` bouwt de minified module opnieuw en controleert
API, docs, lokale links en de echte showcase-layout in
headless Chrome. Stel `CHROME_PATH` in wanneer Chrome of Edge niet op een
standaardlocatie staat.

MIT-licentie. Ontwikkeld door Sebastien Vanblaere.
