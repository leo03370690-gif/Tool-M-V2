import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
admin.initializeApp({
  projectId: "ai-studio-applet-webapp-78f12"
});

const db = getFirestore(admin.app());
const authAdmin = getAuth();

console.log("Firebase Admin initialized with default credentials");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Admin
  const verifyAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await authAdmin.verifyIdToken(idToken);
      console.log("Decoded Token Email:", decodedToken.email);
      console.log("Decoded Token UID:", decodedToken.uid);
      
      const isAdminByEmail = decodedToken.email === "leo03370690@gmail.com" || decodedToken.email === "leo.lo@tooling.local";
      
      if (isAdminByEmail) {
        (req as any).adminUser = decodedToken;
        return next();
      }

      let userDoc;
      try {
        userDoc = await db.collection("users").doc(decodedToken.uid).get();
      } catch (fsError: any) {
        console.error("Firestore Read Error in verifyAdmin:", fsError.message);
        return res.status(500).json({ error: `Firestore error: ${fsError.message}` });
      }
      
      if (!userDoc.exists || userDoc.data()?.role !== "admin") {
        console.warn(`Access denied for user ${decodedToken.email}: Not an admin`);
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      
      (req as any).adminUser = decodedToken;
      next();
    } catch (error: any) {
      console.error("Auth Error:", error.message);
      res.status(401).json({ error: `Invalid token: ${error.message}` });
    }
  };

  // API to create a new user
  app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Create user in Firebase Auth
      const userRecord = await authAdmin.createUser({
        email,
        password,
        displayName: username,
      });

      // 2. Create user document in Firestore
      console.log("Attempting to create user document in Firestore for UID:", userRecord.uid);
      await db.collection("users").doc(userRecord.uid).set({
        username,
        email,
        role,
        createdAt: new Date().toISOString()
      });
      console.log("User document created successfully");

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Create User Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to update user Auth (Email/Password)
  app.post("/api/admin/update-user", verifyAdmin, async (req, res) => {
    const { uid, email, password, role } = req.body;
    if (!uid) return res.status(400).json({ error: "UID is required" });

    try {
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No update data provided" });
      }

      await authAdmin.updateUser(uid, updateData);
      
      // Update Firestore if email or role changed
      const firestoreUpdate: any = {};
      if (email) firestoreUpdate.email = email;
      if (role) firestoreUpdate.role = role;

      if (Object.keys(firestoreUpdate).length > 0) {
        await db.collection("users").doc(uid).update(firestoreUpdate);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Update User Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to delete a user
  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "UID is required" });

    try {
      // 1. Delete from Firebase Auth
      await authAdmin.deleteUser(uid);
      
      // 2. Delete from Firestore
      await db.collection("users").doc(uid).delete();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete User Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
