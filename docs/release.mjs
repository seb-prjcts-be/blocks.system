export const DOCS_RELEASE = Object.freeze({
  sourceRef: "v0.4.1",
  releaseStatus: "released",
  packageVersion: "0.4.1",
  stableRef: "v0.4.1",
  nextRelease: null,
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.4.1"
});

export function docsSourceLabel() {
  return `${DOCS_RELEASE.sourceRef} · ${DOCS_RELEASE.releaseStatus}`;
}
