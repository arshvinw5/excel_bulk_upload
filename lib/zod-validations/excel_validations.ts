import { z } from "zod";
import { CellError, ExcelRow } from "@/app/stores/excel_upload_store";

// ===========================================
// CUSTOMIZE THIS SCHEMA FOR YOUR EXCEL DATA
// ===========================================
// Define the expected structure of each Excel row
// Modify these fields based on your Excel file columns

// Zod v4 compatible schema
export const ExcelRowSchema = z.object({
  // Email field - must be valid email format
  email: z
    .string({ message: "Email is required and must be a string" })
    .email({ message: "Invalid email format" })
    .min(1, { message: "Email cannot be empty" }),

  // Name field - required string with min length
  name: z
    .string({ message: "Name is required and must be a string" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name cannot exceed 100 characters" }),

  // Phone field - optional but must match pattern if provided
  phone: z
    .string()
    .regex(/^[\d\s\-+()]*$/, { message: "Invalid phone number format" })
    .optional()
    .or(z.literal("")),

  // Age field - must be a positive number within range
  age: z
    .number({ message: "Age is required and must be a number" })
    .int({ message: "Age must be a whole number" })
    .min(0, { message: "Age cannot be negative" })
    .max(150, { message: "Age cannot exceed 150" }),

  // Department field - must be one of allowed values
  department: z.enum(["Engineering", "Marketing", "Sales", "HR", "Finance"], {
    message:
      "Department must be one of: Engineering, Marketing, Sales, HR, Finance",
  }),

  // Date field - must be valid date string
  joinDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional()
    .or(z.literal("")),
});

// Type inference from schema
export type ValidExcelRow = z.infer<typeof ExcelRowSchema>;

// ===========================================
// VALIDATION FUNCTIONS
// ===========================================

/**
 * Validates a single cell value against its column schema
 * Returns an error message if validation fails, null otherwise
 */
export function validateCell(
  column: string,
  value: unknown,
  row: number
): CellError | null {
  try {
    // Get the schema shape to validate individual fields
    const shape = ExcelRowSchema.shape;

    // Check if this column exists in our schema
    if (column in shape) {
      const fieldSchema = shape[column as keyof typeof shape];
      const result = fieldSchema.safeParse(value);

      if (!result.success) {
        // Zod v4: Access error messages differently
        const errorMessage =
          result.error.issues?.[0]?.message || "Invalid value";

        return {
          row,
          column,
          message: errorMessage,
          value,
        };
      }
    }

    return null;
  } catch {
    return {
      row,
      column,
      message: "Validation error occurred",
      value,
    };
  }
}

/**
 * Validates all cells in the Excel data
 * Returns an array of all cell-level errors
 */
export function validateAllCells(
  data: ExcelRow[],
  columns: string[]
): CellError[] {
  const errors: CellError[] = [];

  // Iterate through each row and column
  data.forEach((row, rowIndex) => {
    columns.forEach((column) => {
      // Skip the 'id' column (internal use)
      if (column === "id") return;

      const error = validateCell(column, row[column], rowIndex);
      if (error) {
        errors.push(error);
      }
    });
  });

  return errors;
}

/**
 * Finds duplicate rows based on a unique key (e.g., email)
 * Returns indices of duplicate rows (keeps first occurrence)
 */
export function findDuplicates(
  data: ExcelRow[],
  uniqueKey: string = "email"
): number[] {
  const seen = new Map<unknown, number>();
  const duplicateIndices: number[] = [];

  data.forEach((row, index) => {
    const keyValue = row[uniqueKey];

    if (keyValue !== undefined && keyValue !== null && keyValue !== "") {
      if (seen.has(keyValue)) {
        // This is a duplicate - add its index
        duplicateIndices.push(index);
      } else {
        // First occurrence - store the index
        seen.set(keyValue, index);
      }
    }
  });

  return duplicateIndices;
}

/**
 * Removes duplicate rows from data
 * Keeps the first occurrence of each unique key
 */
export function removeDuplicates(
  data: ExcelRow[],
  uniqueKey: string = "email"
): ExcelRow[] {
  const seen = new Set<unknown>();

  return data.filter((row) => {
    const keyValue = row[uniqueKey];

    // Keep rows with empty/null unique keys
    if (keyValue === undefined || keyValue === null || keyValue === "") {
      return true;
    }

    if (seen.has(keyValue)) {
      return false; // Remove duplicate
    }

    seen.add(keyValue);
    return true;
  });
}

/**
 * Converts validated Excel data to JSON for backend upload
 * Removes internal 'id' field before sending
 */
export function convertToJson(data: ExcelRow[]): Omit<ExcelRow, "id">[] {
  return data.map(({ id, ...rest }) => rest);
}
