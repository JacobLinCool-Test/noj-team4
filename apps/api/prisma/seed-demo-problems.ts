/**
 * Demo Problems Seed Script
 *
 * Creates 9 demo problems with test data for demonstrating various Judge Pipeline features.
 *
 * Run with: npx ts-node prisma/seed-demo-problems.ts
 */

import { PrismaClient, SubmissionType, ProgrammingLanguage, ProblemVisibility, ProblemDifficulty } from '@prisma/client';
import * as Minio from 'minio';
import AdmZip from 'adm-zip';

const prisma = new PrismaClient();

// MinIO client
const minio = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'noj_minio',
  secretKey: process.env.MINIO_SECRET_KEY || 'noj_minio_dev_password_change_me',
});

// Generate displayId: 1 lowercase letter + 3 digits
function generateDisplayId(): string {
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
  const digits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${letter}${digits}`;
}

// Ensure MinIO bucket exists
async function ensureBucket(bucket: string) {
  const exists = await minio.bucketExists(bucket);
  if (!exists) {
    await minio.makeBucket(bucket);
    console.log(`Created bucket: ${bucket}`);
  }
}

// Upload buffer to MinIO
async function uploadToMinio(bucket: string, key: string, buffer: Buffer) {
  await minio.putObject(bucket, key, buffer, buffer.length);
  console.log(`  Uploaded: ${bucket}/${key}`);
}

// Create testdata ZIP with manifest
function createTestdataZip(cases: Array<{ input: string; output: string; points?: number; isSample?: boolean }>): Buffer {
  const zip = new AdmZip();

  // 計算配分，確保總分為 100
  const basePoints = Math.floor(100 / cases.length);
  const remainder = 100 % cases.length;

  const manifest = {
    version: '1.0',
    defaultTimeLimitMs: 2000,
    defaultMemoryLimitKb: 262144,
    cases: cases.map((c, i) => ({
      name: `Case ${i + 1}`,
      inputFile: `${i.toString().padStart(2, '0')}.in`,
      outputFile: `${i.toString().padStart(2, '0')}.out`,
      // 前 remainder 個測試點多分配 1 分，確保總分為 100
      points: c.points ?? (basePoints + (i < remainder ? 1 : 0)),
      isSample: c.isSample ?? (i === 0),
      timeLimitMs: 2000,
      memoryLimitKb: 262144,
    })),
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

  cases.forEach((c, i) => {
    zip.addFile(`${i.toString().padStart(2, '0')}.in`, Buffer.from(c.input));
    zip.addFile(`${i.toString().padStart(2, '0')}.out`, Buffer.from(c.output));
  });

  return zip.toBuffer();
}

// Create testdata ZIP with subtasks
function createSubtaskTestdataZip(subtasks: Array<{ cases: Array<{ input: string; output: string }>; points: number }>): Buffer {
  const zip = new AdmZip();

  const allCases: any[] = [];

  subtasks.forEach((subtask, s) => {
    const isSampleSubtask = s === 0;
    const pointsPerCase = Math.floor(subtask.points / subtask.cases.length);

    subtask.cases.forEach((c, t) => {
      const ss = s.toString().padStart(2, '0');
      const tt = t.toString().padStart(2, '0');

      zip.addFile(`${ss}${tt}.in`, Buffer.from(c.input));
      zip.addFile(`${ss}${tt}.out`, Buffer.from(c.output));

      allCases.push({
        name: `Subtask ${s + 1} - Case ${t + 1}`,
        inputFile: `${ss}${tt}.in`,
        outputFile: `${ss}${tt}.out`,
        points: pointsPerCase,
        isSample: isSampleSubtask,
        timeLimitMs: 2000,
        memoryLimitKb: 262144,
      });
    });
  });

  const manifest = {
    version: '1.0',
    defaultTimeLimitMs: 2000,
    defaultMemoryLimitKb: 262144,
    cases: allCases,
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

  return zip.toBuffer();
}

// 生成隨機陣列
function generateRandomArray(n: number, maxVal: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    arr.push(Math.floor(Math.random() * (2 * maxVal + 1)) - maxVal);
  }
  return arr;
}

// O(N) 最優解 - 使用 hash map 計算數對數量
function countPairsOptimal(arr: number[], k: number): number {
  const freq = new Map<number, number>();
  let count = 0;

  for (const num of arr) {
    const complement = k - num;
    if (freq.has(complement)) {
      count += freq.get(complement)!;
    }
    freq.set(num, (freq.get(num) || 0) + 1);
  }

  return count;
}

// 建立數對計數的測資
function createPairCountingTestdata(): Buffer {
  const zip = new AdmZip();
  const allCases: any[] = [];

  // Subtask 1: N <= 1000, O(N²) 可過
  const subtask1Cases = [
    { n: 10, k: 5, maxVal: 10 },
    { n: 100, k: 50, maxVal: 100 },
    { n: 500, k: 0, maxVal: 500 },
    { n: 1000, k: 100, maxVal: 1000 },
  ];

  // Subtask 2: N <= 100000, 需要 O(N) 或 O(N log N)
  const subtask2Cases = [
    { n: 10000, k: 0, maxVal: 10000 },
    { n: 50000, k: 12345, maxVal: 50000 },
    { n: 100000, k: 0, maxVal: 100000 },
    { n: 100000, k: -5678, maxVal: 100000 },
  ];

  let caseIndex = 0;

  // Subtask 1 (50 分)
  for (let i = 0; i < subtask1Cases.length; i++) {
    const { n, k, maxVal } = subtask1Cases[i];
    const arr = generateRandomArray(n, maxVal);
    const answer = countPairsOptimal(arr, k);

    const input = `${n} ${k}\n${arr.join(' ')}\n`;
    const output = `${answer}\n`;

    const fileName = caseIndex.toString().padStart(2, '0');
    zip.addFile(`${fileName}.in`, Buffer.from(input));
    zip.addFile(`${fileName}.out`, Buffer.from(output));

    // 分數分配：13 + 13 + 12 + 12 = 50
    const points = i < 2 ? 13 : 12;

    allCases.push({
      name: `Subtask 1 - Case ${i + 1}`,
      inputFile: `${fileName}.in`,
      outputFile: `${fileName}.out`,
      points: points,
      isSample: i === 0,
      timeLimitMs: 2000,
      memoryLimitKb: 262144,
    });

    caseIndex++;
  }

  // Subtask 2 (50 分)
  for (let i = 0; i < subtask2Cases.length; i++) {
    const { n, k, maxVal } = subtask2Cases[i];
    const arr = generateRandomArray(n, maxVal);
    const answer = countPairsOptimal(arr, k);

    const input = `${n} ${k}\n${arr.join(' ')}\n`;
    const output = `${answer}\n`;

    const fileName = caseIndex.toString().padStart(2, '0');
    zip.addFile(`${fileName}.in`, Buffer.from(input));
    zip.addFile(`${fileName}.out`, Buffer.from(output));

    // 分數分配：13 + 13 + 12 + 12 = 50
    const points = i < 2 ? 13 : 12;

    allCases.push({
      name: `Subtask 2 - Case ${i + 1}`,
      inputFile: `${fileName}.in`,
      outputFile: `${fileName}.out`,
      points: points,
      isSample: false,
      timeLimitMs: 1000, // 更嚴格的時限
      memoryLimitKb: 262144,
    });

    caseIndex++;
  }

  const manifest = {
    version: '1.0',
    defaultTimeLimitMs: 2000,
    defaultMemoryLimitKb: 262144,
    cases: allCases,
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

  return zip.toBuffer();
}

interface ProblemDef {
  displayId: string;
  title: string;
  description: string;
  input: string;
  output: string;
  hint?: string;
  sampleInputs: string[];
  sampleOutputs: string[];
  submissionType: SubmissionType;
  allowedLanguages: ProgrammingLanguage[];
  difficulty: ProblemDifficulty;
  tags: string[];
  pipelineConfig?: any;
  testdata?: Buffer;
  checker?: { code: string; language: ProgrammingLanguage };
  template?: { code: string; language: ProgrammingLanguage };
}

// Problem definitions
const PROBLEMS: ProblemDef[] = [
  // 1) A + B - Standard text comparison
  {
    displayId: 'd001',
    title: 'A + B',
    description: `## 題目描述

給定兩個整數 A 和 B，請計算並輸出它們的和。

這是最基本的程式題目，用來測試你的開發環境是否正確設定。

## 評測方式

標準文字比對（純文字 Diff）`,
    input: `輸入包含一行，有兩個以空格分隔的整數 A 和 B。

- $-10^9 \\leq A, B \\leq 10^9$`,
    output: `輸出一個整數，表示 A + B 的結果。`,
    sampleInputs: ['2 3', '100 -50', '0 0'],
    sampleOutputs: ['5', '50', '0'],
    submissionType: SubmissionType.SINGLE_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.JAVA, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.EASY,
    tags: ['入門', '數學'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: {} },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'text-diff' } },
    ] },
  },

  // 2) JSON Output - Custom Checker
  {
    displayId: 'd002',
    title: '輸出小字典（JSON）',
    description: `## 題目描述

給定一個 key 和一個 value，請輸出一個 JSON 物件。

## 評測方式

使用自訂 Checker（JSON 解析比對），允許：
- 空白差異（縮排、換行）
- key 順序差異

只要輸出的 JSON 在語義上等價即可通過。`,
    input: `輸入包含一行，有兩個以空格分隔的字串：key 和 value。

- key 和 value 只包含英文字母
- 長度不超過 100`,
    output: `輸出一個合法的 JSON 物件，格式為 \`{"key": "value"}\`。`,
    hint: `記得輸出要是合法的 JSON 格式！`,
    sampleInputs: ['name Alice', 'city Taipei'],
    sampleOutputs: ['{"name":"Alice"}', '{"city":"Taipei"}'],
    submissionType: SubmissionType.SINGLE_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.JAVA, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.EASY,
    tags: ['字串', 'JSON'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: {} },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'custom-checker' } },
    ] },
    checker: {
      language: ProgrammingLanguage.PYTHON,
      code: `#!/usr/bin/env python3
"""
JSON Checker - Compares JSON output ignoring whitespace and key order
"""
import json
import sys

def main():
    # Read files
    with open('input.txt', 'r') as f:
        input_data = f.read().strip()
    with open('output.txt', 'r') as f:
        user_output = f.read().strip()
    with open('answer.txt', 'r') as f:
        expected_output = f.read().strip()

    # Parse input to get expected structure
    parts = input_data.split()
    if len(parts) != 2:
        print("Invalid input format")
        sys.exit(1)

    key, value = parts
    expected_json = {key: value}

    try:
        user_json = json.loads(user_output)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        sys.exit(1)

    if user_json == expected_json:
        print("Accepted")
        sys.exit(0)
    else:
        print(f"Wrong Answer: expected {expected_json}, got {user_json}")
        sys.exit(1)

if __name__ == '__main__':
    main()
`,
    },
  },

  // 3) No Loops - Static Analysis
  {
    displayId: 'd003',
    title: '不用迴圈算 1 到 N',
    description: `## 題目描述

給定一個正整數 N，請計算 $1 + 2 + 3 + \\cdots + N$ 的值。

## 限制

**禁止使用迴圈**（\`for\`、\`while\`、\`do-while\`）！

你可以使用：
- 數學公式：$\\frac{N \\times (N+1)}{2}$
- 遞迴

## 評測方式

程式碼會先經過靜態分析檢查，若偵測到迴圈關鍵字將直接判定為不通過。`,
    input: `輸入包含一個正整數 N。

- $1 \\leq N \\leq 10^6$`,
    output: `輸出 1 到 N 的總和。`,
    sampleInputs: ['5', '10', '100'],
    sampleOutputs: ['15', '55', '5050'],
    submissionType: SubmissionType.SINGLE_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.EASY,
    tags: ['數學', '遞迴', '靜態分析'],
    pipelineConfig: { stages: [
      {
        type: 'STATIC_ANALYSIS',
        config: {
          rules: [
            { type: 'forbidden-keyword', keywords: ['for', 'while', 'do'], message: '禁止使用迴圈' }
          ]
        }
      },
      { type: 'COMPILE', config: {} },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'text-diff' } },
    ] },
  },

  // 4) Subtask / Partial Scoring - 數對計數
  {
    displayId: 'd004',
    title: '數對計數（部分給分）',
    description: `## 題目描述

給定一個長度為 N 的整數陣列 A 和一個目標值 K，請計算有多少對 (i, j) 滿足：
- $0 \\leq i < j < N$
- $A_i + A_j = K$

## 輸入格式

第一行包含兩個整數 N 和 K。
第二行包含 N 個整數，表示陣列 A。

## 輸出格式

輸出一個整數，表示滿足條件的數對數量。

## 子任務

| 子任務 | 分數 | 限制 | 時限 |
|--------|------|------|------|
| 1 | 50 | $N \\leq 1000$ | 2 秒 |
| 2 | 50 | $N \\leq 10^5$ | 1 秒 |

## 範例

### 輸入
\`\`\`
5 7
1 2 3 4 5
\`\`\`

### 輸出
\`\`\`
2
\`\`\`

### 說明
滿足條件的數對為：(2, 5) 和 (3, 4)，即 2+5=7 和 3+4=7。

## 提示

- 子任務 1 可以使用 $O(N^2)$ 暴力枚舉
- 子任務 2 需要更高效的演算法（提示：排序 + 雙指針 或 雜湊表）`,
    input: `第一行包含兩個整數 N 和 K ($1 \\leq N \\leq 10^5$, $-10^5 \\leq K \\leq 10^5$)。
第二行包含 N 個整數 $A_i$ ($-10^5 \\leq A_i \\leq 10^5$)。`,
    output: `輸出一個整數，表示滿足 $A_i + A_j = K$ 且 $i < j$ 的數對數量。`,
    sampleInputs: ['5 7\n1 2 3 4 5'],
    sampleOutputs: ['2'],
    submissionType: SubmissionType.SINGLE_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.JAVA, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.MEDIUM,
    tags: ['陣列', '雜湊表', '子任務', '部分給分'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: {} },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'text-diff' } },
    ] },
  },

  // 5) Interactive - Guess Number
  {
    displayId: 'd005',
    title: '互動猜數字',
    description: `## 題目描述

這是一道**互動題**！

評測系統心裡想了一個 1 到 100 之間的整數。你需要在**最多 7 次**猜測內找出這個數字。

## 互動方式

每次你輸出一個猜測的數字後，系統會回應：
- \`HIGH\`：你猜的數字太大了
- \`LOW\`：你猜的數字太小了
- \`OK\`：恭喜你猜對了！

當你收到 \`OK\` 後，程式應該立即結束。

## 注意事項

1. 每次輸出後記得 **flush**（清空輸出緩衝區）
2. 不要輸出多餘的除錯訊息
3. 超過 7 次猜測會判定為錯誤

## 範例互動

\`\`\`
你的輸出: 50
系統回應: HIGH
你的輸出: 25
系統回應: LOW
你的輸出: 37
系統回應: OK
\`\`\`

## 提示

使用**二分搜尋法**可以保證在 7 次內找到答案（因為 $\\log_2(100) < 7$）

## 評測方式

使用互動式評測 (Interactive Judge)`,
    input: `無。這是互動題，系統會根據你的輸出回應。`,
    output: `輸出你的猜測數字，每個數字一行。`,
    hint: `提示：使用二分搜尋法可以保證在 7 次內找到答案（因為 $\\log_2(100) < 7$）`,
    sampleInputs: ['(互動範例)'],
    sampleOutputs: ['50\\nHIGH\\n25\\nLOW\\n37\\nOK'],
    submissionType: SubmissionType.SINGLE_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.JAVA, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.MEDIUM,
    tags: ['互動題', '二分搜尋'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: {} },
      {
        type: 'INTERACTIVE',
        config: {
          interactorLanguage: 'PYTHON',
          timeLimitMs: 5000,
          memoryLimitKb: 262144,
          interactionTimeoutMs: 10000,
        }
      },
      { type: 'SCORING', config: { mode: 'sum' } },
    ] },
    interactor: {
      language: ProgrammingLanguage.PYTHON,
      code: `#!/usr/bin/env python3
"""
互動器：猜數字遊戲
測資格式：一個整數，表示答案 (1-100)
互動協議：
  - 學生輸出猜測的數字
  - 互動器回應 HIGH/LOW/OK
  - 最多 7 次猜測

退出碼：
  - 0: AC (猜對了)
  - 1: WA (猜錯或超過次數)
"""
import sys

def main():
    # 讀取答案（從測資）
    try:
        answer = int(input().strip())
    except:
        print("Invalid test data", file=sys.stderr)
        sys.exit(3)  # JUDGE_ERROR

    max_guesses = 7
    guesses = 0

    while guesses < max_guesses:
        # 讀取學生的猜測
        try:
            line = input().strip()
            if not line:
                continue
            guess = int(line)
        except EOFError:
            print("Unexpected EOF from student program", file=sys.stderr)
            sys.exit(1)  # WA
        except ValueError:
            print(f"Invalid guess format: '{line}'", file=sys.stderr)
            sys.exit(1)  # WA

        guesses += 1

        if guess == answer:
            print("OK")
            sys.stdout.flush()
            print(f"Correct! Answer was {answer}, found in {guesses} guesses", file=sys.stderr)
            sys.exit(0)  # AC
        elif guess > answer:
            print("HIGH")
            sys.stdout.flush()
        else:
            print("LOW")
            sys.stdout.flush()

    # 超過最大猜測次數
    print(f"Too many guesses ({max_guesses}). Answer was {answer}", file=sys.stderr)
    sys.exit(1)  # WA

if __name__ == '__main__':
    main()
`,
    },
  },

  // 6) Artifact Collection
  {
    displayId: 'd006',
    title: '寫出答案檔',
    description: `## 題目描述

這道題目測試你的**檔案輸出**能力。

給定一個字串 S，你需要：
1. 將 S **原樣寫入**檔案 \`answer.txt\`
2. 在標準輸出印出 \`DONE\`

## 評測方式

系統會：
1. 檢查你的標準輸出是否為 \`DONE\`
2. 收集並檢查 \`answer.txt\` 的內容是否正確

## 提示

C 語言範例：
\`\`\`c
FILE *fp = fopen("answer.txt", "w");
fprintf(fp, "%s", s);
fclose(fp);
printf("DONE\\n");
\`\`\``,
    input: `輸入包含一行字串 S。

- S 只包含英文字母和數字
- 長度不超過 1000`,
    output: `在標準輸出印出 \`DONE\`，並將 S 寫入檔案 \`answer.txt\`。`,
    sampleInputs: ['hello', 'world123'],
    sampleOutputs: ['DONE', 'DONE'],
    submissionType: SubmissionType.SINGLE_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.EASY,
    tags: ['檔案操作', '產物收集'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: {} },
      { type: 'EXECUTE', config: { artifactPaths: ['answer.txt'] } },
      { type: 'CHECK', config: { mode: 'artifact-check', artifacts: ['answer.txt'] } },
    ] },
  },

  // 7) Function Only
  {
    displayId: 'd007',
    title: '實作 isPalindrome',
    description: `## 題目描述

請實作一個函式，判斷給定的字串是否為**回文**（正讀反讀都一樣）。

## 函式簽名

### C/C++
\`\`\`c
int isPalindrome(const char* s);
\`\`\`
回傳 1 表示是回文，0 表示不是。

### Python
\`\`\`python
def isPalindrome(s: str) -> bool:
\`\`\`

## 評測方式

你只需要實作上述函式。系統會將你的程式碼與老師提供的測試程式合併後編譯執行。

**不要**撰寫 \`main\` 函式或輸入輸出程式碼！`,
    input: `（由測試程式處理）`,
    output: `（由測試程式處理）`,
    hint: `回文範例：\`abba\`、\`racecar\`、\`a\`、\`""\`（空字串也是回文）`,
    sampleInputs: ['abba', 'hello', 'a', 'racecar'],
    sampleOutputs: ['true', 'false', 'true', 'true'],
    submissionType: SubmissionType.FUNCTION_ONLY,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP, ProgrammingLanguage.PYTHON],
    difficulty: ProblemDifficulty.EASY,
    tags: ['函式實作', '字串', '回文'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: { mode: 'function-only' } },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'text-diff' } },
    ] },
    template: {
      language: ProgrammingLanguage.C,
      code: `// 請在此實作 isPalindrome 函式
// int isPalindrome(const char* s);
// 回傳 1 表示是回文，0 表示不是

`,
    },
  },

  // 8) Multi-file ZIP (no Makefile)
  {
    displayId: 'd008',
    title: '簡易字串工具庫（多檔案）',
    description: `## 題目描述

請實作一個簡易的字串工具庫。

你需要提交一個 ZIP 檔案，包含：
- \`util.h\`：標頭檔，宣告 \`int count_vowels(const char* s);\`
- \`util.c\`：實作檔，實作上述函式

系統會使用老師提供的 \`main.c\` 呼叫你的函式。

## 函式說明

\`count_vowels(s)\`：回傳字串 s 中母音字母（a, e, i, o, u，不分大小寫）的數量。

## ZIP 結構

\`\`\`
your_submission.zip
├── util.h
└── util.c
\`\`\``,
    input: `輸入包含一行字串。`,
    output: `輸出該字串中母音的數量。`,
    sampleInputs: ['banana', 'hello', 'xyz'],
    sampleOutputs: ['3', '2', '0'],
    submissionType: SubmissionType.MULTI_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP],
    difficulty: ProblemDifficulty.MEDIUM,
    tags: ['多檔案', '模組化', '字串'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: { mode: 'multi-file' } },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'text-diff' } },
    ] },
  },

  // 9) Multi-file + Makefile
  {
    displayId: 'd009',
    title: '迷你計算機（Makefile 專案）',
    description: `## 題目描述

請實作一個迷你計算機程式。

你需要提交一個 ZIP 檔案，包含：
- 多個 \`.c\` 和 \`.h\` 檔案
- 一個 \`Makefile\`

執行 \`make\` 後應該產生可執行檔 \`calc\`。

## 程式功能

讀入一行格式為 \`A op B\` 的輸入，其中：
- \`A\` 和 \`B\` 是整數
- \`op\` 是運算符（\`+\`、\`-\`、\`*\`、\`/\`）

輸出運算結果（整數除法）。

## Makefile 範例

\`\`\`makefile
CC = gcc
CFLAGS = -O2 -Wall

calc: main.o ops.o
	$(CC) -o calc main.o ops.o

main.o: main.c ops.h
	$(CC) $(CFLAGS) -c main.c

ops.o: ops.c ops.h
	$(CC) $(CFLAGS) -c ops.c

clean:
	rm -f *.o calc
\`\`\`

## ZIP 結構範例

\`\`\`
calculator.zip
├── Makefile
├── main.c
├── ops.c
└── ops.h
\`\`\``,
    input: `輸入包含一行，格式為 \`A op B\`。

- $-10^9 \\leq A, B \\leq 10^9$
- \`op\` 為 \`+\`、\`-\`、\`*\`、\`/\` 之一
- 保證除法不會除以零`,
    output: `輸出運算結果。`,
    sampleInputs: ['3 * 4', '10 + 5', '20 / 3', '7 - 12'],
    sampleOutputs: ['12', '15', '6', '-5'],
    submissionType: SubmissionType.MULTI_FILE,
    allowedLanguages: [ProgrammingLanguage.C, ProgrammingLanguage.CPP],
    difficulty: ProblemDifficulty.MEDIUM,
    tags: ['多檔案', 'Makefile', '專案'],
    pipelineConfig: { stages: [
      { type: 'COMPILE', config: { mode: 'makefile' } },
      { type: 'EXECUTE', config: {} },
      { type: 'CHECK', config: { mode: 'text-diff' } },
    ] },
  },
];

