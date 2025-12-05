import { School } from "@/app/stores/excel_upload_store";

// ===========================================
// SCHOOL API SERVICE
// ===========================================
// Fetches school suggestions from backend
// Currently uses mock data - replace with real API
// ===========================================

// ===========================================
// MOCK DATA (for development)
// ===========================================
const MOCK_SCHOOLS: School[] = [
  {
    id: "1",
    name: "Springfield Elementary School",
    location: "Springfield",
    type: "public",
  },
  {
    id: "2",
    name: "Springfield High School",
    location: "Springfield",
    type: "public",
  },
  {
    id: "3",
    name: "Riverside Academy",
    location: "Riverside",
    type: "private",
  },
  {
    id: "4",
    name: "Riverside Middle School",
    location: "Riverside",
    type: "public",
  },
  {
    id: "5",
    name: "Oak Grove Elementary",
    location: "Oak Grove",
    type: "public",
  },
  {
    id: "6",
    name: "Oak Grove High School",
    location: "Oak Grove",
    type: "public",
  },
  {
    id: "7",
    name: "Westside Preparatory Academy",
    location: "Westside",
    type: "private",
  },
  {
    id: "8",
    name: "Westside Charter School",
    location: "Westside",
    type: "charter",
  },
  {
    id: "9",
    name: "Central City Academy",
    location: "Central City",
    type: "private",
  },
  {
    id: "10",
    name: "Central High School",
    location: "Central City",
    type: "public",
  },
  {
    id: "11",
    name: "Northview Elementary",
    location: "Northview",
    type: "public",
  },
  {
    id: "12",
    name: "Northview Middle School",
    location: "Northview",
    type: "public",
  },
  {
    id: "13",
    name: "Southside Academy",
    location: "Southside",
    type: "private",
  },
  { id: "14", name: "Lakeside Academy", location: "Lakeside", type: "private" },
  {
    id: "15",
    name: "Mountain View School",
    location: "Mountain View",
    type: "public",
  },
  {
    id: "16",
    name: "Valley Heights Academy",
    location: "Valley Heights",
    type: "private",
  },
];

/**
 * Fetches school suggestions from backend
 *
 * @param query - Search query (user's input)
 * @param signal - AbortSignal for cancelling request
 * @returns Promise<School[]> - Matching schools
 *
 * TO CONNECT TO REAL BACKEND:
 * Replace mock implementation with:
 *
 * const response = await fetch(
 *   `/api/schools?search=${encodeURIComponent(query)}`,
 *   { signal }
 * );
 * return await response.json();
 */
export async function fetchSchools(
  query: string,
  signal?: AbortSignal
): Promise<School[]> {
  // ===========================================
  // MOCK IMPLEMENTATION
  // ===========================================

  // Simulate network delay
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, 300);
    if (signal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      });
    }
  });

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Minimum 2 characters to search
  if (!query || query.trim().length < 2) {
    return [];
  }

  // Filter by search query (case-insensitive)
  const searchTerm = query.toLowerCase().trim();
  return MOCK_SCHOOLS.filter((school) =>
    school.name.toLowerCase().includes(searchTerm)
  ).slice(0, 10); // Limit to 10 results

  // ===========================================
  // REAL API IMPLEMENTATION (uncomment to use)
  // ===========================================
  // try {
  //   const response = await fetch(
  //     `${process.env.NEXT_PUBLIC_API_URL}/api/schools?search=${encodeURIComponent(query)}`,
  //     {
  //       method: 'GET',
  //       headers: { 'Content-Type': 'application/json' },
  //       signal,
  //     }
  //   );
  //   if (!response.ok) throw new Error('Failed to fetch');
  //   return await response.json();
  // } catch (error) {
  //   if (error instanceof DOMException && error. name === 'AbortError') throw error;
  //   console.error('Error fetching schools:', error);
  //   return [];
  // }
}
