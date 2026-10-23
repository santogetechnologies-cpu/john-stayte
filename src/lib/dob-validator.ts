/**
 * Date of Birth Validation & Age Gate Utility
 *
 * Accurately validates date components and verifies that the individual
 * is at least 18 years of age based on the current calendar date,
 * strictly handling calendar validity, leap years (February 29), and future dates.
 */

export interface DobValidationResult {
  valid: boolean;
  age?: number;
  error?: string;
}

export function validateDob(
  yearStr: string,
  monthStr: string,
  dayStr: string,
  today: Date = new Date(),
): DobValidationResult {
  const trimmedYear = yearStr?.trim();
  const trimmedMonth = monthStr?.trim();
  const trimmedDay = dayStr?.trim();

  if (!trimmedYear || !trimmedMonth || !trimmedDay) {
    return {
      valid: false,
      error: "Please enter your complete date of birth.",
    };
  }

  const year = parseInt(trimmedYear, 10);
  const month = parseInt(trimmedMonth, 10);
  const day = parseInt(trimmedDay, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12) {
    return {
      valid: false,
      error: "Please enter a valid date of birth.",
    };
  }

  // Check valid days in the selected month & year (accounting for leap years)
  // In JS, new Date(year, monthIndex, 0) gives the last day of monthIndex (where monthIndex is 1-12)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      valid: false,
      error: "Please enter a valid calendar date.",
    };
  }

  if (year < 1900) {
    return {
      valid: false,
      error: "Please enter a realistic birth year.",
    };
  }

  const birthDate = new Date(year, month - 1, day);

  // Reject future dates (normalized to start of day)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (birthDate.getTime() > todayStart.getTime()) {
    return {
      valid: false,
      error: "Date of birth cannot be in the future.",
    };
  }

  // Calculate age accurately taking birthday occurrence into account
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayDay = today.getDate();

  let age = todayYear - year;
  const hasHadBirthdayThisYear =
    todayMonth > month || (todayMonth === month && todayDay >= day);

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  if (age < 18) {
    return {
      valid: false,
      age,
      error: "You must be at least 18 years old to create an account.",
    };
  }

  return {
    valid: true,
    age,
  };
}

export const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function getBirthYears(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 120 }, (_, i) => currentYear - i);
}
