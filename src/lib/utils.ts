import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
