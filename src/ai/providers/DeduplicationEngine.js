// ================================================================
// SUPREMEX AI — Deduplication Engine
// Phase 3: Cross-document deduplication with confidence merging
// ================================================================

export class DeduplicationEngine {

  deduplicate(extractedDocs) {
    const seen = new Map(); // keyed by canonical identifier

    for (const doc of extractedDocs) {
      const key = this._buildKey(doc);
      if (!seen.has(key)) {
        seen.set(key, doc);
      } else {
        // Merge: keep higher-confidence field values
        seen.set(key, this._merge(seen.get(key), doc));
      }
    }

    const unique = Array.from(seen.values());
    const duplicatesRemoved = extractedDocs.length - unique.length;

    return { uniqueDocs: unique, duplicatesRemoved };
  }

  _buildKey(doc) {
    const url = doc.repositoryUrl?.value || doc.websiteUrl?.value || doc.sourceUrl || '';
    const title = doc.documentTitle?.value || doc.projectName?.value || '';
    // Normalize: strip trailing slashes and lowercase
    return (url.replace(/\/+$/, '').toLowerCase() + '::' + title.toLowerCase()).trim();
  }

  _merge(existing, incoming) {
    const fieldNames = Object.keys(existing).filter(k =>
      existing[k] && typeof existing[k] === 'object' && 'confidence' in existing[k]
    );

    for (const field of fieldNames) {
      const exVal = existing[field];
      const inVal = incoming[field];
      if (!inVal) continue;

      const hasValue = v => v.value !== null && v.value !== undefined &&
                            v.value !== 0 && !(Array.isArray(v.value) && v.value.length === 0);

      // Replace with higher confidence value, or merge arrays
      if (hasValue(inVal) && (!hasValue(exVal) || inVal.confidence > exVal.confidence)) {
        existing[field] = inVal;
      } else if (Array.isArray(exVal?.value) && Array.isArray(inVal?.value)) {
        // Merge and deduplicate arrays
        existing[field] = {
          value: [...new Set([...(exVal.value || []), ...(inVal.value || [])])],
          confidence: Math.max(exVal.confidence, inVal.confidence),
          source: exVal.source,
          extractedAt: exVal.extractedAt
        };
      }
    }

    // Use highest overall confidence
    existing.extractionConfidence = Math.max(
      existing.extractionConfidence || 0,
      incoming.extractionConfidence || 0
    );

    return existing;
  }
}
