export const DOCS_RELEASE = Object.freeze({
  sourceRef: "main",
  releaseStatus: "unreleased",
  packageVersion: "0.4.2",
  stableRef: "v0.4.2",
  nextRelease: null,
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.4.2"
});

export function docsSourceLabel() {
  return `${DOCS_RELEASE.sourceRef} · ${DOCS_RELEASE.releaseStatus}`;
}
