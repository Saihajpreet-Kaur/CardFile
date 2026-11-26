/**
 * Clears the database and fills it with demo data.
 *
 *   npm run seed            (uses MONGO_URI from .env)
 *
 * The same function is used by scripts/dev-local.js to fill a fresh local database.
 */
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { ROLES } from '../src/constants/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import Contact from '../src/models/Contact.js';
import * as userRepository from '../src/repositories/user.repository.js';
import * as contactRepository from '../src/repositories/contact.repository.js';
import * as interactionRepository from '../src/repositories/interaction.repository.js';
import * as listRepository from '../src/repositories/list.repository.js';
import { hashPassword } from '../src/services/auth.service.js';
import { createContact } from '../src/services/contact.service.js';
import { addInteraction } from '../src/services/interaction.service.js';
import { changeMembers, createList } from '../src/services/list.service.js';
import logger from '../src/utils/logger.js';

const ACCOUNTS = [
  {
    name: 'CRM Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@crm.test',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@1234',
    role: ROLES.ADMIN,
  },
  {
    name: 'Demo User',
    email: process.env.SEED_USER_EMAIL || 'demo@crm.test',
    password: process.env.SEED_USER_PASSWORD || 'Demo@1234',
    role: ROLES.USER,
  },
];

const SAMPLE_CONTACTS = [
  { firstName: 'Aarav', lastName: 'Sharma', email: 'aarav.sharma@infosys.example', phone: '+919876500001', company: 'Infosys', designation: 'Engineering Manager', tags: ['client', 'vip'], isFavourite: true },
  { firstName: 'Diya', lastName: 'Patel', email: 'diya.patel@tcs.example', phone: '+919876500002', company: 'TCS', designation: 'HR Lead', tags: ['recruiter'] },
  { firstName: 'Kabir', lastName: 'Singh', email: 'kabir@zomato.example', phone: '+919876500003', company: 'Zomato', designation: 'Product Manager', tags: ['lead'] },
  { firstName: 'Ananya', lastName: 'Gupta', email: 'ananya.gupta@wipro.example', company: 'Wipro', designation: 'Data Scientist', tags: ['client'] },
  { firstName: 'Vihaan', lastName: 'Mehta', phone: '+919876500005', company: 'Freelance', designation: 'UI Designer', tags: ['vendor'] },
  { firstName: 'Ishita', lastName: 'Kaur', email: 'ishita.kaur@paytm.example', phone: '+919876500006', company: 'Paytm', designation: 'Backend Developer', tags: ['lead', 'tech'], isFavourite: true },
  { firstName: 'Arjun', lastName: 'Reddy', email: 'arjun.reddy@flipkart.example', company: 'Flipkart', designation: 'Sales Head', tags: ['client', 'vip'] },
  { firstName: 'Meera', lastName: 'Nair', email: 'meera.nair@swiggy.example', phone: '+919876500008', company: 'Swiggy', designation: 'Marketing Manager', tags: ['partner'] },
  { firstName: 'Rohan', lastName: 'Verma', email: 'rohan.verma@hcl.example', company: 'HCL', designation: 'DevOps Engineer', tags: ['tech'] },
  { firstName: 'Saanvi', lastName: 'Joshi', email: 'saanvi.joshi@byjus.example', phone: '+919876500010', company: "BYJU'S", designation: 'Content Lead', tags: ['partner'] },
  { firstName: 'Aditya', lastName: 'Malhotra', email: 'aditya@startup.example', company: 'Startup Labs', designation: 'Founder', tags: ['lead', 'vip'], notes: 'Met at the HackFest demo day.' },
  { firstName: 'Nisha', lastName: 'Bansal', email: 'nisha.bansal@chitkara.example', company: 'Chitkara University', designation: 'Placement Officer', tags: ['college'] },
];

const day = 86_400_000;
const daysAgo = (days) => new Date(Date.now() - days * day);
const daysAhead = (days) => new Date(Date.now() + days * day);

export async function seedDatabase() {
  await Promise.all([
    userRepository.clear(),
    contactRepository.clear(),
    interactionRepository.clear(),
    listRepository.clear(),
  ]);

  const users = [];
  for (const { password, ...account } of ACCOUNTS) {
    users.push(await userRepository.create({ ...account, passwordHash: await hashPassword(password) }));
  }
  const demoUser = users.find((user) => user.role === ROLES.USER);

  const contacts = [];
  for (const sample of SAMPLE_CONTACTS) {
    contacts.push(await createContact(demoUser.id, sample));
  }
  // Spread creation dates over the last months so the dashboard chart has data
  const spread = [0, 3, 8, 15, 25, 33, 40, 52, 64, 80, 95, 120];
  // createdAt is immutable in Mongoose, so the demo dates are written to the collection directly
  await Promise.all(
    contacts.map((contact, i) =>
      Contact.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(contact.id) },
        { $set: { createdAt: daysAgo(spread[i]) } },
      ),
    ),
  );

  const clients = await createList(demoUser.id, { name: 'Key clients', color: 'blue', description: 'Accounts we work with' });
  const hiring = await createList(demoUser.id, { name: 'Hiring network', color: 'green' });
  await changeMembers(demoUser.id, clients.id, { action: 'add', contactIds: [contacts[0].id, contacts[3].id, contacts[6].id] });
  await changeMembers(demoUser.id, hiring.id, { action: 'add', contactIds: [contacts[1].id, contacts[11].id] });

  const interactions = [
    [0, { type: 'meeting', note: 'Kick-off meeting for the new project.', date: daysAgo(6), followUpDate: daysAhead(2) }],
    [0, { type: 'email', note: 'Sent the proposal document.', date: daysAgo(2) }],
    [2, { type: 'call', note: 'Discussed pricing, wants a demo next week.', date: daysAgo(1), followUpDate: daysAhead(5) }],
    [5, { type: 'call', note: 'Asked for the API documentation.', date: daysAgo(4), followUpDate: daysAgo(1) }],
    [11, { type: 'meeting', note: 'Campus placement drive planning.', date: daysAgo(3), followUpDate: new Date() }],
  ];
  for (const [index, data] of interactions) await addInteraction(demoUser.id, contacts[index].id, data);

  logger.info(`Seeded ${users.length} users, ${contacts.length} contacts, 2 lists and ${interactions.length} interactions`);
  for (const { email, role } of ACCOUNTS) logger.info(`  ${role.padEnd(5)} -> ${email} (password from .env)`);
}

// Run directly with "npm run seed"
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDB();
    await seedDatabase();
  } catch (error) {
    logger.error('Seeding failed', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
