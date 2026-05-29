"use client";

import { useEffect } from "react";

import { getFirebaseApp } from "@/lib/firebase-client";

export function FirebaseAnalytics() {
  useEffect(() => {
    let cancelled = false;

    async function initializeFirebaseAnalytics() {
      const { getAnalytics, isSupported } = await import("firebase/analytics");

      if (cancelled || !(await isSupported())) return;

      getAnalytics(getFirebaseApp());
    }

    initializeFirebaseAnalytics().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
