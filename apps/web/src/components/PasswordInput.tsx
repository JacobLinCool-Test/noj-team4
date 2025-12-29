'use client';

import { useState } from "react";
import { useBlockChineseInput } from "@/hooks/useBlockChineseInput";

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  name?: string;
  toggleLabels: {
    show: string;
    hide: string;
  };
  inputMethodWarning?: string;
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  name = "password",
  toggleLabels,
  inputMethodWarning,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const { isComposing, handleCompositionStart, handleCompositionEnd, handleChange } = useBlockChineseInput();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-800" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => handleChange(e, onChange)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-base focus:border-[#1e5d8f] focus:outline-none"
        />
        <button
          type="button"
          aria-label={visible ? toggleLabels.hide : toggleLabels.show}
          aria-pressed={visible}
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e5d8f] focus-visible:ring-offset-1"
        >
          {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
      {isComposing && inputMethodWarning && (
        <p className="text-sm text-amber-600">{inputMethodWarning}</p>
      )}
    </div>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.052 10.052 0 012.321-3.568"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.343 6.343A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.05 10.05 0 01-4.132 5.411"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
    </svg>
  );
}
