"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { CellError } from "@/app/stores/excel_upload_store";

// ===========================================
// COMPONENT PROPS INTERFACE
// ===========================================
interface ErrorAlertProps {
  errors: CellError[];
  title: string;
  description: string;
}

export function ErrorAlert({ errors, title, description }: ErrorAlertProps) {
  // ===========================================
  // GROUP ERRORS BY ROW FOR BETTER DISPLAY
  // ===========================================
  const errorsByRow = errors.reduce((acc, error) => {
    // Handle file-level errors separately
    if (error.row === -1) {
      if (!acc["file"]) acc["file"] = [];
      acc["file"].push(error);
    } else {
      const rowKey = `row-${error.row + 1}`;
      if (!acc[rowKey]) acc[rowKey] = [];
      acc[rowKey].push(error);
    }
    return acc;
  }, {} as Record<string, CellError[]>);

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{description}</p>

        {/* Scrollable Error List */}
        <ScrollArea className="h-[200px] rounded-md border border-red-200 bg-white dark:bg-gray-950 p-3">
          <div className="space-y-3">
            {Object.entries(errorsByRow).map(([rowKey, rowErrors]) => (
              <div
                key={rowKey}
                className="border-b border-red-100 dark:border-red-900 pb-2 last:border-0"
              >
                {/* Row Header */}
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-xs">
                    {rowKey === "file"
                      ? "File Error"
                      : `Row ${rowKey.replace("row-", "")}`}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {rowErrors.length} error(s)
                  </span>
                </div>

                {/* Error Details */}
                <ul className="space-y-1 ml-2">
                  {rowErrors.map((error, index) => (
                    <li
                      key={`${error.row}-${error.column}-${index}`}
                      className="text-sm flex items-start gap-2"
                    >
                      <X className="h-3 w-3 mt-1 text-red-500 flex-shrink-0" />
                      <span>
                        <strong className="font-medium">{error.column}:</strong>{" "}
                        {error.message}
                        {error.value !== null && error.value !== undefined && (
                          <span className="text-muted-foreground ml-1">
                            (value: "{String(error.value)}")
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Total Error Count */}
        <p className="mt-2 text-xs text-muted-foreground">
          Total: {errors.length} validation error(s) found
        </p>
      </AlertDescription>
    </Alert>
  );
}
