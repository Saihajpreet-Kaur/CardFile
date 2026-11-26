import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parse } from 'csv-parse/sync';
import { Transform as CsvTransform } from '@json2csv/node';

/* ------------------------------------------------------------------ */
/* Import: CSV buffer -> array of row objects                          */
/* ------------------------------------------------------------------ */

// Lets users upload files with friendly headers like "First Name" or "Job Title"
const HEADER_ALIASES = {
  firstname: 'firstName',
  first: 'firstName',
  lastname: 'lastName',
  last: 'lastName',
  surname: 'lastName',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  company: 'company',
  organisation: 'company',
  organization: 'company',
  designation: 'designation',
  title: 'designation',
  jobtitle: 'designation',
  tags: 'tags',
  notes: 'notes',
};

const normalizeHeader = (header) =>
  HEADER_ALIASES[header.toLowerCase().replace(/[\s_-]/g, '')] ?? header.trim();

/**
 * Returns [{ line, data }] where line is the row's line number in the file.
 * Throws a csv-parse error (code starts with "CSV_") when the file is not valid CSV.
 */
export function parseCsv(buffer) {
  const records = parse(buffer, {
    columns: (headers) => headers.map(normalizeHeader),
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    info: true,
  });

  return records.map(({ record, info }) => ({ line: info.lines, data: record }));
}

/* ------------------------------------------------------------------ */
/* Export: contacts -> CSV stream                                      */
/* ------------------------------------------------------------------ */

const EXPORT_FIELDS = [
  { label: 'First Name', value: 'firstName' },
  { label: 'Last Name', value: 'lastName' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
  { label: 'Company', value: 'company' },
  { label: 'Designation', value: 'designation' },
  { label: 'Tags', value: 'tags' },
  { label: 'Notes', value: 'notes' },
  { label: 'Favourite', value: 'isFavourite' },
  { label: 'Created At', value: 'createdAt' },
];

// "CSV injection": spreadsheet apps run cells starting with = + - @ as formulas.
// Prefixing a quote makes them plain text. Phone is skipped - it is validated as digits only.
const FORMULA_START = /^[=+\-@\t\r]/;
const neutralizeFormula = (value) =>
  typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : value;

const toCsvRow = (contact) => ({
  firstName: neutralizeFormula(contact.firstName),
  lastName: neutralizeFormula(contact.lastName),
  email: neutralizeFormula(contact.email),
  phone: contact.phone,
  company: neutralizeFormula(contact.company),
  designation: neutralizeFormula(contact.designation),
  tags: neutralizeFormula(contact.tags.join('; ')),
  notes: neutralizeFormula(contact.notes),
  isFavourite: contact.isFavourite ? 'yes' : 'no',
  createdAt: new Date(contact.createdAt).toISOString(),
});

/** Turns documents from a MongoDB cursor (or any iterable) into CSV rows one at a time. */
async function* toCsvRows(contacts) {
  for await (const contact of contacts) {
    yield toCsvRow(typeof contact.toObject === 'function' ? contact.toObject() : contact);
  }
}

/**
 * Streams contacts as CSV into any writable stream (e.g. the HTTP response):
 * MongoDB cursor -> Readable (objects) -> json2csv Transform (CSV text) -> output
 * Only one document is in memory at a time, however many contacts are exported.
 */
export async function writeContactsCsv(contacts, output) {
  const csvTransform = new CsvTransform({ fields: EXPORT_FIELDS }, {}, { objectMode: true });
  await pipeline(Readable.from(toCsvRows(contacts)), csvTransform, output);
}
