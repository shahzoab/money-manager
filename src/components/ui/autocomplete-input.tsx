"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AutocompleteInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<string[]>;
  placeholder?: string;
  disabled?: boolean;
};

export function AutocompleteInput({
  id,
  value,
  onChange,
  onSearch,
  placeholder,
  disabled,
}: AutocompleteInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    if (!focused) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      onSearch(value)
        .then((results) => {
          if (!cancelled) {
            setSuggestions(results);
            setHighlightIndex(-1);
            setOpen(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setOpen(false);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, focused, onSearch]);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocused(true);
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setFocused(false);
      setOpen(false);
      setHighlightIndex(-1);
    }, 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }

    if (!open || suggestions.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightIndex((index) =>
          index < suggestions.length - 1 ? index + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightIndex((index) =>
          index > 0 ? index - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        if (highlightIndex >= 0) {
          event.preventDefault();
          selectSuggestion(suggestions[highlightIndex]);
        }
        break;
    }
  };

  const showPanel =
    open && focused && (loading || suggestions.length > 0 || value.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightIndex >= 0
            ? `${listboxId}-option-${highlightIndex}`
            : undefined
        }
      />
      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-md"
        >
          {loading && suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No matching comments
            </p>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  "flex w-full items-center truncate text-left text-foreground transition-colors",
                  "min-h-14 rounded-xl px-4 py-3 text-base lg:min-h-0 lg:rounded-md lg:px-3 lg:py-2 lg:text-sm",
                  index === highlightIndex
                    ? "bg-surface-elevated font-medium"
                    : "hover:bg-surface-elevated/60",
                )}
              >
                {suggestion}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
