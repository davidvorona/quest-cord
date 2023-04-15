import Poll from "./Poll";

export type StealthAction = "sneak" | "surprise";

type ResultCallback = (voteResult: StealthAction) => Promise<void>;

export default class StealthPoll extends Poll {
    votes: Record<string, StealthAction> = {};

    constructor(voters: string[], resultCallback: ResultCallback) {
        super(voters, resultCallback);
    }
}
