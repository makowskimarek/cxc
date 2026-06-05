import "dotenv/config";
import { db } from "../lib/db";
import { competitions, eventCompetitions, events } from "../lib/db/schema";

const newCompetitions = [
  {
    name: "Bieganie z obciążeniem",
    description: "Cała drużyna biegnie określony dystans wraz z dużym nieporęcznym obciążeniem. Liczy się czas dobiegnięcia wszystkich zawodników wraz z obciążeniem na metę.",
    scoreType: "time" as const,
    lowerIsBetter: true,
    measureMode: "per_team" as const,
  },
  {
    name: "Airbike",
    description: "Każdy zawodnik ma określony czas na spalenie jak największej liczby kalorii na Airbike'u.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_athlete" as const,
  },
  {
    name: "Wiosło",
    description: "Każdy zawodnik ma określony czas na spalenie jak największej liczby kalorii na wioślarzu.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_athlete" as const,
  },
  {
    name: "Wisielec",
    description: "Każdy zawodnik wisi na drążku jak najdłużej (max 5 min). Wspólny start, osobny pomiar dla każdego.",
    scoreType: "time" as const,
    lowerIsBetter: false,
    measureMode: "per_athlete" as const,
  },
  {
    name: "Siatkówka",
    description: "Przerzucanie obciążonych piłek przez 2m ścianę z jednego pola na drugie. Liczy się suma kilogramów przeniesionych przez całą drużynę.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_team" as const,
  },
  {
    name: "Równoważnia",
    description: "Tor równoważniowy — zaliczony punkt za każde ukończone przejście. Jeśli zawodnik spadnie, wszyscy za nim cofają się do początku.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_team" as const,
  },
  {
    name: "Lina",
    description: "Wchodzenie na linę i uderzenie w dzwonek. Liczy się łączna liczba uderzeń przez całą drużynę.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_team" as const,
  },
  {
    name: "Sanki",
    description: "Drużyna transportuje się na drugą stronę na sankach. Liczy się łączna liczba pełnych przejazdów.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_team" as const,
  },
  {
    name: "Biegacz",
    description: "Jedna bieżnia Air Runner — w określonym czasie zawodnicy mogą się dowolnie zmieniać. Liczy się łączna liczba przebiegniętych metrów.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_team" as const,
  },
  {
    name: "Wallball",
    description: "Podrzucanie obciążonej piłki — jedna piłka, zawodnicy mogą się dowolnie zmieniać. Liczy się łączna liczba pełnych wallbali.",
    scoreType: "points" as const,
    lowerIsBetter: false,
    measureMode: "per_team" as const,
  },
];

async function run() {
  console.log("Usuwanie starych eventCompetitions...");
  await db.delete(eventCompetitions);

  console.log("Usuwanie starych konkurencji (kaskadowo usuwa wyniki)...");
  await db.delete(competitions);

  console.log("Wstawianie nowych konkurencji...");
  const inserted = await db.insert(competitions).values(newCompetitions).returning();
  console.log(`Utworzono ${inserted.length} konkurencji`);

  const allEvents = await db.select().from(events);
  if (allEvents.length === 0) {
    console.log("Brak eventów — pomiń linkowanie.");
    process.exit(0);
  }

  for (const event of allEvents) {
    await db.insert(eventCompetitions).values(
      inserted.map((c, i) => ({ eventId: event.id, competitionId: c.id, displayOrder: i + 1 }))
    );
    console.log(`Połączono ${inserted.length} konkurencji z eventem: ${event.name}`);
  }

  console.log("Gotowe!");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
