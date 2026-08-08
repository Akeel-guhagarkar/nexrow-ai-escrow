// ================================================================
// SUPREMEX AI — Provider Manager
// Manages AI provider registry, health status, logs & retries
// ================================================================

export class ProviderManager {
  constructor() {
    this.providers = new Map();
    this.logs = [];
  }

  registerProvider(provider) {
    if (!provider || !provider.name) {
      throw new Error('Provider must have a valid name');
    }
    this.providers.set(provider.name, {
      instance: provider,
      enabled: true,
      health: 'HEALTHY',
      executionCount: 0,
      failureCount: 0,
      lastExecutionTimeMs: 0
    });
    this.logInfo(`Registered AI Provider: ${provider.name}`);
  }

  enableProvider(name) {
    const entry = this.providers.get(name);
    if (entry) entry.enabled = true;
  }

  disableProvider(name) {
    const entry = this.providers.get(name);
    if (entry) entry.enabled = false;
  }

  getActiveProviders() {
    return Array.from(this.providers.values())
      .filter(p => p.enabled)
      .map(p => p.instance);
  }

  async executeWithRetry(providerInstance, query, options = {}, onProgress) {
    const name = providerInstance.name;
    const entry = this.providers.get(name);
    const maxRetries = options.maxRetries || 2;
    let attempt = 0;
    const startTime = Date.now();

    while (attempt <= maxRetries) {
      try {
        attempt++;
        this.logInfo(`Executing Provider [${name}] (Attempt ${attempt}/${maxRetries + 1})`);
        
        if (entry) entry.executionCount++;

        const results = await providerInstance.search(query, options, onProgress);
        
        const executionTimeMs = Date.now() - startTime;
        if (entry) {
          entry.lastExecutionTimeMs = executionTimeMs;
          entry.health = 'HEALTHY';
        }
        
        this.logInfo(`Provider [${name}] completed in ${executionTimeMs}ms (${results.length} sources found)`);
        return {
          providerName: name,
          results,
          executionTimeMs,
          status: 'COMPLETED',
          attempts: attempt
        };
      } catch (err) {
        this.logError(`Provider [${name}] failed on attempt ${attempt}: ${err.message}`);
        if (attempt > maxRetries) {
          if (entry) {
            entry.failureCount++;
            entry.health = 'DEGRADED';
          }
          return {
            providerName: name,
            results: [],
            executionTimeMs: Date.now() - startTime,
            status: 'FAILED',
            error: err.message,
            attempts: attempt
          };
        }
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  logInfo(message) {
    const log = { level: 'INFO', message, timestamp: new Date().toISOString() };
    this.logs.push(log);
  }

  logError(message) {
    const log = { level: 'ERROR', message, timestamp: new Date().toISOString() };
    this.logs.push(log);
  }

  getLogs() {
    return this.logs;
  }
}
