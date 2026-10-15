import { conferenceTables } from '@/site/derived';
import { csvResponse } from '@/site/download';
import { ratings } from '@/site/data';
import { toCsv } from '@/site/sim';

export const dynamic = 'force-dynamic';

const PATH = '/volleyball/conference-standings';

export function GET() {
  return csvResponse(PATH, `d1picks-volleyball-conference-standings-${ratings().as_of}.csv`, () => {
    const rows = conferenceTables().flatMap((c) =>
      c.teams.map((r) => [
        c.name,
        c.strengthRank,
        r.team.name,
        r.confW,
        r.confL,
        r.team.wins,
        r.team.losses,
        r.team.rank,
        r.team.rating.toFixed(4),
        r.pChampion.toFixed(4),
        r.team.avca_rank,
        ratings().as_of,
      ]),
    );
    return toCsv(
      ['conference', 'conference_strength_rank', 'team', 'conf_wins', 'conf_losses', 'd1_wins', 'd1_losses', 'model_rank', 'rating', 'conference_title_probability', 'avca_rank', 'ratings_as_of'],
      rows,
    );
  });
}
