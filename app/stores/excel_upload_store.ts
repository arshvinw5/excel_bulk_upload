import { create } from "zustand";

// ===========================================
// TYPE DEFINITIONS
// ===========================================

/**
 * Represents a validation error for a specific cell
 */
export interface CellError {
  row: number; // Row index in the data array
  column: string; // Column name
  message: string; // Error message to display
  value: unknown; // The invalid value
}

/**
 * Represents a single row of Excel data
 * Each row has a unique ID for React keys and selection
 */
export interface ExcelRow {
  id: string;
  [key: string]: unknown;
}

/**
 * Represents a school from the backend
 * Used for autocomplete suggestions
 */
export interface School {
  id: string;
  name: string;
  location?: string;
  type?: string;
}

/**
 * State for the autocomplete dropdown
 * Tracks which cell is active and its suggestions
 */
export interface AutocompleteState {
  activeCellKey: string | null; // Format: "rowId-columnName"
  searchQuery: string;
  suggestions: School[];
  isLoading: boolean;
  highlightedIndex: number; // For keyboard navigation
}

/**
 * Main store interface
 * Contains all state and actions for the Excel upload feature
 */
interface ExcelUploadState {
  // ===========================================
  // DATA STATE
  // ===========================================
  data: ExcelRow[]; // Parsed Excel data
  cellErrors: CellError[]; // Validation errors
  duplicates: number[]; // Indices of duplicate rows
  isProcessing: boolean; // File processing state
  fileName: string | null; // Uploaded file name
  columns: string[]; // Column headers

  // ===========================================
  // PAGINATION STATE
  // ===========================================
  currentPage: number;
  pageSize: number;

  // ===========================================
  // SELECTION STATE (for row deletion)
  // ===========================================
  selectedRowIds: Set<string>;

  // ===========================================
  // DIALOG STATE
  // ===========================================
  isDeleteDialogOpen: boolean;

  // ===========================================
  // AUTOCOMPLETE STATE
  // ===========================================
  autocomplete: AutocompleteState;

  // ===========================================
  // DATA ACTIONS
  // ===========================================
  setData: (data: ExcelRow[]) => void;
  setCellErrors: (errors: CellError[]) => void;
  setDuplicates: (duplicates: number[]) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setFileName: (fileName: string | null) => void;
  setColumns: (columns: string[]) => void;
  clearAll: () => void;
  updateCell: (rowIndex: number, column: string, value: unknown) => void;

  // ===========================================
  // PAGINATION ACTIONS
  // ===========================================
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // ===========================================
  // SELECTION ACTIONS
  // ===========================================
  toggleRowSelection: (rowId: string) => void;
  selectAllRows: (rowIds: string[]) => void;
  deselectAllRows: () => void;
  deleteSelectedRows: () => void;

  // ===========================================
  // DIALOG ACTIONS
  // ===========================================
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;

  // ===========================================
  // AUTOCOMPLETE ACTIONS
  // ===========================================
  setActiveAutocompleteCell: (cellKey: string | null) => void;
  setAutocompleteQuery: (query: string) => void;
  setAutocompleteSuggestions: (suggestions: School[]) => void;
  setAutocompleteLoading: (isLoading: boolean) => void;
  setAutocompleteHighlightedIndex: (index: number) => void;
  resetAutocomplete: () => void;
}

// ===========================================
// INITIAL STATE
// ===========================================
const initialAutocompleteState: AutocompleteState = {
  activeCellKey: null,
  searchQuery: "",
  suggestions: [],
  isLoading: false,
  highlightedIndex: -1,
};

const initialState = {
  data: [],
  cellErrors: [],
  duplicates: [],
  isProcessing: false,
  fileName: null,
  currentPage: 1,
  pageSize: 10,
  columns: [],
  selectedRowIds: new Set<string>(),
  isDeleteDialogOpen: false,
  autocomplete: initialAutocompleteState,
};

