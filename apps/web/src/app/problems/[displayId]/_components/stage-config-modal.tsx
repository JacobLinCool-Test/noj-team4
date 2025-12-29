'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { PipelineStageConfig, PipelineStageType } from "./stage-list";

interface StageConfigModalProps {
  stage: PipelineStageConfig | null;
  onSave: (config: Record<string, any>) => void;
  onClose: () => void;
}

const STAGE_LABELS: Record<PipelineStageType, string> = {
  COMPILE: "編譯",
  STATIC_ANALYSIS: "靜態分析",
  EXECUTE: "執行",
  CHECK: "檢查",
  SCORING: "計分",
  INTERACTIVE: "互動式評測",
};

export function StageConfigModal({ stage, onSave, onClose }: StageConfigModalProps) {
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (stage) {
      setConfig(stage.config || {});
    }
  }, [stage]);

  if (!stage) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Use portal to render modal at document body level to avoid clipping issues
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl rounded-lg bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            配置：{STAGE_LABELS[stage.type]}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {stage.type === "COMPILE" && (
            <CompileStageConfig config={config} onChange={updateConfig} />
          )}
          {stage.type === "STATIC_ANALYSIS" && (
            <StaticAnalysisStageConfig config={config} onChange={updateConfig} />
          )}
          {stage.type === "EXECUTE" && (
            <ExecuteStageConfig config={config} onChange={updateConfig} />
          )}
          {stage.type === "CHECK" && (
            <CheckStageConfig config={config} onChange={updateConfig} />
          )}
          {stage.type === "SCORING" && (
            <ScoringStageConfig config={config} onChange={updateConfig} />
          )}
          {stage.type === "INTERACTIVE" && (
            <InteractiveStageConfig config={config} onChange={updateConfig} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
          >
            儲存
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 編譯階段配置
function CompileStageConfig({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          編譯超時 (毫秒)
        </label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => onChange("timeout", parseInt(e.target.value, 10))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          min={1000}
          max={120000}
        />
        <p className="mt-1 text-sm text-gray-600">預設 30000 毫秒 (30 秒)</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          額外編譯選項 (選填)
        </label>
        <input
          type="text"
          value={config.compilerFlags || ""}
          onChange={(e) => onChange("compilerFlags", e.target.value)}
          placeholder="例如: -O2 -Wall"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500"
        />
      </div>
    </div>
  );
}

// 靜態分析階段配置
function StaticAnalysisStageConfig({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const [newFunction, setNewFunction] = useState("");
  const [newLibrary, setNewLibrary] = useState("");
  const [newPattern, setNewPattern] = useState({ pattern: "", message: "" });

  const rules = config.rules || [];

  const addRule = (type: string, ruleConfig: any) => {
    const newRules = [
      ...rules,
      {
        type,
        severity: "error",
        config: ruleConfig,
      },
    ];
    onChange("rules", newRules);
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_: any, i: number) => i !== index);
    onChange("rules", newRules);
  };

  const getForbiddenFunctions = (): string[] => {
    const rule = rules.find((r: any) => r.type === "forbidden-function");
    return rule?.config?.forbiddenFunctions || [];
  };

  const getForbiddenLibraries = (): string[] => {
    const rule = rules.find((r: any) => r.type === "forbidden-library");
    return rule?.config?.forbiddenLibraries || [];
  };

  const getForbiddenPatterns = (): { pattern: string; message: string }[] => {
    const rule = rules.find((r: any) => r.type === "forbidden-syntax");
    return rule?.config?.forbiddenPatterns || [];
  };

  const updateForbiddenFunctions = (functions: string[]) => {
    const newRules = rules.filter((r: any) => r.type !== "forbidden-function");
    if (functions.length > 0) {
      newRules.push({
        type: "forbidden-function",
        severity: "error",
        config: { forbiddenFunctions: functions },
      });
    }
    onChange("rules", newRules);
  };

  const updateForbiddenLibraries = (libraries: string[]) => {
    const newRules = rules.filter((r: any) => r.type !== "forbidden-library");
    if (libraries.length > 0) {
      newRules.push({
        type: "forbidden-library",
        severity: "error",
        config: { forbiddenLibraries: libraries },
      });
    }
    onChange("rules", newRules);
  };

  const updateForbiddenPatterns = (patterns: { pattern: string; message: string }[]) => {
    const newRules = rules.filter((r: any) => r.type !== "forbidden-syntax");
    if (patterns.length > 0) {
      newRules.push({
        type: "forbidden-syntax",
        severity: "error",
        config: { forbiddenPatterns: patterns },
      });
    }
    onChange("rules", newRules);
  };

  return (
    <div className="space-y-6">
      {/* 禁止函式 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          禁止函式
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {getForbiddenFunctions().map((func, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm text-red-800"
            >
              {func}
              <button
                onClick={() => {
                  const funcs = getForbiddenFunctions().filter((_, j) => j !== i);
                  updateForbiddenFunctions(funcs);
                }}
                className="ml-1 text-red-600 hover:text-red-800"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFunction}
            onChange={(e) => setNewFunction(e.target.value)}
            placeholder="輸入函式名稱 (例如: system, exec)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFunction.trim()) {
                updateForbiddenFunctions([...getForbiddenFunctions(), newFunction.trim()]);
                setNewFunction("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newFunction.trim()) {
                updateForbiddenFunctions([...getForbiddenFunctions(), newFunction.trim()]);
                setNewFunction("");
              }
            }}
            className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            新增
          </button>
        </div>
      </div>

      {/* 禁止函式庫 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          禁止函式庫
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {getForbiddenLibraries().map((lib, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800"
            >
              {lib}
              <button
                onClick={() => {
                  const libs = getForbiddenLibraries().filter((_, j) => j !== i);
                  updateForbiddenLibraries(libs);
                }}
                className="ml-1 text-orange-600 hover:text-orange-800"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLibrary}
            onChange={(e) => setNewLibrary(e.target.value)}
            placeholder="輸入函式庫名稱 (例如: subprocess, os)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLibrary.trim()) {
                updateForbiddenLibraries([...getForbiddenLibraries(), newLibrary.trim()]);
                setNewLibrary("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newLibrary.trim()) {
                updateForbiddenLibraries([...getForbiddenLibraries(), newLibrary.trim()]);
                setNewLibrary("");
              }
            }}
            className="rounded-md bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200"
          >
            新增
          </button>
        </div>
      </div>

      {/* 禁止語法模式 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          禁止語法模式 (正規表達式)
        </label>
        <div className="mb-2 space-y-2">
          {getForbiddenPatterns().map((pat, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-purple-50 px-3 py-2"
            >
              <code className="text-sm text-purple-800">{pat.pattern}</code>
              <span className="text-gray-600">-</span>
              <span className="text-sm text-gray-700">{pat.message}</span>
              <button
                onClick={() => {
                  const patterns = getForbiddenPatterns().filter((_, j) => j !== i);
                  updateForbiddenPatterns(patterns);
                }}
                className="ml-auto text-purple-600 hover:text-purple-800"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPattern.pattern}
            onChange={(e) => setNewPattern((p) => ({ ...p, pattern: e.target.value }))}
            placeholder="正規表達式 (例如: \\bgoto\\b)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500"
          />
          <input
            type="text"
            value={newPattern.message}
            onChange={(e) => setNewPattern((p) => ({ ...p, message: e.target.value }))}
            placeholder="錯誤訊息"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500"
          />
          <button
            onClick={() => {
              if (newPattern.pattern.trim() && newPattern.message.trim()) {
                updateForbiddenPatterns([...getForbiddenPatterns(), newPattern]);
                setNewPattern({ pattern: "", message: "" });
              }
            }}
            className="rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200"
          >
            新增
          </button>
        </div>
      </div>

      {/* 其他選項 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="failOnError"
          checked={config.failOnError !== false}
          onChange={(e) => onChange("failOnError", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="failOnError" className="text-sm text-gray-700">
          發現錯誤時中止評測
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enableLinter"
          checked={rules.some((r: any) => r.type === 'linter')}
          onChange={(e) => {
            if (e.target.checked) {
              // 添加 linter 規則
              const newRules = [
                ...rules,
                {
                  type: 'linter',
                  severity: 'warning',
                  config: {},
                },
              ];
              onChange("rules", newRules);
            } else {
              // 移除 linter 規則
              const newRules = rules.filter((r: any) => r.type !== 'linter');
              onChange("rules", newRules);
            }
          }}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="enableLinter" className="text-sm text-gray-700">
          啟用 Linter 檢查 (pylint / eslint / clang-tidy)
        </label>
      </div>
    </div>
  );
}

// 執行階段配置
function ExecuteStageConfig({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const [newDomain, setNewDomain] = useState("");
  const [newIP, setNewIP] = useState("");

  const networkConfig = config.networkConfig || { enabled: false, mode: 'firewall', allowedDomains: [], allowedIPs: [], allowedPorts: [] };

  const updateNetworkConfig = (key: string, value: any) => {
    onChange("networkConfig", { ...networkConfig, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useTestdata"
          checked={config.useTestdata !== false}
          onChange={(e) => onChange("useTestdata", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="useTestdata" className="text-sm text-gray-700">
          使用測資 (如果沒有測資，會使用範例輸入/輸出)
        </label>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          時間限制 (毫秒)
        </label>
        <input
          type="number"
          value={config.timeLimitMs || 1000}
          onChange={(e) => onChange("timeLimitMs", parseInt(e.target.value, 10))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          min={100}
          max={60000}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          記憶體限制 (KB)
        </label>
        <input
          type="number"
          value={config.memoryLimitKb || 262144}
          onChange={(e) => onChange("memoryLimitKb", parseInt(e.target.value, 10))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          min={1024}
          max={1048576}
        />
        <p className="mt-1 text-sm text-gray-600">預設 262144 KB (256 MB)</p>
      </div>

      {/* 網路存取設定 */}
      <div className="rounded-md border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="networkEnabled"
            checked={networkConfig.enabled}
            onChange={(e) => updateNetworkConfig("enabled", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="networkEnabled" className="text-sm font-medium text-gray-700">
            允許網路存取 (受控模式)
          </label>
        </div>

        {networkConfig.enabled && (
          <div className="mt-4 space-y-4 pl-6">
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                程式將可存取指定的網域和 IP 位址。預設封鎖所有其他連線。
              </p>
            </div>

            {/* 允許的網域 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                允許的網域
              </label>
              <div className="mb-2 flex flex-wrap gap-2">
                {(networkConfig.allowedDomains || []).map((domain: string, i: number) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
                  >
                    {domain}
                    <button
                      onClick={() => {
                        const domains = networkConfig.allowedDomains.filter((_: string, j: number) => j !== i);
                        updateNetworkConfig("allowedDomains", domains);
                      }}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="例如: api.example.com"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDomain.trim()) {
                      updateNetworkConfig("allowedDomains", [...(networkConfig.allowedDomains || []), newDomain.trim()]);
                      setNewDomain("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newDomain.trim()) {
                      updateNetworkConfig("allowedDomains", [...(networkConfig.allowedDomains || []), newDomain.trim()]);
                      setNewDomain("");
                    }
                  }}
                  className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200"
                >
                  新增
                </button>
              </div>
            </div>

            {/* 允許的 IP */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                允許的 IP 位址
              </label>
              <div className="mb-2 flex flex-wrap gap-2">
                {(networkConfig.allowedIPs || []).map((ip: string, i: number) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {ip}
                    <button
                      onClick={() => {
                        const ips = networkConfig.allowedIPs.filter((_: string, j: number) => j !== i);
                        updateNetworkConfig("allowedIPs", ips);
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="例如: 192.168.1.100 或 10.0.0.0/8"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newIP.trim()) {
                      updateNetworkConfig("allowedIPs", [...(networkConfig.allowedIPs || []), newIP.trim()]);
                      setNewIP("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newIP.trim()) {
                      updateNetworkConfig("allowedIPs", [...(networkConfig.allowedIPs || []), newIP.trim()]);
                      setNewIP("");
                    }
                  }}
                  className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                >
                  新增
                </button>
              </div>
            </div>

            {/* 允許的埠號 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                允許的埠號 (預設: 80, 443)
              </label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="port80"
                    checked={(networkConfig.allowedPorts || [80, 443]).includes(80)}
                    onChange={(e) => {
                      const ports = networkConfig.allowedPorts || [80, 443];
                      if (e.target.checked) {
                        updateNetworkConfig("allowedPorts", [...ports, 80]);
                      } else {
                        updateNetworkConfig("allowedPorts", ports.filter((p: number) => p !== 80));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="port80" className="text-sm text-gray-700">HTTP (80)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="port443"
                    checked={(networkConfig.allowedPorts || [80, 443]).includes(443)}
                    onChange={(e) => {
                      const ports = networkConfig.allowedPorts || [80, 443];
                      if (e.target.checked) {
                        updateNetworkConfig("allowedPorts", [...ports, 443]);
                      } else {
                        updateNetworkConfig("allowedPorts", ports.filter((p: number) => p !== 443));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="port443" className="text-sm text-gray-700">HTTPS (443)</label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 檢查階段配置
function CheckStageConfig({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          檢查模式
        </label>
        <select
          value={config.mode || "diff"}
          onChange={(e) => onChange("mode", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="diff">字串比對 (diff)</option>
          <option value="custom-checker">自訂 Checker</option>
        </select>
      </div>

      {config.mode === "diff" && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ignoreWhitespace"
              checked={config.ignoreWhitespace !== false}
              onChange={(e) => onChange("ignoreWhitespace", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="ignoreWhitespace" className="text-sm text-gray-700">
              忽略行尾空白和多餘換行
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="caseSensitive"
              checked={config.caseSensitive !== false}
              onChange={(e) => onChange("caseSensitive", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="caseSensitive" className="text-sm text-gray-700">
              區分大小寫
            </label>
          </div>
        </>
      )}

      {config.mode === "custom-checker" && (
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            請在 Pipeline 配置頁面上傳自訂 Checker 腳本。
          </p>
          <p className="mt-1 text-sm text-blue-600">
            Checker 會收到三個參數：input.txt, output.txt, answer.txt
          </p>
        </div>
      )}
    </div>
  );
}

// 計分階段配置
function ScoringStageConfig({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          計分模式
        </label>
        <select
          value={config.mode || "sum"}
          onChange={(e) => onChange("mode", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="sum">累加計分</option>
          <option value="weighted">加權計分</option>
          <option value="custom-script">自訂計分腳本</option>
        </select>
      </div>

      {/* 懲罰規則 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          懲罰規則
        </label>

        <div className="space-y-3">
          {/* 遲交懲罰 */}
          <div className="rounded-md border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lateSubmissionPenalty"
                checked={config.penaltyRules?.some((r: any) => r.type === "late-submission") || false}
                onChange={(e) => {
                  const rules = config.penaltyRules || [];
                  if (e.target.checked) {
                    onChange("penaltyRules", [
                      ...rules,
                      { type: "late-submission", config: { penaltyPerDay: 10, maxPenalty: 50 } },
                    ]);
                  } else {
                    onChange(
                      "penaltyRules",
                      rules.filter((r: any) => r.type !== "late-submission")
                    );
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="lateSubmissionPenalty" className="text-sm font-medium text-gray-700">
                遲交懲罰
              </label>
            </div>
            {config.penaltyRules?.some((r: any) => r.type === "late-submission") && (
              <div className="mt-2 flex gap-4 pl-6">
                <div>
                  <label className="text-xs text-gray-600">每天扣分</label>
                  <input
                    type="number"
                    value={
                      config.penaltyRules?.find((r: any) => r.type === "late-submission")?.config
                        ?.penaltyPerDay || 10
                    }
                    onChange={(e) => {
                      const rules = config.penaltyRules || [];
                      const updatedRules = rules.map((r: any) =>
                        r.type === "late-submission"
                          ? { ...r, config: { ...r.config, penaltyPerDay: parseInt(e.target.value, 10) } }
                          : r
                      );
                      onChange("penaltyRules", updatedRules);
                    }}
                    className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">最大扣分</label>
                  <input
                    type="number"
                    value={
                      config.penaltyRules?.find((r: any) => r.type === "late-submission")?.config
                        ?.maxPenalty || 50
                    }
                    onChange={(e) => {
                      const rules = config.penaltyRules || [];
                      const updatedRules = rules.map((r: any) =>
                        r.type === "late-submission"
                          ? { ...r, config: { ...r.config, maxPenalty: parseInt(e.target.value, 10) } }
                          : r
                      );
                      onChange("penaltyRules", updatedRules);
                    }}
                    className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 記憶體用量懲罰 */}
          <div className="rounded-md border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="memoryPenalty"
                checked={config.penaltyRules?.some((r: any) => r.type === "memory-usage") || false}
                onChange={(e) => {
                  const rules = config.penaltyRules || [];
                  if (e.target.checked) {
                    onChange("penaltyRules", [
                      ...rules,
                      { type: "memory-usage", config: { thresholdMb: 64, penaltyRate: 1 } },
                    ]);
                  } else {
                    onChange(
                      "penaltyRules",
                      rules.filter((r: any) => r.type !== "memory-usage")
                    );
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="memoryPenalty" className="text-sm font-medium text-gray-700">
                記憶體用量懲罰
              </label>
            </div>
          </div>

          {/* 時間用量懲罰 */}
          <div className="rounded-md border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="timePenalty"
                checked={config.penaltyRules?.some((r: any) => r.type === "time-usage") || false}
                onChange={(e) => {
                  const rules = config.penaltyRules || [];
                  if (e.target.checked) {
                    onChange("penaltyRules", [
                      ...rules,
                      { type: "time-usage", config: { thresholdMs: 10000, penaltyRate: 0.01 } },
                    ]);
                  } else {
                    onChange(
                      "penaltyRules",
                      rules.filter((r: any) => r.type !== "time-usage")
                    );
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="timePenalty" className="text-sm font-medium text-gray-700">
                時間用量懲罰
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 互動式評測配置
function InteractiveStageConfig({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          互動式評測需要上傳互動器腳本。學生程式會與互動器進行雙向通訊。
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          互動器語言
        </label>
        <select
          value={config.interactorLanguage || "PYTHON"}
          onChange={(e) => onChange("interactorLanguage", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="PYTHON">Python</option>
          <option value="CPP">C++</option>
          <option value="JAVA">Java</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          互動超時 (毫秒)
        </label>
        <input
          type="number"
          value={config.interactionTimeoutMs || 10000}
          onChange={(e) => onChange("interactionTimeoutMs", parseInt(e.target.value, 10))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          min={1000}
          max={60000}
        />
      </div>
    </div>
  );
}

