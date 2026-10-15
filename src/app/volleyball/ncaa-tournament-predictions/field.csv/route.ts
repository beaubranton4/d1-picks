import { ratings } from '@/site/data';
import { AUTO_BID_NOTE, fieldProjection, rpiTable, SIM } from '@/site/derived';
import { csvResponse } from '@/site/download';
import { toCsv } from '@/site/sim';

export const dynamic = 'force-dynamic';

export function GET() {
  return csvResponse('/volleyball/ncaa-tournament-predictions', `d1picks-volleyball-ncaa-field-${ratings().as_of}.csv`, () => {
    const s = ratings();
    const proj = fieldProjection();
    const rpi = new Map(rpiTable().rows.map((r) => [r.id, r.rank]));
    const inField = new Map(proj.field.map((f, i) => [f.id, { seed: i + 1, kind: f.kind }]));
    const rows = [...s.teams]
      .sort((a, b) => proj.rows.get(b.id)!.pField - proj.rows.get(a.id)!.pField || a.rank - b.rank)
      .map((t) => {
        const p = proj.rows.get(t.id)!;
        const f = inField.get(t.id);
        return [
          t.name,
          t.conference_name,
          f ? f.seed : '',
          f ? f.kind : '',
          p.pChampion.toFixed(4),
          p.pAuto.toFixed(4),
          p.pAtLarge.toFixed(4),
          p.pField.toFixed(4),
          t.rank,
          t.rating.toFixed(4),
          rpi.get(t.id) ?? '',
          t.avca_rank,
          `${t.wins}-${t.losses}`,
          s.as_of,
          SIM.fieldTrials,
          SIM.fieldSeed,
          AUTO_BID_NOTE.csv,
        ];
      });
    return toCsv(
      ['team', 'conference', 'projected_seed', 'projected_bid', 'p_win_league', 'p_automatic_bid', 'p_at_large', 'p_make_field', 'model_rank', 'model_rating', 'rpi_rank', 'avca_rank', 'd1_record', 'ratings_as_of', 'simulations', 'seed', 'note'],
      rows,
    );
  });
}
