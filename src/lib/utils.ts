import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirestoreErrorMessage(error: any): string {
  if (!error) return '發生未知錯誤';
  
  const code = error.code || error.message;
  
  if (code === 'resource-exhausted' || (typeof code === 'string' && code.includes('quota'))) {
    return '系統配額已達上限（每日寫入額度已滿）。請稍後再試，或聯絡管理員。';
  }
  
  if (code === 'permission-denied') {
    return '權限不足，無法執行此操作。';
  }
  
  if (code === 'unavailable') {
    return '網路連線不穩定，請檢查您的網路狀態。';
  }

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return '帳號或密碼錯誤，請重新輸入。';
  }

  if (code === 'auth/too-many-requests') {
    return '嘗試次數過多，帳號已暫時鎖定，請稍後再試。';
  }

  return error.message || '發生未知錯誤，請稍後再試。';
}
