import config from '../config/index.js';


const maxImportRows = config.uploads.maxImportRows;
const maxCsvMegabytes = config.uploads.maxCsvSize / (1024 * 1024);

export const headline = ['Every', 'person', 'you', 'know,', 'on'];
export const headlineHighlight = 'one card.';

export const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#under-the-hood', label: 'Under the hood' },
  { href: '#faq', label: 'FAQ' },
];

export const stack = [
  'Node.js',
  'Express 5',
  'EJS',
  'JWT',
  'bcrypt',
  'Multer',
  'express-validator',
  'Streams',
  'EventEmitter',
  'fs/promises',
  'Tailwind CSS',
  'Fetch API',
  'ESLint',
  'Postman',
];

export const features = [
  {
    icon: 'search',
    title: 'Find anyone in a keystroke',
    text: 'Search names, emails, phones, companies and tags at once. Sort any column, filter by tag and page through the results.',
    visual: 'search',
    wide: true,
  },
  {
    icon: 'clock',
    title: 'Every call, email and meeting',
    text: 'Log interactions with notes on a timeline, so you remember what was said and when.',
    visual: 'timeline',
  },
  {
    icon: 'calendarClock',
    title: 'Follow-ups that do not slip',
    text: 'Set a follow-up date and see straight away what is overdue, due today or coming up.',
    visual: 'followups',
  },
  {
    icon: 'upload',
    title: 'Bring your spreadsheet',
    text: `Import a CSV from Excel or Google Sheets, up to ${maxImportRows.toLocaleString('en-IN')} rows. Bad rows are reported by line number, never half-saved.`,
    visual: 'import',
  },
  {
    icon: 'restore',
    title: 'Trash, not regret',
    text: 'Deleted contacts wait in Trash. Undo straight away, restore later, or delete them for good.',
    visual: 'trash',
  },
  {
    icon: 'shield',
    title: 'Private by design',
    text: 'Passwords are hashed with bcrypt, every request carries a signed JWT, and each contact is visible only to the account that created it.',
    visual: 'security',
    wide: true,
  },
  {
    icon: 'monitor',
    title: 'Works the way you do',
    text: 'Light and dark themes, a layout that fits your phone, and keyboard shortcuts for everything you do often.',
    visual: 'everywhere',
  },
];

export const steps = [
  {
    icon: 'upload',
    title: 'Add or import',
    text: 'Type in a contact or drop in a CSV. Duplicate emails and phone numbers are caught for you.',
  },
  {
    icon: 'meeting',
    title: 'Log what happens',
    text: "Record each call, email and meeting with a note on the contact's timeline.",
  },
  {
    icon: 'calendarClock',
    title: 'Follow up on time',
    text: 'Pick a follow-up date, and every contact shows what is overdue the moment you open it.',
  },
];

// The path every API request takes through the server (see src/routes and src/middlewares)
export const requestFlow = [
  { label: 'GET /api/contacts', note: 'The browser calls the API with fetch()' },
  { label: 'morgan', note: 'Logs the request' },
  { label: 'protect', note: 'Verifies the JWT and loads the user' },
  { label: 'validate', note: 'express-validator checks the query' },
  { label: 'controller', note: 'Reads the request, sends the response' },
  { label: 'service', note: 'Business rules: search, sort, paginate' },
  { label: 'repository', note: 'The only layer that touches storage' },
  { label: 'storage/*.json', note: 'Read with fs/promises' },
];

export const stats = [
  { value: 21, label: 'REST endpoints' },
  { value: 6, label: 'Node.js core modules' },
  { value: maxImportRows, label: 'rows per CSV import' },
  { value: 0, label: 'frontend frameworks' },
];

export const faqs = [
  {
    question: 'Can other people see my contacts?',
    answer:
      'No. Every contact belongs to the account that created it, and the server checks your signed token on every request before reading any data.',
  },
  {
    question: 'Can I bring my contacts from Excel or Google Sheets?',
    answer: `Yes. Save the sheet as CSV and import it (up to ${maxCsvMegabytes} MB and ${maxImportRows.toLocaleString('en-IN')} rows). Columns such as "First Name", "Email" and "Job Title" are recognised automatically, and any row with a problem is listed with its line number.`,
  },
  {
    question: 'What happens when I delete a contact?',
    answer:
      'It moves to Trash, and you can undo straight away or restore it later. Only "Delete forever" removes it, together with its interaction history.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      "In JSON files on the server, read and written with Node's non-blocking fs/promises module. The storage code sits behind a repository layer, so it can move to MongoDB without changing the API.",
  },
];
