import path from "path"
import { filter, skip, startWith, map, concatMap, catchError, of, Observable, mergeMap, tap, toArray } from "rxjs"

import { fromCsvObs, toCsvObs } from "@enrico.piccinin/csv-tools"
import { readLinesObs, writeFileObs } from "observable-fs"

import { executeCommandNewProcessToLinesObs } from "../execute-command/execute-command"
import { cdToProjectDirAndAddRemote$ } from "../git/add-remote"
import { gitDiff$, toFromTagBranchCommitPrefix } from "../git/git-diffs"
import { explainGitDiffs$, PromptTemplates } from "../git/explain-diffs"

//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */

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
export type ClocGitDiffRec = {
    File: string
    blank_same: string
    blank_modified: string
    blank_added: string
    blank_removed: string
    comment_same: string
    comment_modified: string
    comment_added: string
    comment_removed: string
    code_same: string
    code_modified: string
    code_added: string
    code_removed: string,
    projectDir: string,
    fullFilePath: string
    extension: string
}
export type FileDiffWithGitDiffsAndFileContent = ClocGitDiffRec & FileStatus & {
    diffLines: string,
    fileContent: string,
}

export type ComparisonParams = {
    projectDir: string
    from_tag_branch_commit: string
    to_tag_branch_commit: string
    upstream_url_to_repo?: string
}
export function clocDiffRelForProject$(
    comparisonParams: ComparisonParams, repoRootFolder: string, executedCommands: string[], languages?: string[]
) {
    const projectDir = path.join(repoRootFolder, comparisonParams.projectDir)
    const header = 'File,blank_same,blank_modified,blank_added,blank_removed,comment_same,comment_modified,comment_added,comment_removed,code_same,code_modified,code_added,code_removed'
    return clocDiffRel$(
        projectDir,
        {
            from_tag_or_branch: comparisonParams.from_tag_branch_commit,
            to_tag_or_branch: comparisonParams.to_tag_branch_commit,
            upstream_url_to_repo: comparisonParams.upstream_url_to_repo,
            languages
        },
        executedCommands
    ).pipe(
        filter(line => line.trim().length > 0),
        // skip the first line which is the header line
        // File, == blank, != blank, + blank, - blank, == comment, != comment, + comment, - comment, == code, != code, + code, - code, "github.com/AlDanial/cloc v 2.00 T=0.0747981071472168 s"
        skip(1),
        // start with the header line that we want to have
        startWith(header),
        map(line => {
            // remove trailing comma without using regular expressions
            const _line = line.trim()
            if (_line.endsWith(',')) {
                return _line.slice(0, -1)
            }
            return _line
        }),
        fromCsvObs<ClocGitDiffRec>(','),
        map(rec => {
            const fullFilePath = path.join(projectDir, rec.File)
            const extension = path.extname(fullFilePath)
            const recWithPojectDir = { ...rec, projectDir, fullFilePath, extension }
            return recWithPojectDir
        })
    )
}

export function allDiffsForProject$(
    comparisonParams: ComparisonParams, repoRootFolder: string, executedCommands: string[], languages?: string[], concurrentGitDiff = 5
): Observable<FileDiffWithGitDiffsAndFileContent> {
    return clocDiffRelForProject$(comparisonParams, repoRootFolder, executedCommands, languages).pipe(
        mergeMap(rec => {
            console.log(`Calculating git diff for ${rec.fullFilePath}`)
            return gitDiff$(
                rec.projectDir!,
                {
                    from_tag_or_branch: comparisonParams.from_tag_branch_commit,
                    to_tag_or_branch: comparisonParams.to_tag_branch_commit,
                    upstream_url_to_repo: comparisonParams.upstream_url_to_repo
                },
                rec.File,
                executedCommands
            ).pipe(
                map(bufferDiffLines => {
                    const diffLines = bufferDiffLines.toString()
                    const _lines = diffLines.split('\n')
                    const secondLine = _lines[1]
                    const _rec: FileDiffWithGitDiffsAndFileContent = {
                        ...rec, diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null
                    }
                    if (secondLine.startsWith('deleted file mode')) {
                        _rec.deleted = true
                    } else if (secondLine.startsWith('new file mode')) {
                        _rec.added = true
                    } else if (secondLine.startsWith('copy ')) {
                        _rec.copied = true
                    } else if (secondLine.startsWith('rename ')) {
                        _rec.renamed = true
                    }
                    return { ..._rec, diffLines }
                })
            )
        }, concurrentGitDiff),
        concatMap((rec: FileDiffWithGitDiffsAndFileContent & { diffLines: string }) => {
            return readLinesObs(rec.fullFilePath!).pipe(
                map(lines => {
                    return { ...rec, fileContent: lines.join('\n') } as FileDiffWithGitDiffsAndFileContent
                }),
                catchError(err => {
                    if (err.code === 'ENOENT') {
                        return of({ ...rec, fileContent: 'file not found' } as FileDiffWithGitDiffsAndFileContent)
                    }
                    throw err
                })
            )
        }),
    )
}

