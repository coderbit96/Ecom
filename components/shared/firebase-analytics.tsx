"use client";

import { useEffect } from "react";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyCh1WjwtwmJRN6yUOCyanFDZifwkV8wASE",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "ecom-f1b08.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "ecom-f1b08",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "ecom-f1b08.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "54172599292",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:54172599292:web:5533dddec48bfacf63e879",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-MG6T9FW48K",
};

export function FirebaseAnalytics() {
  useEffect(() => {
    let cancelled = false;

    async function initializeFirebaseAnalytics() {
      const [{ getApp, getApps, initializeApp }, { getAnalytics, isSupported }] =
        await Promise.all([import("firebase/app"), import("firebase/analytics")]);

      if (cancelled || !(await isSupported())) return;

      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      getAnalytics(app);
    }

    initializeFirebaseAnalytics().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
