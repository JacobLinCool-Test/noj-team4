import {
  Injectable,
  ForbiddenException,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiCoreService } from '../ai-assistant/ai-core.service';
import { EnhancedRateLimitService } from '../ai-assistant/enhanced-rate-limit.service';
import { AiFeature } from '@prisma/client';
import {
  ChatRequestDto,
  ChatResponseDto,
  GeneratedProblemDto,
  GeneratedSolutionDto,
  AvailabilityResponseDto,
} from './dto/chat.dto';
import {
  getProblemCreatorPromptWithDelimiter,
  type ProblemCreatorMode,
  getTestdataGeneratorPrompt,
} from './prompts/system-prompts';
import {
  generateDelimiter,
  extractDataWithDelimiter,
  findSafeDisplayLength,
  type DelimiterPair,
} from './ai-delimiter';

interface SessionData {
  userId: number;
  courseSlug?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  problemData?: GeneratedProblemDto;
  solutionData?: GeneratedSolutionDto;
  createdAt: number;
}

@Injectable()
export class AiProblemCreatorService {
  private readonly SESSION_TTL = 3600; // 1 hour
  private readonly logger = new Logger(AiProblemCreatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly aiCore: AiCoreService,
    private readonly enhancedRateLimit: EnhancedRateLimitService,
  ) {}

  /**
   * Check availability and rate limit status for the user
   */
  async getAvailability(
    userId: number,
    ip?: string,
    deviceFingerprint?: string,
    sessionId?: string,
  ): Promise<AvailabilityResponseDto> {
    const featureConfig = await this.aiCore.getConfigForFeature(
      AiFeature.PROBLEM_CREATOR,
    );

    // Check if AI is force disabled globally
    if (await this.aiCore.isForceDisabled()) {
      return {
        available: false,
        reason: 'AI_FORCE_DISABLED',
        rateLimit: {
          minIntervalMs: 3000,
          maxPerMinute: 10,
          maxPerSession: 100,
        },
      };
    }

    // Check if feature is enabled
    if (!featureConfig.enabled) {
      return {
        available: false,
        reason: 'AI_FEATURE_DISABLED',
        rateLimit: {
          minIntervalMs: 3000,
          maxPerMinute: 10,
          maxPerSession: 100,
        },
      };
    }

    // Check ban status
    if (ip || deviceFingerprint) {
      const banCheck = await this.enhancedRateLimit.checkBan(
        ip,
        deviceFingerprint,
      );
      if (banCheck) {
        return {
          available: false,
          reason: `BANNED_UNTIL_${banCheck.expiresAt.toISOString()}`,
          rateLimit: {
            minIntervalMs: 3000,
            maxPerMinute: 10,
            maxPerSession: 100,
          },
        };
      }
    }

    // Get session info if available
    let sessionInfo: { sessionId: string; messageCount: number } | undefined;
    if (sessionId) {
      const session = await this.getSession(sessionId);
      if (session && session.userId === userId) {
        sessionInfo = {
          sessionId,
          messageCount: session.messages.length,
        };
      }
    }

    return {
      available: true,
      rateLimit: {
        minIntervalMs: 3000,
        maxPerMinute: 10,
        maxPerSession: 100,
      },
      sessionInfo,
    };
  }

  /**
   * Start a new session
   */
  async startSession(
    userId: number,
    courseSlug?: string,
  ): Promise<{ sessionId: string; createdAt: string }> {
    const sessionId = this.enhancedRateLimit.generateSessionId(userId);
    const sessionData: SessionData = {
      userId,
      courseSlug,
      messages: [],
      createdAt: Date.now(),
    };

    await this.redis.client.setex(
      this.getSessionKey(sessionId),
      this.SESSION_TTL,
      JSON.stringify(sessionData),
    );

    return {
      sessionId,
      createdAt: new Date(sessionData.createdAt).toISOString(),
    };
  }

  /**
   * Chat with AI (non-streaming)
   * @param params.mode - 'direct' for immediate generation (homepage), 'conversation' for guided dialog (problem page)
   */
  async chat(params: {
    sessionId: string;
    message: string;
    userId: number;
    ip?: string;
    deviceFingerprint?: string;
    locale?: 'zh-TW' | 'en';
    mode?: ProblemCreatorMode;
  }): Promise<ChatResponseDto> {
    const { sessionId, message, userId, ip, deviceFingerprint, locale, mode } =
      params;

    // Validate session
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('SESSION_NOT_FOUND');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('SESSION_NOT_OWNED');
    }

