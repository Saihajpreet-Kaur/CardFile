
import { ROLES } from '../src/constants/index.js';
import * as userRepository from '../src/repositories/user.repository.js';
import * as contactRepository from '../src/repositories/contact.repository.js';
import * as interactionRepository from '../src/repositories/interaction.repository.js';
import { hashPassword } from '../src/services/auth.service.js';
import { createContact } from '../src/services/contact.service.js';
import { addInteraction } from '../src/services/interaction.service.js';
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

async function seed() {
  await Promise.all([userRepository.clear(), contactRepository.clear(), interactionRepository.clear()]);

  const users = [];
  for (const { password, ...account } of ACCOUNTS) {
    users.push(await userRepository.create({ ...account, passwordHash: await hashPassword(password) }));
  }
  const demoUser = users.find((user) => user.role === ROLES.USER);

  const contacts = [];
  for (const sample of SAMPLE_CONTACTS) {
    contacts.push(await createContact(demoUser.id, sample));
  }

  const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
  const daysAhead = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

  await addInteraction(demoUser.id, contacts[0].id, { type: 'meeting', note: 'Kick-off meeting for the new project.', date: daysAgo(6), followUpDate: daysAhead(2) });
  await addInteraction(demoUser.id, contacts[0].id, { type: 'email', note: 'Sent the proposal document.', date: daysAgo(2) });
  await addInteraction(demoUser.id, contacts[2].id, { type: 'call', note: 'Discussed pricing, wants a demo next week.', date: daysAgo(1), followUpDate: daysAhead(5) });

  logger.info(`Seeded ${users.length} users, ${contacts.length} contacts and 3 interactions`);
  for (const { email, role } of ACCOUNTS) logger.info(`  ${role.padEnd(5)} -> ${email} (password from .env)`);
}

seed().catch((error) => {
  logger.error('Seeding failed', error);
  process.exit(1);
});
