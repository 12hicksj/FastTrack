import { pgTable, serial, text, numeric, uuid, index } from "drizzle-orm/pg-core";
import { assessments } from "./assessment";

export const estimateLineItems = pgTable(
  "estimate_line_items",
  {
    lineItemId: serial("line_item_id").primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.assessmentId),
    description: text("description").notNull(),
    partCost: numeric("part_cost", { precision: 10, scale: 2 }).notNull(),
    laborHours: numeric("labor_hours", { precision: 6, scale: 2 }).notNull(),
    laborRate: numeric("labor_rate", { precision: 6, scale: 2 }).notNull(),
  },
  (t) => [index("line_items_assessment_id_idx").on(t.assessmentId)]
);
