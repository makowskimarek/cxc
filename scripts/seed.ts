import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import {
  users,
  events,
  competitions,
  teams,
  athletes,
  eventCompetitions,
  eventTeams,
} from "../lib/db/schema";

async function seed() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const [admin] = await db
    .insert(users)
    .values({ email: "admin@cxc.pl", password: adminPassword, name: "Admin", role: "admin" })
    .onConflictDoNothing()
    .returning();
  console.log("Admin created:", admin?.email ?? "already exists");

  const judgePassword = await bcrypt.hash("judge123", 12);
  await db
    .insert(users)
    .values({ email: "sedzia@cxc.pl", password: judgePassword, name: "Sędzia 1", role: "judge" })
    .onConflictDoNothing();

  const competitionData = [
    {
      name: "Bieganie z obciążeniem",
      description: "Cała drużyna biegnie określony dystans wraz z dużym nieporęcznym obciążeniem. Liczy się czas dobiegnięcia wszystkich zawodników wraz z obciążeniem na metę.",
      scoreType: "time" as const, lowerIsBetter: true, measureMode: "per_team" as const,
    },
    {
      name: "Airbike",
      description: "Każdy zawodnik ma określony czas na spalenie jak największej liczby kalorii na Airbike'u.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_athlete" as const,
    },
    {
      name: "Wiosło",
      description: "Każdy zawodnik ma określony czas na spalenie jak największej liczby kalorii na wioślarzu.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_athlete" as const,
    },
    {
      name: "Wisielec",
      description: "Każdy zawodnik wisi na drążku jak najdłużej (max 5 min). Wspólny start, osobny pomiar dla każdego.",
      scoreType: "time" as const, lowerIsBetter: false, measureMode: "per_athlete" as const,
    },
    {
      name: "Siatkówka",
      description: "Przerzucanie obciążonych piłek przez 2m ścianę z jednego pola na drugie. Liczy się suma kilogramów przeniesionych przez całą drużynę.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_team" as const,
    },
    {
      name: "Równoważnia",
      description: "Tor równoważniowy — zaliczony punkt za każde ukończone przejście. Jeśli zawodnik spadnie, wszyscy za nim cofają się do początku.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_team" as const,
    },
    {
      name: "Lina",
      description: "Wchodzenie na linę i uderzenie w dzwonek. Liczy się łączna liczba uderzeń przez całą drużynę.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_team" as const,
    },
    {
      name: "Sanki",
      description: "Drużyna transportuje się na drugą stronę na sankach. Liczy się łączna liczba pełnych przejazdów.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_team" as const,
    },
    {
      name: "Biegacz",
      description: "Jedna bieżnia Air Runner — w określonym czasie zawodnicy mogą się dowolnie zmieniać. Liczy się łączna liczba przebiegniętych metrów.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_team" as const,
    },
    {
      name: "Wallball",
      description: "Podrzucanie obciążonej piłki — jedna piłka, zawodnicy mogą się dowolnie zmieniać. Liczy się łączna liczba pełnych wallbali.",
      scoreType: "points" as const, lowerIsBetter: false, measureMode: "per_team" as const,
    },
  ];

  const insertedCompetitions = await db
    .insert(competitions)
    .values(competitionData)
    .returning();
  console.log(`Created ${insertedCompetitions.length} competitions`);

  const [event] = await db
    .insert(events)
    .values({
      name: "Carbon Extreme Challenge 2024",
      date: "2024-09-15",
      location: "Warszawa, Hala Sportowa CXC",
      description: "Pierwsze oficjalne zawody Carbon Extreme Challenge. Rywalizacja drużynowa w 10 dyscyplinach fitness.",
      isActive: true,
    })
    .returning();
  console.log("Event created:", event.name);

  const teamData = [
    { name: "Iron Wolves" },
    { name: "Carbon Force" },
    { name: "Steel Titans" },
    { name: "Black Diamond" },
  ];
  const insertedTeams = await db.insert(teams).values(teamData).returning();

  const athleteData = insertedTeams.flatMap((team, ti) =>
    Array.from({ length: 5 }, (_, i) => ({
      name: `Zawodnik ${ti * 5 + i + 1}`,
      number: ti * 5 + i + 1,
      teamId: team.id,
    }))
  );
  await db.insert(athletes).values(athleteData);
  console.log(`Created ${athleteData.length} athletes in ${insertedTeams.length} teams`);

  await db.insert(eventCompetitions).values(
    insertedCompetitions.map((c, i) => ({
      eventId: event.id,
      competitionId: c.id,
      displayOrder: i + 1,
    }))
  );

  await db.insert(eventTeams).values(
    insertedTeams.map((t) => ({ eventId: event.id, teamId: t.id }))
  );

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
