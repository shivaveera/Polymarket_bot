import OpenAI from 'openai';
import { Signals, AIValidation } from '@/types';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function validateTradeWithAI(params: {
  question: string;
  signals: Signals;
  score: number;
  entryPrice: number;
  timeframeMin: number;
}): Promise<AIValidation> {
  const { question, signals, score, entryPrice, timeframeMin } = params;

  const openai = getClient();

  const prompt = `You are a crypto trading signal validator for a Polymarket paper trading bot.

Market: "${question}"
Timeframe: ${timeframeMin} minutes
Entry Price (YES): $${entryPrice.toFixed(3)}
Confidence Score: ${score}/35

Current BTC Signals:
- Price: $${signals.btcPrice.toFixed(2)}
- RSI(7): ${signals.rsi7}
- 1m Momentum: ${signals.momentum1m}%
- 5m Momentum: ${signals.momentum5m}%
- ADX(14): ${signals.adx}
- Volume Ratio: ${signals.volumeRatio}x
- BB Width: ${signals.bbWidth}%
- VWAP Distance: ${signals.vwapDistance}%
- Chop Detected: ${signals.chop}
- Absorption: ${signals.absorption}

Should we take this YES position? Consider:
1. Signal alignment (are momentum + RSI + volume confirming?)
2. Entry price value (lower = better risk/reward)
3. Market conditions (chop = bad, trend = good)
4. Timeframe appropriateness

Respond with EXACTLY this JSON format:
{"decision": "YES" or "SKIP", "confidence": 0-100, "reasoning": "one sentence why"}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);

    return {
      decision: parsed.decision === 'YES' ? 'YES' : 'SKIP',
      confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 50)),
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('AI validation error:', error);
    return {
      decision: 'SKIP',
      confidence: 0,
      reasoning: 'AI validation failed',
    };
  }
}
