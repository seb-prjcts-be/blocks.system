# Menu-iconen

Op 2026-10-31 zijn de knoppen in de titelbalk van tekens uit het lettertype omgezet naar kleine SVG-iconen. De betekenis is dezelfde gebleven.

## Waarom

De oude tekens (`−`, `+`, `×`, `↩`, `☆`, `★`, `⊗`, `✓`, `!`) waren ongelijk groot. In Segoe UI 600 13px was `−` 7 × 1 px, `☆` 14 × 11 px en `↩` 15 px breed, breder dan de 14 px binnen in de knop. `↩`, `☆` en `⊗` kwamen uit een reservelettertype en zagen er per systeem anders uit. Het kopieericoon was een gevulde vorm tussen lijntekens.

## Hoe het nu werkt

- Alle iconen staan in `MENU_ICON_PATHS` in `blocks.system.mjs`: één raster van 12, één lijndikte (1.5), getekend met `currentColor`.
- `setMenuIcon(button, name, label)` zet het icoon, `data-icon` en `title`. `data-icon` draagt de toestand voor CSS en tests; `title` toont de actie bij hover.
- Het icoon is `1em` groot. Wie de knop groter zet met `font-size`, krijgt een even groot icoon mee. De Lucas Gent-clone doet dat al (26 px knoppen, 16px).
- Een favoriet vult de ster: `.blocks-system-pin[data-icon="unpin"] svg`.

| Knop | `data-icon` | Icoon |
|---|---|---|
| kopiëren | `copy`, daarna `copied` of `failed` | twee vellen, vinkje, uitroepteken |
| minimaliseren | `minimize` / `restore` | pijlpunt omhoog / omlaag |
| favoriet | `pin` / `unpin` | lege / gevulde ster |
| dock | `dock` / `undock` | `×` / terugkeerpijl |
| verwijderen | `close` | `×` in een cirkel |

## Bewust zo gelaten

`×` blijft de omkeerbare 'sluiten' naar de dock, en alleen het definitieve verwijderen krijgt de cirkel. Dat is een keuze uit v0.5.0 (zie `docs/releases/v0.5.0.md`), en het is de knop die iedereen standaard ziet.

Niet gedaan, om het eenvoudig te houden: de `opacity: 0.75` in rust, en de doelgrootte. Knoppen van 16 px met 2 px tussenruimte halen de 24 px uit WCAG 2.5.8 niet. Groter maken raakt de hele titelbalk van 22 px.
