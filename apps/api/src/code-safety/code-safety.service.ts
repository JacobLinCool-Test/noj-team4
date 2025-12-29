import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCoreService } from '../ai-assistant/ai-core.service';
import { AiFeature } from '@prisma/client';
import {
  CodeSafetyCheckParams,
  CodeSafetyResult,
  AiSafetyResponse,
} from './dto/code-safety.dto';

const SYSTEM_PROMPT = `You are a code security analyzer for an online judge system. Your task is to detect OBVIOUSLY MALICIOUS code patterns.

**BLOCK these patterns (return is_safe: false):**
- System file access (reading /etc/passwd, /proc, /sys, /flag, secrets, etc.)
- Shell escape (exec, system, popen, subprocess with shell=True, os.system, Runtime.exec, etc.)
- Reverse shell attempts (socket connections to external IPs with shell redirection)
- Fork bombs (:(){ :|:& };: or similar recursive process spawning)
- Sandbox escape attempts (breaking out of containers, accessing Docker socket, /proc/self, etc.)
- Network connections to external hosts (except stdin/stdout operations)
- Attempts to access environment variables or secrets (os.environ, process.env, getenv, etc.)
- Attempts to read/write arbitrary files outside the working directory

**DO NOT BLOCK these (the sandbox handles them, return is_safe: true):**
- Infinite loops (while(true), for(;;), etc.) - will be killed by timeout
- Large memory allocation - will be killed by memory limit
- Deep recursion - will cause stack overflow naturally
- Normal competitive programming code
- Reading from stdin
- Writing to stdout/stderr
- Standard library usage for algorithms

Be CONSERVATIVE - only block code that is OBVIOUSLY and INTENTIONALLY malicious.
Normal competitive programming code should NEVER be blocked.

Respond ONLY in valid JSON format (no markdown, no code blocks):
{"is_safe": true, "threat_type": "NONE", "reason_zh": "", "reason_en": "", "analysis": ""}

Or if malicious:
{"is_safe": false, "threat_type": "SHELL_ESCAPE|FILE_READ|FORK_BOMB|REVERSE_SHELL|SANDBOX_ESCAPE|NETWORK_ACCESS|ENV_ACCESS", "reason_zh": "繁體中文簡短原因（一句話）", "reason_en": "Brief English reason (one sentence)", "analysis": "Technical details for admin"}

IMPORTANT: reason_zh must be in Traditional Chinese (繁體中文), NOT Simplified Chinese. Keep it concise (one sentence).`;

@Injectable()
export class CodeSafetyService {
  private readonly logger = new Logger(CodeSafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiCoreService: AiCoreService,
  ) {}

  /**
   * Check if the submitted code is safe to execute.
   * Returns { isSafe: true } if safe, or { isSafe: false, reason, threatType } if blocked.
   *
   * Uses fail-open strategy: if AI check fails (timeout, error), allow the submission.
   * The sandbox itself provides protection against malicious code.
   */
  async checkCodeSafety(
    params: CodeSafetyCheckParams,
  ): Promise<CodeSafetyResult> {
    try {
      // Check if feature is enabled
      const config = await this.aiCoreService.getConfigForFeature(
        AiFeature.CODE_SAFETY_CHECK,
      );

      if (!config.enabled) {
        return { isSafe: true };
      }

      // Check global AI disable
      const forceDisabled = await this.aiCoreService.isForceDisabled();

      if (forceDisabled) {
        return { isSafe: true };
      }

      // Prepare user prompt
      const userPrompt = `Language: ${params.language}
Code:
\`\`\`${params.language.toLowerCase()}
${params.source.slice(0, 10000)}
\`\`\`

Analyze this code for malicious patterns. Be conservative - only block OBVIOUSLY malicious code.`;

      // Call AI with timeout (5 seconds for safety check)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const start = Date.now();
        const result = await this.aiCoreService.callLLM({
          feature: AiFeature.CODE_SAFETY_CHECK,
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
        });
        const latencyMs = Date.now() - start;

        // Parse AI response
        const parsed = this.parseAiResponse(result.text);

        if (!parsed.is_safe) {
          this.logger.warn(`Code blocked: ${parsed.threat_type} - ${parsed.reason_zh || parsed.reason_en}`);

          // Record blocked submission
          await this.recordBlock({
            ...params,
            threatType: parsed.threat_type,
            reason: parsed.reason_zh || parsed.reason_en,
            analysis: parsed.analysis,
            aiResponse: parsed,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            latencyMs,
          });

          return {
            isSafe: false,
            reason: parsed.reason_zh || parsed.reason_en,
            threatType: parsed.threat_type,
            analysis: parsed.analysis,
          };
        }

        return { isSafe: true };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      // Fail-open: if AI check fails, allow the submission
      // The sandbox itself provides protection
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Code safety check failed (fail-open): ${errorMsg}`);
      return { isSafe: true };
    }
  }

  private parseAiResponse(text: string): AiSafetyResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AiSafetyResponse;
      }
      // If no JSON found, assume safe
      this.logger.warn('No JSON found in AI response, assuming safe');
      return {
        is_safe: true,
        threat_type: 'NONE',
        reason_zh: '',
        reason_en: '',
        analysis: '',
      };
    } catch (err) {
      // If parsing fails, assume safe
      this.logger.warn(`Failed to parse AI response: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return {
        is_safe: true,
        threat_type: 'NONE',
        reason_zh: '',
        reason_en: '',
        analysis: '',
      };
    }
  }

  private async recordBlock(params: {
    source: string;
    language: CodeSafetyCheckParams['language'];
    userId?: number;
    problemId?: string;
    sourceType: CodeSafetyCheckParams['sourceType'];
    ip?: string;
    userAgent?: string;
    examId?: string;
    threatType: string;
    reason: string;
    analysis: string;
    aiResponse: AiSafetyResponse;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
  }): Promise<void> {
    try {
      await this.prisma.blockedSubmission.create({
        data: {
          userId: params.userId,
          problemId: params.problemId,
          sourceType: params.sourceType,
          language: params.language,
          sourceTrunc: params.source.slice(0, 10000),
          threatType: params.threatType,
          reason: params.reason,
          analysis: params.analysis,
          aiResponse: params.aiResponse as object,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          latencyMs: params.latencyMs,
          ip: params.ip,
          userAgent: params.userAgent,
          examId: params.examId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record blocked submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
