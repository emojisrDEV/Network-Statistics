import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const networkDevices = pgTable("network_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  ipAddress: text("ip_address").notNull().unique(),
  macAddress: text("mac_address"),
  status: text("status").notNull().default("unknown"), // online, offline, warning, error
  lastSeen: timestamp("last_seen").defaultNow(),
  uptime: real("uptime").default(0), // percentage
  latency: real("latency"), // in milliseconds
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const networkStats = pgTable("network_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").references(() => networkDevices.id),
  timestamp: timestamp("timestamp").defaultNow(),
  uploadSpeed: real("upload_speed"), // Mbps
  downloadSpeed: real("download_speed"), // Mbps
  utilization: real("utilization"), // percentage
  packetLoss: real("packet_loss"), // percentage
  latency: real("latency"), // milliseconds
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").references(() => networkDevices.id),
  severity: text("severity").notNull(), // critical, warning, info
  type: text("type").notNull(), // device_offline, high_latency, high_utilization, etc.
  message: text("message").notNull(),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const raspberryPiNodes = pgTable("raspberry_pi_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull().unique(),
  status: text("status").notNull().default("offline"), // online, offline
  version: text("version"),
  lastHeartbeat: timestamp("last_heartbeat"),
  cpuUsage: real("cpu_usage"),
  memoryUsage: real("memory_usage"),
  diskUsage: real("disk_usage"),
  temperature: real("temperature"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNetworkDeviceSchema = createInsertSchema(networkDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNetworkStatsSchema = createInsertSchema(networkStats).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertRaspberryPiNodeSchema = createInsertSchema(raspberryPiNodes).omit({
  id: true,
  createdAt: true,
});

export type NetworkDevice = typeof networkDevices.$inferSelect;
export type InsertNetworkDevice = z.infer<typeof insertNetworkDeviceSchema>;

export type NetworkStats = typeof networkStats.$inferSelect;
export type InsertNetworkStats = z.infer<typeof insertNetworkStatsSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type RaspberryPiNode = typeof raspberryPiNodes.$inferSelect;
export type InsertRaspberryPiNode = z.infer<typeof insertRaspberryPiNodeSchema>;

// Network tool operation schemas
export const pingRequestSchema = z.object({
  target: z.string().min(1),
  count: z.number().min(1).max(10).optional().default(4),
});

export const tracerouteRequestSchema = z.object({
  target: z.string().min(1),
  maxHops: z.number().min(1).max(30).optional().default(30),
});

export const portScanRequestSchema = z.object({
  target: z.string().min(1),
  ports: z.array(z.number().min(1).max(65535)).optional(),
  startPort: z.number().min(1).max(65535).optional().default(1),
  endPort: z.number().min(1).max(65535).optional().default(1000),
});

export type PingRequest = z.infer<typeof pingRequestSchema>;
export type TracerouteRequest = z.infer<typeof tracerouteRequestSchema>;
export type PortScanRequest = z.infer<typeof portScanRequestSchema>;
