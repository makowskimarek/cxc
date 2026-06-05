CREATE TYPE "public"."measure_mode" AS ENUM('per_athlete', 'per_team');--> statement-breakpoint
DROP INDEX "idx_results_athlete_competition";--> statement-breakpoint
ALTER TABLE "results" ALTER COLUMN "athlete_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "measure_mode" "measure_mode" DEFAULT 'per_athlete' NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_result" ON "results" USING btree ("event_id","team_id","competition_id");