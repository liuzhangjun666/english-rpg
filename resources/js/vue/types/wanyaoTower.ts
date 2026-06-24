export type TowerStatus =
  | 'idle' | 'starting' | 'answering' | 'boss' | 'settling' | 'reward' | 'failed';

export interface TowerQuestion {
  id: number;
  type: 'vocab';
  prompt: string;
  options: string[];
}

export interface BossPrompt {
  id: number;
  theme: string;
  title: string;
  min_chars: number;
  time_limit: number;
}

export interface TowerRunPayload {
  run_id: number;
  floor: number;
  theme: string;
  vocab_tier: string;
  questions: TowerQuestion[];
  boss_prompt: BossPrompt;
}

export interface TowerStatusPayload {
  current_floor: number;
  highest_floor: number;
  in_progress_run_id: number | null;
}

export interface SettleResult {
  cleared: boolean;
  perfect: boolean;
  stones: number;
  demons_added: number;
  is_first_clear: boolean;
  breakthrough: boolean;
  new_floor: number;
  highest_floor: number;
}
