import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parse } from 'csv-parse/sync';
import { Transform as CsvTransform } from '@json2csv/node';

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
  createdAt: contact.createdAt,
});


export async function writeContactsCsv(contacts, output) {
  const csvTransform = new CsvTransform({ fields: EXPORT_FIELDS }, {}, { objectMode: true });
  await pipeline(Readable.from(contacts.map(toCsvRow)), csvTransform, output);
}
