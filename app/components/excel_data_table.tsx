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
// ===========================================
// COMPONENT PROPS INTERFACE
// ===========================================
interface ExcelDataTableProps {
  data: ExcelRow[];
  columns: string[];
  cellErrors: CellError[];
  duplicates: number[];
  onCellUpdate: (rowIndex: number, column: string, value: unknown) => void;
}

export function ExcelDataTable({
  data,
  columns,
  cellErrors,
  duplicates,
  onCellUpdate,
}: ExcelDataTableProps) {
  // ===========================================
  // PAGINATION STATE FROM ZUSTAND
  // ===========================================
  const { currentPage, pageSize, setCurrentPage, setPageSize } =
    useExcelUploadStore();

  // ===========================================
  // PAGINATION CALCULATIONS
  // ===========================================
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data.length);
  const paginatedData = data.slice(startIndex, endIndex);

  // ===========================================
  // HELPER: Check if a cell has an error
  // ===========================================
  const getCellError = useMemo(() => {
    // Create a map for O(1) lookup
    const errorMap = new Map<string, CellError>();
    cellErrors.forEach((error) => {
      errorMap.set(`${error.row}-${error.column}`, error);
    });

    return (rowIndex: number, column: string): CellError | undefined => {
      // Calculate the actual row index in the full dataset
      const actualIndex = startIndex + rowIndex;
      return errorMap.get(`${actualIndex}-${column}`);
    };
  }, [cellErrors, startIndex]);

  // ===========================================
  // HELPER: Check if a row is a duplicate
  // ===========================================
  const isDuplicateRow = (rowIndex: number): boolean => {
    const actualIndex = startIndex + rowIndex;
    return duplicates.includes(actualIndex);
  };

  // ===========================================
  // PAGINATION HANDLERS
  // ===========================================
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1));
  const goToNextPage = () =>
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="space-y-4">
      {/* Data Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              {columns.map((column) => (
                <TableHead key={column} className="min-w-[150px]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody>
            {paginatedData.map((row, rowIndex) => {
              const isRowDuplicate = isDuplicateRow(rowIndex);

              return (
                <TableRow
                  key={row.id}
                  className={
                    isRowDuplicate ? "bg-yellow-50 dark:bg-yellow-950/20" : ""
                  }
                >
                  {/* Row Number */}
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {startIndex + rowIndex + 1}
                    {isRowDuplicate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 ml-1 text-yellow-500 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Duplicate row</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>

                  {/* Data Cells */}
                  {columns.map((column) => {
                    const error = getCellError(rowIndex, column);
                    const hasError = !!error;

                    return (
                      <TableCell key={`${row.id}-${column}`} className="p-1">
                        <div className="relative">
                          {/* Editable Input Field */}
                          <Input
                            value={String(row[column] ?? "")}
                            onChange={(e) =>
                              onCellUpdate(
                                startIndex + rowIndex,
                                column,
                                e.target.value
                              )
                            }
                            className={`
                              h-9 text-sm
                              ${
                                hasError
                                  ? "border-red-500 bg-red-50 dark:bg-red-950/20 focus:ring-red-500"
                                  : ""
                              }
                            `}
                          />

                          {/* Error Indicator with Tooltip */}
                          {hasError && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-red-500 text-white"
                                >
                                  <p>{error.message}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ===========================================
          PAGINATION CONTROLS
          =========================================== */}
      <div className="flex items-center justify-between px-2">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page Info */}
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {endIndex} of {data.length} entries
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToFirstPage}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Current Page Indicator */}
          <span className="text-sm px-3">
            Page {currentPage} of {totalPages}
          </span>

          {/* Next Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last Page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToLastPage}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