// Generate test data for each problem
function generateTestData(displayId: string): Buffer {
  switch (displayId) {
    case 'd001': // A + B
      return createTestdataZip([
        { input: '2 3\n', output: '5\n', isSample: true },
        { input: '100 -50\n', output: '50\n', isSample: true },
        { input: '0 0\n', output: '0\n', isSample: true },
        { input: '1000000000 1000000000\n', output: '2000000000\n' },
        { input: '-1000000000 -1000000000\n', output: '-2000000000\n' },
        { input: '123456789 987654321\n', output: '1111111110\n' },
        { input: '1 -1\n', output: '0\n' },
        { input: '999999999 1\n', output: '1000000000\n' },
      ]);

    case 'd002': // JSON
      return createTestdataZip([
        { input: 'name Alice\n', output: '{"name":"Alice"}\n', isSample: true },
        { input: 'city Taipei\n', output: '{"city":"Taipei"}\n', isSample: true },
        { input: 'foo bar\n', output: '{"foo":"bar"}\n' },
        { input: 'hello world\n', output: '{"hello":"world"}\n' },
        { input: 'key value\n', output: '{"key":"value"}\n' },
      ]);

    case 'd003': // No loops
      return createTestdataZip([
        { input: '5\n', output: '15\n', isSample: true },
        { input: '10\n', output: '55\n', isSample: true },
        { input: '100\n', output: '5050\n', isSample: true },
        { input: '1\n', output: '1\n' },
        { input: '1000\n', output: '500500\n' },
        { input: '10000\n', output: '50005000\n' },
        { input: '100000\n', output: '5000050000\n' },
        { input: '1000000\n', output: '500000500000\n' },
      ]);

    case 'd004': // 數對計數 - Subtask
      return createPairCountingTestdata();

    case 'd005': // Interactive
      return createTestdataZip([
        { input: '42\n', output: 'INTERACTIVE\n', isSample: true },
        { input: '1\n', output: 'INTERACTIVE\n' },
        { input: '100\n', output: 'INTERACTIVE\n' },
        { input: '50\n', output: 'INTERACTIVE\n' },
        { input: '73\n', output: 'INTERACTIVE\n' },
      ]);

    case 'd006': // Artifact
      return createTestdataZip([
        { input: 'hello\n', output: 'DONE\n', isSample: true },
        { input: 'world123\n', output: 'DONE\n', isSample: true },
        { input: 'TestString\n', output: 'DONE\n' },
        { input: 'abc123xyz\n', output: 'DONE\n' },
        { input: 'OpenJudge\n', output: 'DONE\n' },
      ]);

    case 'd007': // Function only
      return createTestdataZip([
        { input: 'abba\n', output: 'true\n', isSample: true },
        { input: 'hello\n', output: 'false\n', isSample: true },
        { input: 'a\n', output: 'true\n', isSample: true },
        { input: 'racecar\n', output: 'true\n', isSample: true },
        { input: '\n', output: 'true\n' }, // empty string
        { input: 'ab\n', output: 'false\n' },
        { input: 'aba\n', output: 'true\n' },
        { input: 'abcba\n', output: 'true\n' },
        { input: 'abcde\n', output: 'false\n' },
      ]);

    case 'd008': // Multi-file
      return createTestdataZip([
        { input: 'banana\n', output: '3\n', isSample: true },
        { input: 'hello\n', output: '2\n', isSample: true },
        { input: 'xyz\n', output: '0\n', isSample: true },
        { input: 'AEIOU\n', output: '5\n' },
        { input: 'aeiouAEIOU\n', output: '10\n' },
        { input: 'programming\n', output: '3\n' },
        { input: 'bcdfghjklmnpqrstvwxyz\n', output: '0\n' },
      ]);

    case 'd009': // Makefile
      return createTestdataZip([
        { input: '3 * 4\n', output: '12\n', isSample: true },
        { input: '10 + 5\n', output: '15\n', isSample: true },
        { input: '20 / 3\n', output: '6\n', isSample: true },
        { input: '7 - 12\n', output: '-5\n', isSample: true },
        { input: '100 + 200\n', output: '300\n' },
        { input: '1000000 * 1000\n', output: '1000000000\n' },
        { input: '999999999 / 3\n', output: '333333333\n' },
        { input: '0 - 1000000000\n', output: '-1000000000\n' },
      ]);

    default:
      return createTestdataZip([
        { input: 'test\n', output: 'test\n' },
      ]);
  }
}

