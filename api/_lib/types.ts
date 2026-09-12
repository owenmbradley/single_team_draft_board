export type Position = 'Skater' | 'Goalie';

export type PlayerStatus = 'available' | 'my_team' | 'drafted' | 'captain';

export type Player = {
  id: string;
  name: string;
  position: Position;
  talent: number;
  vibes: number;
  notes: string;
  classYear: string;
  status: PlayerStatus;
  pickNumber: number | null;
  draftedByTeamId: string | null;
  captainOfTeamId: string | null;
};

export type Team = {
  id: string;
  name: string;
  slot: number;
  isUs: boolean;
};

export type DraftType = 'snake' | 'linear';

export type DraftSession = {
  name: string;
  draftType: DraftType;
  rounds: number;
  currentPick: number;
  teams: Team[];
  players: Player[];
};

export type PlayerInput = {
  name: string;
  position: Position;
  talent: number;
  vibes: number;
  notes: string;
  classYear: string;
};

export type ParsedPlayer = PlayerInput;

export type ImportResult = {
  players: ParsedPlayer[];
  warnings: string[];
  sheetName: string;
};
