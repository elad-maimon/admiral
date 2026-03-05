"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
}

export function InlineEdit({ value, onSave, className }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setCurrentValue(value);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`h-7 py-1 px-2 text-sm ${className || ''}`}
      />
    );
  }

  return (
    <div
      className={`cursor-text hover:bg-slate-100 px-2 py-1 -ml-2 rounded border border-transparent hover:border-slate-300 transition-colors ${className || ''}`}
      onClick={() => setIsEditing(true)}
    >
      {value || <span className="text-slate-400 italic">ריק</span>}
    </div>
  );
}
