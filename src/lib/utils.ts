import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility type to extract only the non-optional (required) keys from a type T.
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

/**
 * Validates a Partial<T> object to ensure all required keys are present and not empty.
 * Enforces at compile-time that ALL required keys of T must be explicitly checked.
 * Returns the object cast as the full type T. Throws an error if required fields are absent.
 */
export function validateFormData<T extends object>(
  data: Partial<T>,
  requiredKeysMap: Record<RequiredKeys<T>, true>
): T {
  for (const key of Object.keys(requiredKeysMap) as Array<keyof T>) {
    const value = data[key]
    if (value === undefined || value === null || value === '') {
      throw new Error(`שדה חובה חסר: ${String(key)}`)
    }
  }
  return data as T
}
