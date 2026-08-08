export const REFERENCE_COLUMNS = Object.freeze([
  Object.freeze({ key: "blocks", label: "A / blocks", color: "#d64f43", gridColumn: 2 }),
  Object.freeze({ key: "block", label: "B / block", color: "#1675bf", gridColumn: 3 }),
  Object.freeze({ key: "definition-adapter", label: "C / definition + adapter", color: "#7b4cbf", gridColumn: 4 }),
  Object.freeze({ key: "field-dom", label: "D / field + DOM", color: "#008f6b", gridColumn: 5 })
]);

export const REFERENCE_ASPECTS = Object.freeze([
  Object.freeze({ key: "create-options", label: "1 / create + options", gridRow: 2, spanRows: 3 }),
  Object.freeze({ key: "state-properties", label: "2 / state + properties", gridRow: 5, spanRows: 3 }),
  Object.freeze({ key: "methods", label: "3 / methods", gridRow: 8, spanRows: 4 }),
  Object.freeze({ key: "reactions-failures", label: "4 / reactions + failures", gridRow: 12, spanRows: 4 })
]);

export const REFERENCE_BLOCKS = Object.freeze([
  Object.freeze({ id: "reference-system-create", anchor: "exports", aliases: ["options"], column: "blocks", aspect: "create-options", span: [1, 3], place: [2, 2] }),
  Object.freeze({ id: "reference-system-state", anchor: "system-state", aliases: [], column: "blocks", aspect: "state-properties", span: [1, 3], place: [2, 5] }),
  Object.freeze({ id: "reference-system-methods", anchor: "system-methods", aliases: [], column: "blocks", aspect: "methods", span: [1, 4], place: [2, 8] }),
  Object.freeze({ id: "reference-system-errors", anchor: "errors", aliases: [], column: "blocks", aspect: "reactions-failures", span: [1, 4], place: [2, 12] }),
  Object.freeze({ id: "reference-block-options", anchor: "add-options", aliases: [], column: "block", aspect: "create-options", span: [1, 3], place: [3, 2] }),
  Object.freeze({ id: "reference-block-properties", anchor: "block-controller", aliases: [], column: "block", aspect: "state-properties", span: [1, 3], place: [3, 5] }),
  Object.freeze({ id: "reference-block-methods", anchor: "block-methods", aliases: [], column: "block", aspect: "methods", span: [1, 4], place: [3, 8] }),
  Object.freeze({ id: "reference-definition-create", anchor: "adapters", aliases: [], column: "definition-adapter", aspect: "create-options", span: [1, 3], place: [4, 2] }),
  Object.freeze({ id: "reference-adapter-methods", anchor: "adapter-methods", aliases: [], column: "definition-adapter", aspect: "methods", span: [1, 4], place: [4, 8] }),
  Object.freeze({ id: "reference-field-signals", anchor: "reorder-event", aliases: ["css-hooks"], column: "field-dom", aspect: "reactions-failures", span: [1, 4], place: [5, 12] })
]);

export const REFERENCE_AXIS_BLOCKS = Object.freeze([
  Object.freeze({ id: "reference-axis-corner", label: "aspect × object", axis: "corner", span: [1, 1], place: [1, 1] }),
  ...REFERENCE_COLUMNS.map((column) => Object.freeze({
    id: `reference-axis-${column.key}`,
    label: column.label,
    axis: "column",
    column: column.key,
    span: [1, 1],
    place: [column.gridColumn, 1]
  })),
  ...REFERENCE_ASPECTS.map((aspect) => Object.freeze({
    id: `reference-axis-${aspect.key}`,
    label: aspect.label,
    axis: "row",
    span: [1, aspect.spanRows],
    place: [1, aspect.gridRow]
  }))
]);
