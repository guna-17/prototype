/**
 * Authentication and Validation Utilities for SmartGST ERP
 */

import { UserRole } from '../types/erp';

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: UserRole;
  godownAccess?: string;
  companyName?: string;
  companyGstin?: string;
}

/**
 * Validate Karnataka GSTIN format:
 * Must start with state code '29', followed by 10-char PAN, 1 entity digit, 'Z', and 1 checksum char.
 * Total 15 alphanumeric characters.
 */
export function isValidKarnatakaGstin(gstin: string): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toUpperCase();
  const karnatakaGstinRegex = /^29[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return karnatakaGstinRegex.test(clean);
}

/**
 * Validate standard email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password requirements (minimum 6 characters)
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { valid: true };
}

/**
 * Validate full sign up form payload
 */
export function validateSignupInput(input: SignupInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  if (!isValidEmail(input.email)) {
    errors.push('Please provide a valid business email address.');
  }

  const pwdCheck = validatePassword(input.password);
  if (!pwdCheck.valid && pwdCheck.error) {
    errors.push(pwdCheck.error);
  }

  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    errors.push('Passwords do not match.');
  }

  if (input.companyGstin && input.companyGstin.trim().length > 0) {
    if (!isValidKarnatakaGstin(input.companyGstin)) {
      errors.push('Company GSTIN must be a valid 15-character Karnataka GSTIN starting with 29 (e.g., 29ABCDE1234F1Z5).');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
