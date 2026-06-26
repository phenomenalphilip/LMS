import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Mux from "@mux/mux-node";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to get signed playback token
  app.get("/api/mux/token/:playbackId", async (req, res) => {
    try {
      const { playbackId } = req.params;
      
      let keyId = process.env.MUX_SIGNING_KEY_ID || process.env.MUX_SIGNING_KEY;
      let keySecret = process.env.MUX_SIGNING_KEY_SECRET || process.env.MUX_PRIVATE_KEY;
      
      if (keyId) {
        keyId = keyId.trim().replace(/^['"]|['"]$/g, '');
      }
      
      if (keySecret) {
        keySecret = keySecret.trim().replace(/^['"]|['"]$/g, '');
        if (!keySecret.startsWith('-----BEGIN')) {
          try {
            const decoded = Buffer.from(keySecret, 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN')) {
              console.log("Successfully decoded Base64-encoded Mux Private Key.");
              keySecret = decoded;
            }
          } catch (e) {
            console.error("Failed to decode base64 keySecret:", e);
          }
        }
      }
      
      console.log("Mux Keys Config:", { keyId, keySecret: keySecret ? "***" : undefined });
      
      if (!keyId || !keySecret || keyId === 'dummy' || keySecret === 'dummy' || keyId.includes("your_")) {
        // If no signing keys are configured, return null to fallback to public playback
        return res.json({ token: null });
      }

      // Generate the token
      // Using @mux/mux-node jwt util
      const mux = new Mux({
        tokenId: process.env.MUX_TOKEN_ID || 'dummy',
        tokenSecret: process.env.MUX_TOKEN_SECRET || 'dummy'
      });
      const token = await mux.jwt.signPlaybackId(playbackId, {
        keyId: keyId,
        keySecret: keySecret,
        type: 'video',
        expiration: '6h', // valid for 6 hours
      });

      res.json({ token });
    } catch (error: any) {
      console.error("Error generating Mux JWT:", error);
      res.status(500).json({ error: error.message || "Failed to generate signed token." });
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
    // Production asset serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
