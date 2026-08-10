export const DOCS_RELEASE = Object.freeze({
  sourceRef: "main",
  releaseStatus: "unreleased",
  packageVersion: "0.2.0",
  stableRef: "v0.2.0",
  nextRelease: "v0.3.0",
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.2.0"
});

export function docsSourceLabel() {
  return `${DOCS_RELEASE.sourceRef} · ${DOCS_RELEASE.releaseStatus}`;
}
