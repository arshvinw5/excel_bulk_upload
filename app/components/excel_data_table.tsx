"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useExcelUploadStore,
  ExcelRow,
  CellError,
} from "@/app/stores/excel_upload_store";
import { AUTOCOMPLETE_COLUMNS } from "@/lib/zod-validations/excel_validations";
import { DeleteConfirmDialog } from "./delete_confirm_dialog";
import { AutocompleteCell } from "./auto_complete_cell";

// ===========================================
// DATA TABLE COMPONENT
// ===========================================
// Displays Excel data with:
// - Checkbox column for row selection/deletion
// - Pagination
// - Inline editing
// - Autocomplete for specified columns
// - Error highlighting
// - Duplicate row highlighting
//
// ALL STATE FROM ZUSTAND - NO useState!
// ===========================================

interface ExcelDataTableProps {
  data: ExcelRow[];
  columns: string[];
  cellErrors: CellError[];
  duplicates: number[];
  onCellUpdate: (rowIndex: number, column: string, value: unknown) => void;
  onDataChange: () => void;
}

export function ExcelDataTable({
  data,
  columns,
  cellErrors,
  duplicates,
  onCellUpdate,
  onDataChange,
}: ExcelDataTableProps) {
  // ===========================================
  // ZUSTAND STORE - ALL STATE
  // ===========================================
  const {
    currentPage,
    pageSize,
    selectedRowIds,
    isDeleteDialogOpen,
    setCurrentPage,
    setPageSize,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
    deleteSelectedRows,
    openDeleteDialog,
    closeDeleteDialog,
  } = useExcelUploadStore();

  // ===========================================
  // PAGINATION
  // ===========================================
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  // ===========================================
  // SELECTION STATE
  // ===========================================
  const currentPageRowIds = paginatedData.map((row) => row.id);
  const allCurrentPageSelected =
    currentPageRowIds.length > 0 &&
    currentPageRowIds.every((id) => selectedRowIds.has(id));
  const someCurrentPageSelected =
    currentPageRowIds.some((id) => selectedRowIds.has(id)) &&
    !allCurrentPageSelected;
  const selectedCount = selectedRowIds.size;

  // ===========================================
  // ERROR LOOKUP (O(1))
  // ===========================================
  const getCellError = useMemo(() => {
    const errorMap = new Map<string, CellError>();
    cellErrors.forEach((error) => {
      errorMap.set(`${error.row}-${error.column}`, error);
    });
    return (rowIndex: number, column: string): CellError | undefined => {
      return errorMap.get(`${startIndex + rowIndex}-${column}`);
    };
  }, [cellErrors, startIndex]);

  // ===========================================
  // HELPERS
  // ===========================================
  const isDuplicateRow = (rowIndex: number) =>
    duplicates.includes(startIndex + rowIndex);
  const isAutocompleteColumn = (column: string) =>
    AUTOCOMPLETE_COLUMNS.includes(column);

  // ===========================================
  // HANDLERS
  // ===========================================
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  const handleSelectAllCurrentPage = () => {
    allCurrentPageSelected
      ? deselectAllRows()
      : selectAllRows(currentPageRowIds);
  };

  const handleConfirmDelete = () => {
    deleteSelectedRows();
    onDataChange();
    // Adjust page if needed
    const remaining = data.length - selectedCount;
    const newTotalPages = Math.ceil(remaining / pageSize);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  // ===========================================
  // RENDER CELL
  // ===========================================
  const renderCellContent = (
    row: ExcelRow,
    column: string,
    rowIndex: number
  ) => {
    const error = getCellError(rowIndex, column);
    const hasError = !!error;
    const actualRowIndex = startIndex + rowIndex;

    // Autocomplete column
    if (isAutocompleteColumn(column)) {
      return (
        <AutocompleteCell
          cellKey={`${row.id}-${column}`}
          value={String(row[column] ?? "")}
          onChange={(val) => onCellUpdate(actualRowIndex, column, val)}
          placeholder={`Search ${column}...`}
          hasError={hasError}
          errorMessage={error?.message || ""}
        />
      );
    }

    // Regular input
    return (
      <div className="relative">
        <Input
          value={String(row[column] ?? "")}
          onChange={(e) => onCellUpdate(actualRowIndex, column, e.target.value)}
          className={`h-9 text-sm ${
            hasError ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
          }`}
        />
        {hasError && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-red-500 text-white">
                {error.message}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="space-y-4">
      {/* Selection Toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border">
          <span className="text-sm font-medium">
            {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={deselectAllRows}>
              Deselect All
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={openDeleteDialog}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Select All Checkbox */}
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={allCurrentPageSelected}
                  {...(someCurrentPageSelected && {
                    "data-state": "indeterminate",
                  })}
                  onCheckedChange={handleSelectAllCurrentPage}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[60px] text-center">#</TableHead>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className={`min-w-[150px] ${
                    isAutocompleteColumn(col) ? "min-w-[280px]" : ""
                  }`}
                >
                  {col}
                  {isAutocompleteColumn(col) && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (searchable)
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, rowIndex) => {
              const isRowDuplicate = isDuplicateRow(rowIndex);
              const isSelected = selectedRowIds.has(row.id);
              return (
                <TableRow
                  key={row.id}
                  className={`
                    ${
                      isRowDuplicate ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
                    }
                    ${isSelected ? "bg-primary/5" : ""}
                  `}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelection(row.id)}
                      aria-label={`Select row ${startIndex + rowIndex + 1}`}
                    />
                  </TableCell>
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {startIndex + rowIndex + 1}
                    {isRowDuplicate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 ml-1 text-yellow-500 inline" />
                          </TooltipTrigger>
                          <TooltipContent>Duplicate row</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={`${row.id}-${col}`} className="p-1">
                      {renderCellContent(row, col, rowIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {startIndex + 1} to {endIndex} of {data.length}
        </div>

        <div className="flex items-center gap-1">
          {[
            {
              icon: ChevronsLeft,
              onClick: goToFirstPage,
              disabled: currentPage === 1,
            },
            {
              icon: ChevronLeft,
              onClick: goToPreviousPage,
              disabled: currentPage === 1,
            },
          ].map(({ icon: Icon, onClick, disabled }, i) => (
            <Button
              key={i}
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onClick}
              disabled={disabled}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <span className="text-sm px-3">
            Page {currentPage} of {totalPages || 1}
          </span>
          {[
            {
              icon: ChevronRight,
              onClick: goToNextPage,
              disabled: currentPage >= totalPages,
            },
            {
              icon: ChevronsRight,
              onClick: goToLastPage,
              disabled: currentPage >= totalPages,
            },
          ].map(({ icon: Icon, onClick, disabled }, i) => (
            <Button
              key={i}
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onClick}
              disabled={disabled}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        rowCount={selectedCount}
      />
    </div>
  );
}
