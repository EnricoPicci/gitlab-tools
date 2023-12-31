"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clocOnRepos = void 0;
const rxjs_1 = require("rxjs");
const repos_in_folder_1 = require("../repos-functions/repos-in-folder");
const cloc_functions_1 = require("../cloc-functions/cloc.functions");
const config_1 = require("../config");
const commit_functions_1 = require("./commit.functions");
// clocOnRepos is a function that takes the path of a folder containing git repositories 
// and returns the cloc stats for each repository
function clocOnRepos(folderPath, concurrency = config_1.CONFIG.CONCURRENCY) {
    const total = {
        language: 'TOTAL',
        nFiles: 0,
        blank: 0,
        comment: 0,
        code: 0,
    };
    return (0, rxjs_1.from)((0, repos_in_folder_1.reposInFolder)(folderPath)).pipe((0, rxjs_1.mergeMap)(repoPath => {
        return (0, commit_functions_1.fetchCommits)(repoPath).pipe((0, rxjs_1.take)(1), (0, rxjs_1.map)((commit) => ({ repoPath, sha: commit.sha })));
    }), (0, rxjs_1.mergeMap)(({ repoPath, sha }) => {
        return (0, cloc_functions_1.runCloc)(sha, repoPath).pipe((0, rxjs_1.map)((clocStats) => {
            const sumStats = clocStats.find((clocStat) => clocStat.language === 'SUM');
            if (!sumStats) {
                throw new Error(`No SUM stats found for repo ${repoPath}`);
            }
            total.nFiles += sumStats.nFiles;
            total.blank += sumStats.blank;
            total.comment += sumStats.comment;
            total.code += sumStats.code;
            // remove the item with the key language 'SUM'
            clocStats = clocStats.filter((clocStat) => clocStat.language !== 'SUM');
            const repoStats = { repoPath, clocStats };
            return repoStats;
        }));
    }, concurrency), (0, rxjs_1.toArray)(), (0, rxjs_1.map)((repoStats) => {
        repoStats.push({ repoPath: folderPath, clocStats: [total] });
        return repoStats;
    }));
}
exports.clocOnRepos = clocOnRepos;
//# sourceMappingURL=repo-cloc.functions.js.map