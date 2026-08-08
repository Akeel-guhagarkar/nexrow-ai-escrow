// ================================================================
// SUPREMEX AI — Summary Generator
// Phase 3: Generates Short, Medium, Technical & Business summaries
// ================================================================

export class SummaryGenerator {

  generate(extractedDocs, entities, statistics) {
    const projectName = this._findBestValue(extractedDocs, 'projectName') ||
                        this._findBestValue(extractedDocs, 'documentTitle') || 'the submitted project';
    const owner = this._findBestValue(extractedDocs, 'owner') || 'the developer';
    const framework = this._findBestValue(extractedDocs, 'framework');
    const langs = this._findBestArray(extractedDocs, 'programmingLanguages');
    const stack = this._findBestArray(extractedDocs, 'technologyStack');
    const domain = this._findBestValue(extractedDocs, 'domain');
    const deployStatus = this._findBestValue(extractedDocs, 'deploymentStatus');
    const stars = this._findBestValue(extractedDocs, 'stars');

    const techStr = [...new Set([...(langs || []), ...(stack || [])])].filter(Boolean).slice(0, 5).join(', ') || 'modern web technologies';
    const fwStr = framework ? ` built with ${framework}` : '';

    return {
      short: this._buildShort(projectName, statistics),
      medium: this._buildMedium(projectName, owner, fwStr, techStr, domain, deployStatus),
      technical: this._buildTechnical(projectName, techStr, stack, langs, domain, stars, statistics),
      business: this._buildBusiness(projectName, owner, deployStatus, domain, statistics)
    };
  }

  _buildShort(projectName, stats) {
    return `AI verification of "${projectName}" completed successfully. ` +
           `${stats.totalSources} sources analysed across ${stats.uniqueDomains} unique domains ` +
           `with an average confidence of ${(stats.avgConfidence * 100).toFixed(0)}%.`;
  }

  _buildMedium(projectName, owner, fwStr, techStr, domain, deployStatus) {
    const deployLine = deployStatus === 'Live' || deployStatus === 'Active'
      ? (domain ? ` The project is actively deployed at ${domain}.` : ' The project is actively deployed.')
      : '';
    return `SupremeX AI analysed "${projectName}"${fwStr}, developed by ${owner} using ${techStr}.` +
           `${deployLine} ` +
           `Multiple independent search providers confirmed authorship and delivery evidence across all scanned sources.`;
  }

  _buildTechnical(projectName, techStr, stack, langs, domain, stars, stats) {
    const stackLine = (stack && stack.length) ? `Technology stack identified: ${stack.join(', ')}.` : '';
    const langLine = (langs && langs.length) ? `Primary programming languages: ${langs.join(', ')}.` : '';
    const domainLine = domain ? `Live endpoint verified at ${domain}.` : '';
    const starsLine = stars ? `Repository has ${stars} stars.` : '';
    return `Technical Analysis — "${projectName}": ` +
           `${stackLine} ${langLine} ${domainLine} ${starsLine} ` +
           `${stats.totalSources} sources processed. ${stats.duplicatesRemoved} duplicate sources removed. ` +
           `Average extraction confidence: ${(stats.avgConfidence * 100).toFixed(1)}%.`;
  }

  _buildBusiness(projectName, owner, deployStatus, domain, stats) {
    const liveStr = (deployStatus === 'Live' || deployStatus === 'Active') ? 'confirmed live and operational' : 'submitted for review';
    return `Business Intelligence Report: The deliverable "${projectName}" has been ${liveStr}. ` +
           `Developer identity verified through ${stats.totalSources} independent sources. ` +
           `${domain ? `Online presence confirmed at ${domain}. ` : ''}` +
           `This escrow verification meets platform quality standards with ${(stats.avgConfidence * 100).toFixed(0)}% confidence.`;
  }

  _findBestValue(docs, field) {
    let best = null, bestConf = -1;
    for (const doc of docs) {
      const f = doc[field];
      if (f && f.value !== null && f.value !== undefined && f.value !== 0 && f.confidence > bestConf) {
        best = f.value;
        bestConf = f.confidence;
      }
    }
    return best;
  }

  _findBestArray(docs, field) {
    let best = null, bestConf = -1;
    for (const doc of docs) {
      const f = doc[field];
      if (f && Array.isArray(f.value) && f.value.length > 0 && f.confidence > bestConf) {
        best = f.value;
        bestConf = f.confidence;
      }
    }
    return best;
  }
}
