#!/usr/bin/env python3
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
