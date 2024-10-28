import path from "path"
import { concatMap, filter, toArray, tap, mergeMap } from "rxjs"

import { writeFileObs } from "observable-fs"
import { toCsvObs } from "@enrico.piccinin/csv-tools"

import { compareForksWithUpstreamInGroup$ } from "../gitlab/compare-forks"
import { readGroup$ } from "../gitlab/group"
import { allDiffsFromComparisonResult$, clocDiffRelFromComparisonResult$, ClocGitDiffRec } from "../cloc-git/cloc-git-diff-rel-between-commits"
import { explanationsFromComparisonResult$ } from "../git/explain-diffs"

//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */

/*
These functions extend the functions that compare forks with upstream or with the first commit after the fork was created
that are defined in the file src/internals/gitlab/compare-forks.ts.
These functions start from the comparison results provided by the functions in compare-forks.ts and enrich them with:
- cloc git diff information (info returned by the command cloc --git-diff-rel --by-file)
- git diff information (info returned by the command git diff) 

Moreover, leveraging the LLM, they provide explanations for the diffs generated by the LLM.
*/

//======================================================================================================================
// COMPARE WITH UPSTREAM WITH cloc --git-diff-rel --by-file INFORMATION

export function compareForksInGroupWithUpstreamClocGitDiffRelByFile$(
    gitLabUrl: string,
    token: string,
    groupId: string,
    groupName: string,
    projectsWithNoChanges: string[],
    repoRootFolder: string,
    executedCommands: string[],
    languages?: string[],
    concurrentClocGitDiff = 5
) {
    return compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName).pipe(
        filter(comparisonResult => {
            if (comparisonResult.diffs.length === 0) {
                projectsWithNoChanges.push(comparisonResult.project_name!)
                console.log(`Project ${comparisonResult.project_name} has no changes`)
                return false
            }
            return true
        }),
        mergeMap(comparisonResult => {
            return clocDiffRelFromComparisonResult$(comparisonResult, repoRootFolder, executedCommands, languages)
        }, concurrentClocGitDiff),
    )
}

export function writeCompareForksInGroupWithUpstreamClocGitDiffRelByFile$(
    gitLabUrl: string,
    token: string,
    groupId: string,
    repoRootFolder: string,
    outdir: string,
    languages?: string[]
) {
    const projectsWithNoChanges: string[] = []
    let groupName: string

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksInGroupWithUpstreamClocGitDiffRelByFile$(
                gitLabUrl, token, groupId, groupName, projectsWithNoChanges, repoRootFolder, executedCommands, languages
            )
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${groupName}-compare-with-upstream-cloc-diff-rel-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, groupName, outFile)
        })
    )
}

//======================================================================================================================
// COMPARE WITH UPSTREAM WITH cloc --git-diff-rel --by-file AND ENRICH WITH GIT DIFF INFORMATION ANS FILE CONTENT

// FileDiffWithGitDiffsAndFileContent defines the objects containing:
// - the cloc git diff information
// - the git diff information (the diffLines returned by git diff command and the status of the file, deleted, added, copied, renamed -
//   the status is determined by the second line of the git diff command output)
// - the file content
export type FileStatus = {
    deleted: null | boolean,
    added: null | boolean,
    copied: null | boolean,
    renamed: null | boolean,
}
export type FileDiffWithGitDiffsAndFileContent = ClocGitDiffRec & FileStatus & {
    diffLines: string,
    fileContent: string,
}
export function compareForksInGroupWithUpstreamAllDiffs$(
    gitLabUrl: string,
    token: string,
    groupId: string,
    groupName: string,
    projectsWithNoChanges: string[],
    repoRootFolder: string,
    executedCommands: string[],
    languages?: string[],
    concurrentClocGitDiff = 5
) {
    return compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName).pipe(
        filter(comparisonResult => {
            if (comparisonResult.diffs.length === 0) {
                projectsWithNoChanges.push(comparisonResult.project_name!)
                console.log(`Project ${comparisonResult.project_name} has no changes`)
                return false
            }
            return true
        }),
        mergeMap(comparisonResult => {
            return allDiffsFromComparisonResult$(comparisonResult, repoRootFolder, executedCommands, languages)
        }, concurrentClocGitDiff),
    )
}

