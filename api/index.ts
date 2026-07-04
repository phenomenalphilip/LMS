import express from "express";
import crypto from "crypto";
import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";


const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));

app.post("/api/webhooks/paystack", async (req, res) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      
      if (!secret) {
        console.error("Missing PAYSTACK_SECRET_KEY");
        return res.status(500).send("Webhook secret missing");
      }

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

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6);

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

app.get("/api/mux/token/:playbackId", async (req, res) => {
    try {
      const { playbackId } = req.params;
      
      let keyId = process.env.MUX_SIGNING_KEY_ID || process.env.MUX_SIGNING_KEY;
      let keySecret = process.env.MUX_SIGNING_KEY_SECRET || process.env.MUX_PRIVATE_KEY;
      
      if (keyId) keyId = keyId.trim().replace(/^['"]|['"]$/g, '');
      if (keySecret) {
        keySecret = keySecret.trim().replace(/^['"]|['"]$/g, '');
        if (!keySecret.startsWith('-----BEGIN')) {
          try {
            const decoded = Buffer.from(keySecret, 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN')) keySecret = decoded;
          } catch (e) {
            console.error("Failed to decode base64 keySecret:", e);
          }
        }
      }
      
      if (!keyId || !keySecret || keyId === 'dummy' || keySecret === 'dummy' || keyId.includes("your_")) {
        return res.json({ token: null });
      }

      const mux = new Mux({
        tokenId: process.env.MUX_TOKEN_ID || 'dummy',
        tokenSecret: process.env.MUX_TOKEN_SECRET || 'dummy'
      });

      const token = await mux.jwt.signPlaybackId(playbackId, {
        keyId: keyId,
        keySecret: keySecret,
        type: 'video',
        expiration: '6h',
      });

      res.json({ token });
    } catch (error: any) {
      console.error("Error generating Mux JWT:", error);
      res.status(500).json({ error: error.message || "Failed to generate signed token." });
    }
});

function getAdminSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing Supabase URL config. Ensure VITE_SUPABASE_URL is set.");
  if (!key) throw new Error("Missing Supabase Service Role Key. Ensure SUPABASE_SERVICE_ROLE_KEY is set.");
  console.log("Admin Supabase key prefix:", key.substring(0, 20)); // Debug: confirm it's service_role
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Telegram Webhook ────────────────────────────────────────────────────────
app.post("/api/webhooks/telegram", async (req, res) => {
  try {
    const update = req.body;
    if (!update || !update.message) {
      return res.status(200).send("OK");
    }

    const msg = update.message;
    const chatId = String(msg.chat.id);
    const messageId = String(msg.message_id);
    const text = msg.text || msg.caption;

    if (!text) return res.status(200).send("OK");

    const supabase = getAdminSupabase();
    
    const sanityUrl = `https://${process.env.VITE_SANITY_PROJECT_ID}.api.sanity.io/v2022-03-07/data/query/${process.env.VITE_SANITY_DATASET}?query=*[_type=="course"&&telegramGroupId=="${chatId}"][0]{_id}`;
    const sanityRes = await fetch(sanityUrl);
    const sanityData = await sanityRes.json() as any;
    
    if (sanityData.result && sanityData.result._id) {
      const courseId = sanityData.result._id;
      
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
// Verifies standard Telegram widget HMAC payload (data-onauth)
app.post("/api/telegram/connect", async (req, res) => {
  try {
    const { user_id, telegram_data } = req.body;
    if (!user_id || !telegram_data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: "Bot token not configured" });

    // Validate the hash using HMAC SHA256
    const secret = crypto.createHash('sha256').update(botToken).digest();
    const dataCheckArr: string[] = [];
    
    for (const key of Object.keys(telegram_data)) {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${telegram_data[key]}`);
      }
    }
    
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');
    const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (hash !== telegram_data.hash) {
      console.error("Telegram hash mismatch");
      return res.status(403).json({ error: "Invalid Telegram authentication" });
    }

    const supabase = getAdminSupabase();

    // Use upsert: update if row exists, insert if not
    const { error: dbError } = await supabase
      .from("profiles")
      .upsert({
        id: user_id,
        telegram_chat_id: String(telegram_data.id),
        telegram_username: telegram_data.username || null,
      }, { onConflict: "id" });

    if (dbError) {
      console.error("Supabase upsert error:", JSON.stringify(dbError));
      // Return the real error so we can diagnose it
      return res.status(500).json({
        error: `Database error: ${dbError.message} (code: ${dbError.code})`,
      });
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram connect error:", err);
    res.status(500).json({ error: err.message || "Failed to connect Telegram" });
  }
});

// ── Telegram Send Message ───────────────────────────────────────────────────
app.post("/api/telegram/send", async (req, res) => {
  try {
    const { user_id, course_id, telegram_group_id, text, reply_to_message_id } = req.body;
    if (!user_id || !course_id || !telegram_group_id || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: "Bot token not configured" });

    const supabase = getAdminSupabase();
    
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user_id)
      .eq("course_id", course_id)
      .single();
      
    if (!enrollment) {
      return res.status(403).json({ error: "Not enrolled in this course" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, telegram_username")
      .eq("id", user_id)
      .single();

    const senderName = profile?.full_name || "A Learner";
    const messageText = `💬 *${senderName}* says:\n\n${text}`;

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

    await supabase.from("course_telegram_messages").insert({
      course_id: course_id,
      telegram_message_id: String(tgData.result.message_id),
      sender_name: senderName,
      sender_username: profile?.telegram_username,
      text_content: text,
    });

    res.json({ ok: true, message: tgData.result });
  } catch (err: any) {
    console.error("Telegram send error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default app;
