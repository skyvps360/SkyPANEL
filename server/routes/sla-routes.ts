import { Router } from 'express';
import { SlaService } from '../sla-service';
import { insertSlaPlanSchema } from '../../shared/schemas/sla-schema';
import { validateRequest } from '../middleware/validate-request';

const router = Router();
const slaService = new SlaService();

// Create SLA Plan
router.post(
  '/',
  validateRequest({ body: insertSlaPlanSchema }),
  async (req, res) => {
    try {
      const newSlaPlan = await slaService.createSlaPlan(req.body);
      res.status(201).json(newSlaPlan);
    } catch (error) {
      console.error('Error creating SLA plan:', error);
      res.status(500).json({ message: 'Failed to create SLA plan' });
    }
  }
);

// Get all SLA Plans
router.get('/', async (req, res) => {
  try {
    const slaPlans = await slaService.getAllSlaPlans();
    res.status(200).json(slaPlans);
  } catch (error) {
    console.error('Error fetching SLA plans:', error);
    res.status(500).json({ message: 'Failed to fetch SLA plans' });
  }
});

// Get SLA Plan by ID
router.get('/:id', async (req, res) => {
  try {
    const slaPlan = await slaService.getSlaPlanById(req.params.id);
    if (slaPlan) {
      res.status(200).json(slaPlan);
    } else {
      res.status(404).json({ message: 'SLA plan not found' });
    }
  } catch (error) {
    console.error('Error fetching SLA plan:', error);
    res.status(500).json({ message: 'Failed to fetch SLA plan' });
  }
});

// Update SLA Plan
router.put(
  '/:id',
  validateRequest({ body: insertSlaPlanSchema.partial() }),
  async (req, res) => {
    try {
      const updatedSlaPlan = await slaService.updateSlaPlan(req.params.id, req.body);
      if (updatedSlaPlan) {
        res.status(200).json(updatedSlaPlan);
      } else {
        res.status(404).json({ message: 'SLA plan not found' });
      }
    } catch (error) {
      console.error('Error updating SLA plan:', error);
      res.status(500).json({ message: 'Failed to update SLA plan' });
    }
  }
);

// Delete SLA Plan
router.delete('/:id', async (req, res) => {
  try {
    const deletedSlaPlan = await slaService.deleteSlaPlan(req.params.id);
    if (deletedSlaPlan) {
      res.status(200).json({ message: 'SLA plan deleted successfully' });
    } else {
      res.status(404).json({ message: 'SLA plan not found' });
    }
  } catch (error) {
    console.error('Error deleting SLA plan:', error);
    res.status(500).json({ message: 'Failed to delete SLA plan' });
  }
});

export default router;