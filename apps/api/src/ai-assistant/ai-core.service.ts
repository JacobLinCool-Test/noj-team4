import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  AiProvider,
  AiFeature,
  ReasoningEffort,
  AiFeatureConfig,
} from '@prisma/client';

export type LLMCallResult = {
  text: string;
  model: string;
  provider: 'openai' | 'gemini';
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
};

export type LLMStreamChunk = {
  text: string;
  done: boolean;
};

// 功能預設值（用於初始化）
const FEATURE_DEFAULTS: Record<
  AiFeature,
  {
    provider: AiProvider;
    model: string;
    reasoningEffort: ReasoningEffort;
    maxOutputTokens: number;
    temperature: number;
    enabled: boolean;
  }
> = {
  ASSISTANT: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 2048,
    temperature: 0.4,
    enabled: true,
  },
  PROBLEM_CREATOR: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 8192,
    temperature: 0.7,
    enabled: true,
  },
  TESTDATA_GENERATOR: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 4096,
    temperature: 0.5,
    enabled: true,
  },
  TRANSLATOR: {
    provider: AiProvider.GEMINI,
    model: 'gemini-2.5-flash',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 8192,
    temperature: 0.2,
    enabled: true,
  },
  CODE_SAFETY_CHECK: {
    provider: AiProvider.OPENAI,
    model: 'gpt-4o-mini',
    reasoningEffort: ReasoningEffort.NONE,
    maxOutputTokens: 512,
    temperature: 0,
    enabled: true,
  },
};

