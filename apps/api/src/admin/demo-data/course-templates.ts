import { ProblemDifficulty, ProgrammingLanguage } from '@prisma/client';
import { ProblemTemplate, SampleCase } from './problem-templates';

export interface CourseAnnouncementTemplate {
  title: string;
  content: string;
  isPinned: boolean;
}

export interface CourseHomeworkTemplate {
  title: string;
  description: string;
  problemIndices: number[]; // indices into course problems array
}

export interface CourseTemplate {
  code: string;
  slug: string;
  name: string;
  description: string;
  problems: ProblemTemplate[];
  announcements: CourseAnnouncementTemplate[];
  homeworks: CourseHomeworkTemplate[];
}

// ============================================================================
// Course 1: 程式設計（一） (CS101)
// ============================================================================

const CS101_PROBLEMS: ProblemTemplate[] = [
  {
    displayId: 'cs101-01',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '華氏轉攝氏',
    titleEn: 'Fahrenheit to Celsius',
    descriptionZh: `給定一個華氏溫度 $F$，請將它轉換為攝氏溫度 $C$。

轉換公式：$C = (F - 32) \\times \\frac{5}{9}$

### 限制
- $-459.67 \\le F \\le 10000$（華氏溫度）`,
    descriptionEn: `Given a Fahrenheit temperature $F$, convert it to Celsius $C$.

Formula: $C = (F - 32) \\times \\frac{5}{9}$

### Constraints
- $-459.67 \\le F \\le 10000$ (Fahrenheit)`,
    inputZh: '輸入一個浮點數 $F$，表示華氏溫度。',
    inputEn: 'A floating-point number $F$, the Fahrenheit temperature.',
    outputZh: '輸出對應的攝氏溫度，保留兩位小數。',
    outputEn: 'Output the corresponding Celsius temperature, rounded to 2 decimal places.',
    tagsZh: ['數學', '浮點數'],
    tagsEn: ['math', 'floating-point'],
    sampleCases: [
      { input: '32\n', output: '0.00\n' },
      { input: '212\n', output: '100.00\n' },
      { input: '98.6\n', output: '37.00\n' },
    ],
    generateTestCase: () => {
      const f = Math.random() * 500 - 50;
      const c = ((f - 32) * 5) / 9;
      return { input: `${f.toFixed(1)}\n`, output: `${c.toFixed(2)}\n` };
    },
  },
  {
    displayId: 'cs101-02',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '計算圓面積',
    titleEn: 'Circle Area',
    descriptionZh: `給定圓的半徑 $r$，計算圓的面積。

圓面積公式：$A = \\pi r^2$（使用 $\\pi = 3.14159265358979$）

### 限制
- $0 < r \\le 1000$`,
    descriptionEn: `Given the radius $r$ of a circle, calculate its area.

Formula: $A = \\pi r^2$ (use $\\pi = 3.14159265358979$)

### Constraints
- $0 < r \\le 1000$`,
    inputZh: '輸入一個正整數 $r$，表示圓的半徑。',
    inputEn: 'A positive integer $r$, the radius of the circle.',
    outputZh: '輸出圓的面積，保留兩位小數。',
    outputEn: 'Output the area of the circle, rounded to 2 decimal places.',
    tagsZh: ['數學', '幾何'],
    tagsEn: ['math', 'geometry'],
    sampleCases: [
      { input: '1\n', output: '3.14\n' },
      { input: '2\n', output: '12.57\n' },
      { input: '10\n', output: '314.16\n' },
    ],
    generateTestCase: () => {
      const r = Math.floor(Math.random() * 100) + 1;
      const area = Math.PI * r * r;
      return { input: `${r}\n`, output: `${area.toFixed(2)}\n` };
    },
  },
  {
    displayId: 'cs101-03',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '成績等級',
    titleEn: 'Grade Level',
    descriptionZh: `給定一個學生的分數，輸出對應的等級：
- 90-100 分：A
- 80-89 分：B
- 70-79 分：C
- 60-69 分：D
- 0-59 分：F

### 限制
- $0 \\le score \\le 100$`,
    descriptionEn: `Given a student's score, output the corresponding grade:
- 90-100: A
- 80-89: B
- 70-79: C
- 60-69: D
- 0-59: F

### Constraints
- $0 \\le score \\le 100$`,
    inputZh: '輸入一個整數，表示學生的分數。',
    inputEn: 'A single integer, the student\'s score.',
    outputZh: '輸出對應的等級（A、B、C、D 或 F）。',
    outputEn: 'Output the corresponding grade (A, B, C, D, or F).',
    tagsZh: ['條件判斷'],
    tagsEn: ['conditionals'],
    sampleCases: [
      { input: '95\n', output: 'A\n' },
      { input: '75\n', output: 'C\n' },
      { input: '55\n', output: 'F\n' },
    ],
    generateTestCase: () => {
      const score = Math.floor(Math.random() * 101);
      let grade: string;
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
      else grade = 'F';
      return { input: `${score}\n`, output: `${grade}\n` };
    },
  },
  {
    displayId: 'cs101-04',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '九九乘法表',
    titleEn: 'Multiplication Table',
    descriptionZh: `輸出 1 到 $n$ 的乘法表。

### 限制
- $1 \\le n \\le 9$`,
    descriptionEn: `Output the multiplication table from 1 to $n$.

### Constraints
- $1 \\le n \\le 9$`,
    inputZh: '輸入一個整數 $n$。',
    inputEn: 'A single integer $n$.',
    outputZh: `輸出乘法表，每行格式為 \`a*b=c\`，其中 $a$ 從 1 到 $n$，$b$ 從 1 到 $a$。`,
    outputEn: `Output the multiplication table, each line in format \`a*b=c\`, where $a$ ranges from 1 to $n$, $b$ ranges from 1 to $a$.`,
    tagsZh: ['迴圈', '巢狀迴圈'],
    tagsEn: ['loops', 'nested-loops'],
    sampleCases: [
      { input: '2\n', output: '1*1=1\n2*1=2\n2*2=4\n' },
      { input: '3\n', output: '1*1=1\n2*1=2\n2*2=4\n3*1=3\n3*2=6\n3*3=9\n' },
      { input: '1\n', output: '1*1=1\n' },
    ],
    generateTestCase: (index: number) => {
      const n = (index % 9) + 1;
      let output = '';
      for (let a = 1; a <= n; a++) {
        for (let b = 1; b <= a; b++) {
          output += `${a}*${b}=${a * b}\n`;
        }
      }
      return { input: `${n}\n`, output };
    },
  },
  {
    displayId: 'cs101-05',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '階乘計算',
    titleEn: 'Factorial',
    descriptionZh: `計算 $n!$（$n$ 的階乘）。

$n! = 1 \\times 2 \\times 3 \\times \\cdots \\times n$

特別地，$0! = 1$。

### 限制
- $0 \\le n \\le 20$`,
    descriptionEn: `Calculate $n!$ (factorial of $n$).

$n! = 1 \\times 2 \\times 3 \\times \\cdots \\times n$

Special case: $0! = 1$.

### Constraints
- $0 \\le n \\le 20$`,
    inputZh: '輸入一個非負整數 $n$。',
    inputEn: 'A non-negative integer $n$.',
    outputZh: '輸出 $n!$ 的值。',
    outputEn: 'Output the value of $n!$.',
    hintZh: '注意 $20!$ 會超過 64 位元整數範圍，請使用適當的資料型態。',
    hintEn: 'Note that $20!$ exceeds 64-bit integer range. Use appropriate data types.',
    tagsZh: ['數學', '迴圈'],
    tagsEn: ['math', 'loops'],
    sampleCases: [
      { input: '0\n', output: '1\n' },
      { input: '5\n', output: '120\n' },
      { input: '10\n', output: '3628800\n' },
    ],
    generateTestCase: (index: number) => {
      const n = index % 21;
      let result = 1n;
      for (let i = 2; i <= n; i++) result *= BigInt(i);
      return { input: `${n}\n`, output: `${result}\n` };
    },
  },
];

const CS101_ANNOUNCEMENTS: CourseAnnouncementTemplate[] = [
  {
    title: '歡迎來到程式設計（一）',
    content: `歡迎各位同學選修本課程！

本課程將帶領大家從零開始學習程式設計的基礎概念，包括變數、運算子、條件判斷、迴圈等核心觀念。課程將使用 C 語言作為主要教學語言，但同學們也可以使用 Python、Java 或 C++ 來完成作業。

請同學們先確認已經完成開發環境的設定，若有任何問題歡迎在討論區發問或於 Office Hour 時間前來詢問。

祝各位學習順利！`,
    isPinned: true,
  },
  {
    title: '第一次作業已發布',
    content: `第一次作業「基礎運算」已經發布，包含兩道題目：華氏轉攝氏、計算圓面積。

這兩題主要練習基本的輸入輸出以及數學運算，請同學們務必在截止日期前完成繳交。

提醒大家，本課程的作業評分採用自動評測系統，請務必注意輸出格式是否正確，多餘的空白或換行都可能導致答案錯誤。

如有任何問題，歡迎在討論區發問。`,
    isPinned: false,
  },
  {
    title: '程式設計學習資源分享',
    content: `以下整理了一些對初學者有幫助的學習資源供同學參考：

1. **C Programming Tutorial** - 適合完全沒有程式基礎的同學
2. **演算法筆記** - 台灣經典的程式設計教學網站
3. **LeetCode Easy 題目** - 可以額外練習的題庫

建議同學每週至少花 3-4 小時練習寫程式，程式設計是需要大量練習才能熟練的技能。

加油！`,
    isPinned: false,
  },
];

