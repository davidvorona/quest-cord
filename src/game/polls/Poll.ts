// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultCallback = (voteResult: any) => Promise<void>;

export default class Poll {
    /**
     * Callback function that is invoked once the poll results are
     * out. Note: avoid replies to interactions, as they will not
     * work as intended.
     */
    resultCallback?: ResultCallback;

    votes: string[] = [];

    votesNeeded: number;

    constructor(votesNeeded: number, resultCallback: ResultCallback) {
        this.votesNeeded = votesNeeded;
        this.resultCallback = resultCallback;
    }

    private countVotes() {
        const counts: Record<string, number> = {};
        for (let i = 0; i < this.votes.length; i++) {
            const vote = this.votes[i];
            if (!counts[vote]) {
                counts[vote] = 0;
            }
            counts[vote] += 1;
        }
        return counts;
    }

    private findHighestVote() {
        const counts = this.countVotes();
        // Default to first vote
        let highestVote = this.votes[0];
        Object.keys(counts).forEach((vote) => {
            if (counts[vote] > counts[highestVote]) {
                highestVote = vote;
            }
        });
        return highestVote;
    }

    private findMajorityVote() {
        const majorityCount = Math.floor(this.votesNeeded / 2) + 1;
        const counts: Record<string, number> = {};
        let result;
        for (let i = 0; i < this.votes.length; i++) {
            const vote = this.votes[i];
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
        } else if (this.votes.length >= this.votesNeeded) {
            result = this.findHighestVote();
            console.info("Result found (highest):", result);
        }
        return result;
    }

    castVote(value: string) {
        this.votes.push(value);
    }

    async handleResult(result: string) {
        if (this.resultCallback) {
            await this.resultCallback(result);
        }
        this.closePoll();
    }

    closePoll() {
        this.resultCallback = undefined;
        this.votes = [];
    }
}
