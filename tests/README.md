# Sitechecks

`site.mjs` bewaakt de stabiele contracten van de website en draait in de
standaard `npm test`-gate:

- lokale routes en assets bestaan;
- package, declarations, README's en reference noemen dezelfde API;
- docscontent heeft de juiste eigenaarsgrens, bevat alle 52 levende docblocks
  en wordt volledig geladen;
- navigatie, aliases, voorbeelden en toegankelijkheidscontracten blijven heel;
- librarycode en library-CSS nemen geen projectspecifieke compositie over.

`site-presentation.mjs` bevat de historische exacte locks op copy,
rastercoordinaten en CSS-waarden. Die blijven beschikbaar via:

```text
npm run test:presentation
```

Deze suite is bewust geen kern-CI-gate. Een tekstcorrectie of bewuste
pixelwijziging mag de structurele tests niet rood maken. Gebruik de
presentatiesuite gericht tijdens documentatie- en compositiewerk en beoordeel
haar bevindingen samen met `browser-layout.mjs`.

`npm run test:types` compileert hetzelfde consumentenfixture met Node16- en
bundler-resolutie. Zowel de hoofdexport als `blocks.system/min` moet daarbij
naar `blocks.system.d.ts` resolven.

`npm run test:docs-contract` inventariseert module-, system- en block-API uit de
echte runtime en `blocks.system.d.ts`, controleert de relevante reference-secties
en laadt de onveranderlijke tag achter de stabiele installatiesnippets. Alleen
vóór het maken van een lokale releasetag mag de releasecommit zichzelf testen
met `BLOCKS_RELEASE_CANDIDATE=vX.Y.Z`; zodra de tag bestaat, werkt die bypass
bewust niet meer.
