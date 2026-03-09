/**
 * ☁️ GAI EXTERNAL AI SERVICE - Wsparcie dla Kimi2.5 i innych zewnętrznych modeli
 * 
 * To rozszerza system GAI o:
 * - Kimi2.5 z Ollama Cloud
 * - Inne zewnętrzne modele AI
 * - API keys management
 * - Fallback mechanisms
 * - Rate limiting
 */

export interface ExternalAIModel {
  id: string;
  name: string;
  provider: 'kimi' | 'openai' | 'anthropic' | 'google' | 'mistral' | 'custom';
  baseUrl: string;
  apiKeyRequired: boolean;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsImages?: boolean;
  supportsTools?: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  pricing?: {
    inputPer1K: number;
    outputPer1K: number;
  };
}

export interface ExternalAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  images?: string[]; // base64 encoded images
}

export interface ExternalAIRequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ExternalAIResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
  error?: string;
}

class GAIExternalAIService {
  private models: Map<string, ExternalAIModel> = new Map();
  private apiKeys: Map<string, string> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();
  private fallbackChain: string[] = [];
  private isInitialized = false;
  private defaultTimeoutMs = Number(process.env.EXTERNAL_AI_TIMEOUT_MS || 120000);
  
  // 🚀 RETRY CONFIGURATION
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000; // 1 sekunda
  private readonly MAX_DELAY_MS = 10000; // 10 sekund
  private readonly JITTER_FACTOR = 0.1; // 10% jitter
  
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = Math.min(
      this.BASE_DELAY_MS * Math.pow(2, attempt),
      this.MAX_DELAY_MS
    );
    const jitter = exponentialDelay * this.JITTER_FACTOR * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }
  
  private isRetryableError(error: any): boolean {
    // Błędy sieciowe, timeout, 5xx, 429
    if (error instanceof TypeError && error.message.includes('fetch')) return true;
    if (error.message?.includes('ECONNRESET')) return true;
    if (error.message?.includes('ETIMEDOUT')) return true;
    if (error.message?.includes('ENOTFOUND')) return false; // DNS - nie retry
    if (error.message?.includes('HTTP 5')) return true;
    if (error.message?.includes('HTTP 429')) return true;
    if (error.message?.includes('HTTP 408')) return true; // Request Timeout
    return false;
  }

  // 🎯 DOMYŚLNE MODELE
  private readonly DEFAULT_MODELS: ExternalAIModel[] = [
    {
      id: 'kimi-2.5-latest',
      name: 'Kimi 2.5 Latest',
      provider: 'kimi',
      baseUrl: 'https://api.moonshot.cn/v1',
      apiKeyRequired: true,
      maxTokens: 128000,
      supportsStreaming: true,
      supportsImages: true,
      supportsTools: true,
      rateLimit: { requestsPerMinute: 60, tokensPerMinute: 30000 },
      pricing: { inputPer1K: 0.01, outputPer1K: 0.03 }
    },
    {
      id: 'kimi-2.5-32k',
      name: 'Kimi 2.5 32K',
      provider: 'kimi',
      baseUrl: 'https://api.moonshot.cn/v1',
      apiKeyRequired: true,
      maxTokens: 32000,
      supportsStreaming: true,
      supportsImages: true,
      supportsTools: true,
      rateLimit: { requestsPerMinute: 120, tokensPerMinute: 60000 },
      pricing: { inputPer1K: 0.008, outputPer1K: 0.024 }
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKeyRequired: true,
      maxTokens: 128000,
      supportsStreaming: true,
      supportsImages: true,
      supportsTools: true,
      rateLimit: { requestsPerMinute: 60, tokensPerMinute: 30000 },
      pricing: { inputPer1K: 0.01, outputPer1K: 0.03 }
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      apiKeyRequired: true,
      maxTokens: 200000,
      supportsStreaming: true,
      supportsImages: true,
      supportsTools: true,
      rateLimit: { requestsPerMinute: 40, tokensPerMinute: 20000 },
      pricing: { inputPer1K: 0.003, outputPer1K: 0.015 }
    }
  ];

  // 🚀 INICJALIZACJA
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Dodaj domyślne modele
    this.DEFAULT_MODELS.forEach(model => {
      this.models.set(model.id, model);
    });

    // Ustaw domyślny fallback chain
    this.fallbackChain = ['kimi-2.5-latest', 'gpt-4-turbo', 'claude-3-sonnet'];

    this.isInitialized = true;
    console.log('☁️ GAI External AI Service initialized with Kimi2.5 support');
  }

  // 🔑 ZARZĄDZANIE API KEYS
  setApiKey(provider: string, apiKey: string): void {
    this.apiKeys.set(provider, apiKey);
    console.log(`🔑 API key set for provider: ${provider}`);
  }

  getApiKey(provider: string): string | undefined {
    return this.apiKeys.get(provider);
  }

  // 🎯 DODAWANIE I USUWANIE MODELI
  addModel(model: ExternalAIModel): void {
    this.models.set(model.id, model);
    console.log(`➕ Added external model: ${model.name} (${model.id})`);
  }

  removeModel(modelId: string): boolean {
    const removed = this.models.delete(modelId);
    if (removed) {
      console.log(`➖ Removed external model: ${modelId}`);
    }
    return removed;
  }

  getModel(modelId: string): ExternalAIModel | undefined {
    return this.models.get(modelId);
  }

  getAllModels(): ExternalAIModel[] {
    return Array.from(this.models.values());
  }

  // 🔄 USTAWIANIE FALLBACK CHAIN
  setFallbackChain(modelIds: string[]): void {
    this.fallbackChain = modelIds.filter(id => this.models.has(id));
    console.log(`🔄 Fallback chain updated: ${this.fallbackChain.join(' → ')}`);
  }

  // ⏱️ RATE LIMITING WITH TOKEN BUCKET ALGORITHM
  private tokenBuckets: Map<string, { tokens: number; lastRefill: number; maxTokens: number; refillRate: number }> = new Map();
  
  private initTokenBucket(modelId: string): void {
    const model = this.models.get(modelId);
    if (!model || !model.rateLimit) return;
    
    if (!this.tokenBuckets.has(modelId)) {
      this.tokenBuckets.set(modelId, {
        tokens: model.rateLimit.requestsPerMinute,
        lastRefill: Date.now(),
        maxTokens: model.rateLimit.requestsPerMinute,
        refillRate: model.rateLimit.requestsPerMinute / 60000 // tokens per ms
      });
    }
  }
  
  private checkRateLimit(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model || !model.rateLimit) return true;
    
    this.initTokenBucket(modelId);
    const bucket = this.tokenBuckets.get(modelId)!;
    
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    // Check if we have tokens available
    if (bucket.tokens < 1) {
      console.warn(`⚠️ Rate limit exceeded for ${modelId}. Tokens: ${bucket.tokens.toFixed(2)}`);
      return false;
    }
    
    // Consume a token
    bucket.tokens -= 1;
    this.tokenBuckets.set(modelId, bucket);
    
    // Also update legacy rate limiter for stats
    const limiter = this.rateLimiter.get(modelId) || { count: 0, resetTime: now + 60000 };
    if (now >= limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + 60000;
    }
    limiter.count++;
    this.rateLimiter.set(modelId, limiter);
    
    return true;
  }
  
  getRateLimitStatus(modelId: string): { available: boolean; tokensRemaining: number; resetIn: number } {
    const bucket = this.tokenBuckets.get(modelId);
    if (!bucket) return { available: true, tokensRemaining: Infinity, resetIn: 0 };
    
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const currentTokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
    const timeToFull = (bucket.maxTokens - currentTokens) / bucket.refillRate;
    
    return {
      available: currentTokens >= 1,
      tokensRemaining: Math.floor(currentTokens),
      resetIn: Math.ceil(timeToFull / 1000) // seconds
    };
  }

  // 🌐 WYSYŁANIE REQUESTÓW
  async sendRequest(request: ExternalAIRequest, preferredModel?: string, options: ExternalAIRequestOptions = {}): Promise<ExternalAIResponse> {
    await this.initialize();

    const modelsToTry = preferredModel ? [preferredModel, ...this.fallbackChain] : this.fallbackChain;

    for (const modelId of modelsToTry) {
      try {
        const response = await this.tryModel(modelId, request, options);
        if (response && !response.error) {
          return response;
        }
      } catch (error) {
        console.error(`❌ Failed with model ${modelId}:`, error);
        continue;
      }
    }

    return {
      id: `error_${Date.now()}`,
      content: 'All external AI models failed. Please check your API keys and internet connection.',
      model: 'none',
      error: 'All models failed'
    };
  }

  private async tryModel(modelId: string, request: ExternalAIRequest, options: ExternalAIRequestOptions = {}): Promise<ExternalAIResponse> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Sprawdź rate limit
    if (!this.checkRateLimit(modelId)) {
      throw new Error(`Rate limit exceeded for ${modelId}`);
    }

    // Sprawdź API key
    const apiKey = this.apiKeys.get(model.provider);
    if (model.apiKeyRequired && !apiKey) {
      throw new Error(`API key required for ${model.provider}`);
    }

    console.log(`🚀 Sending request to ${model.name} (${modelId})`);

    // Przygotuj request na podstawie providera
    const preparedRequest = this.prepareRequest(model, request);
    
    // 🚀 RETRY LOGIC WITH EXPONENTIAL BACKOFF
    let lastError: any = null;
    
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : this.defaultTimeoutMs;
    const createController = () => {
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }
      const onAbort = () => controller.abort();
      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort();
        } else {
          options.signal.addEventListener('abort', onAbort);
        }
      }
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (options.signal) options.signal.removeEventListener('abort', onAbort);
      };
      return { controller, cleanup };
    };

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const { controller, cleanup } = createController();
      try {
        const response = await fetch(`${model.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(model.provider === 'anthropic' ? { 'x-api-key': apiKey! } : {})
          },
          signal: controller.signal,
          body: JSON.stringify(preparedRequest)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          
          // Sprawdź czy błąd jest retryable
          if (this.isRetryableError(error)) {
            lastError = error;
            const delay = this.calculateBackoff(attempt);
            console.warn(`⚠️ Attempt ${attempt + 1}/${this.MAX_RETRIES} failed for ${modelId}. Retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
          throw error;
        }

        const data = await response.json();
        return this.parseResponse(model, data);

      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error)) {
          const delay = this.calculateBackoff(attempt);
          console.warn(`⚠️ Attempt ${attempt + 1}/${this.MAX_RETRIES} failed for ${modelId}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }
        
        console.error(`❌ Request failed for ${modelId}:`, error);
        throw error;
      } finally {
        cleanup();
      }
    }
    
    // Wszystkie próby nieudane
    console.error(`❌ All ${this.MAX_RETRIES} attempts failed for ${modelId}`);
    throw lastError || new Error(`All retry attempts failed for ${modelId}`);
  }

  private prepareRequest(model: ExternalAIModel, request: ExternalAIRequest): any {
    // Dostosuj request na podstawie providera
    switch (model.provider) {
      case 'openai':
      case 'kimi':
        return {
          model: model.id,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || model.maxTokens,
          stream: request.stream || false,
          tools: request.tools,
          ...(request.images && {
            messages: request.messages.map(msg => ({
              ...msg,
              content: msg.role === 'user' ? [
                { type: 'text', text: msg.content },
                ...request.images!.map(img => ({
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${img}` }
                }))
              ] : msg.content
            }))
          })
        };

      case 'anthropic':
        return {
          model: model.id,
          messages: request.messages.filter(m => m.role !== 'system'),
          system: request.messages.find(m => m.role === 'system')?.content,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || model.maxTokens,
          stream: request.stream || false,
          tools: request.tools
        };

      default:
        return {
          model: model.id,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || model.maxTokens,
          stream: request.stream || false
        };
    }
  }

  private parseResponse(model: ExternalAIModel, data: any): ExternalAIResponse {
    try {
      // Parsuj response na podstawie providera
      let content = '';
      let usage = undefined;
      let finish_reason = undefined;

      switch (model.provider) {
        case 'openai':
        case 'kimi':
          content = data.choices?.[0]?.message?.content || '';
          usage = data.usage;
          finish_reason = data.choices?.[0]?.finish_reason;
          break;

        case 'anthropic':
          content = data.content?.[0]?.text || '';
          usage = data.usage;
          finish_reason = data.stop_reason;
          break;

        default:
          content = data.choices?.[0]?.text || data.text || '';
          usage = data.usage;
          break;
      }

      return {
        id: data.id || `ext_${Date.now()}`,
        content: content.trim(),
        model: model.id,
        usage: usage ? {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens) || 0
        } : undefined,
        finish_reason
      };

    } catch (error) {
      console.error('❌ Failed to parse response:', error);
      return {
        id: `parse_error_${Date.now()}`,
        content: 'Failed to parse AI response',
        model: model.id,
        error: 'Parse error'
      };
    }
  }

  // 📊 STATYSTYKI I MONITORING
  getModelStats(): Array<{
    modelId: string;
    name: string;
    successRate: number;
    averageResponseTime: number;
    totalRequests: number;
    rateLimitStatus: 'ok' | 'limited' | 'unknown';
  }> {
    return Array.from(this.models.values()).map(model => {
      const limiter = this.rateLimiter.get(model.id);
      const isLimited = limiter && Date.now() < limiter.resetTime && limiter.count >= (model.rateLimit?.requestsPerMinute || 60);
      
      return {
        modelId: model.id,
        name: model.name,
        successRate: 0.95, // TODO: Implement real stats
        averageResponseTime: 1500, // TODO: Implement real timing
        totalRequests: limiter?.count || 0,
        rateLimitStatus: isLimited ? 'limited' : 'ok'
      };
    });
  }

  // 🧪 TESTOWANIE MODELI
  async testModel(modelId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
    sampleResponse?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.sendRequest({
        model: modelId,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Respond with exactly: "Test successful - [model name] is working!"' },
          { role: 'user', content: 'Say hello and confirm you are working' }
        ],
        max_tokens: 50
      }, modelId);

      const responseTime = Date.now() - startTime;

      return {
        success: !response.error,
        responseTime,
        error: response.error,
        sampleResponse: response.content
      };

    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: String(error)
      };
    }
  }
}

// 🌍 GLOBALNA INSTANCJA
export const gaiExternalAI = new GAIExternalAIService();

// 🚀 INICJALIZACJA PRZY STARCIE
export const initializeExternalAI = async (): Promise<void> => {
  await gaiExternalAI.initialize();
  
  // Testuj Kimi2.5 jeśli jest dostępny
  const kimiApiKey = process.env.KIMI_API_KEY || gaiExternalAI.getApiKey('kimi');
  if (kimiApiKey) {
    console.log('🧪 Testing Kimi2.5 connection...');
    try {
      const testResult = await gaiExternalAI.testModel('kimi-2.5-latest');
      if (testResult.success) {
        console.log(`✅ Kimi2.5 is working! Response time: ${testResult.responseTime}ms`);
      } else {
        console.warn(`⚠️ Kimi2.5 test failed: ${testResult.error}`);
      }
    } catch (error) {
      console.error('❌ Kimi2.5 initialization failed:', error);
    }
  } else {
    console.log('ℹ️ No Kimi API key found. Kimi2.5 will not be available.');
  }
};

// 🎯 EKSPORT DODATKOWYCH FUNKCJI
export { gaiExternalAI as externalAI };
