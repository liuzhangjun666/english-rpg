export type TowerStatus =
  | 'idle' | 'starting' | 'answering' | 'boss' | 'settling' | 'reward' | 'failed';

export interface TowerQuestion {
  id: number;
  type: 'vocab' | 'grammar' | 'listening' | 'reading' | 'speaking' | string;
  prompt: string;
  options: string[];
  word?: string | null;
  listening_text?: string | null;
}

export interface BossPrompt {
  id: number;
  theme: string;
  title: string;
  topic?: string;
  passage?: string | null;
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
  answered_count?: number;
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