// ===========================================
// CREATE ZUSTAND STORE
// ===========================================
export const useExcelUploadStore = create<ExcelUploadState>((set, get) => ({
  ...initialState,

  // ===========================================
  // DATA ACTIONS IMPLEMENTATION
  // ===========================================

  setData: (data) => set({ data }),

  setCellErrors: (cellErrors) => set({ cellErrors }),

  setDuplicates: (duplicates) => set({ duplicates }),

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  setFileName: (fileName) => set({ fileName }),

  setColumns: (columns) => set({ columns }),

  /**
   * Resets all state to initial values
   * Called when user clicks "Clear All" button
   */
  clearAll: () =>
    set({
      ...initialState,
      selectedRowIds: new Set<string>(),
      autocomplete: { ...initialAutocompleteState },
    }),

  /**
   * Updates a specific cell value
   * @param rowIndex - Index of the row in the data array
   * @param column - Column name to update
   * @param value - New value for the cell
   */
  updateCell: (rowIndex, column, value) =>
    set((state) => ({
      data: state.data.map((row, index) =>
        index === rowIndex ? { ...row, [column]: value } : row
      ),
    })),

  // ===========================================
  // PAGINATION ACTIONS IMPLEMENTATION
  // ===========================================

  setCurrentPage: (currentPage) => set({ currentPage }),

  /**
   * Changes page size and resets to first page
   */
  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  // ===========================================
  // SELECTION ACTIONS IMPLEMENTATION
  // ===========================================

  /**
   * Toggles selection state for a single row
   * Used when clicking individual row checkboxes
   */
  toggleRowSelection: (rowId: string) =>
    set((state) => {
      const newSelectedIds = new Set(state.selectedRowIds);
      if (newSelectedIds.has(rowId)) {
        newSelectedIds.delete(rowId);
      } else {
        newSelectedIds.add(rowId);
      }
      return { selectedRowIds: newSelectedIds };
    }),

  /**
   * Selects multiple rows at once
   * Used for "Select All" functionality
   */
  selectAllRows: (rowIds: string[]) =>
    set((state) => {
      const newSelectedIds = new Set(state.selectedRowIds);
      rowIds.forEach((id) => newSelectedIds.add(id));
      return { selectedRowIds: newSelectedIds };
    }),

  /**
   * Clears all row selections
   */
  deselectAllRows: () => set({ selectedRowIds: new Set<string>() }),

  /**
   * Deletes all selected rows from data
   * Also closes the delete dialog and clears selection
   */
  deleteSelectedRows: () =>
    set((state) => {
      const remainingData = state.data.filter(
        (row) => !state.selectedRowIds.has(row.id)
      );
      return {
        data: remainingData,
        selectedRowIds: new Set<string>(),
        isDeleteDialogOpen: false,
      };
    }),

  // ===========================================
  // DIALOG ACTIONS IMPLEMENTATION
  // ===========================================

  /**
   * Opens delete confirmation dialog
   * Only opens if there are selected rows
   */
  openDeleteDialog: () =>
    set((state) => {
      if (state.selectedRowIds.size > 0) {
        return { isDeleteDialogOpen: true };
      }
      return {};
    }),

  closeDeleteDialog: () => set({ isDeleteDialogOpen: false }),

  // ===========================================
  // AUTOCOMPLETE ACTIONS IMPLEMENTATION
  // ===========================================

  /**
   * Sets which cell is currently showing autocomplete
   * @param cellKey - Format "rowId-columnName" or null to close
   */
  setActiveAutocompleteCell: (cellKey: string | null) =>
    set((state) => ({
      autocomplete: {
        ...state.autocomplete,
        activeCellKey: cellKey,
        suggestions: cellKey ? state.autocomplete.suggestions : [],
        highlightedIndex: -1,
      },
    })),

  setAutocompleteQuery: (query: string) =>
    set((state) => ({
      autocomplete: {
        ...state.autocomplete,
        searchQuery: query,
        highlightedIndex: -1,
      },
    })),

  setAutocompleteSuggestions: (suggestions: School[]) =>
    set((state) => ({
      autocomplete: {
        ...state.autocomplete,
        suggestions,
        isLoading: false,
      },
    })),

  setAutocompleteLoading: (isLoading: boolean) =>
    set((state) => ({
      autocomplete: {
        ...state.autocomplete,
        isLoading,
      },
    })),

  setAutocompleteHighlightedIndex: (index: number) =>
    set((state) => ({
      autocomplete: {
        ...state.autocomplete,
        highlightedIndex: index,
      },
    })),

  /**
   * Resets autocomplete state to initial values
   * Called when closing dropdown or selecting a value
   */
  resetAutocomplete: () =>
    set({
      autocomplete: { ...initialAutocompleteState },
    }),
}));
