import Narrator from "../Narrator";
import Poll from "./Poll";
import StealthPoll from "./StealthPoll";
import TravelPoll from "./TravelPoll";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultCallback = (voteResult: any) => Promise<void>;

export enum PollType {
    Travel = "Travel",
    Stealth = "Stealth",
    Social = "Social"
}

// RuneScape
export default class PollBooth {
    polls: Partial<Record<PollType, Poll>> = {};

    narrator: Narrator;

    voters: string[];

    constructor(narrator: Narrator, voters: string[]) {
        this.narrator = narrator;
        this.voters = voters;
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
            this.polls[type] = new TravelPoll(this.voters, resultCallback);
            break;
        case PollType.Stealth:
            this.polls[type] = new StealthPoll(this.voters, resultCallback);
            break;
        case PollType.Social:
            this.polls[type] = new StealthPoll(this.voters, resultCallback);
            break;
        default:
            throw new Error(`Invalid poll type: ${type}`);
        }
        console.info(`${type} poll created`);
    }

    async castVote(voterId: string, type: PollType, vote: string, resultCallback: ResultCallback) {
        this.createPollIfNotExists(type, resultCallback);
        const poll = this.assertAndGetPoll(type);
        // Cast the vote
        poll.castVote(voterId, vote);
        console.info(`User '${voterId}' casts vote for '${vote}'`);
        // Get and handle the result if it exists
        const result = poll.findResult();
        if (result) {
            await poll.handleResult(result);
            this.closePoll(type);
        }
    }

    private closePoll(type: PollType) {
        delete this.polls[type];
    }
}
