'use client';

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export type PipelineStageType =
  | "COMPILE"
  | "STATIC_ANALYSIS"
  | "EXECUTE"
  | "CHECK"
  | "SCORING"
  | "INTERACTIVE";

export interface PipelineStageConfig {
  type: PipelineStageType;
  config: Record<string, any>;
  enabled?: boolean;
}

const STAGE_LABELS: Record<PipelineStageType, string> = {
  COMPILE: "編譯",
  STATIC_ANALYSIS: "靜態分析",
  EXECUTE: "執行",
  CHECK: "檢查",
  SCORING: "計分",
  INTERACTIVE: "互動式評測",
};

const STAGE_DESCRIPTIONS: Record<PipelineStageType, string> = {
  COMPILE: "編譯學生的程式碼",
  STATIC_ANALYSIS: "檢查禁止函式、禁止庫、程式碼風格",
  EXECUTE: "執行測試案例",
  CHECK: "比對輸出結果（支援自訂 Checker）",
  SCORING: "計算分數（支援懲罰規則）",
  INTERACTIVE: "互動式評測（雙向通訊）",
};

interface SortableStageItemProps {
  id: string;
  stage: PipelineStageConfig;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  onToggle: () => void;
}

function SortableStageItem({ id, stage, index, onEdit, onRemove, onToggle }: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border p-4 ${
        stage.enabled === false
          ? "border-gray-200 bg-gray-50"
          : "border-gray-300 bg-white"
      }`}
    >
      {/* 拖曳手柄 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
        title="拖曳排序"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>

      {/* 序號 */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#003865] text-sm font-bold text-white">
        {index + 1}
      </div>

      {/* 階段資訊 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium ${stage.enabled === false ? "text-gray-400" : "text-gray-900"}`}>
            {STAGE_LABELS[stage.type]}
          </h4>
          {stage.enabled === false && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
              已停用
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{STAGE_DESCRIPTIONS[stage.type]}</p>
      </div>

      {/* 操作按鈕 */}
      <div className="flex items-center gap-2">
        {/* 啟用/停用切換 */}
        <button
          onClick={onToggle}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            stage.enabled === false
              ? "bg-green-50 text-green-700 hover:bg-green-100"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          title={stage.enabled === false ? "啟用" : "停用"}
        >
          {stage.enabled === false ? "啟用" : "停用"}
        </button>

        {/* 配置按鈕 */}
        <button
          onClick={onEdit}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          title="配置"
        >
          配置
        </button>

        {/* 刪除按鈕 */}
        <button
          onClick={onRemove}
          className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          title="刪除"
        >
          刪除
        </button>
      </div>
    </div>
  );
}

interface StageListProps {
  stages: PipelineStageConfig[];
  onChange: (stages: PipelineStageConfig[]) => void;
  onEditStage: (index: number) => void;
}

export function StageList({ stages, onChange, onEditStage }: StageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((_, i) => `stage-${i}` === active.id);
      const newIndex = stages.findIndex((_, i) => `stage-${i}` === over.id);
      onChange(arrayMove(stages, oldIndex, newIndex));
    }
  };

  const handleRemove = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    onChange(newStages);
  };

  const handleToggle = (index: number) => {
    const newStages = [...stages];
    newStages[index] = {
      ...newStages[index],
      enabled: newStages[index].enabled === false ? true : false,
    };
    onChange(newStages);
  };

  if (stages.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">尚未配置任何評測階段</p>
        <p className="mt-1 text-sm text-gray-400">點擊下方「新增階段」來開始配置</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={stages.map((_, i) => `stage-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <SortableStageItem
              key={`stage-${index}`}
              id={`stage-${index}`}
              stage={stage}
              index={index}
              onEdit={() => onEditStage(index)}
              onRemove={() => handleRemove(index)}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface AddStageButtonProps {
  onAdd: (type: PipelineStageType) => void;
  existingTypes: PipelineStageType[];
}

export function AddStageButton({ onAdd, existingTypes }: AddStageButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableTypes: PipelineStageType[] = [
    "COMPILE",
    "STATIC_ANALYSIS",
    "EXECUTE",
    "CHECK",
    "SCORING",
    "INTERACTIVE",
  ];

  // 過濾已存在的階段
  const filteredTypes = availableTypes.filter(
    (type) => !existingTypes.includes(type)
  );

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (filteredTypes.length === 0) {
    return null;
  }

  const handleAdd = (type: PipelineStageType) => {
    onAdd(type);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors ${
          isOpen
            ? "border-[#003865] text-[#003865] bg-blue-50"
            : "border-gray-300 text-gray-500 hover:border-[#003865] hover:text-[#003865]"
        }`}
      >
        <svg
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-45" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        新增階段
      </button>

      {/* 下拉選單 - 點擊開關 */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {filteredTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleAdd(type)}
              className="flex w-full flex-col items-start gap-1 rounded-md px-3 py-2.5 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{STAGE_LABELS[type]}</span>
              <span className="text-xs text-gray-500">{STAGE_DESCRIPTIONS[type]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
