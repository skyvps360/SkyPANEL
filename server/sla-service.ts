import { db } from "./db";
import { slaPlans, NewSlaPlan, SlaPlan } from "../shared/schemas/sla-schema";
import { eq } from "drizzle-orm";

export class SlaService {
  async createSlaPlan(newSlaPlan: NewSlaPlan): Promise<SlaPlan> {
    const [slaPlan] = await db.insert(slaPlans).values(newSlaPlan).returning();
    return slaPlan;
  }

  async getSlaPlanById(id: string): Promise<SlaPlan | undefined> {
    const [slaPlan] = await db.select().from(slaPlans).where(eq(slaPlans.id, id));
    return slaPlan;
  }

  async getAllSlaPlans(): Promise<SlaPlan[]> {
    const allSlaPlans = await db.select().from(slaPlans);
    return allSlaPlans;
  }

  async updateSlaPlan(id: string, updatedFields: Partial<NewSlaPlan>): Promise<SlaPlan | undefined> {
    const [slaPlan] = await db.update(slaPlans).set(updatedFields).where(eq(slaPlans.id, id)).returning();
    return slaPlan;
  }

  async deleteSlaPlan(id: string): Promise<SlaPlan | undefined> {
    const [slaPlan] = await db.delete(slaPlans).where(eq(slaPlans.id, id)).returning();
    return slaPlan;
  }
}