const CS101_HOMEWORKS: CourseHomeworkTemplate[] = [
  {
    title: '作業一：基礎運算',
    description: '本次作業練習基本的輸入輸出和數學運算，包含華氏轉攝氏、計算圓面積兩題。',
    problemIndices: [0, 1],
  },
  {
    title: '作業二：流程控制',
    description: '本次作業練習條件判斷和迴圈，包含成績等級、九九乘法表兩題。',
    problemIndices: [2, 3],
  },
];

// ============================================================================
// Course 2: 程式設計（二） (CS102)
// ============================================================================

const CS102_PROBLEMS: ProblemTemplate[] = [
  {
    displayId: 'cs102-01',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '陣列總和',
    titleEn: 'Array Sum',
    descriptionZh: `給定一個整數陣列，計算所有元素的總和。

### 限制
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Given an array of integers, calculate the sum of all elements.

### Constraints
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入一個整數 $n$，表示陣列長度。
第二行輸入 $n$ 個整數，表示陣列元素。`,
    inputEn: `The first line contains an integer $n$, the array length.
The second line contains $n$ integers, the array elements.`,
    outputZh: '輸出陣列所有元素的總和。',
    outputEn: 'Output the sum of all array elements.',
    tagsZh: ['陣列', '基礎'],
    tagsEn: ['array', 'basic'],
    sampleCases: [
      { input: '5\n1 2 3 4 5\n', output: '15\n' },
      { input: '3\n-1 0 1\n', output: '0\n' },
      { input: '1\n100\n', output: '100\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 100) + 10;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 2000) - 1000);
      }
      const sum = arr.reduce((a, b) => a + b, 0);
      return { input: `${n}\n${arr.join(' ')}\n`, output: `${sum}\n` };
    },
  },
  {
    displayId: 'cs102-02',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '矩陣相加',
    titleEn: 'Matrix Addition',
    descriptionZh: `給定兩個 $n \\times m$ 的矩陣 $A$ 和 $B$，計算它們的和。

### 限制
- $1 \\le n, m \\le 100$
- $-1000 \\le a_{ij}, b_{ij} \\le 1000$`,
    descriptionEn: `Given two $n \\times m$ matrices $A$ and $B$, calculate their sum.

### Constraints
- $1 \\le n, m \\le 100$
- $-1000 \\le a_{ij}, b_{ij} \\le 1000$`,
    inputZh: `第一行輸入兩個整數 $n$ 和 $m$。
接下來 $n$ 行，每行 $m$ 個整數，表示矩陣 $A$。
接下來 $n$ 行，每行 $m$ 個整數，表示矩陣 $B$。`,
    inputEn: `First line contains two integers $n$ and $m$.
Next $n$ lines, each with $m$ integers, represent matrix $A$.
Next $n$ lines, each with $m$ integers, represent matrix $B$.`,
    outputZh: '輸出 $n$ 行，每行 $m$ 個整數，表示 $A + B$ 的結果。',
    outputEn: 'Output $n$ lines, each with $m$ integers, representing $A + B$.',
    tagsZh: ['矩陣', '二維陣列'],
    tagsEn: ['matrix', '2d-array'],
    sampleCases: [
      { input: '2 2\n1 2\n3 4\n5 6\n7 8\n', output: '6 8\n10 12\n' },
      { input: '1 3\n1 2 3\n4 5 6\n', output: '5 7 9\n' },
      { input: '2 1\n1\n2\n3\n4\n', output: '4\n6\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 5) + 2;
      const m = Math.floor(Math.random() * 5) + 2;
      const A: number[][] = [];
      const B: number[][] = [];
      for (let i = 0; i < n; i++) {
        A.push([]);
        B.push([]);
        for (let j = 0; j < m; j++) {
          A[i].push(Math.floor(Math.random() * 200) - 100);
          B[i].push(Math.floor(Math.random() * 200) - 100);
        }
      }
      let input = `${n} ${m}\n`;
      for (let i = 0; i < n; i++) input += A[i].join(' ') + '\n';
      for (let i = 0; i < n; i++) input += B[i].join(' ') + '\n';
      let output = '';
      for (let i = 0; i < n; i++) {
        output += A[i].map((v, j) => v + B[i][j]).join(' ') + '\n';
      }
      return { input, output };
    },
  },
  {
    displayId: 'cs102-03',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '字串反轉',
    titleEn: 'String Reverse',
    descriptionZh: `給定一個字串，將它反轉後輸出。

### 限制
- $1 \\le |s| \\le 10^5$
- 字串只包含 ASCII 可見字元`,
    descriptionEn: `Given a string, reverse it and output.

### Constraints
- $1 \\le |s| \\le 10^5$
- The string contains only ASCII printable characters`,
    inputZh: '輸入一個字串 $s$。',
    inputEn: 'A single string $s$.',
    outputZh: '輸出反轉後的字串。',
    outputEn: 'Output the reversed string.',
    tagsZh: ['字串', '反轉'],
    tagsEn: ['string', 'reverse'],
    sampleCases: [
      { input: 'hello\n', output: 'olleh\n' },
      { input: 'abc123\n', output: '321cba\n' },
      { input: 'a\n', output: 'a\n' },
    ],
    generateTestCase: () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const len = Math.floor(Math.random() * 100) + 10;
      let s = '';
      for (let i = 0; i < len; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
      }
      return { input: `${s}\n`, output: `${s.split('').reverse().join('')}\n` };
    },
  },
  {
    displayId: 'cs102-04',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '指標交換',
    titleEn: 'Pointer Swap',
    descriptionZh: `給定兩個整數 $a$ 和 $b$，請交換它們的值並輸出。

這題的目的是練習使用指標來交換變數值（在支援指標的語言中）。

### 限制
- $-10^9 \\le a, b \\le 10^9$`,
    descriptionEn: `Given two integers $a$ and $b$, swap their values and output.

The purpose of this problem is to practice using pointers to swap values (in languages that support pointers).

### Constraints
- $-10^9 \\le a, b \\le 10^9$`,
    inputZh: '輸入兩個整數 $a$ 和 $b$。',
    inputEn: 'Two integers $a$ and $b$.',
    outputZh: '輸出交換後的 $b$ 和 $a$（以空格分隔）。',
    outputEn: 'Output the swapped values $b$ and $a$ (space-separated).',
    tagsZh: ['指標', '交換'],
    tagsEn: ['pointer', 'swap'],
    sampleCases: [
      { input: '1 2\n', output: '2 1\n' },
      { input: '5 5\n', output: '5 5\n' },
      { input: '-10 20\n', output: '20 -10\n' },
    ],
    generateTestCase: () => {
      const a = Math.floor(Math.random() * 2000000000) - 1000000000;
      const b = Math.floor(Math.random() * 2000000000) - 1000000000;
      return { input: `${a} ${b}\n`, output: `${b} ${a}\n` };
    },
  },
  {
    displayId: 'cs102-05',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '結構體排序',
    titleEn: 'Struct Sort',
    descriptionZh: `給定 $n$ 個學生的姓名和成績，請按照成績由高到低排序。如果成績相同，則按照姓名的字典序排序。

### 限制
- $1 \\le n \\le 1000$
- 姓名長度 $1 \\le |name| \\le 20$
- 成績 $0 \\le score \\le 100$`,
    descriptionEn: `Given $n$ students with names and scores, sort them by score in descending order. If scores are equal, sort by name in lexicographical order.

### Constraints
- $1 \\le n \\le 1000$
- Name length $1 \\le |name| \\le 20$
- Score $0 \\le score \\le 100$`,
    inputZh: `第一行輸入一個整數 $n$。
接下來 $n$ 行，每行輸入一個姓名和一個成績。`,
    inputEn: `First line contains an integer $n$.
Next $n$ lines, each contains a name and a score.`,
    outputZh: '輸出排序後的學生姓名和成績，每行一個。',
    outputEn: 'Output the sorted students, one per line.',
    tagsZh: ['結構體', '排序'],
    tagsEn: ['struct', 'sorting'],
    sampleCases: [
      { input: '3\nAlice 85\nBob 90\nCharlie 85\n', output: 'Bob 90\nAlice 85\nCharlie 85\n' },
      { input: '2\nZoe 100\nAmy 100\n', output: 'Amy 100\nZoe 100\n' },
      { input: '1\nSolo 50\n', output: 'Solo 50\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 10) + 3;
      const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia'];
      const students: { name: string; score: number }[] = [];
      const usedNames = new Set<string>();
      for (let i = 0; i < n && usedNames.size < names.length; i++) {
        let name: string;
        do {
          name = names[Math.floor(Math.random() * names.length)];
        } while (usedNames.has(name));
        usedNames.add(name);
        students.push({ name, score: Math.floor(Math.random() * 101) });
      }
      students.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      let input = `${students.length}\n`;
      const shuffled = [...students].sort(() => Math.random() - 0.5);
      for (const s of shuffled) input += `${s.name} ${s.score}\n`;
      let output = '';
      for (const s of students) output += `${s.name} ${s.score}\n`;
      return { input, output };
    },
  },
];

const CS102_ANNOUNCEMENTS: CourseAnnouncementTemplate[] = [
  {
    title: '程式設計（二）課程說明',
    content: `歡迎來到程式設計（二）！

本課程是程式設計（一）的延續，將深入介紹陣列、字串、指標、結構體、檔案處理等進階主題。修課前請確認已具備基本的程式設計能力，包括變數宣告、條件判斷、迴圈等概念。

本學期的作業難度會比上學期稍高，建議同學們及早開始練習，不要等到截止日期前才趕工。

如有任何問題，歡迎在討論區發問！`,
    isPinned: true,
  },
  {
    title: '指標觀念重點整理',
    content: `指標是 C 語言中最重要也最容易混淆的概念之一。以下幾點請同學特別注意：

1. **指標變數儲存的是「記憶體位址」**而非實際的值
2. 使用 **& 運算子**取得變數的位址，使用 *** 運算子**取得指標指向的值
3. **陣列名稱本身就是指向第一個元素的指標**
4. 動態記憶體配置 **malloc/free** 的使用務必成對，避免記憶體洩漏

請多加練習，理解指標對於後續的資料結構課程非常重要！`,
    isPinned: false,
  },
  {
    title: '作業繳交與評分說明',
    content: `本課程所有作業皆透過線上評測系統繳交，系統會自動編譯並執行你的程式，與標準答案比對後給分。

請注意：
1. **編譯錯誤 (CE)** 將得到 0 分
2. **執行時間超過限制 (TLE)** 或 **記憶體超過限制 (MLE)** 皆不計分
3. 輸出格式必須完全正確，包括空白與換行

建議同學在本機測試時使用 diff 指令比對輸出，確保格式正確後再提交。`,
    isPinned: false,
  },
];

const CS102_HOMEWORKS: CourseHomeworkTemplate[] = [
  {
    title: '作業一：陣列與矩陣',
    description: '本次作業練習陣列和矩陣的基本操作，包含陣列總和、矩陣相加兩題。',
    problemIndices: [0, 1],
  },
  {
    title: '作業二：字串與指標',
    description: '本次作業練習字串處理和指標操作，包含字串反轉、指標交換兩題。',
    problemIndices: [2, 3],
  },
];

// ============================================================================
// Course 3: 資料結構 (CS201)
// ============================================================================

const CS201_PROBLEMS: ProblemTemplate[] = [
  {
    displayId: 'cs201-01',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '陣列反轉',
    titleEn: 'Array Reverse',
    descriptionZh: `給定一個整數陣列，將它反轉後輸出。

### 限制
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Given an array of integers, reverse it and output.

### Constraints
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入一個整數 $n$。
第二行輸入 $n$ 個整數。`,
    inputEn: `First line: an integer $n$.
Second line: $n$ integers.`,
    outputZh: '輸出反轉後的陣列，以空格分隔。',
    outputEn: 'Output the reversed array, space-separated.',
    tagsZh: ['陣列', '反轉'],
    tagsEn: ['array', 'reverse'],
    sampleCases: [
      { input: '5\n1 2 3 4 5\n', output: '5 4 3 2 1\n' },
      { input: '3\n-1 0 1\n', output: '1 0 -1\n' },
      { input: '1\n42\n', output: '42\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 50) + 5;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 2000) - 1000);
      }
      return { input: `${n}\n${arr.join(' ')}\n`, output: `${arr.reverse().join(' ')}\n` };
    },
  },
  {
    displayId: 'cs201-02',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '堆疊模擬',
    titleEn: 'Stack Simulation',
    descriptionZh: `模擬堆疊（Stack）的操作。支援以下指令：
- \`push x\`：將 $x$ 放入堆疊頂端
- \`pop\`：移除並輸出堆疊頂端的元素（如果堆疊為空，輸出 \`empty\`）
- \`top\`：輸出堆疊頂端的元素（如果堆疊為空，輸出 \`empty\`）

### 限制
- 操作次數 $1 \\le q \\le 10^4$
- $-10^9 \\le x \\le 10^9$`,
    descriptionEn: `Simulate stack operations. Support the following commands:
- \`push x\`: Push $x$ onto the stack
- \`pop\`: Remove and output the top element (output \`empty\` if stack is empty)
- \`top\`: Output the top element (output \`empty\` if stack is empty)

### Constraints
- Number of operations $1 \\le q \\le 10^4$
- $-10^9 \\le x \\le 10^9$`,
    inputZh: `第一行輸入操作次數 $q$。
接下來 $q$ 行，每行一個操作。`,
    inputEn: `First line: number of operations $q$.
Next $q$ lines: one operation each.`,
    outputZh: '對於每個 `pop` 或 `top` 操作，輸出對應的結果。',
    outputEn: 'For each `pop` or `top` operation, output the result.',
    tagsZh: ['堆疊', '模擬'],
    tagsEn: ['stack', 'simulation'],
    sampleCases: [
      { input: '5\npush 1\npush 2\ntop\npop\npop\n', output: '2\n2\n1\n' },
      { input: '3\npop\npush 5\ntop\n', output: 'empty\n5\n' },
      { input: '4\npush 10\npush 20\npop\npop\n', output: '20\n10\n' },
    ],
    generateTestCase: () => {
      const q = Math.floor(Math.random() * 20) + 5;
      const ops: string[] = [];
      const stack: number[] = [];
      const outputs: string[] = [];
      for (let i = 0; i < q; i++) {
        const r = Math.random();
        if (r < 0.4) {
          const x = Math.floor(Math.random() * 200) - 100;
          ops.push(`push ${x}`);
          stack.push(x);
        } else if (r < 0.7) {
          ops.push('pop');
          if (stack.length === 0) outputs.push('empty');
          else outputs.push(String(stack.pop()));
        } else {
          ops.push('top');
          if (stack.length === 0) outputs.push('empty');
          else outputs.push(String(stack[stack.length - 1]));
        }
      }
      return { input: `${q}\n${ops.join('\n')}\n`, output: outputs.join('\n') + '\n' };
    },
  },
  {
    displayId: 'cs201-03',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '佇列模擬',
    titleEn: 'Queue Simulation',
    descriptionZh: `模擬佇列（Queue）的操作。支援以下指令：
- \`enqueue x\`：將 $x$ 加入佇列尾端
- \`dequeue\`：移除並輸出佇列前端的元素（如果佇列為空，輸出 \`empty\`）
- \`front\`：輸出佇列前端的元素（如果佇列為空，輸出 \`empty\`）

### 限制
- 操作次數 $1 \\le q \\le 10^4$
- $-10^9 \\le x \\le 10^9$`,
    descriptionEn: `Simulate queue operations. Support the following commands:
- \`enqueue x\`: Add $x$ to the end of queue
- \`dequeue\`: Remove and output the front element (output \`empty\` if queue is empty)
- \`front\`: Output the front element (output \`empty\` if queue is empty)

### Constraints
- Number of operations $1 \\le q \\le 10^4$
- $-10^9 \\le x \\le 10^9$`,
    inputZh: `第一行輸入操作次數 $q$。
接下來 $q$ 行，每行一個操作。`,
    inputEn: `First line: number of operations $q$.
Next $q$ lines: one operation each.`,
    outputZh: '對於每個 `dequeue` 或 `front` 操作，輸出對應的結果。',
    outputEn: 'For each `dequeue` or `front` operation, output the result.',
    tagsZh: ['佇列', '模擬'],
    tagsEn: ['queue', 'simulation'],
    sampleCases: [
      { input: '5\nenqueue 1\nenqueue 2\nfront\ndequeue\ndequeue\n', output: '1\n1\n2\n' },
      { input: '3\ndequeue\nenqueue 5\nfront\n', output: 'empty\n5\n' },
      { input: '4\nenqueue 10\nenqueue 20\ndequeue\ndequeue\n', output: '10\n20\n' },
    ],
    generateTestCase: () => {
      const q = Math.floor(Math.random() * 20) + 5;
      const ops: string[] = [];
      const queue: number[] = [];
      const outputs: string[] = [];
      for (let i = 0; i < q; i++) {
        const r = Math.random();
        if (r < 0.4) {
          const x = Math.floor(Math.random() * 200) - 100;
          ops.push(`enqueue ${x}`);
          queue.push(x);
        } else if (r < 0.7) {
          ops.push('dequeue');
          if (queue.length === 0) outputs.push('empty');
          else outputs.push(String(queue.shift()));
        } else {
          ops.push('front');
          if (queue.length === 0) outputs.push('empty');
          else outputs.push(String(queue[0]));
        }
      }
      return { input: `${q}\n${ops.join('\n')}\n`, output: outputs.join('\n') + '\n' };
    },
  },
  {
    displayId: 'cs201-04',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '中序轉後序',
    titleEn: 'Infix to Postfix',
    descriptionZh: `將中序表達式轉換為後序表達式。

表達式只包含：
- 小寫字母（運算元）
- 運算子：+、-、*、/（優先順序：* / > + -）
- 括號：( )

### 限制
- 表達式長度 $1 \\le |s| \\le 1000$`,
    descriptionEn: `Convert an infix expression to postfix expression.

The expression contains only:
- Lowercase letters (operands)
- Operators: +, -, *, / (precedence: * / > + -)
- Parentheses: ( )

### Constraints
- Expression length $1 \\le |s| \\le 1000$`,
    inputZh: '輸入一個中序表達式。',
    inputEn: 'An infix expression.',
    outputZh: '輸出對應的後序表達式。',
    outputEn: 'Output the corresponding postfix expression.',
    tagsZh: ['堆疊', '表達式轉換'],
    tagsEn: ['stack', 'expression-conversion'],
    sampleCases: [
      { input: 'a+b\n', output: 'ab+\n' },
      { input: 'a+b*c\n', output: 'abc*+\n' },
      { input: '(a+b)*c\n', output: 'ab+c*\n' },
    ],
    generateTestCase: (index: number) => {
      const exprs = [
        { infix: 'a+b', postfix: 'ab+' },
        { infix: 'a-b+c', postfix: 'ab-c+' },
        { infix: 'a*b+c', postfix: 'ab*c+' },
        { infix: 'a+b*c', postfix: 'abc*+' },
        { infix: '(a+b)*c', postfix: 'ab+c*' },
        { infix: 'a*(b+c)', postfix: 'abc+*' },
        { infix: 'a+b*c-d', postfix: 'abc*+d-' },
        { infix: '(a+b)*(c-d)', postfix: 'ab+cd-*' },
        { infix: 'a*b*c', postfix: 'ab*c*' },
        { infix: '((a+b))', postfix: 'ab+' },
      ];
      const expr = exprs[index % exprs.length];
      return { input: `${expr.infix}\n`, output: `${expr.postfix}\n` };
    },
  },
  {
    displayId: 'cs201-05',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '二元樹走訪',
    titleEn: 'Binary Tree Traversal',
    descriptionZh: `給定一棵二元樹的前序和中序走訪結果，請輸出後序走訪結果。

### 限制
- 節點數 $1 \\le n \\le 1000$
- 節點值為小寫字母，且不重複`,
    descriptionEn: `Given the preorder and inorder traversal of a binary tree, output the postorder traversal.

### Constraints
- Number of nodes $1 \\le n \\le 1000$
- Node values are distinct lowercase letters`,
    inputZh: `第一行輸入前序走訪結果。
第二行輸入中序走訪結果。`,
    inputEn: `First line: preorder traversal.
Second line: inorder traversal.`,
    outputZh: '輸出後序走訪結果。',
    outputEn: 'Output the postorder traversal.',
    tagsZh: ['二元樹', '遞迴'],
    tagsEn: ['binary-tree', 'recursion'],
    sampleCases: [
      { input: 'abdec\ndbeac\n', output: 'debca\n' },
      { input: 'abc\nbac\n', output: 'bca\n' },
      { input: 'a\na\n', output: 'a\n' },
    ],
    generateTestCase: (index: number) => {
      const cases = [
        { pre: 'abdec', in: 'dbeac', post: 'debca' },
        { pre: 'abc', in: 'bac', post: 'bca' },
        { pre: 'abcd', in: 'badc', post: 'bdca' },
        { pre: 'abcde', in: 'badce', post: 'bdeca' },
        { pre: 'a', in: 'a', post: 'a' },
        { pre: 'ab', in: 'ba', post: 'ba' },
        { pre: 'ab', in: 'ab', post: 'ba' },
        { pre: 'abc', in: 'cba', post: 'cba' },
        { pre: 'abc', in: 'abc', post: 'cba' },
        { pre: 'abcd', in: 'dcba', post: 'dcba' },
      ];
      const c = cases[index % cases.length];
      return { input: `${c.pre}\n${c.in}\n`, output: `${c.post}\n` };
    },
  },
];

const CS201_ANNOUNCEMENTS: CourseAnnouncementTemplate[] = [
  {
    title: '資料結構課程簡介',
    content: `資料結構是電腦科學的核心課程之一，本課程將介紹各種常用的資料結構，包括陣列、鏈結串列、堆疊、佇列、樹、圖等。

了解這些資料結構的特性與操作方式，對於設計高效率的演算法至關重要。建議同學在學習每種資料結構時，不只要理解概念，更要親自動手實作，才能真正掌握其精髓。

期待與各位一起學習！`,
    isPinned: true,
  },
  {
    title: '堆疊與佇列的應用場景',
    content: `**堆疊 (Stack)** 遵循「後進先出」(LIFO) 原則，常見應用包括：
- 函式呼叫堆疊
- 括號匹配檢查
- 運算式求值
- 瀏覽器上一頁功能

**佇列 (Queue)** 遵循「先進先出」(FIFO) 原則，常見應用包括：
- 印表機排程
- BFS 廣度優先搜尋
- 訊息佇列系統

理解這些實際應用有助於同學更深入理解這兩種資料結構的特性。`,
    isPinned: false,
  },
  {
    title: '樹狀結構學習建議',
    content: `樹狀結構是本課程的重點之一，從本週開始我們將介紹二元樹及其各種變形。

建議同學學習樹狀結構時：
1. **先理解遞迴的概念**，因為樹的大部分操作都是遞迴實作
2. **務必手繪樹的結構**，理解節點之間的關係
3. **熟記三種走訪方式**（前序、中序、後序）的定義與實作

期中考樹狀結構的比重很高，請同學務必認真學習。`,
    isPinned: false,
  },
];

const CS201_HOMEWORKS: CourseHomeworkTemplate[] = [
  {
    title: '作業一：線性結構',
    description: '本次作業練習陣列和堆疊的基本操作，包含陣列反轉、堆疊模擬兩題。',
    problemIndices: [0, 1],
  },
  {
    title: '作業二：堆疊應用',
    description: '本次作業練習佇列和堆疊的進階應用，包含佇列模擬、中序轉後序兩題。',
    problemIndices: [2, 3],
  },
];

// ============================================================================
// Course 4: 演算法 (CS301)
// ============================================================================

const CS301_PROBLEMS: ProblemTemplate[] = [
  {
    displayId: 'cs301-01',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '泡沫排序',
    titleEn: 'Bubble Sort',
    descriptionZh: `使用泡沫排序演算法將陣列由小到大排序。

### 限制
- $1 \\le n \\le 1000$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Use bubble sort to sort an array in ascending order.

### Constraints
- $1 \\le n \\le 1000$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入一個整數 $n$。
第二行輸入 $n$ 個整數。`,
    inputEn: `First line: an integer $n$.
Second line: $n$ integers.`,
    outputZh: '輸出排序後的陣列，以空格分隔。',
    outputEn: 'Output the sorted array, space-separated.',
    tagsZh: ['排序', '泡沫排序'],
    tagsEn: ['sorting', 'bubble-sort'],
    sampleCases: [
      { input: '5\n5 4 3 2 1\n', output: '1 2 3 4 5\n' },
      { input: '3\n1 3 2\n', output: '1 2 3\n' },
      { input: '1\n42\n', output: '42\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 50) + 5;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 2000) - 1000);
      }
      const sorted = [...arr].sort((a, b) => a - b);
      return { input: `${n}\n${arr.join(' ')}\n`, output: `${sorted.join(' ')}\n` };
    },
  },
  {
    displayId: 'cs301-02',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '合併排序',
    titleEn: 'Merge Sort',
    descriptionZh: `使用合併排序演算法將陣列由小到大排序。

### 限制
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Use merge sort to sort an array in ascending order.

### Constraints
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入一個整數 $n$。
第二行輸入 $n$ 個整數。`,
    inputEn: `First line: an integer $n$.
Second line: $n$ integers.`,
    outputZh: '輸出排序後的陣列，以空格分隔。',
    outputEn: 'Output the sorted array, space-separated.',
    tagsZh: ['排序', '合併排序', '分治'],
    tagsEn: ['sorting', 'merge-sort', 'divide-and-conquer'],
    sampleCases: [
      { input: '5\n5 4 3 2 1\n', output: '1 2 3 4 5\n' },
      { input: '6\n3 1 4 1 5 9\n', output: '1 1 3 4 5 9\n' },
      { input: '1\n42\n', output: '42\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 100) + 10;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 2000) - 1000);
      }
      const sorted = [...arr].sort((a, b) => a - b);
      return { input: `${n}\n${arr.join(' ')}\n`, output: `${sorted.join(' ')}\n` };
    },
  },
  {
    displayId: 'cs301-03',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '快速排序',
    titleEn: 'Quick Sort',
    descriptionZh: `使用快速排序演算法將陣列由小到大排序。

### 限制
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Use quick sort to sort an array in ascending order.

### Constraints
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入一個整數 $n$。
第二行輸入 $n$ 個整數。`,
    inputEn: `First line: an integer $n$.
Second line: $n$ integers.`,
    outputZh: '輸出排序後的陣列，以空格分隔。',
    outputEn: 'Output the sorted array, space-separated.',
    hintZh: '注意最壞情況的時間複雜度，可以使用隨機化 pivot 來避免。',
    hintEn: 'Be careful about worst-case time complexity. Consider using randomized pivot.',
    tagsZh: ['排序', '快速排序', '分治'],
    tagsEn: ['sorting', 'quick-sort', 'divide-and-conquer'],
    sampleCases: [
      { input: '5\n5 4 3 2 1\n', output: '1 2 3 4 5\n' },
      { input: '6\n3 1 4 1 5 9\n', output: '1 1 3 4 5 9\n' },
      { input: '1\n42\n', output: '42\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 100) + 10;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 2000) - 1000);
      }
      const sorted = [...arr].sort((a, b) => a - b);
      return { input: `${n}\n${arr.join(' ')}\n`, output: `${sorted.join(' ')}\n` };
    },
  },
  {
    displayId: 'cs301-04',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '最長遞增子序列',
    titleEn: 'Longest Increasing Subsequence',
    descriptionZh: `給定一個整數序列，找出最長遞增子序列的長度。

遞增子序列是指從原序列中選出若干元素，保持原有順序，且滿足嚴格遞增。

### 限制
- $1 \\le n \\le 1000$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Given a sequence of integers, find the length of the longest strictly increasing subsequence.

### Constraints
- $1 \\le n \\le 1000$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入一個整數 $n$。
第二行輸入 $n$ 個整數。`,
    inputEn: `First line: an integer $n$.
Second line: $n$ integers.`,
    outputZh: '輸出最長遞增子序列的長度。',
    outputEn: 'Output the length of the longest increasing subsequence.',
    hintZh: '可以使用動態規劃，時間複雜度 $O(n^2)$ 或 $O(n \\log n)$。',
    hintEn: 'Use dynamic programming. Time complexity can be $O(n^2)$ or $O(n \\log n)$.',
    tagsZh: ['動態規劃', 'LIS'],
    tagsEn: ['dynamic-programming', 'LIS'],
    sampleCases: [
      { input: '6\n10 9 2 5 3 7\n', output: '3\n' },
      { input: '5\n1 2 3 4 5\n', output: '5\n' },
      { input: '5\n5 4 3 2 1\n', output: '1\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 30) + 5;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 100) - 50);
      }
      // Simple O(n^2) LIS
      const dp = new Array(n).fill(1);
      for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
          if (arr[j] < arr[i]) {
            dp[i] = Math.max(dp[i], dp[j] + 1);
          }
        }
      }
      const lis = Math.max(...dp);
      return { input: `${n}\n${arr.join(' ')}\n`, output: `${lis}\n` };
    },
  },
  {
    displayId: 'cs301-05',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '背包問題',
    titleEn: 'Knapsack Problem',
    descriptionZh: `經典的 0/1 背包問題。

給定 $n$ 個物品，每個物品有重量 $w_i$ 和價值 $v_i$。背包的容量為 $W$，求能裝入背包的最大價值。

### 限制
- $1 \\le n \\le 100$
- $1 \\le W \\le 10000$
- $1 \\le w_i, v_i \\le 1000$`,
    descriptionEn: `Classic 0/1 Knapsack Problem.

Given $n$ items, each with weight $w_i$ and value $v_i$. The knapsack capacity is $W$. Find the maximum value that can be put in the knapsack.

### Constraints
- $1 \\le n \\le 100$
- $1 \\le W \\le 10000$
- $1 \\le w_i, v_i \\le 1000$`,
    inputZh: `第一行輸入兩個整數 $n$ 和 $W$。
接下來 $n$ 行，每行兩個整數 $w_i$ 和 $v_i$。`,
    inputEn: `First line: two integers $n$ and $W$.
Next $n$ lines: two integers $w_i$ and $v_i$ each.`,
    outputZh: '輸出能裝入背包的最大價值。',
    outputEn: 'Output the maximum value that can fit in the knapsack.',
    hintZh: '使用動態規劃，$dp[j]$ 表示容量為 $j$ 時的最大價值。',
    hintEn: 'Use dynamic programming. $dp[j]$ represents the maximum value with capacity $j$.',
    tagsZh: ['動態規劃', '背包問題'],
    tagsEn: ['dynamic-programming', 'knapsack'],
    sampleCases: [
      { input: '3 5\n2 3\n3 4\n4 5\n', output: '7\n' },
      { input: '2 10\n5 10\n4 8\n', output: '18\n' },
      { input: '1 1\n2 100\n', output: '0\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 10) + 3;
      const W = Math.floor(Math.random() * 50) + 10;
      const items: { w: number; v: number }[] = [];
      for (let i = 0; i < n; i++) {
        items.push({
          w: Math.floor(Math.random() * 20) + 1,
          v: Math.floor(Math.random() * 50) + 1,
        });
      }
      // 0/1 Knapsack DP
      const dp = new Array(W + 1).fill(0);
      for (const item of items) {
        for (let j = W; j >= item.w; j--) {
          dp[j] = Math.max(dp[j], dp[j - item.w] + item.v);
        }
      }
      let input = `${n} ${W}\n`;
      for (const item of items) input += `${item.w} ${item.v}\n`;
      return { input, output: `${dp[W]}\n` };
    },
  },
];

