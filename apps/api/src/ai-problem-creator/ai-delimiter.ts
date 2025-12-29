/**
 * AI Problem Creator - Secure Delimiter Utility
 *
 * Uses a combination of:
 * 1. Invisible Unicode characters (Zero-width space, Word joiner)
 * 2. Rare Unicode mathematical brackets
 * 3. Dynamic session-based token
 * 4. Start/End markers for safe parsing
 */

// Invisible Unicode characters
const UNICODE_PREFIX = '\u200B\u2060'; // Zero-width space + Word joiner
const UNICODE_SUFFIX = '\u2060\u200B';

// Rare Unicode mathematical brackets
const BRACKET_OPEN = '⟦⟦';
const BRACKET_CLOSE = '⟧⟧';

// Marker identifiers
const DATA_MARKER = 'PDATA';

export interface DelimiterPair {
  start: string;
  end: string;
  token: string;
}

/**
 * Generate a unique delimiter pair based on session ID
 */
export function generateDelimiter(sessionId: string): DelimiterPair {
  // Extract a short token from session ID (last 8 chars, uppercase)
  const token = sessionId.slice(-8).toUpperCase();

  const start = `${UNICODE_PREFIX}${BRACKET_OPEN}${DATA_MARKER}:${token}${BRACKET_CLOSE}${UNICODE_SUFFIX}`;
  const end = `${UNICODE_PREFIX}${BRACKET_OPEN}/${DATA_MARKER}:${token}${BRACKET_CLOSE}${UNICODE_SUFFIX}`;

  return { start, end, token };
}

/**
 * Extract JSON data from text using delimiters
 */
export function extractDataWithDelimiter(
  text: string,
  delimiter: DelimiterPair,
): {
  displayText: string;
  jsonData: string | null;
} {
  const startIdx = text.indexOf(delimiter.start);

  if (startIdx === -1) {
    return { displayText: text, jsonData: null };
  }

  const endIdx = text.indexOf(delimiter.end);
  const displayText = text.slice(0, startIdx).trim();

  if (endIdx === -1) {
    // End marker not found, extract everything after start
    const jsonData = text.slice(startIdx + delimiter.start.length).trim();
    return { displayText, jsonData };
  }

  const jsonData = text
    .slice(startIdx + delimiter.start.length, endIdx)
    .trim();

  return { displayText, jsonData };
}

/**
 * Check if text contains the start delimiter (or partial match)
 */
export function containsDelimiterStart(
  text: string,
  delimiter: DelimiterPair,
): boolean {
  return text.includes(delimiter.start);
}

/**
 * Find safe display length - how much text can be safely shown
 * without potentially cutting off a partial delimiter
 */
export function findSafeDisplayLength(
  buffer: string,
  delimiter: DelimiterPair,
): number {
  const delimiterStart = delimiter.start;

  // Check for complete delimiter
  const startIdx = buffer.indexOf(delimiterStart);
  if (startIdx !== -1) {
    return startIdx;
  }

  // Check for partial delimiter at the end
  for (let i = 1; i < delimiterStart.length; i++) {
    const partialDelimiter = delimiterStart.slice(0, i);
    if (buffer.endsWith(partialDelimiter)) {
      return buffer.length - i;
    }
  }

  return buffer.length;
}

/**
 * Create the delimiter instruction for the system prompt
 */
export function getDelimiterInstructions(
  delimiter: DelimiterPair,
  locale: 'zh-TW' | 'en' = 'zh-TW',
): string {
  if (locale === 'zh-TW') {
    return `
## 輸出格式（重要）
當你準備好生成完整題目時，請按照以下格式輸出：

1. **先輸出給用戶看的訊息**（簡短描述題目已準備好）
2. **然後輸出資料標記和 JSON**（用戶不會看到這部分）

格式範例：
---
我已經根據你的需求創建了一道關於[主題]的[難度]題目！
題目包含完整的描述、範例測資和解題程式碼。

${delimiter.start}
{"status": "ready", "problem": {...}, "solution": {...}}
${delimiter.end}
---

**重要**：
- 資料標記 ${delimiter.start} 和 ${delimiter.end} 是系統專用標記，請**完全按照原樣輸出**
- 不要在 JSON 前後添加 \`\`\`json 或其他標記
- JSON 必須是有效的單行或多行 JSON 格式
`;
  }

  return `
## Output Format (Important)
When you are ready to generate a complete problem, follow this format:

1. **First, output a message for the user** (briefly describe the problem is ready)
2. **Then output the data marker and JSON** (users won't see this part)

Format example:
---
I've created a [difficulty] problem about [topic] based on your request!
The problem includes a complete description, sample test cases, and solution code.

${delimiter.start}
{"status": "ready", "problem": {...}, "solution": {...}}
${delimiter.end}
---

**Important**:
- Data markers ${delimiter.start} and ${delimiter.end} are system-specific markers, please **output them exactly as shown**
- Do not add \`\`\`json or other markers around the JSON
- JSON must be valid single-line or multi-line JSON format
`;
}
