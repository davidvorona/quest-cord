import Poll from "./Poll";

export type SocialAction = "talk" | "ignore";

type ResultCallback = (voteResult: SocialAction) => Promise<void>;

export default class SocialPoll extends Poll {
    votes: Record<string, SocialAction> = {};

    constructor(voters: string[], resultCallback: ResultCallback) {
        super(voters, resultCallback);
    }
}
