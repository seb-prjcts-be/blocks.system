export const DOCS_RELEASE = Object.freeze({
  sourceRef: "main",
  releaseStatus: "unreleased",
  packageVersion: "0.4.1",
  stableRef: "v0.4.0",
  nextRelease: "v0.4.1",
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.4.0"
});

export function docsSourceLabel() {
  return `${DOCS_RELEASE.sourceRef} · ${DOCS_RELEASE.releaseStatus}`;
}
