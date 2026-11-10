# Werken in deze repo

Voor elke AI die hier iets wijzigt. Wie alleen een pagina met blocks.system
wil maken, leest [`llms.txt`](llms.txt).

## Eerst lezen

1. [`docs/WERKING.md`](docs/WERKING.md): hoe de delen samenhangen.
2. [`docs/api.json`](docs/api.json): de publieke API als data.
3. [`docs/development.md`](docs/development.md): topologie, routes en uitgeven.
4. [`docs/releases/unreleased.md`](docs/releases/unreleased.md): wat op main
   staat en nog niet in een tag zit.

## Vaste regels

- Geen afhankelijkheden en geen npm-publicatie. Uitgeven gaat met een git-tag,
  geleverd door jsDelivr.
- Werkend gedrag blijft werken. Een nieuwe functie komt erbij; bestaand gedrag
  verandert alleen als Seb dat beslist.
- Publiek gedrag verandert samen met `blocks.system.d.ts`, beide README's,
  `docs/content.json`, `docs/API-OVERZICHT.md`, de tests en
  `docs/releases/unreleased.md`, in één commit.
- De `*.min.mjs`, `docs/api.json` en `docs/reference-fallback.html` maak je
  nooit met de hand. Zie de opdrachten hieronder.
- De Lucas Gent-site pint deze lib op een commit (`BLOCKS_SYSTEM_REF`). Wat een
  wijziging voor die site betekent, staat in
  [`docs/LUCASGENT-CLONE.md`](docs/LUCASGENT-CLONE.md). Schrijf elke wijziging
  die de site kan raken daar bij.
- Committen en pushen alleen als Seb het vraagt, rechtstreeks op main.

## Opdrachten

| Opdracht | Doet |
|---|---|
| `npm ci` | Installeert terser en TypeScript. Nodig voor de tests. |
| `npm run check` | Bouwt de min-bestanden en `api.json` en draait alle tests. Dit is de poort. |
| `npm run build:min` | Maakt `blocks.system.min.mjs` en `blocks.storage.min.mjs`. |
| `npm run build:api` | Maakt `docs/api.json`. |
| `node tools/render-reference-fallback.mjs --write` | Maakt `docs/reference-fallback.html` uit `docs/content.json`. |
| `node tests/<naam>.mjs` | Draait één test. |

## Wat je moet weten over de tests

- `npm test` is één ketting; de eerste fout stopt de rest. Draai bij twijfel
  de test die faalt apart.
- `tests/contract.mjs` en `tests/storage.mjs` lezen de `*.min.mjs`. Draai dus
  eerst `npm run build:min` na een wijziging aan de bron.
- Zonder browser: `contract`, `storage`, `site`, `docs-layout`, `test:types` en
  `node tools/render-api.mjs --check`.
- Met Chrome of Edge (of `CHROME_PATH`): alle andere, ook `docs-api-contract`.
- `tests/docs-api-contract.mjs` heeft de lokale git-tag van de laatste release
  nodig (`git fetch --tags`).
- `tests/contract.mjs` draait op een kleine nep-DOM. Iets dat echte DOM,
  observers of metingen nodig heeft, hoort in een browsertest zoals
  `tests/lifecycle.mjs`.
- De reference (`docs/api.html`) heeft vaste plaatsen per block in
  `docs/reference-sections.mjs`. Voeg je rijen toe aan `docs/content.json`, meet
  dan of de blocks nog passen en schuif de plaatsen op.
