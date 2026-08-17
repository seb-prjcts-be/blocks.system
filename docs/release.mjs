export const DOCS_RELEASE = Object.freeze({
  sourceRef: "v0.4.0",
  releaseStatus: "released",
  packageVersion: "0.4.0",
  stableRef: "v0.4.0",
  nextRelease: null,
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.4.0"
});

export function docsSourceLabel() {
  return `${DOCS_RELEASE.sourceRef} · ${DOCS_RELEASE.releaseStatus}`;
}
