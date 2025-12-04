import { create } from "zustand";

//types for cell-level validation errors
export interface CellError {
  row: number;
  column: string;
  message: string;
  value: unknown;
}

// Type for each row of Excel data
export interface ExcelRow {
  id: string; // Unique identifier for each row
  [key: string]: unknown;
}

// Main store state interface
interface ExcelUploadState {
  // Raw data from Excel file
  data: ExcelRow[];
  // Array of cell-level validation errors
  cellErrors: CellError[];
  // Duplicate row indices
  duplicates: number[];
  // Loading state for file processing
  isProcessing: boolean;
  // File name for display
  fileName: string | null;
  // Pagination state
  currentPage: number;
  pageSize: number;
  // Column headers from Excel
  columns: string[];

  // Actions
  setData: (data: ExcelRow[]) => void;
  setCellErrors: (errors: CellError[]) => void;
  setDuplicates: (duplicates: number[]) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setFileName: (fileName: string | null) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setColumns: (columns: string[]) => void;

  // Clear all data and reset state
  clearAll: () => void;

  // Remove a specific error after user fixes it
  removeError: (row: number, column: string) => void;

  // Update a specific cell value
  updateCell: (rowIndex: number, column: string, value: unknown) => void;
}

// Initial state values
const initialState = {
  data: [],
  cellErrors: [],
  duplicates: [],
  isProcessing: false,
  fileName: null,
  currentPage: 1,
  pageSize: 10,
  columns: [],
};

// Create the Zustand store
export const useExcelUploadStore = create<ExcelUploadState>((set) => ({
  ...initialState,

  // Set the parsed Excel data
  setData: (data) => set({ data }),

  // Set validation errors for cells
  setCellErrors: (cellErrors) => set({ cellErrors }),

  // Set duplicate row indices
  setDuplicates: (duplicates) => set({ duplicates }),

  // Set processing/loading state
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  // Set the uploaded file name
  setFileName: (fileName) => set({ fileName }),

  // Set current pagination page
  setCurrentPage: (currentPage) => set({ currentPage }),

  // Set items per page
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  // Set column headers
  setColumns: (columns) => set({ columns }),

  // Reset all state to initial values
  clearAll: () => set(initialState),

  // Remove a specific error when cell is corrected
  removeError: (row, column) =>
    set((state) => ({
      cellErrors: state.cellErrors.filter(
        (error) => !(error.row === row && error.column === column)
      ),
    })),

  // Update a specific cell value in the data
  updateCell: (rowIndex, column, value) =>
    set((state) => ({
      data: state.data.map((row, index) =>
        index === rowIndex ? { ...row, [column]: value } : row
      ),
    })),
}));
