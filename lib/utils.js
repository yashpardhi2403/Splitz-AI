import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupees (₹)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, decimals = 2) {
  if (amount === null || amount === undefined) {
    return `₹0.${'0'.repeat(decimals)}`;
  }
  return `₹${Number(amount).toFixed(decimals)}`;
}
