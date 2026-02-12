/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function splitCamelCaseToWords(input: string): string {
  if (input === 'createdAt') {
    return 'Created On';
  }
  if (input === 'daysSinceCreated') {
    return 'Days Pending';
  }
  // Insert space before each uppercase letter except the first character
  const result = input.replace(/([A-Z])/g, ' $1');
  // Capitalize the first letter of each word
  return result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDateString(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',

    day: '2-digit',
  };
  return date.toLocaleDateString(undefined, options);
}

export function removeColumnsFromJsonArray<T extends Record<string, any>>(
  data: T[],
  keysToRemove: (keyof T)[]
): Partial<T>[] {
  return data.map(item => {
    const newItem = { ...item };
    keysToRemove.forEach(key => {
      delete newItem[key]; // Remove the key from the new object
    });
    return newItem;
  });
}

export function extractUniqueValues<T extends Record<string, any>>(data: T[], key: keyof T): string[] {
  const uniqueValues = new Set<string>();

  data.forEach(item => {
    const value = item[key];
    if (typeof value === 'string') {
      uniqueValues.add(value);
    }
  });

  return Array.from(uniqueValues);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
