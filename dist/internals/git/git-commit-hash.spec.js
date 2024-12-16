"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const git_commit_hash_1 = require("./git-commit-hash");
describe(`isInGitCommitHashFormat`, () => {
    it(`should validate if a string is a valid git commit hash`, () => {
        const testCases = [
            { input: "535f140d6d9d3532e6f4018cd02ea5b4e83c8e39", expected: true },
            { input: "aae72b4", expected: true },
            { input: "aae72b", expected: false },
            { input: "xyz123", expected: false },
            { input: "  aae72b42  ", expected: true },
            { input: "", expected: false },
            { input: "aae72b42ad2a4d6a66f787e7297df455c0a2dfb6extra", expected: false }, // Too long
        ];
        testCases.forEach(({ input, expected }) => {
            const result = (0, git_commit_hash_1.isInGitCommitHashFormat)(input);
            (0, chai_1.expect)(result).equal(expected, `Expected ${input} to be ${expected ? 'valid' : 'invalid'}`);
        });
    });
});
//# sourceMappingURL=git-commit-hash.spec.js.map