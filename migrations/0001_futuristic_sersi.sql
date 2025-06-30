CREATE TABLE "dns_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"interserver_id" integer,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dns_plan_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"planId" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"autoRenew" boolean DEFAULT true NOT NULL,
	"lastPaymentDate" timestamp,
	"nextPaymentDate" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dns_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" real NOT NULL,
	"maxDomains" integer NOT NULL,
	"maxRecords" integer NOT NULL,
	"features" json DEFAULT '[]'::json,
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dns_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"interserver_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"ttl" integer DEFAULT 86400 NOT NULL,
	"priority" integer DEFAULT 0,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_department_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"can_manage" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"requires_vps" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"color" text DEFAULT '#3b82f6',
	"icon" text DEFAULT 'MessageCircle',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email_verification_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" integer,
	"attempt_type" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"last_attempt_at" timestamp DEFAULT now(),
	"lockout_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discord_ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text NOT NULL,
	"role" text NOT NULL,
	"message" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_ai_user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text NOT NULL,
	"max_conversation_history" integer DEFAULT 50,
	"is_enabled" boolean DEFAULT true,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"total_messages_count" integer DEFAULT 0,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discord_ai_user_settings_discord_user_id_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
CREATE TABLE "byos_servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"ip_address" text NOT NULL,
	"provider" text NOT NULL,
	"os" text NOT NULL,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"agent_token" text NOT NULL,
	"last_heartbeat" timestamp,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "byos_servers_ip_address_unique" UNIQUE("ip_address"),
	CONSTRAINT "byos_servers_agent_token_unique" UNIQUE("agent_token")
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" DROP CONSTRAINT "chat_sessions_department_id_chat_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_department_id_ticket_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "legacy_chat_department_id" integer;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "legacy_department_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "virtfusion_credit_id" text;--> statement-breakpoint
ALTER TABLE "dns_domains" ADD CONSTRAINT "dns_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dns_plan_subscriptions" ADD CONSTRAINT "dns_plan_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dns_plan_subscriptions" ADD CONSTRAINT "dns_plan_subscriptions_planId_dns_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."dns_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_domain_id_dns_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."dns_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_department_admins" ADD CONSTRAINT "support_department_admins_department_id_support_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."support_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_department_admins" ADD CONSTRAINT "support_department_admins_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_attempts" ADD CONSTRAINT "email_verification_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "byos_servers" ADD CONSTRAINT "byos_servers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_department_id_support_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."support_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_legacy_chat_department_id_chat_departments_id_fk" FOREIGN KEY ("legacy_chat_department_id") REFERENCES "public"."chat_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_support_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."support_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_legacy_department_id_ticket_departments_id_fk" FOREIGN KEY ("legacy_department_id") REFERENCES "public"."ticket_departments"("id") ON DELETE set null ON UPDATE no action;