import { matchedData } from 'express-validator';
import * as interactionService from '../services/interaction.service.js';

export async function listInteractions(req, res) {
  const interactions = await interactionService.listInteractions(req.user.id, req.params.id);
  res.json({ success: true, data: interactions });
}

export async function addInteraction(req, res) {
  const interaction = await interactionService.addInteraction(
    req.user.id,
    req.params.id,
    matchedData(req, { locations: ['body'] }),
  );
  res.status(201).json({ success: true, message: 'Interaction added', data: interaction });
}

export async function deleteInteraction(req, res) {
  await interactionService.deleteInteraction(req.user.id, req.params.id, req.params.interactionId);
  res.json({ success: true, message: 'Interaction deleted' });
}
