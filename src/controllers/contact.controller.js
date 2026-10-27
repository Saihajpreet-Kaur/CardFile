import { matchedData } from 'express-validator';
import * as contactService from '../services/contact.service.js';
import { writeContactsCsv } from '../services/csv.service.js';

// Values that passed validation, after sanitizers ran (trimmed, converted to numbers, ...)
const validBody = (req) => matchedData(req, { locations: ['body'] });
const validQuery = (req) => matchedData(req, { locations: ['query'] });

export async function listContacts(req, res) {
  const { items, pagination } = await contactService.listContacts(req.user.id, validQuery(req));
  res.json({ success: true, data: items, pagination });
}

export async function getRecentlyViewed(req, res) {
  const contacts = await contactService.getRecentlyViewed(req.user.id);
  res.json({ success: true, data: contacts });
}

export async function getContact(req, res) {
  const contact = await contactService.getContact(req.user.id, req.params.id);
  res.json({ success: true, data: contact });
}

export async function createContact(req, res) {
  const contact = await contactService.createContact(req.user.id, validBody(req));
  res.status(201).json({ success: true, message: 'Contact created', data: contact });
}

export async function updateContact(req, res) {
  const contact = await contactService.updateContact(req.user.id, req.params.id, validBody(req));
  res.json({ success: true, message: 'Contact updated', data: contact });
}

export async function toggleFavourite(req, res) {
  const contact = await contactService.toggleFavourite(req.user.id, req.params.id);
  const message = contact.isFavourite ? 'Added to favourites' : 'Removed from favourites';
  res.json({ success: true, message, data: contact });
}

export async function uploadPhoto(req, res) {
  const contact = await contactService.updatePhoto(req.user.id, req.params.id, req.file);
  res.json({ success: true, message: 'Photo uploaded', data: contact });
}

export async function moveToTrash(req, res) {
  const contact = await contactService.moveToTrash(req.user.id, req.params.id);
  res.json({ success: true, message: 'Contact moved to trash', data: contact });
}

export async function restoreContact(req, res) {
  const contact = await contactService.restoreContact(req.user.id, req.params.id);
  res.json({ success: true, message: 'Contact restored', data: contact });
}

export async function deletePermanently(req, res) {
  await contactService.deletePermanently(req.user.id, req.params.id);
  res.json({ success: true, message: 'Contact permanently deleted' });
}

export async function importContacts(req, res) {
  const report = await contactService.importContacts(req.user.id, req.file);
  const message = `Imported ${report.imported} of ${report.totalRows} rows`;
  res.status(report.imported > 0 ? 201 : 200).json({ success: true, message, data: report });
}

export async function exportContacts(req, res) {
  const contacts = await contactService.findContactsForExport(req.user.id, validQuery(req));
  const fileName = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  await writeContactsCsv(contacts, res);
}
