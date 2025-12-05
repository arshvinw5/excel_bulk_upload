"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, School as SchoolIcon, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useExcelUploadStore, School } from "@/app/stores/excel_upload_store";
import { fetchSchools } from "@/lib/api/school_api";

// ===========================================
// AUTOCOMPLETE CELL COMPONENT
// ===========================================
// Searchable dropdown that fetches suggestions from backend
// ALL STATE MANAGED BY ZUSTAND - NO useState!
//
// Features:
// - Debounced search (waits for user to stop typing)
// - Backend API fetching with abort controller
// - Keyboard navigation (arrows, enter, escape)
// - Click outside to close
// - Loading state
// - Validation error display
// ===========================================

interface AutocompleteCellProps {
  cellKey: string; // Unique: "rowId-columnName"
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  errorMessage?: string;
  minSearchLength?: number; // Min chars before search
  debounceMs?: number; // Delay before API call
}

export function AutocompleteCell({
  cellKey,
  value,
  onChange,
  placeholder = "Type to search.. .",
  hasError = false,
  errorMessage = "",
  minSearchLength = 2,
  debounceMs = 300,
}: AutocompleteCellProps) {
  // ===========================================
  // ZUSTAND STORE - ALL STATE FROM STORE
  // ===========================================
  const {
    autocomplete,
    setActiveAutocompleteCell,
    setAutocompleteQuery,
    setAutocompleteSuggestions,
    setAutocompleteLoading,
    setAutocompleteHighlightedIndex,
    resetAutocomplete,
  } = useExcelUploadStore();

  // Is this cell currently active?
  const isActive = autocomplete.activeCellKey === cellKey;
  const { suggestions, isLoading, highlightedIndex } = autocomplete;

  // ===========================================
  // REFS
  // ===========================================
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ===========================================
  // FETCH SUGGESTIONS
  // ===========================================
  const fetchSuggestions = useCallback(
    async (query: string) => {
      // Cancel previous request
      abortControllerRef.current?.abort();

      if (query.length < minSearchLength) {
        setAutocompleteSuggestions([]);
        return;
      }

      abortControllerRef.current = new AbortController();
      setAutocompleteLoading(true);

      try {
        const results = await fetchSchools(
          query,
          abortControllerRef.current.signal
        );
        setAutocompleteSuggestions(results);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Fetch error:", error);
          setAutocompleteSuggestions([]);
        }
      }
    },
    [minSearchLength, setAutocompleteSuggestions, setAutocompleteLoading]
  );

  // ===========================================
  // INPUT CHANGE (debounced)
  // ===========================================
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setAutocompleteQuery(newValue);

      // Clear previous debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Debounced fetch
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
      }, debounceMs);
    },
    [onChange, setAutocompleteQuery, fetchSuggestions, debounceMs]
  );

  // ===========================================
  // SELECT SUGGESTION
  // ===========================================
  const handleSelectSuggestion = useCallback(
    (school: School) => {
      onChange(school.name);
      resetAutocomplete();
      inputRef.current?.focus();
    },
    [onChange, resetAutocomplete]
  );

  // ===========================================
  // KEYBOARD NAVIGATION
  // ===========================================
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isActive || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setAutocompleteHighlightedIndex(
            Math.min(highlightedIndex + 1, suggestions.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setAutocompleteHighlightedIndex(Math.max(highlightedIndex - 1, -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0) {
            handleSelectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case "Escape":
        case "Tab":
          resetAutocomplete();
          break;
      }
    },
    [
      isActive,
      suggestions,
      highlightedIndex,
      setAutocompleteHighlightedIndex,
      handleSelectSuggestion,
      resetAutocomplete,
    ]
  );

  // ===========================================
  // FOCUS - Activate this cell
  // ===========================================
  const handleFocus = useCallback(() => {
    setActiveAutocompleteCell(cellKey);
    if (value.length >= minSearchLength) {
      fetchSuggestions(value);
    }
  }, [
    cellKey,
    value,
    minSearchLength,
    setActiveAutocompleteCell,
    fetchSuggestions,
  ]);

  // ===========================================
  // CLICK OUTSIDE - Close dropdown
  // ===========================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isActive &&
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        resetAutocomplete();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isActive, resetAutocomplete]);

  // ===========================================
  // CLEANUP
  // ===========================================
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  // ===========================================
  // HIGHLIGHT MATCHING TEXT
  // ===========================================
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const showDropdown = isActive && (suggestions.length > 0 || isLoading);

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`h-9 text-sm pr-8 ${
            hasError ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
          }`}
        />

        {/* Icon: Loading / Error / School */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading && isActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent className="bg-red-500 text-white">
                  {errorMessage}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : value ? (
            <SchoolIcon className="h-4 w-4 text-muted-foreground" />
          ) : null}
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden"
        >
          {isLoading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Searching...
            </div>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <ul className="py-1">
                {suggestions.map((school, index) => (
                  <li
                    key={school.id}
                    onClick={() => handleSelectSuggestion(school)}
                    onMouseEnter={() => setAutocompleteHighlightedIndex(index)}
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 ${
                      index === highlightedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <SchoolIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {highlightMatch(school.name, value)}
                      </p>
                      {(school.location || school.type) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[school.location, school.type]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-1. 5 bg-muted/50 border-t text-xs text-muted-foreground">
                {suggestions.length} result{suggestions.length !== 1 ? "s" : ""}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* No Results */}
      {isActive &&
        !isLoading &&
        suggestions.length === 0 &&
        value.length >= minSearchLength && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center"
          >
            No schools found for "{value}"
          </div>
        )}
    </div>
  );
}
