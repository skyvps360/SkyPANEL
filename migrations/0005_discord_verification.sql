CREATE TABLE "discord_verification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"role_id" text NOT NULL,
	"channel_id" text,
	"message_id" text,
	"is_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discord_verification_settings_guild_id_unique" UNIQUE("guild_id")
);
-->> statement-breakpoint
CREATE TABLE "discord_verified_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"guild_id" text NOT NULL,
	CONSTRAINT "discord_verified_users_discord_user_id_unique" UNIQUE("discord_user_id")
);
-->> statement-breakpoint
