import { Direction } from "../../types";
import Poll from "./Poll";

type ResultCallback = (voteResult: Direction) => Promise<void>;

export default class TravelPoll extends Poll {
    votes: Direction[] = [];

    constructor(votesNeeded: number, resultCallback: ResultCallback) {
        super(votesNeeded, resultCallback);
    }
}
