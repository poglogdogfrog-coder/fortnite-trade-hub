import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, statusCode = 200, message = 'Success') => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const sendError = (res: Response, statusCode = 500, message = 'Internal Server Error', error?: any) => {
  res.status(statusCode).json({
    status: 'error',
    message,
    error: error?.message || undefined,
    timestamp: new Date().toISOString(),
  });
};

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .trim()
    .replace(/[<>"'&]/g, (char) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;',
      };
      return escapeMap[char];
    });
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const truncateString = (str: string, length: number): string => {
  return str.length > length ? str.substring(0, length) + '...' : str;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateTrustDecay = (lastActivityDays: number): number => {
  const decayFactor = 0.95;
  return Math.pow(decayFactor, Math.min(lastActivityDays / 30, 12));
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
