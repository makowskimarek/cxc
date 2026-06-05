import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  uniqueIndex,
  index,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["admin", "judge"]);
export const scoreTypeEnum = pgEnum("score_type", ["points", "time"]);
export const measureModeEnum = pgEnum("measure_mode", ["per_athlete", "per_team"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("judge"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  date: date("date"),
  location: text("location"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(false),
});

export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  scoreType: scoreTypeEnum("score_type").notNull().default("points"),
  lowerIsBetter: boolean("lower_is_better").notNull().default(false),
  measureMode: measureModeEnum("measure_mode").notNull().default("per_athlete"),
  videoUrl: text("video_url"),
});

export const competitionImages = pgTable("competition_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
});

export const athletes = pgTable(
  "athletes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    number: integer("number"),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (t) => [index("idx_athletes_team_id").on(t.teamId)]
);

export const eventCompetitions = pgTable(
  "event_competitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("uq_event_competition").on(t.eventId, t.competitionId),
    index("idx_event_competitions_event_id").on(t.eventId),
  ]
);

export const eventTeams = pgTable(
  "event_teams",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.teamId] }),
    index("idx_event_teams_event_id").on(t.eventId),
  ]
);

export const eventJudges = pgTable(
  "event_judges",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })]
);

export const results = pgTable(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .references(() => athletes.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" }),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    points: integer("points"),
    timeSeconds: integer("time_seconds"),
    judgeId: uuid("judge_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_result").on(t.eventId, t.athleteId, t.competitionId),
    uniqueIndex("uq_team_result").on(t.eventId, t.teamId, t.competitionId),
    index("idx_results_event_id").on(t.eventId),
  ]
);
