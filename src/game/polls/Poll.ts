// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultCallback = (voteResult: any) => Promise<void>;

export default class Poll {
    resultCallbackLocked = false;

    /**
     * Callback function that is invoked once the poll results are
     * out. Note: avoid replies to interactions, as they will not
     * work as intended.
     */
    resultCallback: ResultCallback;

    votes: Record<string, string> = {};

    voters: string[];

    constructor(voters: string[], resultCallback: ResultCallback) {
        this.voters = voters;
        this.resultCallback = resultCallback;
    }

    private countVotes = () => Object.keys(this.votes).length;

    private findVoteCounts() {
        const counts: Record<string, number> = {};
        const votes = Object.values(this.votes);
        for (let i = 0; i < this.countVotes(); i++) {
            const vote = votes[i];
            if (!counts[vote]) {
                counts[vote] = 0;
            }
            counts[vote] += 1;
        }
        return counts;
    }

    private findHighestVote() {
        const counts = this.findVoteCounts();
        // Default to first vote
        let highestVote = Object.values(this.votes)[0];
        Object.keys(counts).forEach((vote) => {
            if (counts[vote] > counts[highestVote]) {
                highestVote = vote;
            }
        });
        return highestVote;
    }

    private findMajorityVote() {
        const majorityCount = Math.floor(this.voters.length / 2) + 1;
        const counts: Record<string, number> = {};
        const votes = Object.values(this.votes);
        let result;
        for (let i = 0; i < this.countVotes(); i++) {
            const vote = votes[i];
            if (!counts[vote]) {
                counts[vote] = 0;
            }
            counts[vote] += 1;
            if (counts[vote] >= majorityCount) {
                result = vote;
                break;
            }
        }
        return result;
    }

    /**
     * Tries to determine a valid result from the votes so far. First
     * it checks for a majority vote and returns that as the result if
     * it exists. If no majority vote is found, it checks if all votes
     * have been cast. If they have, then the result is either the highest
     * vote or - if a winner has still not been decided - randomly chosen
     * between the highest.
     */
    findResult() {
        let result = this.findMajorityVote();
        if (result) {
            console.info("Result found (majority):", result);
        } else if (this.countVotes() >= this.voters.length) {
            result = this.findHighestVote();
            console.info("Result found (highest):", result);
        }
        return result;
    }

    castVote(voterId: string, value: string) {
        this.votes[voterId] = value;
    }

    private lockResult() {
        this.resultCallbackLocked = true;
    }

    private unlockResult() {
        this.resultCallbackLocked = false;
    }

    /**
     * Invokes the result callback. To prevent the callback from being invoked
     * multiple times due to a race condition, a lock is placed on the callback
     * until it resolves and the poll is deleted, or until it throws an error.
     */
    async handleResult(result: string) {
        if (this.resultCallbackLocked) {
            throw new Error("Poll result callback is locked, aborting");
        }
        this.lockResult();
        try {
            await this.resultCallback(result);
        } catch (err) {
            this.unlockResult();
            throw err;
        }
    }
}