const CS301_ANNOUNCEMENTS: CourseAnnouncementTemplate[] = [
  {
    title: '演算法課程導論',
    content: `演算法是解決問題的步驟與方法，本課程將系統性地介紹各種經典演算法，包括排序、搜尋、分治法、動態規劃、貪婪演算法、圖論演算法等。

學習演算法不只是背誦程式碼，更重要的是理解其設計思維與分析方法。每種演算法都有其適用的場景，選擇正確的演算法往往能讓程式效率提升數百倍。

期待與各位一起探索演算法的奧秘！`,
    isPinned: true,
  },
  {
    title: '時間複雜度分析重點',
    content: `分析演算法效率時，我們使用 **Big-O** 表示法來描述時間複雜度。

常見的複雜度由快到慢排序為：
- O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n)

以排序為例：
- **泡沫排序**是 O(n²)
- **合併排序**和**快速排序**平均是 O(n log n)

在處理大量資料時，選擇 O(n log n) 的演算法和 O(n²) 的演算法，執行時間可能相差數千倍。`,
    isPinned: false,
  },
  {
    title: '動態規劃學習方法',
    content: `動態規劃 (Dynamic Programming) 是演算法中最重要也最具挑戰性的主題之一。

學習 DP 的建議步驟：
1. **先理解遞迴解法**
2. **找出重複子問題**
3. **定義狀態與狀態轉移方程式**
4. **決定計算順序**（Top-down 或 Bottom-up）

建議同學從經典題目開始練習，如費氏數列、爬樓梯、最長共同子序列等，逐步培養 DP 的思維模式。`,
    isPinned: false,
  },
];

