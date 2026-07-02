import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Mux from "@mux/mux-node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use raw body for webhook verification, json for others
  app.use(express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf;
    }
  }));

  // Paystack Webhook endpoint
  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      
      if (!secret) {
        console.error("Missing PAYSTACK_SECRET_KEY");
        return res.status(500).send("Webhook secret missing");
      }

      // Verify the signature
      const hash = crypto.createHmac('sha512', secret)
                         .update((req as any).rawBody)
                         .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        console.error("Invalid Paystack signature");
        return res.status(400).send("Invalid signature");
      }

      const event = req.body;
      console.log("Paystack Webhook Event:", event.event);

      if (event.event === 'charge.success') {
        const { metadata, reference } = event.data;
        
        if (!metadata || !metadata.user_id || !metadata.course_id) {
          console.error("Missing metadata for charge.success:", event.data);
          return res.status(400).send("Missing metadata");
        }

        const userId = metadata.user_id;
        const courseId = metadata.course_id;

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.error("Missing Supabase config for webhook");
          return res.status(500).send("Database config missing");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 6 months from now
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6);

        // Insert or update enrollment
        const { error } = await supabase
          .from('enrollments')
          .insert({
            user_id: userId,
            course_id: courseId,
            expires_at: expiresAt.toISOString(),
            progress: 0,
            completed: false
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating enrollment:", error);
          return res.status(500).send("Error creating enrollment");
        }

        console.log(`Successfully enrolled user ${userId} in course ${courseId}`);
      }

      res.status(200).send("Webhook received");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Webhook error");
    }
  });

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
