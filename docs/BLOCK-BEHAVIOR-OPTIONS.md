# Functionele gedragsruimte van blocks

Onderzoek van 5 augustus 2026. Dit document beschrijft mogelijke
interacties; het wijzigt of belooft nog geen publiek API-contract.

## Vaststelling

`block.minimized` is nu **inklappen op dezelfde plaats**:

- de inhoud wordt verborgen en verdwijnt uit de accessibility tree;
- kolom, rij en span blijven bewaard;
- het block blijft zijn volledige rastergebied reserveren;
- andere blocks worden niet opnieuw geplaatst.

Dat is stabiel en voorspelbaar, maar het woord _minimaliseren_ kan meer ruimtewinst
suggereren dan het systeem werkelijk levert. In een gesnapt raster is de lege
ruimte na het inklappen dus bewust niet beschikbaar voor buren.

Het sterkste bestaande inter-blockgedrag zit elders: bij een drag met
`snap = true` bezet het gedropte block de doelplaats en worden botsende blocks
kolomvast naar beneden geduwd. Met `snap = false` verandert drag de DOM- en
flowvolgorde. Alleen drag publiceert momenteel een `blocks:reorder`-event.

## Mogelijke gedragingen

| Gedrag | Zichtbaar gevolg voor andere blocks | Passendheid |
| --- | --- | --- |
| Expliciet compacten | Blocks schuiven omhoog om lege plaatsen na sluiten of verbergen te vullen. Een volgordebewarende verticale variant is het duidelijkst. | Hoog |
| Focus / echt maximaliseren | Eén block vult tijdelijk het veld; de andere blijven geparkeerd maar worden verborgen of inert. Herstellen geeft exact de vorige compositie terug. | Hoog |
| Resizen door de gebruiker | Een sleepgreep verandert `span`; geraakte blocks worden met dezelfde neerwaartse collisionregel verplaatst. | Hoog, maar groter werk |
| Minimaliseren naar een dock | Het block wordt een header in een aparte strook en maakt zijn volledige rasterplaats vrij. Herstellen vraagt een vaste regel voor een intussen bezette oude plaats. | Middel |
| Verbergen en filteren | Verborgen blocks verlaten tijdelijk de layout; zichtbare blocks compacten. Anders dan sluiten blijft het block aanspreekbaar. | Middel |
| Wisselen bij drop | Een drop op een block wisselt beide plaatsen in plaats van een neerwaartse cascade. Eenvoudig bij gelijke spans, ambigu bij ongelijke spans. | Middel |
| Vastzetten | Een vastgezet block mag niet slepen of door compactie/collisions worden verplaatst; andere blocks bewegen eromheen. | Middel |
| Stapelen als tabs | Meerdere blocks delen één plaats en slechts één inhoud is zichtbaar. Dit introduceert groepen/nesting in het nu vlakke systeem. | Laag |
| Tussen velden verplaatsen | Een block kan van het ene blocks-system naar het andere. Dit botst met de huidige eenvoudige ownership- en lifecyclegrens. | Laag |
| Automatisch groeien naar inhoud | Inhoud verandert zelf de span en veroorzaakt telkens reflow. Dit is bij canvas, media en responsieve inhoud moeilijk voorspelbaar. | Laag |

Vergelijkbare layoutsystemen bevestigen dat compacten, float/fill-gaps,
move/swap, hide/filter, resize, focus/maximize en stacks bekende maar
afzonderlijke keuzes zijn. Ze hoeven dus niet allemaal onderdeel van één
`minimized`-schakelaar te worden.

## Aanbevolen richting

Update later op 5 augustus 2026: de eerste richting is lokaal uitgevoerd als
`blocks.compact()`. De methode is expliciet, behoudt vaste kolommen en spans,
schuift geplaatste gridblocks in DOM-volgorde omhoog, verkleint het ingestelde
raster niet stilzwijgend en publiceert `blocks:change` met de verplaatste ids.

1. **Behoud het huidige gedrag als `collapse in place`.** Overweeg in de UI
   _inklappen_ in plaats van _minimaliseren_ als er geen ruimte wordt vrijgemaakt.
2. **Voeg als eerste inter-blockactie expliciet compacten toe.** Compactie hoort
   bij het systeem, niet stilzwijgend bij ieder block. Begin met één deterministische
   variant: behoud de visuele/DOM-volgorde en vul verticale gaten van boven naar
   beneden.
3. **Behandel echt maximaliseren als een aparte focusmodus.** Andere blocks
   hoeven dan niet herschikt te worden; ze worden tijdelijk verborgen/inert en
   komen exact terug. Dat voorkomt een verrassende restore-cascade.
4. **Hergebruik voor later resizen de bestaande collisionregel.** Groei heeft
   dan hetzelfde mentale model als een grid-drop: het actieve block wint, geraakte
   blocks zakken naar beneden.
5. **Definieer vóór nieuwe acties een breder change-event.** Minimize/restore,
   remove, resize, compact en focus moeten door consumers waarneembaar zijn;
   momenteel is alleen reorder dat.

## Belangrijkste ontwerpbeslissing

Als minimaliseren zelf ruimte moet vrijmaken, is een dock duidelijker dan een
block tot één rasterrij verkleinen. Veel blocks zijn al `1x1`; één rij kleiner
maken levert dan geen rasterruimte op. Een dock maakt altijd de volledige oude
plaats vrij, maar voegt wel een nieuw systeemonderdeel en restorebeleid toe.

Daarom is de kleinste sterke uitbreiding niet “slimmere minimize”, maar:

> inklappen blijft lokaal; compacten en focussen worden expliciete
> systeemgedragingen.

## Externe referentiepatronen

- [GridStack](https://gridstackjs.com/doc/html/classes/GridStackEngine.html)
  documenteert collision handling, resize, float en expliciete
  `compact()`-strategieën.
- [Muuri](https://docs.muuri.dev/) scheidt hide/show/filter, move en swap van
  elkaar en laat hide standaard een nieuwe layout uitvoeren.
- [Golden Layout](https://golden-layout.com/docs/Item.html) behandelt maximize,
  close, popout en stacks als afzonderlijke acties en publiceert
  state-/lifecycle-events.
