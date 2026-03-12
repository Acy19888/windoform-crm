// api/track.js – Email open tracking pixel
// Returns a 1x1 transparent GIF and logs the open event

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, updateDoc, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

let db;
if (firebaseConfig.projectId) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export default async function handler(req, res) {
  const { id } = req.query; // email/deal ID

  // Log the open event
  if (id && db) {
    try {
      await updateDoc(doc(db, "crm_email_tracking", id), {
        opens: arrayUnion({
          at: new Date().toISOString(),
          ip: req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown",
          ua: (req.headers["user-agent"] || "").substring(0, 200),
        }),
        lastOpenedAt: new Date().toISOString(),
        openCount: (await import("firebase/firestore")).increment(1),
      }).catch(async () => {
        // Document might not exist yet, create it
        const { setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "crm_email_tracking", id), {
          opens: [{ at: new Date().toISOString(), ip: req.headers["x-forwarded-for"] || "unknown", ua: (req.headers["user-agent"] || "").substring(0, 200) }],
          lastOpenedAt: new Date().toISOString(),
          openCount: 1,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      console.error("Tracking error:", err.message);
    }
  }

  // Return tracking pixel
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.status(200).end(PIXEL);
}
