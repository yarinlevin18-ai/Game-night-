import { likely } from "./likely";
import { know } from "./know";
import { truth } from "./truth";
import { challenge } from "./challenge";
import { fastest } from "./fastest";
import { closest } from "./closest";
import { taboo, charades, headsup } from "./cards";
import { finale } from "./finale";
import { imposterGame } from "./imposter";
import type { GameDef } from "./types";

export const GAMES: GameDef[] = [likely, know, truth, imposterGame, challenge, fastest, closest, taboo, charades, headsup, finale];
export const gameById = (id: string | null | undefined) => GAMES.find((g) => g.id === id);
