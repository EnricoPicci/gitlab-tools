"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirstCommitSinceCreation$ = exports.getFirstCommit$ = exports.getCommits$ = void 0;
const rxjs_1 = require("rxjs");
const paged_command_1 = require("./paged-command");
const project_1 = require("./project");
function getCommits$(gitLabUrl, token, projectId, stop) {
    console.log(`====>>>> reading all commits for project: ${projectId}`);
    const command = `https://${gitLabUrl}/api/v4/projects/${projectId}/repository/commits?per_page=100`;
    return (0, paged_command_1.runPagedCommand)(command, token, 'commits', stop).pipe((0, rxjs_1.tap)(commits => {
        console.log(`====>>>> number of commits read from GitLab: `, commits.length);
    }));
}
exports.getCommits$ = getCommits$;
function getFirstCommit$(gitLabUrl, token, projectId) {
    return getCommits$(gitLabUrl, token, projectId).pipe((0, rxjs_1.map)(commits => {
        // sort by date
        commits.sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        return commits[0];
    }));
}
exports.getFirstCommit$ = getFirstCommit$;
// in case of forked projects, the first commit is the first commit of the upstream project
// this is because when the fork is created, the forked project is created with the same commits as the upstream project
// with this function we retun the first commit after the fork was created
function getFirstCommitSinceCreation$(gitLabUrl, token, projectId) {
    return (0, project_1.readProject$)(gitLabUrl, token, projectId).pipe((0, rxjs_1.concatMap)(project => {
        const creationDate = new Date(project.created_at);
        const stop = (commits) => {
            const firstCommit = commits[commits.length - 1];
            return new Date(firstCommit.created_at) < creationDate;
        };
        return getCommits$(gitLabUrl, token, projectId, stop).pipe((0, rxjs_1.map)((commits) => {
            const creationDate = new Date(project.created_at);
            // find the first commit after the creation date
            // sort the commits by date ascending (the first commit is the oldest)
            commits.sort((a, b) => {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
            const firstCommit = commits.find((commit) => {
                return new Date(commit.created_at) > creationDate;
            });
            return firstCommit;
        }));
    }));
}
exports.getFirstCommitSinceCreation$ = getFirstCommitSinceCreation$;
//# sourceMappingURL=commits.js.map