import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Mux from "@mux/mux-node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ─── Encryption helpers (AES-256-GCM) ────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const hex = process.env.CARD_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("CARD_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16-byte auth tag
  // Format: iv(12) + authTag(16) + ciphertext — all as hex, joined by ":"
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptToken(payload: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error("Invalid encrypted token format.");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// ─── Supabase admin client (service role — bypasses RLS) ─────────────────────

function getAdminSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config.");
  return createClient(url, key);
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Raw body buffer needed for webhook signature verification
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );

  // ── Paystack Webhook ────────────────────────────────────────────────────────
  // Receives: charge.success events
  // Captures: authorization_code (reusable card token), card details
  app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) {
        console.error("Missing PAYSTACK_SECRET_KEY");
        return res.status(500).send("Webhook secret missing");
      }

      const hash = crypto
        .createHmac("sha512", secret)
        .update((req as any).rawBody)
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        console.error("Invalid Paystack signature");
        return res.status(400).send("Invalid signature");
      }

      const event = req.body;
      console.log("Paystack Webhook Event:", event.event);

      if (event.event === "charge.success") {
        const { metadata, reference, authorization, customer, amount, currency } = event.data;

        if (!metadata?.user_id || !metadata?.course_id) {
          console.error("Missing metadata:", event.data);
          return res.status(400).send("Missing metadata");
        }

        const userId: string = metadata.user_id;
        const courseId: string = metadata.course_id;
        const courseTitleMeta: string = metadata.course_title || "";

        const supabase = getAdminSupabase();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6);

        // 1. Create enrollment (idempotent)
        const { error: enrollErr } = await supabase
          .from("enrollments")
          .upsert(
            { user_id: userId, course_id: courseId, expires_at: expiresAt.toISOString(), progress: 0, completed: false },
            { onConflict: "user_id,course_id", ignoreDuplicates: true }
          );
        if (enrollErr) console.error("Enrollment error:", enrollErr);

        // 2. Record payment transaction
        const { error: txErr } = await supabase.from("payment_transactions").insert({
          user_id: userId,
          course_id: courseId,
          course_title: courseTitleMeta,
          amount: (amount || 0) / 100, // Paystack sends kobo
          currency: currency || "NGN",
          provider: "Paystack",
          reference,
          status: "success",
        });
        if (txErr) console.error("Transaction error:", txErr);

        // 3. Store encrypted authorization token + card details
        if (authorization?.authorization_code) {
          try {
            const encryptedToken = encryptToken(authorization.authorization_code);
            const last4 = authorization.last4 || null;
            const cardType = authorization.card_type || authorization.brand || "Card";
            const expiryMonth = authorization.exp_month || "";
            const expiryYear = (authorization.exp_year || "").toString().slice(-2);
            const expiry = expiryMonth && expiryYear ? `${expiryMonth.toString().padStart(2, "0")}/${expiryYear}` : null;
            const label = `${cardType} •••• ${last4 || "????"}`;

            // Upsert by user + last4 + card_type to avoid duplicates
            const { data: existing } = await supabase
              .from("payment_methods")
              .select("id")
              .eq("user_id", userId)
              .eq("card_last4", last4 || "")
              .eq("card_type", cardType)
              .limit(1);

            if (existing && existing.length > 0) {
              await supabase
                .from("payment_methods")
                .update({
                  authorization_token: encryptedToken,
                  paystack_customer_code: customer?.customer_code || null,
                  is_tokenized: true,
                  last_used_at: new Date().toISOString(),
                })
                .eq("id", existing[0].id);
            } else {
              // Check if user has any existing methods to determine default
              const { data: anyExisting } = await supabase
                .from("payment_methods")
                .select("id")
                .eq("user_id", userId)
                .limit(1);

              await supabase.from("payment_methods").insert({
                user_id: userId,
                label,
                provider: "Paystack",
                card_last4: last4,
                card_type: cardType,
                card_expiry: expiry,
                cardholder_name: customer?.name || null,
                authorization_token: encryptedToken,
                paystack_customer_code: customer?.customer_code || null,
                is_tokenized: true,
                is_default: !anyExisting || anyExisting.length === 0,
                last_used_at: new Date().toISOString(),
              });
            }
            console.log(`Tokenized Paystack card for user ${userId}: ${label}`);
          } catch (cryptoErr) {
            console.error("Token encryption error:", cryptoErr);
          }
        }

        console.log(`Paystack charge.success processed for user ${userId}, course ${courseId}`);
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("Paystack webhook error:", err);
      return res.status(500).send("Webhook error");
    }
  });

  // ── Flutterwave: Verify transaction & capture token ─────────────────────────
  // Called by frontend after Flutterwave popup success
  // Body: { transaction_id, user_id, course_id, course_title, amount, currency }
  app.post("/api/flutterwave/verify", async (req, res) => {
    try {
      const { transaction_id, user_id, course_id, course_title, amount, currency } = req.body;

      if (!transaction_id || !user_id || !course_id) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
      if (!flwSecret) {
        return res.status(500).json({ error: "Flutterwave secret not configured." });
      }

      // Call Flutterwave verify API
      const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
        headers: { Authorization: `Bearer ${flwSecret}` },
      });
      const flwData = await flwRes.json() as any;

      if (flwData.status !== "success" || flwData.data?.status !== "successful") {
        console.error("Flutterwave verification failed:", flwData);
        return res.status(400).json({ error: "Payment verification failed." });
      }

      const txData = flwData.data;
      const supabase = getAdminSupabase();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      // 1. Enrollment (idempotent)
      await supabase
        .from("enrollments")
        .upsert(
          { user_id, course_id, expires_at: expiresAt.toISOString(), progress: 0, completed: false },
          { onConflict: "user_id,course_id", ignoreDuplicates: true }
        );

      // 2. Payment transaction record
      await supabase.from("payment_transactions").insert({
        user_id,
        course_id,
        course_title: course_title || txData.meta?.course_title || "",
        amount: amount || txData.amount || 0,
        currency: currency || txData.currency || "USD",
        provider: "Flutterwave",
        reference: txData.flw_ref || txData.tx_ref || String(transaction_id),
        status: "success",
      });

      // 3. Store encrypted Flutterwave card token
      const cardData = txData.card;
      if (cardData?.token) {
        try {
          const encryptedToken = encryptToken(cardData.token);
          const last4 = cardData.last_4digits || null;
          const cardType = cardData.type || "Card";
          const expiry = cardData.expiry || null; // format: "MM/YY" from Flutterwave
          const label = `${cardType} •••• ${last4 || "????"}`;

          const { data: existing } = await supabase
            .from("payment_methods")
            .select("id")
            .eq("user_id", user_id)
            .eq("card_last4", last4 || "")
            .eq("card_type", cardType)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase
              .from("payment_methods")
              .update({
                authorization_token: encryptedToken,
                flw_transaction_id: String(transaction_id),
                is_tokenized: true,
                last_used_at: new Date().toISOString(),
              })
              .eq("id", existing[0].id);
          } else {
            const { data: anyExisting } = await supabase
              .from("payment_methods")
              .select("id")
              .eq("user_id", user_id)
              .limit(1);

            await supabase.from("payment_methods").insert({
              user_id,
              label,
              provider: "Flutterwave",
              card_last4: last4,
              card_type: cardType,
              card_expiry: expiry,
              cardholder_name: txData.customer?.name || null,
              authorization_token: encryptedToken,
              flw_transaction_id: String(transaction_id),
              is_tokenized: true,
              is_default: !anyExisting || anyExisting.length === 0,
              last_used_at: new Date().toISOString(),
            });
          }
          console.log(`Tokenized Flutterwave card for user ${user_id}: ${label}`);
        } catch (cryptoErr) {
          console.error("Token encryption error:", cryptoErr);
        }
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("Flutterwave verify error:", err);
      return res.status(500).json({ error: err.message || "Verification error." });
    }
  });

  // ── Charge saved card ───────────────────────────────────────────────────────
  // Body: { payment_method_id, course_id, course_title, amount, currency, user_id, email }
  app.post("/api/charge/saved-card", async (req, res) => {
    try {
      const { payment_method_id, course_id, course_title, amount, currency, user_id, email } = req.body;

      if (!payment_method_id || !course_id || !user_id || !email) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const supabase = getAdminSupabase();

      // Fetch payment method (service role so we get the encrypted token)
      const { data: method, error: fetchErr } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("id", payment_method_id)
        .eq("user_id", user_id) // ensure ownership
        .eq("is_tokenized", true)
        .single();

      if (fetchErr || !method) {
        return res.status(404).json({ error: "Payment method not found or not tokenized." });
      }

      // Decrypt the token
      let authToken: string;
      try {
        authToken = decryptToken(method.authorization_token);
      } catch (decryptErr) {
        console.error("Decryption error:", decryptErr);
        return res.status(500).json({ error: "Failed to decrypt payment token." });
      }

      let chargeRef = "";
      let chargeSuccess = false;

      if (method.provider === "Paystack") {
        // ── Paystack charge authorization ──
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) return res.status(500).json({ error: "Paystack not configured." });

        const chargeRes = await fetch("https://api.paystack.co/charge/authorization", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorization_code: authToken,
            email,
            amount: Math.round((amount || 0) * 100), // kobo
            currency: currency || "NGN",
            metadata: { user_id, course_id, course_title },
          }),
        });

        const chargeData = await chargeRes.json() as any;
        if (chargeData.data?.status === "success") {
          chargeSuccess = true;
          chargeRef = chargeData.data.reference;
        } else {
          console.error("Paystack saved-card charge failed:", chargeData);
          return res.status(402).json({ error: chargeData.data?.gateway_response || "Payment declined." });
        }

      } else if (method.provider === "Flutterwave") {
        // ── Flutterwave tokenized charge ──
        const flwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
        if (!flwSecret) return res.status(500).json({ error: "Flutterwave not configured." });

        const txRef = `LMS-${user_id.slice(0, 8)}-${Date.now()}`;
        const chargeRes = await fetch("https://api.flutterwave.com/v3/tokenized-charges", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${flwSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: authToken,
            email,
            currency: currency || "USD",
            amount: amount || 0,
            tx_ref: txRef,
            full_name: method.cardholder_name || "",
          }),
        });

        const chargeData = await chargeRes.json() as any;
        if (chargeData.status === "success" && chargeData.data?.status === "successful") {
          chargeSuccess = true;
          chargeRef = chargeData.data.flw_ref || txRef;
        } else {
          console.error("Flutterwave saved-card charge failed:", chargeData);
          return res.status(402).json({ error: chargeData.message || "Payment declined." });
        }
      } else {
        return res.status(400).json({ error: "Provider does not support saved-card charges." });
      }

      if (chargeSuccess) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6);

        // Create enrollment
        await supabase
          .from("enrollments")
          .upsert(
            { user_id, course_id, expires_at: expiresAt.toISOString(), progress: 0, completed: false },
            { onConflict: "user_id,course_id", ignoreDuplicates: true }
          );

        // Record transaction
        await supabase.from("payment_transactions").insert({
          user_id,
          course_id,
          course_title: course_title || "",
          amount,
          currency,
          provider: method.provider,
          reference: chargeRef,
          status: "success",
        });

        // Update last_used_at
        await supabase
          .from("payment_methods")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", payment_method_id);

        return res.json({ ok: true, reference: chargeRef });
      }

      return res.status(500).json({ error: "Charge did not complete." });
    } catch (err: any) {
      console.error("Saved card charge error:", err);
      return res.status(500).json({ error: err.message || "Charge error." });
    }
  });

  // ── Telegram Webhook ────────────────────────────────────────────────────────
  // Receives messages from Telegram Bot and saves to Supabase
  app.post("/api/webhooks/telegram", async (req, res) => {
    try {
      // Very basic security: optionally check a query param secret or check IP
      const update = req.body;
      if (!update || !update.message) {
        return res.status(200).send("OK");
      }

      const msg = update.message;
      const chatId = String(msg.chat.id);
      const messageId = String(msg.message_id);
      const text = msg.text || msg.caption;

      if (!text) return res.status(200).send("OK"); // Ignore non-text messages for now

      const supabase = getAdminSupabase();
      
      // Look up course by telegramGroupId
      // We would normally fetch this from Sanity, but for speed we might need to 
      // query Sanity directly or cache it. Since we're in the webhook, let's fetch from Sanity via API.
      const sanityUrl = `https://${process.env.VITE_SANITY_PROJECT_ID}.api.sanity.io/v2022-03-07/data/query/${process.env.VITE_SANITY_DATASET}?query=*[_type=="course"&&telegramGroupId=="${chatId}"][0]{_id}`;
      const sanityRes = await fetch(sanityUrl);
      const sanityData = await sanityRes.json() as any;
      
      if (sanityData.result && sanityData.result._id) {
        const courseId = sanityData.result._id;
        
        // Insert message
        await supabase.from("course_telegram_messages").insert({
          course_id: courseId,
          telegram_message_id: messageId,
          sender_name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Unknown",
          sender_username: msg.from.username || null,
          text_content: text,
        });
        console.log(`Saved Telegram message for course ${courseId}`);
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("Telegram webhook error:", err);
      res.status(500).send("Error processing webhook");
    }
  });

  // ── Telegram Connect ────────────────────────────────────────────────────────
  // Verifies Telegram Login Widget payload
  app.post("/api/telegram/connect", async (req, res) => {
    try {
      const { user_id, telegram_data } = req.body;
      if (!user_id || !telegram_data) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ error: "Telegram bot token not configured" });
      }

      // Verify Telegram auth data
      const { hash, ...dataToCheck } = telegram_data;
      const dataCheckString = Object.keys(dataToCheck)
        .sort()
        .map(key => `${key}=${dataToCheck[key]}`)
        .join("\n");
      
      const secretKey = crypto.createHash("sha256").update(botToken).digest();
      const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

      if (hmac !== hash) {
        return res.status(403).json({ error: "Invalid Telegram authentication" });
      }

      // Check if auth is not too old (e.g. 24 hours)
      if (Date.now() / 1000 - telegram_data.auth_date > 86400) {
        return res.status(403).json({ error: "Telegram auth data expired" });
      }

      const supabase = getAdminSupabase();
      
      // Update profile
      await supabase
        .from("profiles")
        .update({
          telegram_chat_id: String(telegram_data.id),
          telegram_username: telegram_data.username || null,
        })
        .eq("id", user_id);

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Telegram connect error:", err);
      res.status(500).json({ error: "Failed to connect Telegram" });
    }
  });

  // ── Telegram Send Message ───────────────────────────────────────────────────
  // Allows user to send a message from dashboard to the group
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { user_id, course_id, telegram_group_id, text, reply_to_message_id } = req.body;
      if (!user_id || !course_id || !telegram_group_id || !text) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) return res.status(500).json({ error: "Bot token not configured" });

      const supabase = getAdminSupabase();
      
      // Verify enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user_id)
        .eq("course_id", course_id)
        .single();
        
      if (!enrollment) {
        return res.status(403).json({ error: "Not enrolled in this course" });
      }

      // Get user profile for name prefixing
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, telegram_username")
        .eq("id", user_id)
        .single();

      const senderName = profile?.full_name || "A Learner";
      const messageText = `💬 *${senderName}* says:\n\n${text}`;

      // Call Telegram API to send message
      const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const payload: any = {
        chat_id: telegram_group_id,
        text: messageText,
        parse_mode: "Markdown",
      };
      
      if (reply_to_message_id) {
        payload.reply_to_message_id = parseInt(reply_to_message_id, 10);
      }

      const tgRes = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const tgData = await tgRes.json() as any;
      if (!tgData.ok) {
        console.error("Telegram API Error:", tgData);
        return res.status(500).json({ error: "Failed to send to Telegram" });
      }

      // We don't need to manually insert into course_telegram_messages here
      // because our webhook will receive the message we just sent!
      // But we CAN insert it to show it immediately.
      await supabase.from("course_telegram_messages").insert({
        course_id: course_id,
        telegram_message_id: String(tgData.result.message_id),
        sender_name: senderName,
        sender_username: profile?.telegram_username,
        text_content: text, // Store the raw text without the "X says:" prefix locally if we want
      });

      res.json({ ok: true, message: tgData.result });
    } catch (err: any) {
      console.error("Telegram send error:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ── Mux signed token ────────────────────────────────────────────────────────
  app.get("/api/mux/token/:playbackId", async (req, res) => {
    try {
      const { playbackId } = req.params;

      let keyId = process.env.MUX_SIGNING_KEY_ID || process.env.MUX_SIGNING_KEY;
      let keySecret = process.env.MUX_SIGNING_KEY_SECRET || process.env.MUX_PRIVATE_KEY;

      if (keyId) keyId = keyId.trim().replace(/^['\"]|['\"]$/g, "");
      if (keySecret) {
        keySecret = keySecret.trim().replace(/^['\"]|['\"]$/g, "");
        if (!keySecret.startsWith("-----BEGIN")) {
          try {
            const decoded = Buffer.from(keySecret, "base64").toString("utf8");
            if (decoded.includes("-----BEGIN")) {
              console.log("Successfully decoded Base64-encoded Mux Private Key.");
              keySecret = decoded;
            }
          } catch (e) {
            console.error("Failed to decode base64 keySecret:", e);
          }
        }
      }

      console.log("Mux Keys Config:", { keyId, keySecret: keySecret ? "***" : undefined });

      if (!keyId || !keySecret || keyId === "dummy" || keySecret === "dummy" || keyId.includes("your_")) {
        return res.json({ token: null });
      }

      const mux = new Mux({
        tokenId: process.env.MUX_TOKEN_ID || "dummy",
        tokenSecret: process.env.MUX_TOKEN_SECRET || "dummy",
      });
      const token = await mux.jwt.signPlaybackId(playbackId, {
        keyId,
        keySecret,
        type: "video",
        expiration: "6h",
      });

      res.json({ token });
    } catch (error: any) {
      console.error("Error generating Mux JWT:", error);
      res.status(500).json({ error: error.message || "Failed to generate signed token." });
    }
  });

  // ── Vite / static ───────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
