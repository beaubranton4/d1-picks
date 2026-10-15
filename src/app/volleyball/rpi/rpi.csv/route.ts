import { ratings } from '@/site/data';
import { rpiTable } from '@/site/derived';
import { csvResponse } from '@/site/download';
import { toCsv } from '@/site/sim';

export const dynamic = 'force-dynamic';

export function GET() {
  return csvResponse('/volleyball/rpi', `d1picks-volleyball-rpi-${ratings().as_of}.csv`, () => {
    const { rows } = rpiTable();
    return toCsv(
      ['rpi_rank', 'team', 'conference', 'rpi', 'wp', 'owp', 'oowp', 'wins', 'losses', 'model_rank', 'model_rating', 'avca_rank', 'ratings_as_of'],
      rows.map((r) => [
        r.rank,
        r.team.name,
        r.team.conference_name,
        r.rpi.toFixed(5),
        r.wp.toFixed(5),
        r.owp.toFixed(5),
        r.oowp.toFixed(5),
        r.wins,
        r.losses,
        r.team.rank,
        r.team.rating.toFixed(4),
        r.team.avca_rank,
        ratings().as_of,
      ]),
    );
  });
}
