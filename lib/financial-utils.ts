/**
 * Financial Utility Functions
 * Helper functions for calculating worker earnings and financial metrics
 */

/**
 * Calculate earnings for a specific month
 * @param timesheets - Array of timesheet records with shift data (already flattened by server action)
 * @param year - Year to filter by
 * @param month - Month to filter by (0-11, JavaScript month indexing)
 * @returns Total earnings for the specified month
 */
export function calculateMonthlyEarnings(
  timesheets: any[],
  year: number,
  month: number
): number {
  return timesheets.reduce((total, ts) => {
    // Data is already flattened, shifts is a direct object (not array)
    if (!ts.shifts?.start_time) return total;

    const shiftDate = new Date(ts.shifts.start_time);
    if (shiftDate.getFullYear() === year && shiftDate.getMonth() === month) {
      // Only count approved and paid timesheets for earnings
      if (ts.status === 'approved' || ts.status === 'paid') {
        return total + (ts.total_pay || 0);
      }
    }
    return total;
  }, 0);
}

/**
 * Calculate all-time earnings (only approved and paid timesheets)
 * @param timesheets - Array of timesheet records
 * @returns Total lifetime earnings
 */
export function calculateAllTimeEarnings(timesheets: any[]): number {
  return timesheets.reduce((total, ts) => {
    if (ts.status === 'approved' || ts.status === 'paid') {
      return total + (ts.total_pay || 0);
    }
    return total;
  }, 0);
}
