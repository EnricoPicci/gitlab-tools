"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareForkLastTagOrBranchWithUpstreamDefaultBranch$ = exports.compareForkLastTagOrBranchWithFirstCommit$ = exports.writeCompareForksWithUpstreamFileDetailsInGroupToCsv$ = exports.writeCompareForksInGroupWithUpstreamToCsv$ = exports.compareForksInGroupWithUpstreamFileDetails$ = exports.compareForksWithUpstreamInGroup$ = exports.writeCompareForksWithFirstCommitFileDetailsInGroupToCsv$ = exports.writeCompareForksInGroupWithFirstCommitToCsv$ = exports.compareForksInGroupWithFirstCommitFileDetails$ = exports.compareForksWithFirstCommitInGroup$ = void 0;
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const observable_fs_1 = require("observable-fs");
const csv_tools_1 = require("@enrico.piccinin/csv-tools");
const project_1 = require("./project");
const branches_tags_1 = require("./branches-tags");
const group_1 = require("./group");
const commits_1 = require("./commits");
const forks_1 = require("./forks");
// for the function compareForksWithFirstCommitInGroup$ we do need to pass the projectsWithNoChanges array
// the reason is that there are cases when a project has been forked but no commits have been made to it
// since the fork was created. In this case we do not generate a comparison result for the project because there 
// is no commit to compare with. 
// In such cases we add the project name to the projectsWithNoChanges array and we return it
function compareForksWithFirstCommitInGroup$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges) {
    let count = 0;
    return (0, forks_1.readForkedProjectsForGroup$)(gitLabUrl, token, groupId, groupName).pipe((0, rxjs_1.concatMap)(project => {
        count += 1;
        console.log(`====>>>> Analyzing project ${project.name_with_namespace}`);
        return compareForkLastTagOrBranchWithFirstCommit$(gitLabUrl, token, project.id.toString(), project.name_with_namespace, projectsWithNoChanges);
    }), (0, rxjs_1.tap)({
        complete: () => {
            console.log(`====>>>> Total number of for projects analyzed`, count);
        }
    }));
}
exports.compareForksWithFirstCommitInGroup$ = compareForksWithFirstCommitInGroup$;
function compareForksInGroupWithFirstCommitFileDetails$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges) {
    return compareForksWithFirstCommitInGroup$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges).pipe((0, rxjs_1.tap)(comparisonResult => {
        if (comparisonResult.diffs.length === 0) {
            projectsWithNoChanges.push(comparisonResult.project_name);
        }
    }), (0, rxjs_1.concatMap)((newComparisonResultWithDiffs)));
}
exports.compareForksInGroupWithFirstCommitFileDetails$ = compareForksInGroupWithFirstCommitFileDetails$;
function writeCompareForksInGroupWithFirstCommitToCsv$(gitLabUrl, token, groupId, outdir) {
    let groupName;
    const projectsWithNoChanges = [];
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    return (0, group_1.readGroup$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.concatMap)(group => {
        groupName = group.name;
        return compareForksWithFirstCommitInGroup$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges);
    }), (0, rxjs_1.map)(compareResult => {
        // delete the diffs field from the compareResult
        delete compareResult.diffs;
        return compareResult;
    }), (0, csv_tools_1.toCsvObs)(), (0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((compareResult) => {
        const outFile = path_1.default.join(outdir, `${groupName}-compare-with-first-commit-${timeStampYYYYMMDDHHMMSS}.csv`);
        return writeCompareResultsToCsv$(compareResult, groupName, outFile);
    }), (0, rxjs_1.concatMap)(() => {
        const outFile = path_1.default.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
        return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile);
    }));
}
exports.writeCompareForksInGroupWithFirstCommitToCsv$ = writeCompareForksInGroupWithFirstCommitToCsv$;
function writeCompareForksWithFirstCommitFileDetailsInGroupToCsv$(gitLabUrl, token, groupId, outdir) {
    const projectsWithNoChanges = [];
    let groupName;
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    return (0, group_1.readGroup$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.concatMap)(group => {
        groupName = group.name;
        return compareForksInGroupWithFirstCommitFileDetails$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges);
    }), (0, csv_tools_1.toCsvObs)(), (0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((compareResult) => {
        const outFile = path_1.default.join(outdir, `${groupName}-compare-with-first-commit-file-details-${timeStampYYYYMMDDHHMMSS}.csv`);
        return writeCompareResultsToCsv$(compareResult, groupName, outFile);
    }), (0, rxjs_1.concatMap)(() => {
        const outFile = path_1.default.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
        return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile);
    }));
}
exports.writeCompareForksWithFirstCommitFileDetailsInGroupToCsv$ = writeCompareForksWithFirstCommitFileDetailsInGroupToCsv$;
// for the function compareForksWithUpstreamInGroup$ we do not pass the projectsWithNoChanges array since even if
// there are no changes in a project we still generate a comparison result for it with no commits ahed or behind
function compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName) {
    let count = 0;
    return (0, forks_1.readForkedProjectsForGroup$)(gitLabUrl, token, groupId, groupName).pipe((0, rxjs_1.concatMap)(project => {
        count += 1;
        console.log(`====>>>> Analyzing project ${project.name_with_namespace}`);
        return compareForkLastTagOrBranchWithUpstreamDefaultBranch$(gitLabUrl, token, project.id.toString());
    }), (0, rxjs_1.tap)({
        complete: () => {
            console.log(`====>>>> Total number of for projects analyzed`, count);
        }
    }));
}
exports.compareForksWithUpstreamInGroup$ = compareForksWithUpstreamInGroup$;
// for the function compareForksWithUpstreamInGroup$ we do pass the projectsWithNoChanges array since there may be cases
// when a project has been forked but no commits have been made to it and to the upstream project since the fork was created.
// In this case there would be no diffs and therefore we do not generate any comparison result for the project.
// In this cases we want to add the project name to the projectsWithNoChanges array so that we have evidence that the project
// has no changes.
function compareForksInGroupWithUpstreamFileDetails$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges) {
    return compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName).pipe((0, rxjs_1.tap)(comparisonResult => {
        if (comparisonResult.diffs.length === 0) {
            projectsWithNoChanges.push(comparisonResult.project_name);
        }
    }), (0, rxjs_1.concatMap)((newComparisonResultWithDiffs)));
}
exports.compareForksInGroupWithUpstreamFileDetails$ = compareForksInGroupWithUpstreamFileDetails$;
function writeCompareForksInGroupWithUpstreamToCsv$(gitLabUrl, token, groupId, outdir) {
    let groupName;
    return (0, group_1.readGroup$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.concatMap)(group => {
        groupName = group.name;
        return compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName);
    }), (0, rxjs_1.map)(compareResult => {
        // delete the diffs field from the compareResult
        delete compareResult.diffs;
        return compareResult;
    }), (0, csv_tools_1.toCsvObs)(), (0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((compareResult) => {
        const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const outFile = path_1.default.join(outdir, `${groupName}-compare-with-upstream-${timeStampYYYYMMDDHHMMSS}.csv`);
        return writeCompareResultsToCsv$(compareResult, groupName, outFile);
    }));
}
exports.writeCompareForksInGroupWithUpstreamToCsv$ = writeCompareForksInGroupWithUpstreamToCsv$;
function writeCompareForksWithUpstreamFileDetailsInGroupToCsv$(gitLabUrl, token, groupId, outdir) {
    let groupName;
    const projectsWithNoChanges = [];
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    return (0, group_1.readGroup$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.concatMap)(group => {
        groupName = group.name;
        return compareForksInGroupWithUpstreamFileDetails$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges);
    }), (0, csv_tools_1.toCsvObs)(), (0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((compareResult) => {
        const outFile = path_1.default.join(outdir, `${groupName}-compare-with-upstream-file-details-${timeStampYYYYMMDDHHMMSS}.csv`);
        return writeCompareResultsToCsv$(compareResult, groupName, outFile);
    }), (0, rxjs_1.concatMap)(() => {
        const outFile = path_1.default.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
        return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile);
    }));
}
exports.writeCompareForksWithUpstreamFileDetailsInGroupToCsv$ = writeCompareForksWithUpstreamFileDetailsInGroupToCsv$;
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
function compareForkLastTagOrBranchWithFirstCommit$(gitLabUrl, token, projectId, projectName, projectsWithNoChanges) {
    const projectDataAndLastTagOrBranch$ = _getProjectDataAndLastTagOrBranchName$(gitLabUrl, token, projectId);
    const firstCommit$ = (0, commits_1.getFirstCommitSinceCreation$)(gitLabUrl, token, projectId);
    return (0, rxjs_1.forkJoin)([projectDataAndLastTagOrBranch$, firstCommit$]).pipe((0, rxjs_1.filter)(([_, firstCommit]) => {
        if (!firstCommit) {
            projectsWithNoChanges.push(projectName);
            return false;
        }
        return true;
    }), (0, rxjs_1.concatMap)(([{ projectData, lastTagOrBranchName }, firstCommit]) => {
        if (!firstCommit) {
            console.error(`====>>>> Error: project ${projectData.project_name} has no commits`);
            return [];
        }
        const from_firstCommit_to_fork$ = (0, project_1.compareFromTagOrBranchToCommit$)(gitLabUrl, token, projectData.project_id.toString(), firstCommit.id, lastTagOrBranchName);
        return from_firstCommit_to_fork$.pipe((0, rxjs_1.map)((from_firstCommit_to_fork) => {
            return { from_firstCommit_to_fork, projectData, firstCommit, lastTagOrBranchName };
        }));
    }), (0, rxjs_1.map)(({ from_firstCommit_to_fork, projectData, firstCommit, lastTagOrBranchName }) => {
        const num_commits_ahead = from_firstCommit_to_fork.commits.length;
        // build the url for GitLab that shows the commits ahead and behind for the forked project, a url like, for instance:
        // "https://git.ad.rgigroup.com/iiab/temporary_forks/payload-builder-core/-/tree/payload-builder-core-310.3.4?ref_type=tags"
        let first_commit_after_fork_creation_url = '---';
        const from_upstream_fork_url = from_firstCommit_to_fork.web_url;
        // check that there is a '/-/' in the url
        if (!from_upstream_fork_url.includes('/-/')) {
            console.error(`====>>>> Error: from_firstCommit_to_fork ${from_upstream_fork_url} does not contain '/-/'`);
        }
        else {
            const from_upstream_fork_url_parts = from_upstream_fork_url.split('/-/');
            const base_part = from_upstream_fork_url_parts[0];
            first_commit_after_fork_creation_url = `${base_part}/-/tree/${firstCommit.id}`;
        }
        const comparisonResult = {
            project_name: projectData.project_name_with_namespace,
            project_created: projectData.created_at,
            project_updated: projectData.updated_at,
            project_id: projectData.project_id,
            from_tag_branch_commit: firstCommit.id,
            to_tag_branch_commit: lastTagOrBranchName,
            num_commits_ahead: num_commits_ahead,
            num_commits_behind: 0,
            web_url_to_commit: from_firstCommit_to_fork.web_url,
            web_url_from_commit: first_commit_after_fork_creation_url,
            diffs: from_firstCommit_to_fork.diffs
        };
        return comparisonResult;
    }));
}
exports.compareForkLastTagOrBranchWithFirstCommit$ = compareForkLastTagOrBranchWithFirstCommit$;
/**
 * Compares a forked GitLab project with its upstream repository.
 * The comparison is made between the last tag or branch of the project and the default branch of the upstream repository.
 *
 * This function performs the following steps:
 * 1. Reads project data and verifies if the project is a fork.
 * 2. Retrieves the last tag and the last branch of the project.
 * 3. Determines the most recent between the last tag and the last branch.
 * 4. Compares the forked project with its upstream repository default branch.
 * 5. Constructs a URL showing the commits ahead and behind for the forked project.
 *
 * @param {string} gitLabUrl - The URL of the GitLab instance.
 * @param {string} token - The access token for GitLab API.
 * @param {string} projectId - The ID of the project to compare.
 * @returns {Observable<Object>} An observable that emits an object containing comparison details.
 */
