import Narrator from "../game/Narrator";
import Poll from "../game/polls/Poll";
import TravelPoll from "../game/polls/TravelPoll";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultCallback = (voteResult: any) => Promise<void>;

export enum PollType {
    Travel = "Travel"
}

// RuneScape
export default class PollBooth {
    polls: Partial<Record<PollType, Poll>> = {};

    narrator: Narrator;

    votesNeeded: number;

    constructor(narrator: Narrator, votesNeeded: number) {
        this.narrator = narrator;
        this.votesNeeded = votesNeeded;
    }

    doesPollTypeExist = (type: PollType) => type in this.polls;

    doesPollExist = (poll?: Poll): poll is Poll => poll !== undefined;

    getPoll = (type: PollType) => this.polls[type];

    assertAndGetPoll(type: PollType) {
        const poll = this.getPoll(type);
        if (!this.doesPollExist(poll)) {
            throw new Error(`Poll does not exist for type '${type}'`);
        }
        return poll;
    }

    createPollIfNotExists(type: PollType, resultCallback: ResultCallback) {
        if (this.doesPollTypeExist(type)) {
            return;
        }
        // If poll type does not exist, create a new one
        switch (type) {
        case PollType.Travel:
            this.polls[type] = new TravelPoll(this.votesNeeded, resultCallback);
            break;
        default:
            throw new Error(`Invalid poll type: ${type}`);
        }
        console.info(`${type} poll created`);
    }

    async castVote(type: PollType, vote: string, resultCallback: ResultCallback) {
        this.createPollIfNotExists(type, resultCallback);
        const poll = this.assertAndGetPoll(type);
        console.info(`Vote cast for '${vote}'`);
        await poll.castVote(vote);
    }
}
