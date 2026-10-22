import { likely } from "./likely";
import { know } from "./know";
import { truth } from "./truth";
import { challenge } from "./challenge";
import { fastest } from "./fastest";
import { closest } from "./closest";
import { taboo, charades, headsup, teamTaboo, teamCharades, teamHeadsup } from "./cards";
import { teamTrivia } from "./teamTrivia";
import { finale } from "./finale";
import { imposterGame } from "./imposter";
import type { GameDef } from "./types";

export const GAMES: GameDef[] = [likely, know, truth, imposterGame, challenge, fastest, closest, taboo, charades, headsup, teamTaboo, teamCharades, teamHeadsup, teamTrivia, finale];
export const gameById = (id: string | null | undefined) => GAMES.find((g) => g.id === id);
