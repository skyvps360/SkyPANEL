import { Router } from "express";
import { db } from "../db";
import { dnsPlans, dnsPlanSubscriptions } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// DNS Plan validation schema
const dnsPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be non-negative"),
  maxDomains: z.number().min(1, "Must allow at least 1 domain"),
  maxRecords: z.number().min(1, "Must allow at least 1 record"),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

// GET /api/admin/dns-plans - Get all DNS plans with subscription counts
router.get("/dns-plans", requireAdmin, async (req, res) => {
  try {
    const plans = await db
      .select({
        id: dnsPlans.id,
        name: dnsPlans.name,
        description: dnsPlans.description,
        price: dnsPlans.price,
        maxDomains: dnsPlans.maxDomains,
        maxRecords: dnsPlans.maxRecords,
        features: dnsPlans.features,
        isActive: dnsPlans.isActive,
        displayOrder: dnsPlans.displayOrder,
        createdAt: dnsPlans.createdAt,
        updatedAt: dnsPlans.updatedAt,
        subscriptionCount: sql<number>`count(${dnsPlanSubscriptions.id})`.as('subscription_count'),
      })
      .from(dnsPlans)
      .leftJoin(dnsPlanSubscriptions, eq(dnsPlans.id, dnsPlanSubscriptions.planId))
      .groupBy(dnsPlans.id)
      .orderBy(dnsPlans.displayOrder, dnsPlans.id);

    // Transform the result to include _count for compatibility with frontend
    const transformedPlans = plans.map(plan => ({
      ...plan,
      _count: {
        subscriptions: plan.subscriptionCount || 0
      }
    }));

    res.json(transformedPlans);
  } catch (error) {
    console.error("Error fetching DNS plans:", error);
    res.status(500).json({ error: "Failed to fetch DNS plans" });
  }
});

// POST /api/admin/dns-plans - Create new DNS plan
router.post("/dns-plans", requireAdmin, async (req, res) => {
  try {
    const validatedData = dnsPlanSchema.parse(req.body);

    const [newPlan] = await db
      .insert(dnsPlans)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(newPlan);
  } catch (error) {
    console.error("Error creating DNS plan:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to create DNS plan" });
  }
});

// PUT /api/admin/dns-plans/:id - Update DNS plan
router.put("/dns-plans/:id", requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const validatedData = dnsPlanSchema.partial().parse(req.body);

    const [updatedPlan] = await db
      .update(dnsPlans)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(dnsPlans.id, planId))
      .returning();

    if (!updatedPlan) {
      return res.status(404).json({ error: "DNS plan not found" });
    }

    res.json(updatedPlan);
  } catch (error) {
    console.error("Error updating DNS plan:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    res.status(500).json({ error: "Failed to update DNS plan" });
  }
});

// DELETE /api/admin/dns-plans/:id - Delete DNS plan
router.delete("/dns-plans/:id", requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await db
      .select({ count: sql<number>`count(*)` })
      .from(dnsPlanSubscriptions)
      .where(eq(dnsPlanSubscriptions.planId, planId));

    if (activeSubscriptions[0]?.count > 0) {
      return res.status(400).json({
        error: "Cannot delete plan with active subscriptions",
        activeSubscriptions: activeSubscriptions[0].count,
      });
    }

    const [deletedPlan] = await db
      .delete(dnsPlans)
      .where(eq(dnsPlans.id, planId))
      .returning();

    if (!deletedPlan) {
      return res.status(404).json({ error: "DNS plan not found" });
    }

    res.json({ message: "DNS plan deleted successfully", plan: deletedPlan });
  } catch (error) {
    console.error("Error deleting DNS plan:", error);
    res.status(500).json({ error: "Failed to delete DNS plan" });
  }
});

// GET /api/admin/dns-plans/:id - Get specific DNS plan
router.get("/dns-plans/:id", requireAdmin, async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const [plan] = await db
      .select({
        id: dnsPlans.id,
        name: dnsPlans.name,
        description: dnsPlans.description,
        price: dnsPlans.price,
        maxDomains: dnsPlans.maxDomains,
        maxRecords: dnsPlans.maxRecords,
        features: dnsPlans.features,
        isActive: dnsPlans.isActive,
        displayOrder: dnsPlans.displayOrder,
        createdAt: dnsPlans.createdAt,
        updatedAt: dnsPlans.updatedAt,
        subscriptionCount: sql<number>`count(${dnsPlanSubscriptions.id})`.as('subscription_count'),
      })
      .from(dnsPlans)
      .leftJoin(dnsPlanSubscriptions, eq(dnsPlans.id, dnsPlanSubscriptions.planId))
      .where(eq(dnsPlans.id, planId))
      .groupBy(dnsPlans.id);

    if (!plan) {
      return res.status(404).json({ error: "DNS plan not found" });
    }

    // Transform the result to include _count for compatibility with frontend
    const transformedPlan = {
      ...plan,
      _count: {
        subscriptions: plan.subscriptionCount || 0
      }
    };

    res.json(transformedPlan);
  } catch (error) {
    console.error("Error fetching DNS plan:", error);
    res.status(500).json({ error: "Failed to fetch DNS plan" });
  }
});

export default router;
