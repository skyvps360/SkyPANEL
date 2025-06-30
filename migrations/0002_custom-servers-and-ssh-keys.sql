CREATE TABLE "custom_servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"ip_address" text NOT NULL,
	"port" integer DEFAULT 22 NOT NULL,
	"username" text NOT NULL,
	"authentication_method" text NOT NULL,
	"password" text,
	"ssh_key_id" integer,
	"status" text DEFAULT 'offline' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_ssh_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "byos_servers" CASCADE;--> statement-breakpoint
ALTER TABLE "custom_servers" ADD CONSTRAINT "custom_servers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_ssh_keys" ADD CONSTRAINT "custom_ssh_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;