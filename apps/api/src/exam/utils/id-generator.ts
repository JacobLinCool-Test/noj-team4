import { randomBytes } from 'crypto';

/**
 * examId 字元集：小寫英文 + 數字（36 個字元）
 */
const EXAM_ID_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const EXAM_ID_LENGTH = 10;

/**
 * 登入代碼字元集：大寫英文 + 數字，排除易混淆字元（I, O, 0, 1）
 * 共 32 個字元
 */
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * 生成考試 ID（10 個字元，小寫英數）
 *
 * @example generateExamId() // "a8k2m9x4n7"
 */
export function generateExamId(): string {
  const bytes = randomBytes(EXAM_ID_LENGTH);
  let result = '';
  for (let i = 0; i < EXAM_ID_LENGTH; i++) {
    result += EXAM_ID_CHARSET[bytes[i] % EXAM_ID_CHARSET.length];
  }
  return result;
}

/**
 * 生成考試登入代碼（6 個字元，大寫英數，排除易混淆字元）
 *
 * @example generateExamCode() // "A7K9X3"
 */
export function generateExamCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  return result;
}

/**
 * 驗證 examId 格式是否正確
 */
export function isValidExamId(id: string): boolean {
  if (id.length !== EXAM_ID_LENGTH) return false;
  return /^[a-z0-9]+$/.test(id);
}

/**
 * 驗證登入代碼格式是否正確
 */
export function isValidExamCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return new RegExp(`^[${CODE_CHARSET}]+$`).test(code);
}
