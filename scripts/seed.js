/**
 * FoundX seed script
 * ------------------
 * Creates the demo accounts and at least 10 sample item records required by
 * the project brief. Run once after the SQL migrations:
 *
 *     npm run seed
 *
 * It is idempotent: re-running resets the demo listings.
 */
import 'dotenv/config';
import { supabaseAdmin } from '../src/config/supabase.js';

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'FoundX@2026';

const USERS = [
  {
    email: 'admin@foundx.edu',
    full_name: 'Dr. Rupam Sah',
    roll_number: null,
    department: 'School of Computing and Data Science',
    phone: '+91 90000 00001',
    role: 'admin',
  },
  {
    email: 'sai.tagore@foundx.edu',
    full_name: 'Jammala Saitagore',
    roll_number: '23BCS1042',
    department: 'B.Tech CSE',
    phone: '+91 90000 00002',
    role: 'student',
  },
  {
    email: 'ananya.rao@foundx.edu',
    full_name: 'Ananya Rao',
    roll_number: '23BCS1088',
    department: 'B.Tech CSE',
    phone: '+91 90000 00003',
    role: 'student',
  },
  {
    email: 'vikram.nair@foundx.edu',
    full_name: 'Vikram Nair',
    roll_number: '22BCS0713',
    department: 'B.Tech CSE (Data Science)',
    phone: '+91 90000 00004',
    role: 'student',
  },
];

const ITEMS = [
  {
    owner: 'sai.tagore@foundx.edu',
    category: 'electronics',
    title: 'Black Dell Inspiron laptop bag with charger',
    description:
      'Left my black Dell laptop bag near the second-floor reading room of the Central Library. Contains the laptop charger, a blue notebook and a USB mouse.',
    listing_type: 'lost',
    status: 'open',
    location: 'Central Library, 2nd floor reading room',
    campus_building: 'Central Library',
    event_date: '2026-11-18',
    image_url: 'https://picsum.photos/seed/foundx-laptop/640/480',
    contact_info: 'Call or WhatsApp +91 90000 00002',
  },
  {
    owner: 'ananya.rao@foundx.edu',
    category: 'keys-wallets',
    title: 'Brown leather wallet found near canteen counter',
    description:
      'Found a brown leather wallet with a college ID inside while paying at the canteen. Handed to the security desk, please claim with details.',
    listing_type: 'found',
    status: 'open',
    location: 'Canteen / Food Court, billing counter 2',
    campus_building: 'Canteen / Food Court',
    event_date: '2026-11-20',
    image_url: 'https://picsum.photos/seed/foundx-wallet/640/480',
    contact_info: 'Message me here to arrange pickup',
  },
  {
    owner: 'vikram.nair@foundx.edu',
    category: 'documents',
    title: 'College ID card - 22BCS0713 lost at bus bay',
    description:
      'Lost my student ID card somewhere between the bus bay and Academic Block B on Monday morning. Card has a blue lanyard attached.',
    listing_type: 'lost',
    status: 'open',
    location: 'Bus Bay to Academic Block B',
    campus_building: 'Bus Bay',
    event_date: '2026-11-16',
    image_url: null,
    contact_info: 'Email vikram.nair@foundx.edu',
  },
  {
    owner: 'ananya.rao@foundx.edu',
    category: 'electronics',
    title: 'White wired earphones in a small pouch',
    description:
      'Found white wired earphones inside a small grey pouch on the bench outside the CS lab. Pouch also has a 16GB pen drive.',
    listing_type: 'found',
    status: 'open',
    location: 'Bench outside Computer Science Lab',
    campus_building: 'Computer Science Lab',
    event_date: '2026-11-19',
    image_url: 'https://picsum.photos/seed/foundx-earphones/640/480',
    contact_info: 'Reply through the claim form',
  },
  {
    owner: 'sai.tagore@foundx.edu',
    category: 'bottles',
    title: 'Blue Milton water bottle with name sticker',
    description:
      'Left a blue Milton 1 litre bottle in the Sports Complex gallery after the inter-department match. It has a name sticker on the base.',
    listing_type: 'lost',
    status: 'open',
    location: 'Sports Complex, gallery seating',
    campus_building: 'Sports Complex',
    event_date: '2026-11-21',
    image_url: null,
    contact_info: '+91 90000 00002',
  },
  {
    owner: 'vikram.nair@foundx.edu',
    category: 'bags',
    title: 'Grey Wildcraft backpack found in auditorium',
    description:
      'A grey Wildcraft backpack was left behind after the tech talk in the auditorium. Contains two textbooks and a geometry box.',
    listing_type: 'found',
    status: 'claimed',
    location: 'Auditorium, row F',
    campus_building: 'Auditorium',
    event_date: '2026-11-14',
    image_url: 'https://picsum.photos/seed/foundx-backpack/640/480',
    contact_info: 'Deposited with the auditorium in-charge',
  },
  {
    owner: 'ananya.rao@foundx.edu',
    category: 'books',
    title: 'Data Structures textbook (Cormen) with yellow notes',
    description:
      'Lost my copy of Introduction to Algorithms. It has yellow sticky notes on the graph chapters and my roll number on the inside cover.',
    listing_type: 'lost',
    status: 'open',
    location: 'Academic Block A, room 204',
    campus_building: 'Academic Block A',
    event_date: '2026-11-17',
    image_url: null,
    contact_info: 'Message me here',
  },
  {
    owner: 'sai.tagore@foundx.edu',
    category: 'sports',
    title: 'SG cricket bat found at the practice nets',
    description:
      'Found an SG cricket bat with a red grip at the practice nets after evening practice. Kept it with the sports room attendant.',
    listing_type: 'found',
    status: 'resolved',
    location: 'Sports Complex practice nets',
    campus_building: 'Sports Complex',
    event_date: '2026-11-12',
    image_url: 'https://picsum.photos/seed/foundx-bat/640/480',
    contact_info: 'Collected by the owner on 15 Nov',
  },
  {
    owner: 'vikram.nair@foundx.edu',
    category: 'clothing',
    title: 'Navy blue hoodie left in Academic Block B',
    description:
      'A navy blue hoodie was left on a chair in room 108 after the afternoon lecture. Size M, with a small tear on the left sleeve.',
    listing_type: 'found',
    status: 'open',
    location: 'Academic Block B, room 108',
    campus_building: 'Academic Block B',
    event_date: '2026-11-22',
    image_url: null,
    contact_info: 'Ask at the department office',
  },
  {
    owner: 'ananya.rao@foundx.edu',
    category: 'electronics',
    title: 'Black Redmi earbuds case lost in hostel corridor',
    description:
      'Lost the charging case of my black Redmi earbuds in the Girls Hostel first-floor corridor. The case has a tiny scratch near the hinge.',
    listing_type: 'lost',
    status: 'open',
    location: 'Girls Hostel, first floor corridor',
    campus_building: 'Girls Hostel',
    event_date: '2026-11-23',
    image_url: null,
    contact_info: '+91 90000 00003',
  },
  {
    owner: 'sai.tagore@foundx.edu',
    category: 'keys-wallets',
    title: 'Bunch of 3 keys with a red keychain',
    description:
      'Found a bunch of three keys with a red plastic keychain near the parking area gate. Please describe the keys to claim.',
    listing_type: 'found',
    status: 'open',
    location: 'Parking Area, near the main gate',
    campus_building: 'Parking Area',
    event_date: '2026-11-24',
    image_url: 'https://picsum.photos/seed/foundx-keys/640/480',
    contact_info: 'Handed to the security cabin',
  },
  {
    owner: 'vikram.nair@foundx.edu',
    category: 'documents',
    title: 'Aadhaar photocopy and fee receipt found in library',
    description:
      'Found a folder with an Aadhaar photocopy and a semester fee receipt in the library reference section. Name on the receipt is partly visible.',
    listing_type: 'found',
    status: 'open',
    location: 'Central Library, reference section',
    campus_building: 'Central Library',
    event_date: '2026-11-15',
    image_url: null,
    contact_info: 'Ask the librarian, deposited with her',
  },
];

