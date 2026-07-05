import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Polyfill WebSocket for Node 20 to avoid Supabase initialization error
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase configuration.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sanityProjectId = process.env.VITE_SANITY_PROJECT_ID || 'wj0t8ags';
const sanityDataset = process.env.VITE_SANITY_DATASET || 'production';
const sanityQuery = encodeURIComponent('*[_type == "course"]{_id, title, description, telegramGroupId, telegramGroupLink}');
const sanityUrl = `https://${sanityProjectId}.api.sanity.io/v2022-03-07/data/query/${sanityDataset}?query=${sanityQuery}`;

async function run() {
  console.log('--- Starting Community Migration ---');

  // 1. Create PDS Academy Network
  console.log('1. Creating PDS Academy Network...');
  const { data: network, error: netErr } = await supabase.from('communities').upsert({
    slug: 'pds-academy-network',
    name: 'PDS Academy Network',
    description: 'The central hub for all paying learners of PDS Academy.',
    community_type: 'GENERAL',
    is_active: true
  }, { onConflict: 'slug' }).select().single();

  if (netErr) throw new Error(`Failed to create network: ${JSON.stringify(netErr)}`);
  console.log(`✅ Network created: ${network.id}`);

  // 2. Fetch Sanity Courses
  console.log('2. Fetching courses from Sanity...');
  const sanityRes = await fetch(sanityUrl);
  const sanityData = await sanityRes.json();
  const courses = sanityData.result;
  console.log(`Found ${courses.length} courses in Sanity.`);

  // 3. Create Course Communities
  const courseCommunityMap: Record<string, string> = {};
  for (const course of courses) {
    const slug = `course-${course._id}`;
    const { data: cComm, error: cErr } = await supabase.from('communities').upsert({
      slug,
      name: course.title,
      description: course.description?.substring(0, 200),
      community_type: 'COURSE',
      course_id: course._id,
      telegram_chat_id: course.telegramGroupId ? String(course.telegramGroupId) : null,
      telegram_invite_link: course.telegramGroupLink || null,
      is_active: true
    }, { onConflict: 'slug' }).select().single();

    if (cErr) throw new Error(`Failed to create course community: ${JSON.stringify(cErr)}`);
    courseCommunityMap[course._id] = cComm.id;
    console.log(`✅ Created course community: ${cComm.name}`);
  }

  // 4. Migrate Messages
  console.log('3. Migrating legacy messages...');
  const { data: legacyMessages, error: msgErr } = await supabase
    .from('course_telegram_messages')
    .select('*');
  
  if (msgErr) {
    console.warn(`Could not fetch legacy messages (maybe table doesn't exist yet): ${msgErr.message}`);
  } else if (legacyMessages && legacyMessages.length > 0) {
    console.log(`Found ${legacyMessages.length} legacy messages to migrate.`);
    let migratedCount = 0;
    for (const msg of legacyMessages) {
      const commId = courseCommunityMap[msg.course_id];
      if (!commId) continue;
      
      const { error: insErr } = await supabase.from('community_messages').upsert({
        community_id: commId,
        provider: 'TELEGRAM',
        telegram_message_id: msg.telegram_message_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        sender_username: msg.sender_username,
        content: msg.text_content,
        created_at: msg.created_at
      }, { onConflict: 'community_id, provider, telegram_message_id', ignoreDuplicates: true });

      if (!insErr) migratedCount++;
    }
    console.log(`✅ Migrated ${migratedCount} messages.`);
  }

  // 5. Backfill Enrollments
  console.log('4. Backfilling enrollments into community_members...');
  const { data: enrollments, error: enrErr } = await supabase.from('enrollments').select('user_id, course_id');
  if (enrErr) throw new Error(`Failed to fetch enrollments: ${JSON.stringify(enrErr)}`);
  
  let memberCount = 0;
  for (const enr of enrollments) {
    // Add to general network
    await supabase.from('community_members').upsert({
      community_id: network.id,
      user_id: enr.user_id,
      role: 'MEMBER'
    }, { onConflict: 'community_id, user_id', ignoreDuplicates: true });
    memberCount++;

    // Add to course community
    const commId = courseCommunityMap[enr.course_id];
    if (commId) {
      await supabase.from('community_members').upsert({
        community_id: commId,
        user_id: enr.user_id,
        role: 'MEMBER'
      }, { onConflict: 'community_id, user_id', ignoreDuplicates: true });
      memberCount++;
    }
  }
  console.log(`✅ Assigned ${memberCount} community memberships based on past enrollments.`);

  console.log('--- Migration Complete ---');
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
