// ================================================================
// SUPREMEX AI — Router
// Compares providers, calculates confidence, selects best source
// ================================================================

export class AIRouter {
  constructor() {
    this.name = 'SupremeX AI Router';
  }

  evaluateAndRoute(providerOutputs) {
    const validOutputs = providerOutputs.filter(o => o.status === 'COMPLETED');

    if (validOutputs.length === 0) {
      return {
        decision: 'NO_VALID_PROVIDER',
        confidence: 0,
        selectedProvider: null,
        mergedResults: [],
        rationale: 'All search providers failed or timed out.'
      };
    }

    // Evaluate each provider
    const evaluations = validOutputs.map(output => {
      const resultsCount = output.results.length;
      const avgConfidence = resultsCount > 0
        ? output.results.reduce((acc, curr) => acc + curr.confidence, 0) / resultsCount
        : 0;
      const timePenalty = Math.min(output.executionTimeMs / 5000, 0.2); // max 0.2 penalty for slowness
      const score = (avgConfidence * 0.7) + (Math.min(resultsCount / 5, 1) * 0.25) - timePenalty;

      return {
        providerName: output.providerName,
        resultsCount,
        avgConfidence: Number(avgConfidence.toFixed(2)),
        executionTimeMs: output.executionTimeMs,
        score: Number(score.toFixed(3)),
        results: output.results
      };
    });

    // Sort by evaluation score
    evaluations.sort((a, b) => b.score - a.score);
    const best = evaluations[0];

    // Combine all unique search results across all providers
    const uniqueResultsMap = new Map();
    validOutputs.forEach(o => {
      o.results.forEach(res => {
        if (!uniqueResultsMap.has(res.url)) {
          uniqueResultsMap.set(res.url, res);
        }
      });
    });

    const mergedResults = Array.from(uniqueResultsMap.values());
    const overallConfidence = Number((best.avgConfidence * 0.95).toFixed(2));

    return {
      decision: evaluations.length > 1 ? 'MERGED_PROVIDER' : 'BEST_PROVIDER',
      confidence: overallConfidence,
      selectedProvider: best.providerName,
      evaluations,
      mergedResults,
      totalSourcesFound: mergedResults.length,
      rationale: `Selected [${best.providerName}] as top provider (Score: ${best.score}). Merged ${mergedResults.length} unique sources across ${validOutputs.length} parallel providers.`
    };
  }
}