    // Check rate limit
    const rateLimitResult = await this.enhancedRateLimit.checkRateLimit({
      userId,
      sessionId,
      message,
      ip,
      deviceFingerprint,
    });

    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === 'BANNED') {
        throw new HttpException(
          `BANNED_UNTIL_${rateLimitResult.banExpiresAt?.toISOString()}`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        rateLimitResult.reason || 'RATE_LIMITED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add user message to session
    session.messages.push({ role: 'user', content: message });

    // Generate secure delimiter for this session
    const delimiter = generateDelimiter(sessionId);

    // Build prompt with delimiter
    const systemPrompt = getProblemCreatorPromptWithDelimiter(
      delimiter,
      locale || 'zh-TW',
      mode || 'conversation',
    );

    // Call LLM
    const result = await this.aiCore.callLLM({
      feature: AiFeature.PROBLEM_CREATOR,
      systemPrompt,
      userPrompt: message,
      history: session.messages.slice(0, -1),
    });

    // Parse response for structured data (try new delimiter format first, then legacy)
    const { responseText, problemData, solutionData } =
      this.parseAiResponseWithDelimiter(result.text, delimiter);

    // Add assistant message to session
    session.messages.push({ role: 'assistant', content: result.text });

    // Update session with problem/solution data if available
    if (problemData) {
      session.problemData = problemData;
    }
    if (solutionData) {
      session.solutionData = solutionData;
    }

    // Save session
    await this.saveSession(sessionId, session);

    // Log usage
    await this.logUsage({
      feature: AiFeature.PROBLEM_CREATOR,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      success: true,
      userId,
      sessionId,
    });

    return {
      sessionId,
      message: responseText,
      problemReady: !!problemData,
      problemData,
      solutionData,
    };
  }

  /**
   * Chat with AI (streaming)
   * @param params.mode - 'direct' for immediate generation (homepage), 'conversation' for guided dialog (problem page)
   */
  async *chatStream(params: {
    sessionId: string;
    message: string;
    userId: number;
    ip?: string;
    deviceFingerprint?: string;
    locale?: 'zh-TW' | 'en';
    mode?: ProblemCreatorMode;
  }): AsyncGenerator<{
    type: 'meta' | 'chunk' | 'done' | 'problem_ready';
    sessionId?: string;
    text?: string;
    problemData?: GeneratedProblemDto;
    solutionData?: GeneratedSolutionDto;
  }> {
    const { sessionId, message, userId, ip, deviceFingerprint, locale, mode } =
      params;

    this.logger.log(`[chatStream] Starting: userId=${userId}, sessionId=${sessionId}, mode=${mode || 'conversation'}, message="${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

    // Validate session
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('SESSION_NOT_FOUND');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('SESSION_NOT_OWNED');
    }

    // Check rate limit
    const rateLimitResult = await this.enhancedRateLimit.checkRateLimit({
      userId,
      sessionId,
      message,
      ip,
      deviceFingerprint,
    });

    if (!rateLimitResult.allowed) {
      if (rateLimitResult.reason === 'BANNED') {
        throw new HttpException(
          `BANNED_UNTIL_${rateLimitResult.banExpiresAt?.toISOString()}`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        rateLimitResult.reason || 'RATE_LIMITED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add user message to session
    session.messages.push({ role: 'user', content: message });

    // Emit session metadata
    yield { type: 'meta', sessionId };

    // Generate secure delimiter for this session
    const delimiter = generateDelimiter(sessionId);

    // Build prompt with delimiter
    const systemPrompt = getProblemCreatorPromptWithDelimiter(
      delimiter,
      locale || 'zh-TW',
      mode || 'conversation',
    );

    // Call LLM with streaming
    let fullText = '';
    let displayBuffer = ''; // Buffer for safe display text
    let sentContent = ''; // Track what we've already sent to detect duplicates
    let isCapturingJson = false; // Whether we've hit the delimiter
    const startTime = Date.now();

    // Helper to send chunk without duplicates
    const sendChunk = function* (text: string) {
      if (!text) return;
      // Check if this text would create a duplicate
      const lines = (sentContent + text).split('\n');
      const uniqueLines: string[] = [];
      const seenLines = new Set<string>();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && seenLines.has(trimmed)) {
          // Skip duplicate line
          continue;
        }
        if (trimmed) {
          seenLines.add(trimmed);
        }
        uniqueLines.push(line);
      }

      const deduped = uniqueLines.join('\n');
      const newContent = deduped.slice(sentContent.length);
      if (newContent) {
        sentContent = deduped;
        yield { type: 'chunk' as const, text: newContent };
      }
    };

    try {
      for await (const chunk of this.aiCore.callLLMStream({
        feature: AiFeature.PROBLEM_CREATOR,
        systemPrompt,
        userPrompt: message,
        history: session.messages.slice(0, -1),
      })) {
        if (chunk.text) {
          fullText += chunk.text;

          // Only process for display if we haven't hit the delimiter yet
          if (!isCapturingJson) {
            displayBuffer += chunk.text;

            // Check if we've hit the delimiter start
            const delimiterIdx = displayBuffer.indexOf(delimiter.start);
            if (delimiterIdx !== -1) {
              // Send everything before the delimiter
              const safeText = displayBuffer.slice(0, delimiterIdx);
              yield* sendChunk(safeText);
              isCapturingJson = true;
              displayBuffer = '';
            } else {
              // Check for partial delimiter match at the end
              const safeLength = findSafeDisplayLength(displayBuffer, delimiter);
              if (safeLength > 0) {
                const safeText = displayBuffer.slice(0, safeLength);
                yield* sendChunk(safeText);
                displayBuffer = displayBuffer.slice(safeLength);
              }
            }
          }
          // If isCapturingJson, we just accumulate to fullText but don't yield
        }
        if (chunk.done) {
          break;
        }
      }

      // Flush any remaining safe buffer (if delimiter was never found)
      if (!isCapturingJson && displayBuffer) {
        yield* sendChunk(displayBuffer);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'STREAM_ERROR';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[chatStream] LLM stream error: ${errorMessage}`, errorStack);
      this.logger.error(`[chatStream] Error context: userId=${userId}, sessionId=${sessionId}, locale=${locale || 'zh-TW'}`);

      await this.logUsage({
        feature: AiFeature.PROBLEM_CREATOR,
        provider: 'unknown',
        model: 'unknown',
        success: false,
        errorCode: errorMessage,
        userId,
        sessionId,
      });
      throw error;
    }

    // Parse response for structured data
    const { problemData, solutionData } = this.parseAiResponseWithDelimiter(
      fullText,
      delimiter,
    );

    // Add assistant message to session
    session.messages.push({ role: 'assistant', content: fullText });

    // Update session with problem/solution data if available
    if (problemData) {
      session.problemData = problemData;
    }
    if (solutionData) {
      session.solutionData = solutionData;
    }

    // Save session
    await this.saveSession(sessionId, session);

    // Log usage
    await this.logUsage({
      feature: AiFeature.PROBLEM_CREATOR,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      latencyMs: Date.now() - startTime,
      success: true,
      userId,
      sessionId,
    });

    // Emit final status with problem data if available
    if (problemData) {
      this.logger.log(`[chatStream] Problem generated successfully: title="${problemData.title}", userId=${userId}`);
      yield { type: 'problem_ready', problemData, solutionData };
    } else {
      this.logger.warn(`[chatStream] Completed but no problem data extracted: userId=${userId}, fullTextLength=${fullText.length}`);
      this.logger.warn(`[chatStream] AI raw response (first 500 chars): ${fullText.substring(0, 500)}`);
    }

    this.logger.log(`[chatStream] Stream completed: userId=${userId}, sessionId=${sessionId}`);
    yield { type: 'done' };
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.client.get(this.getSessionKey(sessionId));
    if (!data) return null;
    try {
      return JSON.parse(data) as SessionData;
    } catch {
      return null;
    }
  }

  /**
   * Get session problem and solution data
   */
  async getSessionProblemData(
    sessionId: string,
    userId: number,
  ): Promise<{
    problemData?: GeneratedProblemDto;
    solutionData?: GeneratedSolutionDto;
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('SESSION_NOT_FOUND');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('SESSION_NOT_OWNED');
    }
    return {
      problemData: session.problemData,
      solutionData: session.solutionData,
    };
  }

  // ========== Private Methods ==========

  private getSessionKey(sessionId: string): string {
    return `ai:problem-creator:session:${sessionId}`;
  }

  private async saveSession(
    sessionId: string,
    session: SessionData,
  ): Promise<void> {
    await this.redis.client.setex(
      this.getSessionKey(sessionId),
      this.SESSION_TTL,
      JSON.stringify(session),
    );
  }

  /**
   * Parse AI response with secure delimiter format
   * Falls back to legacy markdown format if delimiter not found
   */
  private parseAiResponseWithDelimiter(
    text: string,
    delimiter: DelimiterPair,
  ): {
    responseText: string;
    problemData?: GeneratedProblemDto;
    solutionData?: GeneratedSolutionDto;
  } {
    // Try new delimiter format first
    const { displayText, jsonData } = extractDataWithDelimiter(text, delimiter);

    if (jsonData) {
      try {
        const parsed = JSON.parse(jsonData);
        if (parsed.status === 'ready' && parsed.problem) {
          const problemData: GeneratedProblemDto = {
            title: parsed.problem.title,
            description: parsed.problem.description,
            inputFormat: parsed.problem.inputFormat,
            outputFormat: parsed.problem.outputFormat,
            sampleCases: parsed.problem.sampleCases || [],
            difficulty: parsed.problem.difficulty,
            tags: parsed.problem.tags || [],
            constraints: {
              timeLimitMs: parsed.problem.constraints?.timeLimitMs || 1000,
              memoryLimitKb: parsed.problem.constraints?.memoryLimitKb || 262144,
            },
            suggestedTestInputs: parsed.problem.suggestedTestInputs,
          };

          let solutionData: GeneratedSolutionDto | undefined;
          if (parsed.solution) {
            solutionData = {
              language: parsed.solution.language,
              code: parsed.solution.code,
            };
          }

          return { responseText: displayText, problemData, solutionData };
        }
      } catch {
        // JSON parsing failed, try legacy format
      }
    }

    // Fall back to legacy markdown format
    return this.parseAiResponseLegacy(text);
  }

  /**
   * Legacy parser for markdown code block format (backwards compatibility)
   */
  private parseAiResponseLegacy(text: string): {
    responseText: string;
    problemData?: GeneratedProblemDto;
    solutionData?: GeneratedSolutionDto;
  } {
    // Try to find JSON block in response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      return { responseText: text };
    }

    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.status === 'ready' && parsed.problem) {
        const problemData: GeneratedProblemDto = {
          title: parsed.problem.title,
          description: parsed.problem.description,
          inputFormat: parsed.problem.inputFormat,
          outputFormat: parsed.problem.outputFormat,
          sampleCases: parsed.problem.sampleCases || [],
          difficulty: parsed.problem.difficulty,
          tags: parsed.problem.tags || [],
          constraints: {
            timeLimitMs: parsed.problem.constraints?.timeLimitMs || 1000,
            memoryLimitKb: parsed.problem.constraints?.memoryLimitKb || 262144,
          },
          suggestedTestInputs: parsed.problem.suggestedTestInputs,
        };

        let solutionData: GeneratedSolutionDto | undefined;
        if (parsed.solution) {
          solutionData = {
            language: parsed.solution.language,
            code: parsed.solution.code,
          };
        }

        // Remove JSON block from response text for display
        const responseText = text
          .replace(/```json\s*[\s\S]*?\s*```/, '')
          .trim();

        return { responseText, problemData, solutionData };
      }
    } catch {
      // JSON parsing failed, return original text
    }

    return { responseText: text };
  }

  // Keep old method for backwards compatibility (delegates to legacy)
  private parseAiResponse(text: string): {
    responseText: string;
    problemData?: GeneratedProblemDto;
    solutionData?: GeneratedSolutionDto;
  } {
    return this.parseAiResponseLegacy(text);
  }

  private async logUsage(params: {
    feature: AiFeature;
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    success: boolean;
    errorCode?: string;
    userId?: number;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          provider: params.provider,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          latencyMs: params.latencyMs,
          success: params.success,
          errorCode: params.errorCode,
          userId: params.userId,
        },
      });
    } catch {
      // Silently ignore logging errors
    }
  }

  /**
   * Generate solution code and test inputs for standalone testdata generation
   */
  async generateSolutionAndTestInputs(params: {
    problemDescription: string;
    inputFormat: string;
    outputFormat: string;
    sampleCases: Array<{ input: string; output: string }>;
    numTestCases: number;
  }): Promise<{
    success: boolean;
    solutionCode: string;
    solutionLanguage: 'C' | 'CPP' | 'JAVA' | 'PYTHON';
    testInputs: string[];
    error?: string;
  }> {
    const prompt = getTestdataGeneratorPrompt({
      problemDescription: params.problemDescription,
      inputFormat: params.inputFormat,
      outputFormat: params.outputFormat,
      sampleCases: params.sampleCases,
      numTestCases: params.numTestCases,
    });

    try {
      const result = await this.aiCore.callLLM({
        feature: AiFeature.TESTDATA_GENERATOR,
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
      });

      // Parse the response
      const parsed = this.parseTestdataGeneratorResponse(result.text);
      if (!parsed) {
        return {
          success: false,
          solutionCode: '',
          solutionLanguage: 'PYTHON',
          testInputs: [],
          error: 'Failed to parse AI response',
        };
      }

      return {
        success: true,
        solutionCode: parsed.solutionCode,
        solutionLanguage: parsed.solutionLanguage,
        testInputs: parsed.testInputs,
      };
    } catch (error) {
      return {
        success: false,
        solutionCode: '',
        solutionLanguage: 'PYTHON',
        testInputs: [],
        error: error instanceof Error ? error.message : 'AI_ERROR',
      };
    }
  }

  private parseTestdataGeneratorResponse(text: string): {
    solutionCode: string;
    solutionLanguage: 'C' | 'CPP' | 'JAVA' | 'PYTHON';
    testInputs: string[];
  } | null {
    // Try to find JSON block in response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.solution && parsed.testInputs) {
        return {
          solutionCode: parsed.solution.code,
          solutionLanguage: parsed.solution.language || 'PYTHON',
          testInputs: parsed.testInputs,
        };
      }
    } catch {
      // JSON parsing failed
    }

    return null;
  }
}