export function writeCompareForksInGroupWithUpstreamAllDiffs$(
    gitLabUrl: string,
    token: string,
    groupId: string,
    repoRootFolder: string,
    outdir: string,
    languages?: string[]
) {
    const projectsWithNoChanges: string[] = []
    let groupName: string

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksInGroupWithUpstreamAllDiffs$(
                gitLabUrl, token, groupId, groupName, projectsWithNoChanges, repoRootFolder, executedCommands, languages
            )
        }),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${groupName}-compare-with-upstream-all-diffs-${timeStampYYYYMMDDHHMMSS}.json`);
            return writeCompareResultsToJson$(compareResult, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, groupName, outFile)
        })
    )
}

export type FileDiffWithGitDiffsAndFileContentWithExplanation = FileDiffWithGitDiffsAndFileContent & {
    explanation: string
}

//======================================================================================================================
// COMPARE WITH UPSTREAM WITH cloc --git-diff-rel --by-file AND PROVIDE AN EXPLANATION FOR THE DIFFS USING THE LLM

// DiffsWithExplanationRec defines the objects containing:
// - the cloc git diff information
// - the the status of the file (deleted, added, copied, renamed)
// - the explanation of the diffs generated by the LLM
// it has not the file content and the diffLines so that it can be written to a json or csv file
export type DiffsWithExplanationRec = ClocGitDiffRec & FileStatus & {
    explanation: string,
}
export type PromptTemplates = {
    changedFile: string,
    removedFile: string,
    addedFile: string,
}
export function compareForksInGroupWithUpstreamExplanation$(
    gitLabUrl: string,
    token: string,
    groupId: string,
    groupName: string,
    promptTemplates: PromptTemplates,
    repoRootFolder: string,
    projectsWithNoChanges: string[],
    executedCommands: string[],
    languages?: string[],
    concurrentLLMCalls = 5
) {
    return compareForksInGroupWithUpstreamAllDiffs$(
        gitLabUrl,
        token,
        groupId,
        groupName,
        projectsWithNoChanges,
        repoRootFolder,
        executedCommands,
        languages
    ).pipe(
        mergeMap(comparisonResult => {
            return explanationsFromComparisonResult$(comparisonResult, promptTemplates, executedCommands)
        }, concurrentLLMCalls),
    )
}

export function writeCompareForksInGroupWithUpstreamExplanation$(
    gitLabUrl: string,
    token: string,
    groupId: string,
    promptTemplates: PromptTemplates,
    repoRootFolder: string,
    outdir: string,
    languages?: string[]
) {
    const projectsWithNoChanges: string[] = []
    let groupName: string

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksInGroupWithUpstreamExplanation$(
                gitLabUrl, token, groupId, groupName, promptTemplates, repoRootFolder, projectsWithNoChanges, executedCommands, languages
            )
        }),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${groupName}-compare-with-upstream-explanations-${timeStampYYYYMMDDHHMMSS}.json`);
            return writeCompareResultsToJson$(compareResult, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, groupName, outFile)
        })
    )
}

//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

const writeCompareResultsToCsv$ = (compareResults: any[], group: string, outFile: string) => {
    return writeFileObs(outFile, compareResults)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Fork compare result for Group ${group} written in csv file: ${outFile}`),
            }),
        );
}

const writeCompareResultsToJson$ = (compareResults: any[], group: string, outFile: string) => {
    // dump compareResults as a json string
    const jsonArray = JSON.stringify(compareResults, null, 2)
    return writeFileObs(outFile, [jsonArray])
        .pipe(
            tap({
                next: () => console.log(`====>>>> Fork compare result for Group ${group} written in json file: ${outFile}`),
            }),
        );
}

const writeProjectsWithNoChanges$ = (projectsWithNoChanges: string[], group: string, outFile: string) => {
    return writeFileObs(outFile, projectsWithNoChanges)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Forks with no commits for Group ${group} written in csv file: ${outFile}`),
            }),
        );
}

const writeExecutedCommands$ = (executedCommands: string[], group: string, outFile: string) => {
    return writeFileObs(outFile, executedCommands)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Command executed to calculate fork diffs for group "${group}" written in csv file: ${outFile}`),
            }),
        );
}