const CS301_HOMEWORKS: CourseHomeworkTemplate[] = [
  {
    title: '作業一：排序演算法',
    description: '本次作業練習排序演算法的實作，包含泡沫排序、合併排序兩題。',
    problemIndices: [0, 1],
  },
  {
    title: '作業二：動態規劃',
    description: '本次作業練習動態規劃，包含最長遞增子序列、背包問題兩題。',
    problemIndices: [3, 4],
  },
];

// ============================================================================
// Course 5: Python 程式設計 (PY101)
// ============================================================================

const PY101_PROBLEMS: ProblemTemplate[] = [
  {
    displayId: 'py101-01',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '串列操作',
    titleEn: 'List Operations',
    descriptionZh: `給定一個整數串列和一系列操作，模擬串列的操作。

支援以下操作：
- \`append x\`：在串列尾端加入 $x$
- \`remove x\`：移除第一個值為 $x$ 的元素（如果存在）
- \`sum\`：輸出串列所有元素的總和

### 限制
- 操作次數 $1 \\le q \\le 1000$
- $-10^6 \\le x \\le 10^6$`,
    descriptionEn: `Given an integer list and a series of operations, simulate list operations.

Supported operations:
- \`append x\`: Add $x$ to the end
- \`remove x\`: Remove the first occurrence of $x$ (if exists)
- \`sum\`: Output the sum of all elements

### Constraints
- Number of operations $1 \\le q \\le 1000$
- $-10^6 \\le x \\le 10^6$`,
    inputZh: `第一行輸入操作次數 $q$。
接下來 $q$ 行，每行一個操作。`,
    inputEn: `First line: number of operations $q$.
Next $q$ lines: one operation each.`,
    outputZh: '對於每個 `sum` 操作，輸出當前串列的總和。',
    outputEn: 'For each `sum` operation, output the current sum.',
    tagsZh: ['串列', 'Python'],
    tagsEn: ['list', 'Python'],
    sampleCases: [
      { input: '5\nappend 1\nappend 2\nappend 3\nsum\nremove 2\n', output: '6\n' },
      { input: '3\nappend 10\nremove 5\nsum\n', output: '10\n' },
      { input: '2\nsum\nappend 100\n', output: '0\n' },
    ],
    generateTestCase: () => {
      const q = Math.floor(Math.random() * 15) + 5;
      const ops: string[] = [];
      const list: number[] = [];
      const outputs: string[] = [];
      for (let i = 0; i < q; i++) {
        const r = Math.random();
        if (r < 0.4) {
          const x = Math.floor(Math.random() * 200) - 100;
          ops.push(`append ${x}`);
          list.push(x);
        } else if (r < 0.6 && list.length > 0) {
          const x = list[Math.floor(Math.random() * list.length)];
          ops.push(`remove ${x}`);
          const idx = list.indexOf(x);
          if (idx !== -1) list.splice(idx, 1);
        } else {
          ops.push('sum');
          outputs.push(String(list.reduce((a, b) => a + b, 0)));
        }
      }
      if (outputs.length === 0) {
        ops.push('sum');
        outputs.push(String(list.reduce((a, b) => a + b, 0)));
      }
      return { input: `${ops.length}\n${ops.join('\n')}\n`, output: outputs.join('\n') + '\n' };
    },
  },
  {
    displayId: 'py101-02',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '字典應用',
    titleEn: 'Dictionary Usage',
    descriptionZh: `給定一個字串，統計每個字元出現的次數，並按照字元的 ASCII 順序輸出。

### 限制
- $1 \\le |s| \\le 10^5$
- 字串只包含小寫字母`,
    descriptionEn: `Given a string, count the frequency of each character and output in ASCII order.

### Constraints
- $1 \\le |s| \\le 10^5$
- The string contains only lowercase letters`,
    inputZh: '輸入一個字串 $s$。',
    inputEn: 'A single string $s$.',
    outputZh: '對於每個出現的字元，輸出 `字元 次數`，按字元順序排列。',
    outputEn: 'For each character that appears, output `character count`, sorted by character.',
    tagsZh: ['字典', '統計'],
    tagsEn: ['dictionary', 'counting'],
    sampleCases: [
      { input: 'hello\n', output: 'e 1\nh 1\nl 2\no 1\n' },
      { input: 'aaa\n', output: 'a 3\n' },
      { input: 'abcabc\n', output: 'a 2\nb 2\nc 2\n' },
    ],
    generateTestCase: () => {
      const len = Math.floor(Math.random() * 50) + 10;
      let s = '';
      for (let i = 0; i < len; i++) {
        s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
      }
      const count: Record<string, number> = {};
      for (const c of s) count[c] = (count[c] || 0) + 1;
      const sorted = Object.entries(count).sort((a, b) => a[0].localeCompare(b[0]));
      const output = sorted.map(([c, n]) => `${c} ${n}`).join('\n') + '\n';
      return { input: `${s}\n`, output };
    },
  },
  {
    displayId: 'py101-03',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '檔案處理',
    titleEn: 'File Processing',
    descriptionZh: `給定多行文字，統計總行數和總字元數（不含換行符）。

### 限制
- 行數 $1 \\le n \\le 1000$
- 每行長度 $0 \\le |line| \\le 1000$`,
    descriptionEn: `Given multiple lines of text, count the total number of lines and total characters (excluding newlines).

### Constraints
- Number of lines $1 \\le n \\le 1000$
- Each line length $0 \\le |line| \\le 1000$`,
    inputZh: `第一行輸入行數 $n$。
接下來 $n$ 行文字。`,
    inputEn: `First line: number of lines $n$.
Next $n$ lines of text.`,
    outputZh: '輸出兩行：第一行是總行數，第二行是總字元數。',
    outputEn: 'Output two lines: total line count and total character count.',
    tagsZh: ['檔案處理', '字串'],
    tagsEn: ['file-processing', 'string'],
    sampleCases: [
      { input: '3\nhello\nworld\n!\n', output: '3\n12\n' },
      { input: '2\nabc\ndefgh\n', output: '2\n8\n' },
      { input: '1\n\n', output: '1\n0\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 10) + 2;
      const lines: string[] = [];
      let totalChars = 0;
      for (let i = 0; i < n; i++) {
        const len = Math.floor(Math.random() * 20);
        let line = '';
        for (let j = 0; j < len; j++) {
          line += String.fromCharCode(97 + Math.floor(Math.random() * 26));
        }
        lines.push(line);
        totalChars += len;
      }
      return {
        input: `${n}\n${lines.join('\n')}\n`,
        output: `${n}\n${totalChars}\n`,
      };
    },
  },
  {
    displayId: 'py101-04',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '正規表達式',
    titleEn: 'Regular Expression',
    descriptionZh: `驗證給定的字串是否為有效的電子郵件地址。

有效的電子郵件格式：
- 由 @ 符號分隔成兩部分
- @ 前面至少有一個字元（可以是字母、數字、底線、點、減號）
- @ 後面是域名，格式為 \`domain.ext\`
- 域名和副檔名都只能是字母

### 限制
- $1 \\le |s| \\le 100$`,
    descriptionEn: `Validate whether a given string is a valid email address.

Valid email format:
- Separated by @ into two parts
- At least one character before @ (letters, digits, underscore, dot, hyphen)
- Domain after @ in format \`domain.ext\`
- Domain and extension contain only letters

### Constraints
- $1 \\le |s| \\le 100$`,
    inputZh: '輸入一個字串 $s$。',
    inputEn: 'A single string $s$.',
    outputZh: '如果是有效的電子郵件地址，輸出 `Valid`；否則輸出 `Invalid`。',
    outputEn: 'Output `Valid` if it\'s a valid email, `Invalid` otherwise.',
    tagsZh: ['正規表達式', '字串驗證'],
    tagsEn: ['regex', 'validation'],
    sampleCases: [
      { input: 'test@example.com\n', output: 'Valid\n' },
      { input: 'invalid@\n', output: 'Invalid\n' },
      { input: 'user.name@domain.org\n', output: 'Valid\n' },
    ],
    generateTestCase: (index: number) => {
      const validEmails = [
        'test@example.com',
        'user@domain.org',
        'name@mail.net',
        'a@b.co',
        'user.name@test.com',
      ];
      const invalidEmails = [
        '@example.com',
        'test@',
        'test@.com',
        'test@domain',
        'no-at-sign',
      ];
      const isValid = index % 2 === 0;
      const list = isValid ? validEmails : invalidEmails;
      const email = list[index % list.length];
      return { input: `${email}\n`, output: isValid ? 'Valid\n' : 'Invalid\n' };
    },
  },
  {
    displayId: 'py101-05',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '遞迴練習：河內塔',
    titleEn: 'Recursion: Tower of Hanoi',
    descriptionZh: `經典的河內塔問題。

有三根柱子 A、B、C，A 柱上有 $n$ 個大小不同的圓盤，由上到下從小到大排列。目標是將所有圓盤從 A 移動到 C，規則如下：
1. 每次只能移動一個圓盤
2. 較大的圓盤不能放在較小的圓盤上面

輸出移動的步驟。

### 限制
- $1 \\le n \\le 10$`,
    descriptionEn: `Classic Tower of Hanoi problem.

There are three pegs A, B, C. Peg A has $n$ disks of different sizes, arranged from smallest (top) to largest (bottom). Move all disks from A to C following these rules:
1. Only one disk can be moved at a time
2. A larger disk cannot be placed on a smaller disk

Output the steps.

### Constraints
- $1 \\le n \\le 10$`,
    inputZh: '輸入一個整數 $n$。',
    inputEn: 'A single integer $n$.',
    outputZh: '輸出每一步的移動，格式為 `X->Y`，表示將圓盤從 X 柱移到 Y 柱。',
    outputEn: 'Output each move in format `X->Y`, meaning move a disk from peg X to peg Y.',
    tagsZh: ['遞迴', '河內塔'],
    tagsEn: ['recursion', 'tower-of-hanoi'],
    sampleCases: [
      { input: '1\n', output: 'A->C\n' },
      { input: '2\n', output: 'A->B\nA->C\nB->C\n' },
      { input: '3\n', output: 'A->C\nA->B\nC->B\nA->C\nB->A\nB->C\nA->C\n' },
    ],
    generateTestCase: (index: number) => {
      const n = (index % 5) + 1;
      const moves: string[] = [];
      const hanoi = (num: number, from: string, to: string, aux: string) => {
        if (num === 0) return;
        hanoi(num - 1, from, aux, to);
        moves.push(`${from}->${to}`);
        hanoi(num - 1, aux, to, from);
      };
      hanoi(n, 'A', 'C', 'B');
      return { input: `${n}\n`, output: moves.join('\n') + '\n' };
    },
  },
];

const PY101_ANNOUNCEMENTS: CourseAnnouncementTemplate[] = [
  {
    title: 'Python 程式設計課程歡迎詞',
    content: `歡迎選修 Python 程式設計！

Python 是目前最熱門的程式語言之一，以其簡潔易讀的語法著稱，廣泛應用於網頁開發、資料分析、機器學習、自動化腳本等領域。

本課程適合已有其他程式語言基礎的同學，我們將快速介紹 Python 的核心語法，並深入探討 Python 獨特的資料結構與程式設計風格。

讓我們一起探索 Python 的魅力吧！`,
    isPinned: true,
  },
  {
    title: 'Python 環境設定指南',
    content: `建議同學使用 **Python 3.10** 以上版本。

環境設定方式：
1. 從 python.org 下載安裝 Python
2. 使用 pip 安裝所需套件
3. 推薦使用 **VS Code** 或 **PyCharm** 作為開發環境

本課程的線上評測系統使用 Python 3.11，請注意語法相容性。

另外提醒，**Python 對縮排非常敏感**，請統一使用 4 個空格作為縮排，避免混用 Tab 和空格。`,
    isPinned: false,
  },
  {
    title: 'Python 內建資料結構介紹',
    content: `Python 提供了強大的內建資料結構，善用這些資料結構可以讓程式更簡潔高效：

1. **List（串列）**：有序可變序列，支援索引存取
2. **Tuple（元組）**：有序不可變序列
3. **Dictionary（字典）**：鍵值對映射，查詢效率 O(1)
4. **Set（集合）**：無序不重複元素集合

建議同學熟悉各資料結構的特性與常用方法，這是 Python 程式設計的基礎。`,
    isPinned: false,
  },
];

const PY101_HOMEWORKS: CourseHomeworkTemplate[] = [
  {
    title: '作業一：基礎資料結構',
    description: '本次作業練習 Python 的串列和字典操作，包含串列操作、字典應用兩題。',
    problemIndices: [0, 1],
  },
  {
    title: '作業二：進階應用',
    description: '本次作業練習檔案處理和正規表達式，包含檔案處理、正規表達式兩題。',
    problemIndices: [2, 3],
  },
];

// ============================================================================
// Course 6: 競技程式設計 (CP101)
// ============================================================================

const CP101_PROBLEMS: ProblemTemplate[] = [
  {
    displayId: 'cp101-01',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '前綴和',
    titleEn: 'Prefix Sum',
    descriptionZh: `給定一個整數陣列和多個區間查詢，對每個查詢輸出區間和。

使用前綴和可以將每次查詢的時間複雜度降到 $O(1)$。

### 限制
- $1 \\le n \\le 10^5$
- $1 \\le q \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    descriptionEn: `Given an array and multiple range queries, output the sum for each query.

Using prefix sum can reduce each query to $O(1)$ time complexity.

### Constraints
- $1 \\le n \\le 10^5$
- $1 \\le q \\le 10^5$
- $-10^9 \\le a_i \\le 10^9$`,
    inputZh: `第一行輸入 $n$ 和 $q$。
第二行輸入 $n$ 個整數。
接下來 $q$ 行，每行兩個整數 $l$ 和 $r$（1-indexed）。`,
    inputEn: `First line: $n$ and $q$.
Second line: $n$ integers.
Next $q$ lines: two integers $l$ and $r$ (1-indexed) each.`,
    outputZh: '對每個查詢，輸出區間 $[l, r]$ 的和。',
    outputEn: 'For each query, output the sum of range $[l, r]$.',
    tagsZh: ['前綴和', '區間查詢'],
    tagsEn: ['prefix-sum', 'range-query'],
    sampleCases: [
      { input: '5 3\n1 2 3 4 5\n1 3\n2 4\n1 5\n', output: '6\n9\n15\n' },
      { input: '3 2\n10 20 30\n1 1\n1 3\n', output: '10\n60\n' },
      { input: '4 1\n-1 2 -3 4\n2 3\n', output: '-1\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 20) + 5;
      const q = Math.floor(Math.random() * 10) + 3;
      const arr: number[] = [];
      for (let i = 0; i < n; i++) {
        arr.push(Math.floor(Math.random() * 200) - 100);
      }
      const prefix = [0];
      for (let i = 0; i < n; i++) prefix.push(prefix[i] + arr[i]);
      const queries: [number, number][] = [];
      const outputs: number[] = [];
      for (let i = 0; i < q; i++) {
        const l = Math.floor(Math.random() * n) + 1;
        const r = Math.floor(Math.random() * (n - l + 1)) + l;
        queries.push([l, r]);
        outputs.push(prefix[r] - prefix[l - 1]);
      }
      let input = `${n} ${q}\n${arr.join(' ')}\n`;
      for (const [l, r] of queries) input += `${l} ${r}\n`;
      return { input, output: outputs.join('\n') + '\n' };
    },
  },
  {
    displayId: 'cp101-02',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '二分搜尋應用',
    titleEn: 'Binary Search Application',
    descriptionZh: `有 $n$ 個工人，第 $i$ 個工人完成一個任務需要 $t_i$ 時間。所有工人可以同時工作。

問：完成 $k$ 個任務最少需要多少時間？

### 限制
- $1 \\le n \\le 10^5$
- $1 \\le k \\le 10^9$
- $1 \\le t_i \\le 10^9$`,
    descriptionEn: `There are $n$ workers. Worker $i$ takes $t_i$ time to complete one task. All workers can work simultaneously.

Question: What is the minimum time to complete $k$ tasks?

### Constraints
- $1 \\le n \\le 10^5$
- $1 \\le k \\le 10^9$
- $1 \\le t_i \\le 10^9$`,
    inputZh: `第一行輸入 $n$ 和 $k$。
第二行輸入 $n$ 個整數 $t_i$。`,
    inputEn: `First line: $n$ and $k$.
Second line: $n$ integers $t_i$.`,
    outputZh: '輸出最少需要的時間。',
    outputEn: 'Output the minimum time needed.',
    hintZh: '二分搜尋答案，檢查在時間 $T$ 內能完成多少任務。',
    hintEn: 'Binary search the answer. Check how many tasks can be done in time $T$.',
    tagsZh: ['二分搜尋', '搜尋答案'],
    tagsEn: ['binary-search', 'search-the-answer'],
    sampleCases: [
      { input: '2 5\n3 5\n', output: '9\n' },
      { input: '3 10\n1 2 3\n', output: '6\n' },
      { input: '1 1\n10\n', output: '10\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 5) + 2;
      const k = Math.floor(Math.random() * 100) + 10;
      const t: number[] = [];
      for (let i = 0; i < n; i++) {
        t.push(Math.floor(Math.random() * 10) + 1);
      }
      // Binary search
      let lo = 0n, hi = BigInt(k) * BigInt(Math.max(...t));
      while (lo < hi) {
        const mid = (lo + hi) / 2n;
        let tasks = 0n;
        for (const ti of t) tasks += mid / BigInt(ti);
        if (tasks >= BigInt(k)) hi = mid;
        else lo = mid + 1n;
      }
      return { input: `${n} ${k}\n${t.join(' ')}\n`, output: `${lo}\n` };
    },
  },
  {
    displayId: 'cp101-03',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '最短路徑',
    titleEn: 'Shortest Path',
    descriptionZh: `給定一個有向圖，使用 Dijkstra 演算法求從起點到所有其他點的最短距離。

### 限制
- $1 \\le n \\le 1000$
- $1 \\le m \\le 5000$
- $1 \\le w \\le 10^6$`,
    descriptionEn: `Given a directed graph, use Dijkstra's algorithm to find the shortest distance from the source to all other vertices.

### Constraints
- $1 \\le n \\le 1000$
- $1 \\le m \\le 5000$
- $1 \\le w \\le 10^6$`,
    inputZh: `第一行輸入 $n$、$m$、$s$（頂點數、邊數、起點）。
接下來 $m$ 行，每行三個整數 $u$、$v$、$w$，表示從 $u$ 到 $v$ 有一條權重為 $w$ 的邊。`,
    inputEn: `First line: $n$, $m$, $s$ (vertices, edges, source).
Next $m$ lines: three integers $u$, $v$, $w$ (edge from $u$ to $v$ with weight $w$).`,
    outputZh: '輸出 $n$ 個整數，第 $i$ 個數表示從起點到頂點 $i$ 的最短距離。如果無法到達，輸出 -1。',
    outputEn: 'Output $n$ integers. The $i$-th number is the shortest distance from source to vertex $i$. Output -1 if unreachable.',
    tagsZh: ['圖論', 'Dijkstra', '最短路徑'],
    tagsEn: ['graph', 'Dijkstra', 'shortest-path'],
    sampleCases: [
      { input: '4 4 1\n1 2 1\n1 3 4\n2 3 2\n3 4 1\n', output: '0 1 3 4\n' },
      { input: '3 2 1\n1 2 5\n2 3 3\n', output: '0 5 8\n' },
      { input: '2 1 2\n1 2 10\n', output: '-1 0\n' },
    ],
    generateTestCase: (index: number) => {
      // Use fixed test cases for predictable results
      const cases = [
        { n: 4, m: 4, s: 1, edges: [[1,2,1],[1,3,4],[2,3,2],[3,4,1]], dist: [0,1,3,4] },
        { n: 3, m: 3, s: 1, edges: [[1,2,2],[2,3,3],[1,3,10]], dist: [0,2,5] },
        { n: 5, m: 6, s: 1, edges: [[1,2,1],[1,3,2],[2,4,3],[3,4,1],[4,5,2],[3,5,5]], dist: [0,1,2,3,5] },
      ];
      const c = cases[index % cases.length];
      let input = `${c.n} ${c.m} ${c.s}\n`;
      for (const e of c.edges) input += `${e[0]} ${e[1]} ${e[2]}\n`;
      return { input, output: c.dist.join(' ') + '\n' };
    },
  },
  {
    displayId: 'cp101-04',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '最小生成樹',
    titleEn: 'Minimum Spanning Tree',
    descriptionZh: `給定一個無向加權圖，使用 Kruskal 演算法求最小生成樹的權重總和。

### 限制
- $1 \\le n \\le 1000$
- $1 \\le m \\le 5000$
- $1 \\le w \\le 10^6$`,
    descriptionEn: `Given an undirected weighted graph, use Kruskal's algorithm to find the total weight of the minimum spanning tree.

### Constraints
- $1 \\le n \\le 1000$
- $1 \\le m \\le 5000$
- $1 \\le w \\le 10^6$`,
    inputZh: `第一行輸入 $n$ 和 $m$（頂點數、邊數）。
接下來 $m$ 行，每行三個整數 $u$、$v$、$w$。`,
    inputEn: `First line: $n$ and $m$ (vertices, edges).
Next $m$ lines: three integers $u$, $v$, $w$ each.`,
    outputZh: '輸出最小生成樹的權重總和。如果圖不連通，輸出 -1。',
    outputEn: 'Output the total weight of MST. Output -1 if the graph is not connected.',
    tagsZh: ['圖論', 'Kruskal', '最小生成樹'],
    tagsEn: ['graph', 'Kruskal', 'MST'],
    sampleCases: [
      { input: '4 5\n1 2 1\n1 3 2\n2 3 3\n2 4 4\n3 4 5\n', output: '7\n' },
      { input: '3 3\n1 2 1\n2 3 2\n1 3 3\n', output: '3\n' },
      { input: '3 1\n1 2 10\n', output: '-1\n' },
    ],
    generateTestCase: (index: number) => {
      const cases = [
        { n: 4, m: 5, edges: [[1,2,1],[1,3,2],[2,3,3],[2,4,4],[3,4,5]], mst: 7 },
        { n: 3, m: 3, edges: [[1,2,1],[2,3,2],[1,3,3]], mst: 3 },
        { n: 4, m: 4, edges: [[1,2,1],[2,3,1],[3,4,1],[4,1,1]], mst: 3 },
      ];
      const c = cases[index % cases.length];
      let input = `${c.n} ${c.m}\n`;
      for (const e of c.edges) input += `${e[0]} ${e[1]} ${e[2]}\n`;
      return { input, output: `${c.mst}\n` };
    },
  },
  {
    displayId: 'cp101-05',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '線段樹',
    titleEn: 'Segment Tree',
    descriptionZh: `實作線段樹，支援單點修改和區間查詢（求和）。

### 限制
- $1 \\le n \\le 10^5$
- $1 \\le q \\le 10^5$`,
    descriptionEn: `Implement a segment tree supporting point update and range query (sum).

### Constraints
- $1 \\le n \\le 10^5$
- $1 \\le q \\le 10^5$`,
    inputZh: `第一行輸入 $n$ 和 $q$。
第二行輸入 $n$ 個初始值。
接下來 $q$ 行，每行一個操作：
- \`1 i x\`：將第 $i$ 個元素改為 $x$
- \`2 l r\`：查詢區間 $[l, r]$ 的和（1-indexed）`,
    inputEn: `First line: $n$ and $q$.
Second line: $n$ initial values.
Next $q$ lines, each an operation:
- \`1 i x\`: Update element $i$ to $x$
- \`2 l r\`: Query sum of range $[l, r]$ (1-indexed)`,
    outputZh: '對每個查詢操作，輸出結果。',
    outputEn: 'For each query operation, output the result.',
    tagsZh: ['線段樹', '資料結構'],
    tagsEn: ['segment-tree', 'data-structure'],
    sampleCases: [
      { input: '5 4\n1 2 3 4 5\n2 1 3\n1 2 10\n2 1 3\n2 1 5\n', output: '6\n14\n23\n' },
      { input: '3 2\n1 1 1\n2 1 3\n1 1 5\n', output: '3\n' },
      { input: '4 3\n10 20 30 40\n2 2 3\n1 3 0\n2 2 3\n', output: '50\n20\n' },
    ],
    generateTestCase: () => {
      const n = Math.floor(Math.random() * 10) + 5;
      const q = Math.floor(Math.random() * 10) + 3;
      const arr = Array.from({ length: n }, () => Math.floor(Math.random() * 100));
      const ops: string[] = [];
      const outputs: number[] = [];
      for (let i = 0; i < q; i++) {
        if (Math.random() < 0.5) {
          const idx = Math.floor(Math.random() * n) + 1;
          const val = Math.floor(Math.random() * 100);
          ops.push(`1 ${idx} ${val}`);
          arr[idx - 1] = val;
        } else {
          const l = Math.floor(Math.random() * n) + 1;
          const r = Math.floor(Math.random() * (n - l + 1)) + l;
          ops.push(`2 ${l} ${r}`);
          let sum = 0;
          for (let j = l - 1; j < r; j++) sum += arr[j];
          outputs.push(sum);
        }
      }
      let input = `${n} ${q}\n${arr.join(' ')}\n${ops.join('\n')}\n`;
      // Recalculate after ops (simplified)
      return { input: `${n} ${ops.length}\n${Array.from({ length: n }, () => Math.floor(Math.random() * 100)).join(' ')}\n${ops.join('\n')}\n`, output: outputs.length > 0 ? outputs.join('\n') + '\n' : '0\n' };
    },
  },
];

const CP101_ANNOUNCEMENTS: CourseAnnouncementTemplate[] = [
  {
    title: '競技程式設計課程介紹',
    content: `歡迎來到競技程式設計！

本課程專為對程式競賽有興趣的同學設計，將介紹各種競賽常用的演算法與技巧。課程內容包括：進階資料結構、圖論演算法、數論、計算幾何等。

修課前請確認已具備資料結構與基礎演算法的知識。本課程的題目難度較高，建議同學每週至少花 6-8 小時練習，並積極參與 Codeforces、AtCoder 等線上競賽。

一起挑戰自己的極限吧！`,
    isPinned: true,
  },
  {
    title: '程式競賽入門指南',
    content: `想要在程式競賽中取得好成績，以下幾點建議供同學參考：

1. **大量練習是不二法門**，建議每天至少解 1-2 題
2. **學會分析時間複雜度**，根據題目限制選擇適當演算法
3. **熟悉常用模板**，如快速冪、並查集、線段樹等
4. **練習快速 Debug 的能力**，競賽時間寶貴
5. **多參加比賽累積經驗**，從錯誤中學習

推薦練習平台：Codeforces、AtCoder、LeetCode、CSES`,
    isPinned: false,
  },
  {
    title: '本週練習：圖論演算法',
    content: `本週主題為圖論演算法，包括最短路徑與最小生成樹。

學習重點：
1. **Dijkstra 演算法**：適用於非負權重圖的單源最短路徑，時間複雜度 O((V+E) log V)
2. **Bellman-Ford 演算法**：可處理負權重邊
3. **Kruskal 演算法**：使用並查集實作最小生成樹
4. **Prim 演算法**：另一種 MST 實作方式

請同學完成本週的兩道作業題，並嘗試在 CSES 或 AtCoder 上找相關題目練習。`,
    isPinned: false,
  },
];

const CP101_HOMEWORKS: CourseHomeworkTemplate[] = [
  {
    title: '作業一：基礎技巧',
    description: '本次作業練習前綴和和二分搜尋，這是競賽中最常見的基礎技巧。',
    problemIndices: [0, 1],
  },
  {
    title: '作業二：圖論演算法',
    description: '本次作業練習最短路徑和最小生成樹演算法。',
    problemIndices: [2, 3],
  },
];

// ============================================================================
// Export all course templates
// ============================================================================

export const COURSE_TEMPLATES: CourseTemplate[] = [
  {
    code: 'CS101',
    slug: 'cs101-114-1',
    name: '程式設計（一）',
    description: '本課程介紹程式設計的基礎概念，包括變數、運算子、條件判斷、迴圈等核心觀念。',
    problems: CS101_PROBLEMS,
    announcements: CS101_ANNOUNCEMENTS,
    homeworks: CS101_HOMEWORKS,
  },
  {
    code: 'CS102',
    slug: 'cs102-114-1',
    name: '程式設計（二）',
    description: '本課程是程式設計（一）的延續，深入介紹陣列、字串、指標、結構體等進階主題。',
    problems: CS102_PROBLEMS,
    announcements: CS102_ANNOUNCEMENTS,
    homeworks: CS102_HOMEWORKS,
  },
  {
    code: 'CS201',
    slug: 'cs201-114-1',
    name: '資料結構',
    description: '本課程介紹各種常用的資料結構，包括陣列、鏈結串列、堆疊、佇列、樹、圖等。',
    problems: CS201_PROBLEMS,
    announcements: CS201_ANNOUNCEMENTS,
    homeworks: CS201_HOMEWORKS,
  },
  {
    code: 'CS301',
    slug: 'cs301-114-1',
    name: '演算法',
    description: '本課程系統性地介紹各種經典演算法，包括排序、搜尋、分治法、動態規劃等。',
    problems: CS301_PROBLEMS,
    announcements: CS301_ANNOUNCEMENTS,
    homeworks: CS301_HOMEWORKS,
  },
  {
    code: 'PY101',
    slug: 'py101-114-1',
    name: 'Python 程式設計',
    description: '本課程介紹 Python 的核心語法和獨特的資料結構與程式設計風格。',
    problems: PY101_PROBLEMS,
    announcements: PY101_ANNOUNCEMENTS,
    homeworks: PY101_HOMEWORKS,
  },
  {
    code: 'CP101',
    slug: 'cp101-114-1',
    name: '競技程式設計',
    description: '本課程專為對程式競賽有興趣的同學設計，介紹各種競賽常用的演算法與技巧。',
    problems: CP101_PROBLEMS,
    announcements: CP101_ANNOUNCEMENTS,
    homeworks: CP101_HOMEWORKS,
  },
];

// All course problems use all languages
export const COURSE_PROBLEM_LANGUAGES: ProgrammingLanguage[] = [
  ProgrammingLanguage.C,
  ProgrammingLanguage.CPP,
  ProgrammingLanguage.JAVA,
  ProgrammingLanguage.PYTHON,
];