async function main() {
  console.log('=== Demo Problems Seed Script ===\n');

  // Find admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    console.error('No admin user found! Please create an admin user first.');
    process.exit(1);
  }

  console.log(`Using admin user: ${admin.email} (id: ${admin.id})\n`);

  // Ensure MinIO buckets exist
  await ensureBucket('noj-testdata');
  await ensureBucket('noj-checkers');
  await ensureBucket('noj-templates');

  for (const problemDef of PROBLEMS) {
    console.log(`\nCreating problem: ${problemDef.displayId} - ${problemDef.title}`);

    // Check if problem already exists
    const existing = await prisma.problem.findUnique({
      where: { displayId: problemDef.displayId },
    });

    if (existing) {
      console.log(`  Problem ${problemDef.displayId} already exists, skipping...`);
      continue;
    }

    // Create problem
    const problem = await prisma.problem.create({
      data: {
        displayId: problemDef.displayId,
        title: problemDef.title,
        description: problemDef.description,
        input: problemDef.input,
        output: problemDef.output,
        hint: problemDef.hint,
        sampleInputs: problemDef.sampleInputs,
        sampleOutputs: problemDef.sampleOutputs,
        submissionType: problemDef.submissionType,
        allowedLanguages: problemDef.allowedLanguages,
        visibility: ProblemVisibility.PUBLIC,
        difficulty: problemDef.difficulty,
        tags: problemDef.tags,
        pipelineConfig: problemDef.pipelineConfig,
        ownerId: admin.id,
        artifactPaths: [],
      },
    });

    console.log(`  Created problem: ${problem.id}`);

    // Upload checker if exists
    if (problemDef.checker) {
      const checkerKey = `checkers/${problem.id}/checker.py`;
      await uploadToMinio('noj-checkers', checkerKey, Buffer.from(problemDef.checker.code));

      await prisma.problem.update({
        where: { id: problem.id },
        data: {
          checkerKey,
          checkerLanguage: problemDef.checker.language,
        },
      });
      console.log(`  Uploaded checker`);
    }

    // Upload template if exists
    if (problemDef.template) {
      const templateKey = `templates/${problem.id}/template.c`;
      await uploadToMinio('noj-templates', templateKey, Buffer.from(problemDef.template.code));

      await prisma.problem.update({
        where: { id: problem.id },
        data: { templateKey },
      });
      console.log(`  Uploaded template`);
    }

    // Generate and upload testdata
    const testdataZip = generateTestData(problemDef.displayId);
    const zipKey = `testdata/${problem.id}/v1/testdata.zip`;

    await uploadToMinio('noj-testdata', zipKey, testdataZip);

    // Parse manifest from ZIP
    const zip = new AdmZip(testdataZip);
    const manifestEntry = zip.getEntry('manifest.json');
    const manifest = JSON.parse(manifestEntry!.getData().toString('utf-8'));

    // Create testdata record
    await prisma.problemTestdata.create({
      data: {
        problemId: problem.id,
        version: 1,
        zipKey,
        manifest,
        isActive: true,
        uploadedById: admin.id,
      },
    });

    console.log(`  Uploaded testdata (${manifest.cases.length} cases)`);
  }

  console.log('\n=== Seed completed! ===');
  console.log(`Created ${PROBLEMS.length} demo problems.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