export type FileDiffWithExplanation = ClocGitDiffRec & FileStatus & {
    explanation: string,
}
export function allDiffsForProjectWithExplanation$(
    comparisonParams: ComparisonParams,
    repoFolder: string,
    promptTemplates: PromptTemplates,
    executedCommands: string[],
    languages?: string[],
    concurrentLLMCalls = 5
): Observable<FileDiffWithExplanation> {
    return allDiffsForProject$(comparisonParams, repoFolder, executedCommands, languages).pipe(
        mergeMap(comparisonResult => {
            return explainGitDiffs$(comparisonResult, promptTemplates, executedCommands)
        }, concurrentLLMCalls)
    )
}

export function writeAllDiffsForProjectWithExplanationToCsv$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    repoFolder: string,
    outdir: string,
    languages?: string[]
) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    return allDiffsForProjectWithExplanation$(comparisonParams, repoFolder, promptTemplates, executedCommands, languages).pipe(
        // replace any ',' in the explanation with a '-'
        map((diffWithExplanation) => {
            diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/,/g, '-')
            diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/;/g, ' ')
            return diffWithExplanation
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${projectDirName}-compare-with-upstream-explanations-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, projectDirName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, projectDirName, outFile)
        })
    )
}


//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

export function clocDiffRel$(
    projectDir: string,
    fromToParams: { from_tag_or_branch: string, to_tag_or_branch: string, upstream_url_to_repo?: string, languages?: string[] },
    executedCommands: string[]
) {
    return cdToProjectDirAndAddRemote$(
        projectDir,
        fromToParams,
        executedCommands
    ).pipe(
        concatMap(() => {
            const to_tag_branch_commit = fromToParams.to_tag_or_branch
            const from_tag_branch_commit = fromToParams.from_tag_or_branch
            // `cloc --git-diff-rel --csv --by-file base/${upstream_repo_tag_or_branch} origin/${fork_tag_or_branch}`
            const command = `cloc`
            const compareWithRemote = fromToParams.upstream_url_to_repo ? true : false
            const prefixes = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, compareWithRemote)
            const args = [
                '--git-diff-rel',
                '--csv',
                '--by-file',
                `${prefixes.toTagBranchCommitPrefix}${from_tag_branch_commit}`,
                `${prefixes.fromTagBranchCommitPrefix}${to_tag_branch_commit}`
            ]

            if (fromToParams.languages && fromToParams.languages?.length > 0) {
                const languagesString = fromToParams.languages.join(',');
                args.push(`--include-lang=${languagesString}`);
            }
            const options = {
                cwd: projectDir
            }
            return executeCommandNewProcessToLinesObs(
                'run cloc --git-diff-rel --csv --by-file', command, args, options, executedCommands
            )
        })
    )
}

const writeCompareResultsToCsv$ = (compareResults: any[], projectDirName: string, outFile: string) => {
    return writeFileObs(outFile, compareResults)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in csv file: ${outFile}`),
            }),
        );
}

const writeExecutedCommands$ = (executedCommands: string[], projectDirName: string, outFile: string) => {
    return writeFileObs(outFile, executedCommands)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Command executed to calculate comparisons for project "${projectDirName}" written in csv file: ${outFile}`),
            }),
        );
}
