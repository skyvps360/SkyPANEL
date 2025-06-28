import { Router } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Public endpoint for SLA plans (no authentication required)
router.get('/', async (req, res) => {
  try {
    console.log("Getting all SLA plans");

    // Get all active SLA plans from the database
    const slaPlans = await db
      .select()
      .from(schema.slaPlans)
      .where(eq(schema.slaPlans.is_active, true))
      .orderBy(schema.slaPlans.uptime_guarantee_percentage);

    console.log(`Returning ${slaPlans.length} active SLA plans`);
    res.json(slaPlans);
  } catch (error: any) {
    console.error("Error fetching SLA plans:", error);
    res.status(500).json({
      error: "Failed to load SLA plans. Please try again later."
    });
  }
});

export default router;