async function ensureUser(user) {
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());

  let id;
  if (existing) {
    id = existing.id;
    await supabaseAdmin.auth.admin.updateUserById(id, {
      password: DEMO_PASSWORD,
      user_metadata: {
        full_name: user.full_name,
        roll_number: user.roll_number,
        department: user.department,
        phone: user.phone,
      },
    });
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        roll_number: user.roll_number,
        department: user.department,
        phone: user.phone,
      },
    });
    if (error) throw error;
    id = data.user.id;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id,
        full_name: user.full_name,
        email: user.email,
        roll_number: user.roll_number,
        department: user.department,
        phone: user.phone,
        role: user.role,
      },
      { onConflict: 'id' },
    );
  if (profileError) throw profileError;

  return id;
}

async function main() {
  console.log('[seed] Creating demo accounts...');
  const idByEmail = {};
  for (const user of USERS) {
    idByEmail[user.email] = await ensureUser(user);
    console.log(`[seed]   ${user.role.padEnd(7)} ${user.email}`);
  }

  const { data: categories, error: catError } = await supabaseAdmin.from('categories').select('id, slug');
  if (catError) throw catError;
  if (!categories?.length) {
    throw new Error('No categories found. Run supabase/migrations/0002_seed_categories.sql first.');
  }
  const categoryIdBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  console.log('[seed] Resetting demo listings...');
  const ownerIds = Object.values(idByEmail);
  await supabaseAdmin.from('items').delete().in('user_id', ownerIds);

  const rows = ITEMS.map((item) => ({
    user_id: idByEmail[item.owner],
    category_id: categoryIdBySlug[item.category] ?? null,
    title: item.title,
    description: item.description,
    listing_type: item.listing_type,
    status: item.status,
    location: item.location,
    campus_building: item.campus_building,
    event_date: item.event_date,
    image_url: item.image_url,
    contact_info: item.contact_info,
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin.from('items').insert(rows).select('id');
  if (insertError) throw insertError;

  console.log(`[seed] Inserted ${inserted.length} items.`);
  console.log('');
  console.log('  Demo credentials (password for all): ' + DEMO_PASSWORD);
  USERS.forEach((u) => console.log(`    ${u.role.padEnd(7)} ${u.email}`));
  console.log('');
}

main().catch((error) => {
  console.error('[seed] Failed:', error.message || error);
  process.exit(1);
});
