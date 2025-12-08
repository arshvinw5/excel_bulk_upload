import { z } from "zod";
import { CellError, ExcelRow } from "@/app/stores/excel_upload_store";

// ===========================================
// ZOD V4 VALIDATION SCHEMA
// ===========================================
// In Zod v4, use { message: '.. .' } for error customization
// instead of { required_error, invalid_type_error }
// ===========================================

export const ExcelRowSchema = z.object({
  // Email: Required, valid format
  email: z
    .string({ message: "Email is required" })
    .email({ message: "Invalid email format" })
    .min(1, { message: "Email cannot be empty" }),

  // Name: Required, 2-100 characters
  name: z
    .string({ message: "Name is required" })
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name cannot exceed 100 characters" }),

  // Phone: Optional, must match pattern if provided
  phone: z
    .string()
    .regex(/^[\d\s\-+()]*$/, { message: "Invalid phone format" })
    .optional()
    .or(z.literal("")),

  // Age: Required, positive integer 0-150
  age: z.coerce
    .number({ message: "Age must be a number" })
    .int({ message: "Age must be a whole number" })
    .min(0, { message: "Age cannot be negative" })
    .max(150, { message: "Age cannot exceed 150" }),

  // Department: Required, must be one of allowed values
  department: z.enum(["Engineering", "Marketing", "Sales", "HR", "Finance"], {
    message:
      "Invalid department.  Must be: Engineering, Marketing, Sales, HR, or Finance",
  }),

  // Join Date: Optional, must be valid date if provided
  joinDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .optional()
    .or(z.literal("")),

  // School: Required, autocomplete field
  // Fetches suggestions from backend
  school: z
    .string({ message: "School is required" })
    .min(2, { message: "School must be at least 2 characters" })
    .max(200, { message: "School name too long" }),
});

// Type inference from schema
export type ValidExcelRow = z.infer<typeof ExcelRowSchema>;

// ===========================================
// AUTOCOMPLETE COLUMNS CONFIGURATION
// ===========================================
// Add column names here that should render as
// autocomplete inputs with backend suggestions
export const AUTOCOMPLETE_COLUMNS = ["school"];

// ===========================================
// VALIDATION FUNCTIONS
// ===========================================

/**
 * Validates a single cell value against its column schema
 * @returns CellError if validation fails, null otherwise
 */
export function validateCell(
  column: string,
  value: unknown,
  row: number
): CellError | null {
  try {
    const shape = ExcelRowSchema.shape;

    if (column in shape) {
      const fieldSchema = shape[column as keyof typeof shape];
      const result = fieldSchema.safeParse(value);

      if (!result.success) {
        // Zod v4: Access error messages
        const errorMessage =
          result.error.issues?.[0]?.message || "Invalid value";

        return { row, column, message: errorMessage, value };
      }
    }

    return null;
  } catch {
    return { row, column, message: "Validation error", value };
  }
}

/**
 * Validates all cells in the dataset
 * @returns Array of all cell errors
 */
export function validateAllCells(
  data: ExcelRow[],
  columns: string[]
): CellError[] {
  const errors: CellError[] = [];

  data.forEach((row, rowIndex) => {
    columns.forEach((column) => {
      if (column === "id") return; // Skip internal ID column

      const error = validateCell(column, row[column], rowIndex);
      if (error) {
        errors.push(error);
      }
    });
  });

  return errors;
}

/**
 * Finds duplicate rows based on a unique key field
 * @param uniqueKey - Column name to check for duplicates (default: 'email')
 * @returns Array of indices for duplicate rows (keeps first occurrence)
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
        duplicateIndices.push(index);
      } else {
        seen.set(keyValue, index);
      }
    }
  });

  return duplicateIndices;
}

/**
 * Removes duplicate rows, keeping first occurrence
 */
export function removeDuplicates(
  data: ExcelRow[],
  uniqueKey: string = "email"
): ExcelRow[] {
  const seen = new Set<unknown>();

  return data.filter((row) => {
    const keyValue = row[uniqueKey];

    if (keyValue === undefined || keyValue === null || keyValue === "") {
      return true;
    }

    if (seen.has(keyValue)) {
      return false;
    }

    seen.add(keyValue);
    return true;
  });
}

/**
 * Converts Excel data to JSON for backend upload
 * Removes internal 'id' field before sending
 */
export function convertToJson(data: ExcelRow[]): Omit<ExcelRow, "id">[] {
  return data.map(({ id, ...rest }) => rest);
}
