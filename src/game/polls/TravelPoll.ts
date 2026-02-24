import { Direction } from "../../constants";
import Poll from "./Poll";

type ResultCallback = (voteResult: Direction) => Promise<void>;

export default class TravelPoll extends Poll {
    votes: Record<string, Direction> = {};

    constructor(voters: string[], resultCallback: ResultCallback) {
        super(voters, resultCallback);
    }
}
