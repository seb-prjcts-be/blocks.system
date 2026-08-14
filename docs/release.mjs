export const DOCS_RELEASE = Object.freeze({
  sourceRef: "main",
  releaseStatus: "unreleased",
  packageVersion: "0.3.0",
  stableRef: "v0.3.0",
  nextRelease: null,
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.3.0"
});

export function docsSourceLabel() {
  return `${DOCS_RELEASE.sourceRef} · ${DOCS_RELEASE.releaseStatus}`;
}
