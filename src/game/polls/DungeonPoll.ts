import Poll from "./Poll";
import { DungeonVote } from "../../constants";

type ResultCallback = (voteResult: DungeonVote) => Promise<void>;

export default class DungeonPoll extends Poll {
    votes: Record<string, DungeonVote> = {};

    constructor(voters: string[], resultCallback: ResultCallback) {
        super(voters, resultCallback);
    }
}
