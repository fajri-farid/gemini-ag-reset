import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getFirebaseAdminEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? "";
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim() ?? "";
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function isFirebaseAdminConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = getFirebaseAdminEnv();
  return Boolean(projectId && clientEmail && privateKey);
}

export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const { projectId, clientEmail, privateKey } = getFirebaseAdminEnv();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured in environment variables.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