function compareForkLastTagOrBranchWithUpstreamDefaultBranch$(gitLabUrl, token, projectId) {
    const projectDataAndLastTagOrBranch$ = _getProjectDataAndLastTagOrBranchName$(gitLabUrl, token, projectId);
    return projectDataAndLastTagOrBranch$.pipe((0, rxjs_1.concatMap)(({ projectData, lastTagOrBranchName }) => {
        const from_fork_to_upstream$ = (0, project_1.compareProjects$)(gitLabUrl, token, projectData.project_id.toString(), lastTagOrBranchName, projectData.upstream_repo_id, projectData.upstream_repo_default_branch);
        const from_upstream_to_fork$ = (0, project_1.compareProjects$)(gitLabUrl, token, projectData.upstream_repo_id, projectData.upstream_repo_default_branch, projectData.project_id.toString(), lastTagOrBranchName);
        return (0, rxjs_1.forkJoin)([from_fork_to_upstream$, from_upstream_to_fork$]).pipe((0, rxjs_1.map)(([from_fork_to_upstream, from_upstream_to_fork]) => {
            var _a;
            return { from_fork_to_upstream, from_upstream_to_fork, projectData, lastTagOrBranchName, upstreamBranchName: projectData.upstream_repo_default_branch, url_to_remote_repo: (_a = projectData.upstream_repo) === null || _a === void 0 ? void 0 : _a.http_url_to_repo };
        }));
    }), (0, rxjs_1.map)(({ from_fork_to_upstream, from_upstream_to_fork, projectData, lastTagOrBranchName, upstreamBranchName, url_to_remote_repo }) => {
        const num_commits_ahead = from_upstream_to_fork.commits.length;
        const num_commits_behind = from_fork_to_upstream.commits.length;
        // build the url for GitLab that shows the commits ahead and behind for the forked project, a url like, for instance:
        // "https://git.ad.rgigroup.com/iiab/temporary_forks/payload-builder-core/-/tree/payload-builder-core-310.3.4?ref_type=tags"
        let ahead_behind_commits_url = '---';
        const from_upstream_fork_url = from_upstream_to_fork.web_url;
        // check that there is a '/-/' in the url
        if (!from_upstream_fork_url.includes('/-/')) {
            console.error(`====>>>> Error: from_upstream_fork_url ${from_upstream_fork_url} does not contain '/-/'`);
        }
        else {
            const from_upstream_fork_url_parts = from_upstream_fork_url.split('/-/');
            const base_part = from_upstream_fork_url_parts[0];
            ahead_behind_commits_url = `${base_part}/-/tree/${lastTagOrBranchName}`;
        }
        const comparisonWithUpstreamResult = {
            project_name: projectData.project_name_with_namespace,
            project_created: projectData.created_at,
            project_updated: projectData.updated_at,
            project_id: projectData.project_id,
            from_tag_branch_commit: lastTagOrBranchName,
            to_tag_branch_commit: upstreamBranchName,
            num_commits_ahead,
            num_commits_behind,
            web_url_from_commit: from_fork_to_upstream.web_url,
            web_url_to_commit: from_upstream_to_fork.web_url,
            upstream_repo_name: projectData.upstream_repo_name,
            upstream_repo_forks_count: projectData.upstream_repo_forks_count,
            url_to_remote_repo: url_to_remote_repo,
            ahead_behind_commits_url: ahead_behind_commits_url,
            diffs: from_fork_to_upstream.diffs
        };
        return comparisonWithUpstreamResult;
    }));
}
exports.compareForkLastTagOrBranchWithUpstreamDefaultBranch$ = compareForkLastTagOrBranchWithUpstreamDefaultBranch$;
const writeCompareResultsToCsv$ = (compareResults, group, outFile) => {
    return (0, observable_fs_1.writeFileObs)(outFile, compareResults)
        .pipe((0, rxjs_1.tap)({
        next: () => console.log(`====>>>> Fork compare result for Group ${group} written in csv file: ${outFile}`),
    }));
};
const writeProjectsWithNoChanges$ = (projectsWithNoChanges, group, outFile) => {
    return (0, observable_fs_1.writeFileObs)(outFile, projectsWithNoChanges)
        .pipe((0, rxjs_1.tap)({
        next: () => console.log(`====>>>> Forks with no commits for Group ${group} written in csv file: ${outFile}`),
    }));
};
function _readProject$(gitLabUrl, token, projectId) {
    return (0, project_1.readProject$)(gitLabUrl, token, projectId).pipe((0, rxjs_1.filter)(project => {
        if (project.forked_from_project === undefined) {
            console.error(`====>>>> Error: project ${project.name_with_namespace} is not a fork`);
            return false;
        }
        return true;
    }), (0, rxjs_1.map)(project => {
        const upstream = project.forked_from_project;
        const resp = {
            project_name: project.name,
            project_name_with_namespace: project.name_with_namespace,
            project_id: project.id,
            default_branch: project.default_branch,
            created_at: project.created_at,
            updated_at: project.updated_at,
            upstream_repo: upstream,
            upstream_repo_name: upstream === null || upstream === void 0 ? void 0 : upstream.name_with_namespace,
            upstream_repo_id: upstream === null || upstream === void 0 ? void 0 : upstream.id,
            upstream_repo_default_branch: upstream === null || upstream === void 0 ? void 0 : upstream.default_branch,
            upstream_repo_forks_count: upstream === null || upstream === void 0 ? void 0 : upstream.forks_count
        };
        return resp;
    }));
}
function _lastTagOrBranch(gitLabUrl, token, projectId) {
    const lastTag$ = (0, branches_tags_1.getTags$)(gitLabUrl, token, projectId).pipe((0, rxjs_1.map)(tags => {
        if (tags.length === 0) {
            return null;
        }
        // the last tag is the first in the array
        return tags[0];
    }));
    const lastBranch$ = (0, branches_tags_1.getLastBranch$)(gitLabUrl, token, projectId);
    return (0, rxjs_1.forkJoin)([lastTag$, lastBranch$]).pipe((0, rxjs_1.map)(([tag, branch]) => {
        if (tag === null && branch === null) {
            console.error(`====>>>> Error: project ${projectId} has no tags or branches`);
            return null;
        }
        if (tag === null) {
            return branch;
        }
        if (branch === null) {
            return tag;
        }
        if (tag.commit.committed_date > branch.commit.committed_date) {
            return tag;
        }
        return branch;
    }));
}
function _getProjectDataAndLastTagOrBranchName$(gitLabUrl, token, projectId) {
    const projectdata$ = _readProject$(gitLabUrl, token, projectId);
    const lastTagOrBranch$ = _lastTagOrBranch(gitLabUrl, token, projectId);
    return (0, rxjs_1.forkJoin)([projectdata$, lastTagOrBranch$]).pipe((0, rxjs_1.map)(([projectData, lastTagOrBranch]) => {
        const lastTagOrBranchName = lastTagOrBranch ? lastTagOrBranch.name : projectData.default_branch;
        return { projectData, lastTagOrBranchName };
    }), (0, rxjs_1.filter)(({ projectData, lastTagOrBranchName }) => {
        if (lastTagOrBranchName === undefined || projectData.upstream_repo_default_branch === undefined) {
            console.error(`====>>>> Error: lastTagName or upstream_repo_default_branch for project ${projectData.project_name} is undefined. LastTagName: ${lastTagOrBranchName}, upstream_repo_default_branch: ${projectData.upstream_repo_default_branch}`);
            return false;
        }
        return true;
    }));
}
function newComparisonResultWithDiffs(compareResult) {
    // for each diff in diffs create a new object with all the fields of the compareResult and the diff
    const { diffs } = compareResult, _compareResultWitNoDiffs = __rest(compareResult, ["diffs"]);
    const compareResultWitNoDiffs = _compareResultWitNoDiffs;
    const compareResultForFiles = diffs.map(diff => {
        var _a;
        const diffLines = diff.diff.split('\n');
        // numOfLinesAdded and numOfLinesDeleted are the number of lines added and deleted in the diff
        let numOfLinesAdded = 0;
        let numOfLinesDeleted = 0;
        diffLines.forEach(line => {
            if (line.startsWith('+')) {
                numOfLinesAdded += 1;
            }
            if (line.startsWith('-')) {
                numOfLinesDeleted += 1;
            }
        });
        const extension = path_1.default.extname(diff.new_path);
        const fileDetails = {
            new_path: diff.new_path,
            old_path: diff.old_path,
            extension,
            numOfLinesAdded,
            numOfLinesDeleted,
            renamed_file: diff.renamed_file,
            deleted_file: diff.deleted_file,
            generated_file: (_a = diff.generated_file) !== null && _a !== void 0 ? _a : false,
        };
        const rec = Object.assign(Object.assign({}, compareResultWitNoDiffs), fileDetails);
        return rec;
    });
    return compareResultForFiles;
}
//# sourceMappingURL=compare-forks.js.map