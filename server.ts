import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_MODEL = "gemini-4-hydrogen";
let revokedApiKey: string | null = null;

function isLeakedOrPermissionError(error: unknown): boolean {
  const err = error as { message?: string; status?: number; code?: number } | null;
  const rawMsg = (err?.message || "").toLowerCase();
  return (
    err?.status === 403 ||
    err?.code === 403 ||
    rawMsg.includes("reported as leaked") ||
    rawMsg.includes("permission_denied") ||
    rawMsg.includes("permission denied") ||
    rawMsg.includes("api key not valid")
  );
}

function handleGeminiFailure(context: string, error: unknown): boolean {
  const isAuthIssue = isLeakedOrPermissionError(error);
  if (isAuthIssue) {
    const currentKey = process.env.GEMINI_API_KEY || null;
    if (currentKey && revokedApiKey !== currentKey) {
      revokedApiKey = currentKey;
      console.warn(`[${context}] Configured GEMINI_API_KEY was rejected (403/leaked). Switching to local simulation fallback until a new key is provided.`);
    }
    return true;
  }
  const msg = (error as { message?: string } | null)?.message || "Unknown Gemini error";
  console.warn(`[${context}] Falling back to local mode: ${msg}`);
  return false;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === revokedApiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

function fallbackRiskAnalysis(headline: string, errorNotice?: string) {
  const lower = headline.toLowerCase();
  const daysMatch = lower.match(/(\d+)\s*[- ]*(?:day|d)/i);
  let days = daysMatch ? parseInt(daysMatch[1], 10) : 0;

  const disruptionKeywords = [
    'strike', 'drought', 'storm', 'typhoon', 'hurricane', 'canal', 'port',
    'backlog', 'delay', 'closure', 'halt', 'congestion', 'blockage', 'shortage',
    'restricted', 'suez', 'panama', 'fire', 'embargo', 'conflict'
  ];

  const hasDisruption = disruptionKeywords.some(kw => lower.includes(kw));
  if (hasDisruption && days === 0) {
    days = 7;
  }

  const baseReasoning = hasDisruption
    ? `Heuristic risk evaluation identified critical logistics bottlenecks affecting lead times. Estimated impact: +${days} days.`
    : `Headline indicates regular transit conditions with no significant disruption to key shipping routes.`;

  const reasoning = errorNotice 
    ? `${baseReasoning} [Notice: ${errorNotice}]`
    : baseReasoning;

  return {
    isDisruption: hasDisruption,
    estimatedDelayDays: days,
    reasoning
  };
}

function fallbackSupplierEmail(sku: string, daysUntilStockout: number, avgDailyDemand: number, note?: string) {
  return `Subject: URGENT: Expedited Delivery Request for SKU: ${sku}

Dear Supplier Procurement & Logistics Team,

We are writing regarding our active supply line for SKU: ${sku}.

According to our inventory monitoring and lead-time tracking:
- Current Remaining Inventory Runway: ${Number(daysUntilStockout).toFixed(1)} days
- Average Daily Demand: ${Number(avgDailyDemand).toFixed(1)} units/day
- Target Safety Stock Threshold: At imminent risk of stockout

Due to current supply chain lead-time adjustments, we urgently request:
1. Prioritized dispatch or split-batch air/express freight for our next scheduled PO.
2. Confirmation of the earliest possible ship date and carrier tracking details.
3. Advance notice of any supplier-side component constraints.

Please let us know your earliest availability for an expedited dispatch.

Thank you for your partnership and prompt response.

Best regards,
Procurement & Supply Chain Operations
${note ? `\n\n(Generated via local procurement template: ${note})` : ''}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/process-inventory", (req, res) => {
    try {
      const { data, leadTime } = req.body ?? {};

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          error: "The uploaded CSV contains no data rows. Please upload a non-empty .csv file."
        });
      }

      const baseLeadTime = Number.isFinite(Number(leadTime)) && Number(leadTime) >= 0
        ? Math.min(365, Number(leadTime))
        : 5;

      const normalizeKey = (k: string) =>
        String(k).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      const skuAliases = ['productid', 'sku', 'skuid', 'itemid', 'itemcode', 'productcode', 'partnumber', 'product', 'item', 'id'];
      const unitsAliases = ['unitssold', 'units', 'quantitysold', 'quantity', 'qty', 'sold', 'sales', 'demand', 'dailydemand', 'avgdailydemand', 'volume'];
      const dateAliases = ['date', 'orderdate', 'salesdate', 'transactiondate', 'day', 'timestamp', 'period'];
      const stockAliases = ['currentstock', 'stock', 'onhand', 'onhandstock', 'inventory', 'availablestock', 'available'];
      const leadTimeAliases = ['leadtime', 'leadtimedays', 'lt'];

      const pickField = (row: Record<string, unknown>, aliases: string[]): { key?: string; value?: unknown } => {
        const entries = Object.entries(row);
        for (const alias of aliases) {
          for (const [k, v] of entries) {
            if (normalizeKey(k) === alias) {
              if (v !== undefined && v !== null && String(v).trim() !== '') {
                return { key: k, value: v };
              }
              return { key: k, value: undefined };
            }
          }
        }
        return {};
      };

      const products: Record<string, {
        totalSold: number;
        days: Set<string>;
        sku: string;
        explicitStock?: number;
        explicitLeadTime?: number;
      }> = {};

      let matchedSkuCol = false;
      let matchedUnitsCol = false;

      for (const rawRow of data) {
        if (!rawRow || typeof rawRow !== 'object') continue;
        const row = rawRow as Record<string, unknown>;

        const skuMatch = pickField(row, skuAliases);
        const unitsMatch = pickField(row, unitsAliases);
        const dateMatch = pickField(row, dateAliases);
        const stockMatch = pickField(row, stockAliases);
        const ltMatch = pickField(row, leadTimeAliases);

        if (skuMatch.key) matchedSkuCol = true;
        if (unitsMatch.key) matchedUnitsCol = true;

        const sku = skuMatch.value !== undefined ? String(skuMatch.value).trim() : '';
        if (!sku) continue;

        const rawUnitsStr = unitsMatch.value !== undefined ? String(unitsMatch.value).replace(/,/g, '').trim() : '0';
        const parsedUnits = parseFloat(rawUnitsStr);
        const units = Number.isFinite(parsedUnits) && parsedUnits >= 0 ? parsedUnits : 0;

        const date = dateMatch.value !== undefined ? String(dateMatch.value).trim() : '';

        if (!products[sku]) {
          products[sku] = { totalSold: 0, days: new Set(), sku };
        }
        products[sku].totalSold += units;
        if (date) {
          products[sku].days.add(date);
        }

        if (stockMatch.value !== undefined) {
          const parsedStock = parseFloat(String(stockMatch.value).replace(/,/g, '').trim());
          if (Number.isFinite(parsedStock) && parsedStock >= 0) {
            products[sku].explicitStock = Math.floor(parsedStock);
          }
        }

        if (ltMatch.value !== undefined) {
          const parsedLt = parseFloat(String(ltMatch.value).replace(/,/g, '').trim());
          if (Number.isFinite(parsedLt) && parsedLt >= 0) {
            products[sku].explicitLeadTime = parsedLt;
          }
        }
      }

      const firstRow = data.find((r: unknown) => r && typeof r === 'object') as Record<string, unknown> | undefined;
      const detectedColumns = firstRow
        ? Object.keys(firstRow).map(k => k.replace(/^\uFEFF/, '').trim()).filter(Boolean)
        : [];

      const productList = Object.values(products);
      if (productList.length === 0 || !matchedSkuCol || !matchedUnitsCol) {
        return res.status(400).json({
          error: `Could not map required CSV columns. Detected columns: [${detectedColumns.join(', ') || 'none'}]. Please include a SKU/Product column (e.g., Product_ID or SKU) and a Sales/Demand column (e.g., Units_Sold or Quantity), optionally with Date.`,
          detectedColumns
        });
      }

      const results = productList.map(p => {
        const numDays = p.days.size || 1;
        const avgDailyDemand = p.totalSold / numDays;
        const effectiveLt = p.explicitLeadTime ?? baseLeadTime;
        const safetyStock = (avgDailyDemand * effectiveLt) * 0.20;
        const reorderPoint = (avgDailyDemand * effectiveLt) + safetyStock;

        return {
          sku: p.sku,
          avgDailyDemand,
          safetyStock,
          reorderPoint,
          currentStock: p.explicitStock ?? Math.max(0, Math.floor(avgDailyDemand * 15)),
          leadTime: effectiveLt
        };
      });

      return res.json(results);
    } catch (error) {
      console.error("Process inventory error:", error);
      return res.status(500).json({ error: "Failed to process CSV inventory data on the server." });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Server-side Gemini API endpoints
  app.post("/api/gemini/analyze-risk", async (req, res) => {
    const { headline } = req.body;
    if (!headline || typeof headline !== "string") {
      return res.status(400).json({ error: "Headline is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const notice = revokedApiKey
        ? "Your current API key was flagged as leaked/expired by Google. Please update your key in Settings > Secrets. Local simulation heuristic applied."
        : "Running in local simulation mode. To enable live Gemini AI models, ensure GEMINI_API_KEY is active in Settings > Secrets.";
      return res.json(fallbackRiskAnalysis(headline, notice));
    }

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Analyze this news headline or shipping disruption notice: "${headline}"`,
        config: {
          systemInstruction: "You are an expert supply chain risk and logistics analyst for SME inventory systems. Evaluate real-world disruption risk, determine whether shipping delays will occur, and estimate added delay in days.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isDisruption: {
                type: Type.BOOLEAN,
                description: "True if this event causes shipping or supply chain delays."
              },
              estimatedDelayDays: {
                type: Type.INTEGER,
                description: "Estimated delay in days (0 if no disruption, up to 30 days)."
              },
              reasoning: {
                type: Type.STRING,
                description: "Brief rationale explaining why and how this affects logistics."
              }
            },
            required: ["isDisruption", "estimatedDelayDays", "reasoning"]
          }
        }
      });

      const rawText = response.text?.trim() || "{}";
      const parsed = JSON.parse(rawText);

      return res.json({
        isDisruption: Boolean(parsed.isDisruption),
        estimatedDelayDays: Math.max(0, Math.min(30, Number(parsed.estimatedDelayDays) || 0)),
        reasoning: parsed.reasoning || "Analysis complete."
      });
    } catch (error: unknown) {
      const isAuthIssue = handleGeminiFailure("analyze-risk", error);
      const note = isAuthIssue
        ? "Your current API key was flagged as leaked/expired by Google. Please update your key in Settings > Secrets. Local simulation heuristic applied."
        : "Gemini service temporarily unavailable; local heuristic applied.";

      return res.json(fallbackRiskAnalysis(headline, note));
    }
  });

  app.post("/api/gemini/supplier-email", async (req, res) => {
    const { sku, daysUntilStockout, avgDailyDemand } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      const note = revokedApiKey
        ? "Current Gemini API key is flagged as leaked. Please update in Settings > Secrets."
        : "Update your GEMINI_API_KEY in Settings > Secrets for customized AI drafting.";
      return res.json({
        email: fallbackSupplierEmail(sku, daysUntilStockout || 0, avgDailyDemand || 0, note)
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Generate a polite but urgent procurement email to a supplier.
        
Details:
- Product SKU: ${sku}
- Days until stockout: ${Number(daysUntilStockout || 0).toFixed(1)} days
- Avg daily demand: ${Number(avgDailyDemand || 0).toFixed(1)} units/day
        
Objective: Request expedited shipping or split-batch dispatch to avoid a critical stockout.
Tone: Professional, data-driven, and collaborative.`,
        config: {
          systemInstruction: "You are an expert procurement agent for a growing SME."
        }
      });

      return res.json({ email: response.text || "Failed to generate email content." });
    } catch (error: unknown) {
      const isAuthIssue = handleGeminiFailure("supplier-email", error);
      const note = isAuthIssue
        ? "Current Gemini API key is flagged as leaked. Please update in Settings > Secrets."
        : undefined;

      return res.json({
        email: fallbackSupplierEmail(sku, daysUntilStockout || 0, avgDailyDemand || 0, note)
      });
    }
  });

  app.post("/api/gemini/chat", async (req, res) => {
    const { messages, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      const reply = revokedApiKey
        ? "Your attached Gemini API key was flagged as leaked and disabled by Google. Please update your API key in the AI Studio Settings > Secrets panel (or generate a fresh key at https://aistudio.google.com/apikey). In the meantime, inventory simulation continues uninterrupted."
        : "I am running in local mode. To enable full Gemini AI intelligence, please provide an active Gemini API key in Settings > Secrets.";
      return res.json({ reply });
    }

    try {
      const formattedContents = (messages || []).map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: m.parts || [{ text: m.text || '' }]
      }));

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: formattedContents,
        config: {
          systemInstruction: `You are the Predict-A-Stock Intelligence Agent. 
Your goal is to help SMEs optimize their inventory, burn-down rate, and reorder levels.
Current Inventory Profile Context:
${typeof context === 'string' ? context : JSON.stringify(context)}

Keep answers concise, professional, and data-driven.`
        }
      });

      return res.json({ reply: response.text || "I am unable to process that at the moment." });
    } catch (error: unknown) {
      const isAuthIssue = handleGeminiFailure("chat", error);
      if (isAuthIssue) {
        return res.json({
          reply: "Your attached Gemini API key was flagged as leaked and disabled by Google. Please update your API key in the AI Studio Settings > Secrets panel (or generate a fresh key at https://aistudio.google.com/apikey). In the meantime, inventory simulation continues uninterrupted."
        });
      }
      return res.json({
        reply: "I'm currently operating in offline heuristic mode due to a temporary AI connection issue. Your inventory calculations and burn-down charts remain fully functional."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
