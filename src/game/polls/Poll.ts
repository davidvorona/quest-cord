import { randInList } from "../../util";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultCallback = (voteResult: any) => Promise<void>;

export enum PollingMethod {
    Majority = "Majority",
    Highest = "Highest",
    Random = "Random"
}

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

    private findHighestVotes() {
        const counts = this.findVoteCounts();
        // Default to first vote
        let highestVotes = [Object.values(this.votes)[0]];
        Object.keys(counts).forEach((vote) => {
            const highestVote = highestVotes[0];
            if (counts[vote] > counts[highestVote]) {
                highestVotes = [vote];
            } else if (counts[vote] === counts[highestVote]) {
                highestVotes.push(vote);
            }
        });
        return highestVotes;
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
    findResults() {
        let result = this.findMajorityVote();
        let method;
        if (result) {
            method = PollingMethod.Majority;
            console.info("Result found (majority):", result);
        } else if (this.countVotes() >= this.voters.length) {
            const highestVotes = this.findHighestVotes();
            if (highestVotes.length === 1) {
                method = PollingMethod.Highest;
                result = highestVotes[0];
                console.info("Result found (highest):", result);
            } else {
                method = PollingMethod.Random;
                result = randInList(highestVotes);
                console.info("Result found (random):", result);
            }
        }
        return {
            result,
            method
        };
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
