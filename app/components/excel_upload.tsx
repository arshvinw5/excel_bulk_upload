"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useExcelUploadStore, ExcelRow } from "@/app/stores/excel_upload_store";
import {
  validateAllCells,
  findDuplicates,
  removeDuplicates,
  convertToJson,
} from "@/lib/zod-validations/excel_validations";

import { ExcelDataTable } from "./excel_data_table";
import { ErrorAlert } from "./error_alert";

export function ExcelUploader() {
  // ===========================================
  // ZUSTAND STORE STATE & ACTIONS
  // ===========================================
  const {
    data,
    cellErrors,
    duplicates,
    isProcessing,
    fileName,
    columns,
    setData,
    setCellErrors,
    setDuplicates,
    setIsProcessing,
    setFileName,
    setColumns,
    clearAll,
    updateCell,
  } = useExcelUploadStore();

  // ===========================================
  // FILE PROCESSING HANDLER
  // ===========================================
  const processExcelFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setFileName(file.name);

      try {
        // Read the file as array buffer
        const arrayBuffer = await file.arrayBuffer();

        // Parse the Excel workbook
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          { defval: "" } // Default value for empty cells
        );

        // Add unique IDs to each row for React key prop
        const dataWithIds: ExcelRow[] = jsonData.map((row) => ({
          ...row,
          id: uuidv4(),
        }));

        // Extract column headers (excluding 'id')
        const extractedColumns =
          jsonData.length > 0
            ? Object.keys(jsonData[0]).filter((col) => col !== "id")
            : [];

        setColumns(extractedColumns);
        setData(dataWithIds);

        // ===========================================
        // VALIDATION: Check all cells for errors
        // ===========================================
        const errors = validateAllCells(dataWithIds, extractedColumns);
        setCellErrors(errors);

        // ===========================================
        // DUPLICATE DETECTION: Find duplicate rows
        // ===========================================
        const duplicateIndices = findDuplicates(dataWithIds, "email");
        setDuplicates(duplicateIndices);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        setCellErrors([
          {
            row: -1,
            column: "file",
            message:
              "Failed to parse Excel file.  Please check the file format.",
            value: null,
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      setData,
      setCellErrors,
      setDuplicates,
      setIsProcessing,
      setFileName,
      setColumns,
    ]
  );

  // ===========================================
  // DROPZONE CONFIGURATION
  // ===========================================
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        processExcelFile(file);
      }
    },
    [processExcelFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false, // Only allow single file
    disabled: isProcessing, // Disable during processing
  });

  // ===========================================
  // REMOVE DUPLICATES HANDLER
  // ===========================================
  const handleRemoveDuplicates = useCallback(() => {
    const cleanedData = removeDuplicates(data, "email");
    setData(cleanedData);
    setDuplicates([]); // Clear duplicate indicators

    // Re-validate after removing duplicates
    const errors = validateAllCells(cleanedData, columns);
    setCellErrors(errors);
  }, [data, columns, setData, setDuplicates, setCellErrors]);

  // ===========================================
  // CELL UPDATE HANDLER (for inline editing)
  // ===========================================
  const handleCellUpdate = useCallback(
    (rowIndex: number, column: string, value: unknown) => {
      updateCell(rowIndex, column, value);

      // Re-validate the entire dataset after update
      const updatedData = [...data];
      updatedData[rowIndex] = { ...updatedData[rowIndex], [column]: value };

      const errors = validateAllCells(updatedData, columns);
      setCellErrors(errors);

      // Re-check for duplicates
      const duplicateIndices = findDuplicates(updatedData, "email");
      setDuplicates(duplicateIndices);
    },
    [data, columns, updateCell, setCellErrors, setDuplicates]
  );

  // ===========================================
  // COMPLETE/SUBMIT HANDLER
  // ===========================================
  const handleComplete = useCallback(async () => {
    // Convert data to JSON (removes internal 'id' field)
    const jsonPayload = convertToJson(data);

    console.log("Bulk Upload Payload:", JSON.stringify(jsonPayload, null, 2));

    // ===========================================
    // TODO: Send to your backend API
    // ===========================================
    // Example:
    // try {
    //   const response = await fetch('/api/bulk-upload', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(jsonPayload),
    //   });
    //   if (response.ok) {
    //     // Handle success
    //     clearAll();
    //   }
    // } catch (error) {
    //   // Handle error
    // }

    alert(
      `Ready to upload ${jsonPayload.length} records!\nCheck console for JSON payload.`
    );
  }, [data]);

  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  // Check if there are any errors or duplicates
  const hasErrors = cellErrors.length > 0;
  const hasDuplicates = duplicates.length > 0;

  // Disable complete button if there are errors or duplicates
  const isCompleteDisabled = hasErrors || hasDuplicates || data.length === 0;

  // ===========================================
  // RENDER
  // ===========================================
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Excel Bulk Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* ===========================================
              DROPZONE AREA
              =========================================== */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input {...getInputProps()} />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Processing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-medium">
                  {isDragActive
                    ? "Drop the Excel file here"
                    : "Drag & drop an Excel file here, or click to select"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports . xlsx, .xls, and .csv files
                </p>
              </div>
            )}
          </div>

          {/* File name display */}
          {fileName && (
            <p className="mt-4 text-sm text-muted-foreground">
              Loaded file: <span className="font-medium">{fileName}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ===========================================
          ERROR ALERTS SECTION
          =========================================== */}
      {hasErrors && (
        <ErrorAlert
          errors={cellErrors}
          title="Validation Errors Found"
          description="Please fix the following errors before completing the upload:"
        />
      )}

      {/* Duplicate Warning Alert */}
      {hasDuplicates && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Duplicate Entries Detected</AlertTitle>
          <AlertDescription className="mt-2">
            <p>
              Found {duplicates.length} duplicate row(s) based on email.
              Duplicate rows: {duplicates.map((i) => i + 1).join(", ")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleRemoveDuplicates}
            >
              Remove Duplicates
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ===========================================
          DATA TABLE SECTION
          =========================================== */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Data ({data.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <ExcelDataTable
              data={data}
              columns={columns}
              cellErrors={cellErrors}
              duplicates={duplicates}
              onCellUpdate={handleCellUpdate}
            />
          </CardContent>
        </Card>
      )}

      {/* ===========================================
          ACTION BUTTONS
          =========================================== */}
      {data.length > 0 && (
        <div className="flex justify-end gap-4">
          {/* Clear Button */}
          <Button variant="outline" onClick={clearAll}>
            Clear All
          </Button>

          {/* Complete/Submit Button - Disabled if errors exist */}
          <Button
            onClick={handleComplete}
            disabled={isCompleteDisabled}
            className="min-w-[150px]"
          >
            {isCompleteDisabled && hasErrors ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Fix Errors First
              </>
            ) : isCompleteDisabled && hasDuplicates ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Remove Duplicates
              </>
            ) : (
              "Complete Upload"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
