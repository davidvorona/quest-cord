import path from "path";
import { parseJson, readFile, rand } from "./util";
import { AnyObject } from "./types";

const lexiconPath = path.join(__dirname, "../config/lexicon.json");
const lexicon = parseJson(readFile(lexiconPath)) as AnyObject;

export default class TextBuilder {
    activity = "";

    subActivity = "";

    setActivity(activity: string) {
        if (!lexicon[activity]) {
            throw new Error(`Invalid activity: ${activity}`);
        }
        this.activity = activity;
        return this;
    }

    setSubActivity(subActivity: string) {
        if (!lexicon[this.activity][subActivity]) {
            throw new Error(`Invalid sub-activity: ${subActivity}`);
        }
        this.subActivity = subActivity;
        return this;
    }

    private static reduceArgArray(argArr: string[]) {
        const counts: Record<string, number> = {};
        argArr.forEach((arg) => {
            if (!counts[arg]) {
                counts[arg] = 0;
            }
            counts[arg] += 1;
        });
        return Object.keys(counts).map(k => `${counts[k]} ${k}${counts[k] > 1 ? "s" : ""}`);
    }

    private static stringifyArgs(args: (string | number | string[])[]) {
        return args.map((arg) => {
            if (typeof arg === "string") {
                return arg;
            }
            if (typeof arg === "number") {
                return arg.toString();
            }
            if (Array.isArray(arg)) {
                const argArr = TextBuilder.reduceArgArray(arg);
                if (argArr.length === 1) {
                    return argArr[0];
                }
                if (argArr.length === 2) {
                    return `${argArr[0]} and ${argArr[1]}`;
                }
                return argArr.reduce((acc, curr, idx) => {
                    if (idx === 0) {
                        return curr;
                    }
                    if (idx === argArr.length - 1) {
                        return `${acc}, and ${curr}`;
                    }
                    return `${acc}, ${curr}`;
                }, "");
            }
        });
    }

    build(...args: (string | string[])[]) {
        const templates = lexicon[this.activity][this.subActivity];
        let template = templates[rand(templates.length)];
        const strArgs = TextBuilder.stringifyArgs(args);
        strArgs.forEach((arg, idx) => {
            const num = idx + 1;
            const sub = `$${num}`;
            const subIdx = template.indexOf(sub);
            if (subIdx > -1) {
                template = template.replace(sub, arg);
            }
        });
        return template;
    }
}
