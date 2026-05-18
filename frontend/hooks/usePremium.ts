"use client";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "momentm_premium";

interface PremiumData {
  expiresAt: string;
  email?: string;
}

function getCurrentUserEmail(): string | null {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored).email : null;
  } catch { return null; }
}

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { expiresAt, email }: PremiumData = JSON.parse(raw);
      const currentEmail = getCurrentUserEmail();
      if (!email || !currentEmail || email !== currentEmail) return;
      const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        setIsPremium(true);
        setDaysRemaining(days);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activatePremium = useCallback(() => {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const email = getCurrentUserEmail();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expiresAt, email }));
    setIsPremium(true);
    setDaysRemaining(30);
  }, []);

  return { isPremium, daysRemaining, activatePremium };
}