@Injectable()
export class AiCoreService {
  private readonly logger = new Logger(AiCoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getConfigForFeature(feature: AiFeature): Promise<AiFeatureConfig> {
    return this.prisma.aiFeatureConfig.upsert({
      where: { feature },
      update: {},
      create: { feature, ...FEATURE_DEFAULTS[feature] },
    });
  }

  async isForceDisabled(): Promise<boolean> {
    const global = await this.prisma.aiGlobalConfig.findUnique({
      where: { id: 1 },
    });
    return global?.forceDisabled ?? false;
  }

  async callLLM(params: {
    feature: AiFeature;
    systemPrompt: string;
    userPrompt: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<LLMCallResult> {
    // 1. 檢查全域開關
    if (await this.isForceDisabled()) {
      throw new ForbiddenException('AI_FORCE_DISABLED');
    }

    // 2. 取得該功能配置
    const config = await this.getConfigForFeature(params.feature);
    if (!config.enabled) {
      throw new ForbiddenException('AI_FEATURE_DISABLED');
    }

    // 3. 根據 provider 呼叫對應 API
    if (config.provider === AiProvider.OPENAI) {
      return this.callOpenAI(config, params);
    }
    return this.callGemini(config, params);
  }

  /**
   * 串流呼叫 LLM，回傳 AsyncGenerator 逐 token 輸出
   */
  async *callLLMStream(params: {
    feature: AiFeature;
    systemPrompt: string;
    userPrompt: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): AsyncGenerator<LLMStreamChunk> {
    // 1. 檢查全域開關
    if (await this.isForceDisabled()) {
      throw new ForbiddenException('AI_FORCE_DISABLED');
    }

    // 2. 取得該功能配置
    const config = await this.getConfigForFeature(params.feature);
    if (!config.enabled) {
      throw new ForbiddenException('AI_FEATURE_DISABLED');
    }

    // 3. 根據 provider 呼叫對應串流 API
    if (config.provider === AiProvider.OPENAI) {
      yield* this.callOpenAIStream(config, params);
    } else {
      yield* this.callGeminiStream(config, params);
    }
  }

  private async *callOpenAIStream(
    config: AiFeatureConfig,
    params: {
      systemPrompt: string;
      userPrompt: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): AsyncGenerator<LLMStreamChunk> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ForbiddenException('OPENAI_API_KEY_MISSING');
    }

    const messages = [
      { role: 'system', content: params.systemPrompt },
      ...(params.history ?? []),
      { role: 'user', content: params.userPrompt },
    ];

    const payload: Record<string, unknown> = {
      model: config.model,
      messages,
      max_completion_tokens: config.maxOutputTokens,
      temperature: config.temperature,
      stream: true,
    };

    if (config.reasoningEffort !== ReasoningEffort.NONE) {
      payload.reasoning_effort = config.reasoningEffort.toLowerCase();
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.getInt('AI_TIMEOUT_MS', 60000),
    );

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Could not read error body';
        }
        this.logger.error(`[OpenAIStream] API error ${response.status}: ${errorBody}`);
        this.logger.error(`[OpenAIStream] Model: ${config.model}, Feature: ${config.feature}`);
        throw new ForbiddenException(`OPENAI_ERROR_${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        this.logger.error('[OpenAIStream] No stream body returned');
        throw new ForbiddenException('OPENAI_NO_STREAM');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { text: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{
                delta?: { content?: string };
                finish_reason?: string;
              }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { text: content, done: false };
            }
            if (parsed.choices?.[0]?.finish_reason === 'stop') {
              yield { text: '', done: true };
              return;
            }
          } catch {
            // 忽略解析錯誤，繼續處理下一行
          }
        }
      }

      yield { text: '', done: true };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *callGeminiStream(
    config: AiFeatureConfig,
    params: {
      systemPrompt: string;
      userPrompt: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): AsyncGenerator<LLMStreamChunk> {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY')?.trim() ||
      this.configService.get<string>('GOOGLE_API_KEY')?.trim();
    if (!apiKey) {
      throw new ForbiddenException('GEMINI_API_KEY_MISSING');
    }

    const payload = {
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [
        ...(params.history ?? []).map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: params.userPrompt }] },
      ],
      generationConfig: {
        maxOutputTokens: config.maxOutputTokens,
        temperature: config.temperature,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.getInt('AI_TIMEOUT_MS', 60000),
    );

    try {
      // 使用 streamGenerateContent 端點並加上 alt=sse 參數
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Could not read error body';
        }
        this.logger.error(`[GeminiStream] API error ${response.status}: ${errorBody}`);
        this.logger.error(`[GeminiStream] Model: ${config.model}, Feature: ${config.feature}`);
        throw new ForbiddenException(`GEMINI_ERROR_${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        this.logger.error('[GeminiStream] No stream body returned');
        throw new ForbiddenException('GEMINI_NO_STREAM');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);

          try {
            const parsed = JSON.parse(data) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
                finishReason?: string;
              }>;
            };

            const text = (parsed.candidates ?? [])
              .flatMap((c) => c.content?.parts ?? [])
              .map((p) => p.text ?? '')
              .join('');

            if (text) {
              yield { text, done: false };
            }

            const finishReason = parsed.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'UNSPECIFIED') {
              yield { text: '', done: true };
              return;
            }
          } catch {
            // 忽略解析錯誤，繼續處理下一行
          }
        }
      }

      yield { text: '', done: true };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callOpenAI(
    config: AiFeatureConfig,
    params: {
      systemPrompt: string;
      userPrompt: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): Promise<LLMCallResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ForbiddenException('OPENAI_API_KEY_MISSING');
    }

    const messages = [
      { role: 'system', content: params.systemPrompt },
      ...(params.history ?? []),
      { role: 'user', content: params.userPrompt },
    ];

    const payload: Record<string, unknown> = {
      model: config.model,
      messages,
      max_completion_tokens: config.maxOutputTokens,
      temperature: config.temperature,
    };

    // 只有非 NONE 時才加 reasoning_effort
    if (config.reasoningEffort !== ReasoningEffort.NONE) {
      payload.reasoning_effort = config.reasoningEffort.toLowerCase();
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.getInt('AI_TIMEOUT_MS', 15000),
    );
    const start = Date.now();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Could not read error body';
      }
      this.logger.error(`[OpenAI] API error ${response.status}: ${errorBody}`);
      this.logger.error(`[OpenAI] Model: ${config.model}, Feature: ${config.feature}`);
      throw new ForbiddenException(`OPENAI_ERROR_${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    return {
      text: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? config.model,
      provider: 'openai',
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      latencyMs: Date.now() - start,
    };
  }

  private async callGemini(
    config: AiFeatureConfig,
    params: {
      systemPrompt: string;
      userPrompt: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): Promise<LLMCallResult> {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY')?.trim() ||
      this.configService.get<string>('GOOGLE_API_KEY')?.trim();
    if (!apiKey) {
      throw new ForbiddenException('GEMINI_API_KEY_MISSING');
    }

    const payload = {
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [
        ...(params.history ?? []).map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: params.userPrompt }] },
      ],
      generationConfig: {
        maxOutputTokens: config.maxOutputTokens,
        temperature: config.temperature,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.getInt('AI_TIMEOUT_MS', 15000),
    );
    const start = Date.now();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Could not read error body';
      }
      this.logger.error(`[Gemini] API error ${response.status}: ${errorBody}`);
      this.logger.error(`[Gemini] Model: ${config.model}, Feature: ${config.feature}`);
      throw new ForbiddenException(`GEMINI_ERROR_${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
      modelVersion?: string;
    };

    const text = (data.candidates ?? [])
      .flatMap((c) => c.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();

    return {
      text,
      model: data.modelVersion ?? config.model,
      provider: 'gemini',
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
      latencyMs: Date.now() - start,
    };
  }

  private getInt(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
