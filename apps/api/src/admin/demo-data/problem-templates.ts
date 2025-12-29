import { ProblemDifficulty, ProgrammingLanguage } from '@prisma/client';

export interface SampleCase {
  input: string;
  output: string;
}

export interface ProblemTemplate {
  displayId: string;
  difficulty: ProblemDifficulty;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  inputZh: string;
  inputEn: string;
  outputZh: string;
  outputEn: string;
  hintZh?: string;
  hintEn?: string;
  tagsZh: string[];
  tagsEn: string[];
  sampleCases: SampleCase[];
  generateTestCase: (index: number, isSample: boolean) => { input: string; output: string };
}

// ============================================================================
// Public Problems (a001 - a010)
// ============================================================================

export const PUBLIC_PROBLEM_TEMPLATES: ProblemTemplate[] = [
  // a001 - Hello World (EASY)
  {
    displayId: 'a001',
    difficulty: ProblemDifficulty.EASY,
    titleZh: 'Hello World',
    titleEn: 'Hello World',
    descriptionZh: `輸入任意數字，輸出 \`Hello World\`。`,
    descriptionEn: `Input any number, output \`Hello World\`.`,
    inputZh: '輸入一個整數 $n$（$1 \\le n \\le 1000$）。',
    inputEn: 'A single integer $n$ ($1 \\le n \\le 1000$).',
    outputZh: '輸出 `Hello World`（不含引號），結尾需有換行。',
    outputEn: 'Output `Hello World` (without quotes), followed by a newline.',
    tagsZh: ['入門', '輸出'],
    tagsEn: ['beginner', 'output'],
    sampleCases: [
      { input: '1\n', output: 'Hello World\n' },
      { input: '42\n', output: 'Hello World\n' },
      { input: '999\n', output: 'Hello World\n' },
    ],
    generateTestCase: (index: number) => {
      const n = Math.floor(Math.random() * 1000) + 1;
      return { input: `${n}\n`, output: 'Hello World\n' };
    },
  },

  // a002 - Add Two Numbers (EASY)
  {
    displayId: 'a002',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '兩數相加',
    titleEn: 'Add Two Numbers',
    descriptionZh: `給定兩個整數 $a$ 和 $b$，請計算它們的和。

### 限制
- $-10^9 \\le a, b \\le 10^9$`,
    descriptionEn: `Given two integers $a$ and $b$, calculate their sum.

### Constraints
- $-10^9 \\le a, b \\le 10^9$`,
    inputZh: '輸入一行，包含兩個以空格分隔的整數 $a$ 和 $b$。',
    inputEn: 'A single line containing two space-separated integers $a$ and $b$.',
    outputZh: '輸出一個整數，表示 $a + b$ 的值。',
    outputEn: 'Output a single integer, the value of $a + b$.',
    tagsZh: ['入門', '數學'],
    tagsEn: ['beginner', 'math'],
    sampleCases: [
      { input: '1 2\n', output: '3\n' },
      { input: '100 200\n', output: '300\n' },
      { input: '-5 10\n', output: '5\n' },
    ],
    generateTestCase: (index: number, isSample: boolean) => {
      const ranges = isSample
        ? [100, 1000, 10000]
        : [1000000, 10000000, 100000000, 1000000000, 1000000000, 1000000000, 1000000000, 1000000000, 1000000000, 1000000000];
      const range = ranges[index] || 1000000000;
      const a = Math.floor(Math.random() * range * 2) - range;
      const b = Math.floor(Math.random() * range * 2) - range;
      return { input: `${a} ${b}\n`, output: `${a + b}\n` };
    },
  },

  // a003 - Odd or Even (EASY)
  {
    displayId: 'a003',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '奇偶判斷',
    titleEn: 'Odd or Even',
    descriptionZh: `給定一個整數 $n$，判斷它是奇數還是偶數。

### 限制
- $-10^9 \\le n \\le 10^9$`,
    descriptionEn: `Given an integer $n$, determine whether it is odd or even.

### Constraints
- $-10^9 \\le n \\le 10^9$`,
    inputZh: '輸入一個整數 $n$。',
    inputEn: 'A single integer $n$.',
    outputZh: '如果 $n$ 是偶數，輸出 `Even`；如果是奇數，輸出 `Odd`。',
    outputEn: 'Output `Even` if $n$ is even, `Odd` if $n$ is odd.',
    tagsZh: ['入門', '條件判斷'],
    tagsEn: ['beginner', 'conditionals'],
    sampleCases: [
      { input: '4\n', output: 'Even\n' },
      { input: '7\n', output: 'Odd\n' },
      { input: '0\n', output: 'Even\n' },
    ],
    generateTestCase: (index: number) => {
      const n = Math.floor(Math.random() * 2000000000) - 1000000000;
      return { input: `${n}\n`, output: n % 2 === 0 ? 'Even\n' : 'Odd\n' };
    },
  },

  // a004 - Find Maximum (EASY)
  {
    displayId: 'a004',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '最大值',
    titleEn: 'Find Maximum',
    descriptionZh: `給定三個整數 $a$、$b$、$c$，找出其中的最大值。

### 限制
- $-10^9 \\le a, b, c \\le 10^9$`,
    descriptionEn: `Given three integers $a$, $b$, and $c$, find the maximum value.

### Constraints
- $-10^9 \\le a, b, c \\le 10^9$`,
    inputZh: '輸入一行，包含三個以空格分隔的整數 $a$、$b$、$c$。',
    inputEn: 'A single line containing three space-separated integers $a$, $b$, and $c$.',
    outputZh: '輸出三個數中的最大值。',
    outputEn: 'Output the maximum of the three numbers.',
    tagsZh: ['入門', '條件判斷'],
    tagsEn: ['beginner', 'conditionals'],
    sampleCases: [
      { input: '1 2 3\n', output: '3\n' },
      { input: '5 5 5\n', output: '5\n' },
      { input: '-1 -2 -3\n', output: '-1\n' },
    ],
    generateTestCase: () => {
      const a = Math.floor(Math.random() * 2000000000) - 1000000000;
      const b = Math.floor(Math.random() * 2000000000) - 1000000000;
      const c = Math.floor(Math.random() * 2000000000) - 1000000000;
      return { input: `${a} ${b} ${c}\n`, output: `${Math.max(a, b, c)}\n` };
    },
  },

  // a005 - String Length (EASY)
  {
    displayId: 'a005',
    difficulty: ProblemDifficulty.EASY,
    titleZh: '字串長度',
    titleEn: 'String Length',
    descriptionZh: `給定一個字串 $s$，計算它的長度。

### 限制
- $1 \\le |s| \\le 1000$
- 字串只包含英文字母和數字`,
    descriptionEn: `Given a string $s$, calculate its length.

### Constraints
- $1 \\le |s| \\le 1000$
- The string contains only letters and digits`,
    inputZh: '輸入一個字串 $s$。',
    inputEn: 'A single string $s$.',
    outputZh: '輸出字串的長度。',
    outputEn: 'Output the length of the string.',
    tagsZh: ['入門', '字串'],
    tagsEn: ['beginner', 'string'],
    sampleCases: [
      { input: 'hello\n', output: '5\n' },
      { input: 'a\n', output: '1\n' },
      { input: 'HelloWorld123\n', output: '13\n' },
    ],
    generateTestCase: (index: number) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const len = Math.floor(Math.random() * 990) + 10;
      let s = '';
      for (let i = 0; i < len; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
      }
      return { input: `${s}\n`, output: `${len}\n` };
    },
  },

  // a006 - Fibonacci Sequence (MEDIUM)
  {
    displayId: 'a006',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '費氏數列',
    titleEn: 'Fibonacci Sequence',
    descriptionZh: `費氏數列定義如下：
- $F_0 = 0$
- $F_1 = 1$
- $F_n = F_{n-1} + F_{n-2}$（當 $n \\ge 2$）

給定一個整數 $n$，請輸出 $F_n$。

### 限制
- $0 \\le n \\le 45$`,
    descriptionEn: `The Fibonacci sequence is defined as:
- $F_0 = 0$
- $F_1 = 1$
- $F_n = F_{n-1} + F_{n-2}$ (when $n \\ge 2$)

Given an integer $n$, output $F_n$.

### Constraints
- $0 \\le n \\le 45$`,
    inputZh: '輸入一個整數 $n$。',
    inputEn: 'A single integer $n$.',
    outputZh: '輸出第 $n$ 項費氏數 $F_n$。',
    outputEn: 'Output the $n$-th Fibonacci number $F_n$.',
    hintZh: '可以使用迴圈或遞迴來計算。注意 $n=45$ 時結果會超過 32 位元整數範圍。',
    hintEn: 'You can use a loop or recursion. Note that when $n=45$, the result exceeds 32-bit integer range.',
    tagsZh: ['遞迴', '動態規劃'],
    tagsEn: ['recursion', 'dynamic-programming'],
    sampleCases: [
      { input: '0\n', output: '0\n' },
      { input: '1\n', output: '1\n' },
      { input: '10\n', output: '55\n' },
    ],
    generateTestCase: (index: number, isSample: boolean) => {
      const fib = (n: number): bigint => {
        if (n <= 1) return BigInt(n);
        let a = 0n, b = 1n;
        for (let i = 2; i <= n; i++) {
          [a, b] = [b, a + b];
        }
        return b;
      };
      const n = isSample ? [0, 1, 10][index] : Math.floor(Math.random() * 46);
      return { input: `${n}\n`, output: `${fib(n)}\n` };
    },
  },

  // a007 - Prime Check (MEDIUM)
  {
    displayId: 'a007',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '質數判斷',
    titleEn: 'Prime Check',
    descriptionZh: `給定一個正整數 $n$，判斷它是否為質數。

質數是指大於 1 且只能被 1 和自身整除的正整數。

### 限制
- $1 \\le n \\le 10^9$`,
    descriptionEn: `Given a positive integer $n$, determine whether it is a prime number.

A prime number is a positive integer greater than 1 that is only divisible by 1 and itself.

### Constraints
- $1 \\le n \\le 10^9$`,
    inputZh: '輸入一個正整數 $n$。',
    inputEn: 'A single positive integer $n$.',
    outputZh: '如果 $n$ 是質數，輸出 `Yes`；否則輸出 `No`。',
    outputEn: 'Output `Yes` if $n$ is prime, `No` otherwise.',
    hintZh: '只需要檢查到 $\\sqrt{n}$ 即可。',
    hintEn: 'You only need to check divisors up to $\\sqrt{n}$.',
    tagsZh: ['數學', '質數'],
    tagsEn: ['math', 'prime'],
    sampleCases: [
      { input: '2\n', output: 'Yes\n' },
      { input: '4\n', output: 'No\n' },
      { input: '17\n', output: 'Yes\n' },
    ],
    generateTestCase: (index: number) => {
      const isPrime = (n: number): boolean => {
        if (n < 2) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        for (let i = 3; i * i <= n; i += 2) {
          if (n % i === 0) return false;
        }
        return true;
      };
      // Generate a mix of primes and non-primes
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 97, 101, 1000000007, 999999937];
      const nonPrimes = [1, 4, 6, 8, 9, 10, 12, 100, 1000, 1000000000];
      const candidates = [...primes, ...nonPrimes];
      const n = candidates[Math.floor(Math.random() * candidates.length)];
      return { input: `${n}\n`, output: isPrime(n) ? 'Yes\n' : 'No\n' };
    },
  },

  // a008 - Palindrome Check (MEDIUM)
  {
    displayId: 'a008',
    difficulty: ProblemDifficulty.MEDIUM,
    titleZh: '回文判斷',
    titleEn: 'Palindrome Check',
    descriptionZh: `給定一個字串 $s$，判斷它是否為回文。

回文是指正著讀和反著讀都一樣的字串。

### 限制
- $1 \\le |s| \\le 10^5$
- 字串只包含小寫英文字母`,
    descriptionEn: `Given a string $s$, determine whether it is a palindrome.

A palindrome reads the same forwards and backwards.

### Constraints
- $1 \\le |s| \\le 10^5$
- The string contains only lowercase letters`,
    inputZh: '輸入一個字串 $s$。',
    inputEn: 'A single string $s$.',
    outputZh: '如果 $s$ 是回文，輸出 `Yes`；否則輸出 `No`。',
    outputEn: 'Output `Yes` if $s$ is a palindrome, `No` otherwise.',
    tagsZh: ['字串', '回文'],
    tagsEn: ['string', 'palindrome'],
    sampleCases: [
      { input: 'aba\n', output: 'Yes\n' },
      { input: 'abc\n', output: 'No\n' },
      { input: 'a\n', output: 'Yes\n' },
    ],
    generateTestCase: (index: number) => {
      const len = Math.floor(Math.random() * 100) + 10;
      const isPalin = Math.random() > 0.5;
      let s = '';
      if (isPalin) {
        const half = Math.ceil(len / 2);
        for (let i = 0; i < half; i++) {
          s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
        }
        s = s + s.split('').reverse().join('').slice(len % 2 === 0 ? 0 : 1);
      } else {
        for (let i = 0; i < len; i++) {
          s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
        }
        // Ensure it's not accidentally a palindrome
        if (s === s.split('').reverse().join('')) {
          s = s.slice(0, -1) + (s[s.length - 1] === 'a' ? 'b' : 'a');
        }
      }
      const reversed = s.split('').reverse().join('');
      return { input: `${s}\n`, output: s === reversed ? 'Yes\n' : 'No\n' };
    },
  },

  // a009 - GCD (HARD)
  {
    displayId: 'a009',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '最大公因數',
    titleEn: 'GCD',
    descriptionZh: `給定兩個正整數 $a$ 和 $b$，請使用輾轉相除法計算它們的最大公因數 (GCD)。

### 限制
- $1 \\le a, b \\le 10^{18}$`,
    descriptionEn: `Given two positive integers $a$ and $b$, calculate their Greatest Common Divisor (GCD) using the Euclidean algorithm.

### Constraints
- $1 \\le a, b \\le 10^{18}$`,
    inputZh: '輸入一行，包含兩個以空格分隔的正整數 $a$ 和 $b$。',
    inputEn: 'A single line containing two space-separated positive integers $a$ and $b$.',
    outputZh: '輸出 $a$ 和 $b$ 的最大公因數。',
    outputEn: 'Output the GCD of $a$ and $b$.',
    hintZh: '輾轉相除法：$\\gcd(a, b) = \\gcd(b, a \\mod b)$，當 $b = 0$ 時，$\\gcd(a, 0) = a$。',
    hintEn: 'Euclidean algorithm: $\\gcd(a, b) = \\gcd(b, a \\mod b)$, and $\\gcd(a, 0) = a$.',
    tagsZh: ['數學', '輾轉相除法'],
    tagsEn: ['math', 'euclidean-algorithm'],
    sampleCases: [
      { input: '12 8\n', output: '4\n' },
      { input: '17 13\n', output: '1\n' },
      { input: '100 25\n', output: '25\n' },
    ],
    generateTestCase: () => {
      const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
      const a = BigInt(Math.floor(Math.random() * 1000000000000)) + 1n;
      const b = BigInt(Math.floor(Math.random() * 1000000000000)) + 1n;
      return { input: `${a} ${b}\n`, output: `${gcd(a, b)}\n` };
    },
  },

  // a010 - Binary Search (HARD)
  {
    displayId: 'a010',
    difficulty: ProblemDifficulty.HARD,
    titleZh: '二分搜尋',
    titleEn: 'Binary Search',
    descriptionZh: `給定一個已排序（由小到大）的整數陣列和一個目標值，請使用二分搜尋找出目標值在陣列中的位置。

### 限制
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i, target \\le 10^9$
- 陣列中的元素兩兩不同`,
    descriptionEn: `Given a sorted (ascending) array of integers and a target value, use binary search to find the position of the target in the array.

### Constraints
- $1 \\le n \\le 10^5$
- $-10^9 \\le a_i, target \\le 10^9$
- All elements in the array are distinct`,
    inputZh: `第一行包含兩個整數 $n$ 和 $target$，分別表示陣列長度和目標值。
第二行包含 $n$ 個整數，表示已排序的陣列。`,
    inputEn: `The first line contains two integers $n$ and $target$, the array length and target value.
The second line contains $n$ integers, the sorted array.`,
    outputZh: '如果目標值存在於陣列中，輸出其索引（從 0 開始）；否則輸出 `-1`。',
    outputEn: 'If the target exists in the array, output its index (0-based); otherwise output `-1`.',
    hintZh: '二分搜尋的時間複雜度是 $O(\\log n)$。',
    hintEn: 'Binary search has a time complexity of $O(\\log n)$.',
    tagsZh: ['搜尋', '二分搜尋'],
    tagsEn: ['search', 'binary-search'],
    sampleCases: [
      { input: '5 3\n1 2 3 4 5\n', output: '2\n' },
      { input: '5 6\n1 2 3 4 5\n', output: '-1\n' },
      { input: '3 1\n1 2 3\n', output: '0\n' },
    ],
    generateTestCase: (index: number) => {
      const n = Math.floor(Math.random() * 100) + 10;
      const arr: number[] = [];
      let val = Math.floor(Math.random() * 100) - 50;
      for (let i = 0; i < n; i++) {
        arr.push(val);
        val += Math.floor(Math.random() * 10) + 1;
      }
      const hasTarget = Math.random() > 0.3;
      const targetIdx = hasTarget ? Math.floor(Math.random() * n) : -1;
      const target = hasTarget ? arr[targetIdx] : arr[n - 1] + Math.floor(Math.random() * 100) + 1;
      return {
        input: `${n} ${target}\n${arr.join(' ')}\n`,
        output: `${targetIdx}\n`,
      };
    },
  },
];

// All public problems use the same allowed languages
export const PUBLIC_PROBLEM_LANGUAGES: ProgrammingLanguage[] = [
  ProgrammingLanguage.C,
  ProgrammingLanguage.CPP,
  ProgrammingLanguage.JAVA,
  ProgrammingLanguage.PYTHON,
];
