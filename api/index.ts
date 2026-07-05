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
        .upsert({
          user_id: userId,
          course_id: courseId,
          expires_at: expiresAt.toISOString(),
          progress: 0,
          completed: false
        }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });

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
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Sanity Webhook ────────────────────────────────────────────────────────
app.post("/api/webhooks/sanity", async (req, res) => {
  try {
    const { _id, _type, title, description, telegramGroupId, telegramGroupLink } = req.body;

    // We only care about courses
    if (_type !== "course") {
      return res.status(200).send("Ignored");
    }

    if (!_id || !title) {
      return res.status(400).json({ error: "Missing _id or title" });
    }

    const supabase = getAdminSupabase();

    // Upsert the community
    const { error } = await supabase.from("communities").upsert({
      course_id: _id,
      slug: `course-${_id}`,
      name: title,
      description: description || null,
      community_type: 'COURSE',
      telegram_chat_id: telegramGroupId ? String(telegramGroupId) : null,
      telegram_invite_link: telegramGroupLink || null,
      is_active: true
    }, { onConflict: "slug" });

    if (error) {
      console.error("Sanity Webhook Upsert Error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`Sanity Webhook: Upserted course community for ${_id}`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Sanity Webhook Error:", error);
    res.status(500).send("Webhook processing failed");
  }
});

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

    console.log(`Telegram webhook: chatId=${chatId}, text="${text?.substring(0, 50)}"`);

    if (!text) return res.status(200).send("OK");

    const supabase = getAdminSupabase();

    const { data: matchedCommunities, error: lookupError } = await supabase
      .from('communities')
      .select('id')
      .eq('telegram_chat_id', chatId);

    if (lookupError) {
      console.error(`Communities lookup failed for chatId="${chatId}":`, JSON.stringify(lookupError));
      return res.status(200).send("OK"); // ack to Telegram; do not retry on DB error
    }

    if (matchedCommunities && matchedCommunities.length > 0) {
      for (const community of matchedCommunities) {
        // Attempt to derive channel from reply thread scoped to this community
        let derivedChannel = 'general';

        if (msg.reply_to_message && msg.reply_to_message.message_id) {
          const { data: parentMsg } = await supabase
            .from('community_messages')
            .select('channel_name')
            .eq('telegram_message_id', String(msg.reply_to_message.message_id))
            .eq('community_id', community.id)
            .single();
          if (parentMsg && parentMsg.channel_name) {
            derivedChannel = parentMsg.channel_name;
          }
        }

        // Fallback to hashtag matching if not a reply
        if (derivedChannel === 'general' && text) {
          const validChannels = [
            'overview', 'announcements', 'networking', 'opportunities', 'events',
            'wins', 'ask-the-community', 'members', 'discussion', 'resources',
            'assignments', 'live-qa'
          ];
          const lowerText = text.toLowerCase();
          for (const ch of validChannels) {
            if (lowerText.includes(`#${ch.replace(/-/g, '')}`) || lowerText.includes(`#${ch}`)) {
              derivedChannel = ch; break;
            }
          }
        }

        const { error: insertErr } = await supabase.from("community_messages").upsert({
          community_id: community.id,
          provider: 'TELEGRAM',
          telegram_message_id: messageId,
          sender_name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Unknown",
          sender_username: msg.from.username || null,
          content: text,
          channel_name: derivedChannel
        }, { onConflict: 'community_id,provider,channel_name,telegram_message_id', ignoreDuplicates: true });

        if (insertErr) {
          console.error(`Failed to save Telegram message for community ${community.id}:`, JSON.stringify(insertErr));
        } else {
          console.log(`Saved Telegram message for community ${community.id}`);
        }
      }
    } else {
      console.warn(`No community found in Supabase for telegram_chat_id="${chatId}"`);
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

    const { error: dbError } = await supabase
      .from("profiles")
      .upsert({
        id: user_id,
        telegram_chat_id: String(telegram_data.id),
        telegram_username: telegram_data.username || null,
      }, { onConflict: "id" });

    if (dbError) {
      console.error("Supabase upsert error:", JSON.stringify(dbError));
      console.error("Telegram connect DB error:", dbError);
      return res.status(500).json({ error: "Failed to save Telegram connection. Please try again later." });
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
    let { user_id, community_id, text, reply_to_message_id, channel_name } = req.body;
    if (!user_id || !community_id || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const normalizedChannel = (channel_name || 'general').trim().toLowerCase();
    const validChannels = [
      'overview', 'announcements', 'networking', 'opportunities', 'events',
      'wins', 'ask-the-community', 'members', 'discussion', 'resources',
      'assignments', 'live-qa', 'general'
    ];

    if (!validChannels.includes(normalizedChannel)) {
      return res.status(400).json({ error: "Invalid channel name" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: "Bot token not configured" });

    const supabase = getAdminSupabase();

    // Verify membership
    const { data: member } = await supabase
      .from("community_members")
      .select("id, role")
      .eq("user_id", user_id)
      .eq("community_id", community_id)
      .single();

    if (!member) {
      return res.status(403).json({ error: "Not a member of this community" });
    }

    const isAdminOnlyTab = ['announcements', 'events', 'assignments'].includes(normalizedChannel);
    if (isAdminOnlyTab && member.role !== 'ADMIN') {
      return res.status(403).json({ error: "Only admins can post in this channel" });
    }

    // Get community details
    const { data: community } = await supabase
      .from("communities")
      .select("telegram_chat_id")
      .eq("id", community_id)
      .single();

    if (!community || !community.telegram_chat_id) {
      return res.status(400).json({ error: "Community is not linked to a Telegram group" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, telegram_username")
      .eq("id", user_id)
      .single();

    const senderName = profile?.full_name || "A Learner";
    const messageText = `💬 *${senderName}* says:\n\n${text}`;

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: community.telegram_chat_id,
        text: messageText,
        parse_mode: "Markdown",
        ...(reply_to_message_id && { reply_to_message_id: parseInt(reply_to_message_id, 10) })
      }),
    });

    const tgData = await tgRes.json() as any;
    if (!tgData.ok) {
      console.error("Telegram API Error:", tgData);
      return res.status(500).json({ error: "Failed to send to Telegram" });
    }

    const { error: insertError } = await supabase.from("community_messages").insert({
      community_id: community_id,
      provider: 'TELEGRAM',
      telegram_message_id: String(tgData.result.message_id),
      sender_name: senderName,
      sender_username: profile?.telegram_username,
      content: text,
      channel_name: normalizedChannel
    });

    if (insertError) {
      console.error("Failed to insert Telegram message:", insertError);
      return res.status(500).json({ error: "Message sent but failed to save to database" });
    }

    res.json({ ok: true, message: tgData.result });
  } catch (err: any) {
    console.error("Telegram send error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default app;
