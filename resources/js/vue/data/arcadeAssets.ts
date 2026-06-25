import bgGrammarForge from '../../../assets/images/ui/arcade/bg_grammar_forge.png';
import bgVocabRune from '../../../assets/images/ui/arcade/bg_vocab_rune.png';
import furnaceCore from '../../../assets/images/ui/arcade/furnace_core.png';
import wordTile from '../../../assets/images/ui/arcade/word_tile.png';
import runeTile from '../../../assets/images/ui/arcade/rune_tile.png';
import scrollPanel from '../../../assets/images/ui/arcade/scroll_panel.png';
import successBurst from '../../../assets/images/ui/arcade/success_burst.png';
import hammerStrike from '../../../assets/images/ui/arcade/hammer_strike.png';
import rankS from '../../../assets/images/ui/arcade/rank_s.png';
import rankA from '../../../assets/images/ui/arcade/rank_a.png';
import rankB from '../../../assets/images/ui/arcade/rank_b.png';
import rankC from '../../../assets/images/ui/arcade/rank_c.png';

export const ARCADE_ASSETS = {
  bgGrammarForge,
  bgVocabRune,
  furnaceCore,
  wordTile,
  runeTile,
  scrollPanel,
  successBurst,
  hammerStrike,
  rankS,
  rankA,
  rankB,
  rankC,
} as const;

export type ArcadeRank = 's' | 'a' | 'b' | 'c';

export function getArcadeRankBadge(rank: string): string {
  const key = String(rank || 'c').toLowerCase() as ArcadeRank;
  const map: Record<ArcadeRank, string> = {
    s: rankS,
    a: rankA,
    b: rankB,
    c: rankC,
  };
  return map[key] || rankC;
}
