"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastBranch$ = exports.getBranches$ = exports.getTags$ = void 0;
const axios_1 = __importDefault(require("axios"));
const rxjs_1 = require("rxjs");
const paged_command_1 = require("./paged-command");
function getTags$(gitLabUrl, token, projectId) {
    const command = `https://${gitLabUrl}/api/v4/projects/${projectId}/repository/tags`;
    return (0, rxjs_1.from)(axios_1.default.get(command, {
        headers: {
            "PRIVATE-TOKEN": token
        }
    })).pipe((0, rxjs_1.map)(resp => {
        return resp.data;
    }));
}
exports.getTags$ = getTags$;
function getBranches$(gitLabUrl, token, projectId) {
    console.log(`Start reading branches for project ${projectId}`);
    const command = getBranchesCommand(gitLabUrl, projectId);
    return (0, paged_command_1.runPagedCommand)(command, token, 'branches');
}
exports.getBranches$ = getBranches$;
function getLastBranch$(gitLabUrl, token, projectId) {
    return getBranches$(gitLabUrl, token, projectId).pipe((0, rxjs_1.map)(branches => {
        // sort by commit date
        branches.sort((a, b) => {
            return new Date(b.commit.committed_date).getTime() - new Date(a.commit.committed_date).getTime();
        });
        return branches[0];
    }));
}
exports.getLastBranch$ = getLastBranch$;
function getBranchesCommand(gitLabUrl, projectId) {
    return `https://${gitLabUrl}/api/v4/projects/${projectId}/repository/branches?per_page=100`;
}
//# sourceMappingURL=branches-tags.js.map