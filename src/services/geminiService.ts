export interface RiskAnalysis {
  isDisruption: boolean;
  estimatedDelayDays: number;
  reasoning: string;
}

async function postWithRetry(url: string, body: unknown, retries = 1): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (![502, 503, 504].includes(response.status) || attempt === retries) {
        return response;
      }
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error('Request failed');
}

function localFallbackRisk(headline: string): RiskAnalysis {
  const lower = headline.toLowerCase();
  const daysMatch = lower.match(/(\d+)\s*[- ]*(?:day|d)/i);
  let days = daysMatch ? parseInt(daysMatch[1], 10) : 0;
  const keywords = [
    'strike', 'drought', 'storm', 'typhoon', 'hurricane', 'canal', 'port',
    'backlog', 'delay', 'closure', 'halt', 'congestion', 'blockage', 'shortage',
    'restricted', 'suez', 'panama', 'fire', 'embargo', 'conflict'
  ];
  const isDisruption = keywords.some((kw) => lower.includes(kw));
  if (isDisruption && days === 0) days = 7;

  return {
    isDisruption,
    estimatedDelayDays: days,
    reasoning: isDisruption
      ? `Local simulation detected supply chain disruption indicators. Estimated impact: +${days} days.`
      : 'Headline indicates normal transit conditions with no significant shipping delays.',
  };
}

export async function generateSupplierEmail(product: {
  sku: string;
  daysUntilStockout: number;
  avgDailyDemand: number;
}): Promise<string> {
  try {
    const response = await postWithRetry('/api/gemini/supplier-email', product);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.email || 'Failed to generate email content.';
  } catch {
    return `Subject: URGENT: Expedited Delivery Request for SKU: ${product.sku}\n\nDear Supplier Team,\n\nOur inventory tracking shows ${product.daysUntilStockout.toFixed(1)} days of runway remaining at an average demand of ${product.avgDailyDemand.toFixed(1)} units/day. Please prioritize expedited dispatch for our next scheduled order.\n\nBest regards,\nProcurement Operations`;
  }
}

export async function analyzeDisruptionRisk(headline: string): Promise<RiskAnalysis> {
  try {
    const response = await postWithRetry('/api/gemini/analyze-risk', { headline });

    if (!response.ok) {
      if ([502, 503, 504].includes(response.status)) {
        return localFallbackRisk(headline);
      }
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `Server responded with ${response.status}`;
      throw new Error(message);
    }

    const result = await response.json();
    return {
      isDisruption: Boolean(result.isDisruption),
      estimatedDelayDays: Number(result.estimatedDelayDays) || 0,
      reasoning: result.reasoning || 'No reasoning provided.',
    };
  } catch (err) {
    if (err instanceof TypeError) {
      // Network/gateway unreachable fallback
      return localFallbackRisk(headline);
    }
    throw err;
  }
}

export async function chatWithInventoryAgent(
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[],
  context: string
): Promise<string> {
  try {
    const response = await postWithRetry('/api/gemini/chat', { messages, context });

    if (!response.ok) {
      if ([502, 503, 504].includes(response.status)) {
        return 'The AI backend is temporarily reconnecting. Your inventory metrics and burn-down charts remain available—please try your question again in a moment.';
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data.reply || 'I am unable to process that at the moment.';
  } catch {
    return 'Unable to reach the AI assistant right now. Please verify the server connection and try again.';
  }
}
