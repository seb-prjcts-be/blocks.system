// De volgorde en de ankers van de reference. Hoogtes en plaatsen staan hier
// niet: reference.mjs meet elk block en legt ze onder elkaar.
export const REFERENCE_SECTIONS = Object.freeze([
  Object.freeze({ id: "reference-system-create", anchor: "exports", aliases: ["options"] }),
  Object.freeze({ id: "reference-container", anchor: "container", aliases: ["system-methods"] }),
  Object.freeze({ id: "reference-grid", anchor: "grid", aliases: ["system-state"] }),
  Object.freeze({ id: "reference-block-create", anchor: "blocks", aliases: ["add-options"] }),
  Object.freeze({ id: "reference-block-layout", anchor: "block-layout", aliases: ["block-methods"] }),
  Object.freeze({ id: "reference-content", anchor: "content", aliases: [] }),
  Object.freeze({ id: "reference-titlebar", anchor: "titlebar-controls", aliases: [] }),
  Object.freeze({ id: "reference-dragging", anchor: "dragging", aliases: ["reorder-event"] }),
  Object.freeze({ id: "reference-appearance", anchor: "appearance", aliases: [] }),
  Object.freeze({ id: "reference-color", anchor: "colors", aliases: [] }),
  Object.freeze({ id: "reference-chance", anchor: "chance", aliases: [] }),
  Object.freeze({ id: "reference-block-controller", anchor: "block-controller", aliases: [] }),
  Object.freeze({ id: "reference-definition-create", anchor: "adapters", aliases: [] }),
  Object.freeze({ id: "reference-adapter-methods", anchor: "adapter-methods", aliases: [] }),
  Object.freeze({ id: "reference-field-signals", anchor: "field-dom", aliases: ["css-hooks"] }),
  Object.freeze({ id: "reference-system-errors", anchor: "errors", aliases: [] })
]);
