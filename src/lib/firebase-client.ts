import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const PLACEHOLDER_TOKENS = new Set([
  "your_firebase_web_api_key",
  "your-project.firebaseapp.com",
  "your_firebase_project_id",
  "1:000000000000:web:xxxxxxxxxxxx",
]);

function isPlaceholderValue(value: string): boolean {
  if (!value) {
    return true;
  }
  return (
    PLACEHOLDER_TOKENS.has(value) ||
    value.includes("xxxxxxxx") ||
    value.startsWith("your_")
  );
}

function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
  };
}

export function getMissingFirebaseClientEnvVars(): string[] {
  const config = getFirebaseClientConfig();
  const missing: string[] = [];

  if (isPlaceholderValue(config.apiKey)) {
    missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  }
  if (isPlaceholderValue(config.authDomain)) {
    missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  }
  if (isPlaceholderValue(config.projectId)) {
    missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }
  if (isPlaceholderValue(config.appId)) {
    missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  }

  return missing;
}

export function isFirebaseClientConfigured(): boolean {
  return getMissingFirebaseClientEnvVars().length === 0;
}

let cachedAuth: Auth | null = null;

export function getFirebaseClientAuth(): Auth | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!isFirebaseClientConfigured()) {
    return null;
  }

  if (cachedAuth) {
    return cachedAuth;
  }

  const config = getFirebaseClientConfig();
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
