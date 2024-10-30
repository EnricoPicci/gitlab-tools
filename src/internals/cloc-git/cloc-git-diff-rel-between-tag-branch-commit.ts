import path from "path"
import { filter, skip, startWith, map, concatMap, catchError, of, Observable, mergeMap, tap, toArray, reduce } from "rxjs"

import json2md from 'json2md'

import { fromCsvObs, toCsvObs } from "@enrico.piccinin/csv-tools"
import { readLinesObs, writeFileObs } from "observable-fs"

import { executeCommandNewProcessToLinesObs } from "../execute-command/execute-command"
import { cdToProjectDirAndAddRemote$ } from "../git/add-remote"
import { gitDiff$, toFromTagBranchCommitPrefix } from "../git/git-diffs"
import { explainGitDiffs$, PromptTemplates } from "../git/explain-diffs"
import { summarizeDiffs$ } from "../git/summarize-diffs"

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
    url_to_remote_repo?: string
    use_ssh?: boolean
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
            url_to_remote_repo: comparisonParams.url_to_remote_repo,
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
    comparisonParams: ComparisonParams,
    repoRootFolder: string,
    executedCommands: string[],
    languages?: string[]
): Observable<FileDiffWithGitDiffsAndFileContent> {
    return clocDiffRelForProject$(comparisonParams, repoRootFolder, executedCommands, languages).pipe(
        // we MUST use concatMap here to ensure that gitDiff$ is not streaming concurrently but only sequentially
        // in other words gitDiff$ must return the bufferDiffLines value before starting for the next one
        // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Obsrvable accumulates the output
        // sent to the stdout and returns it as a buffer string (diffLinesString)
        // Using concatMap (which just mergeMap with concurrency set to 1) ensures that the command "git diff" 
        // is not executed concurrently for different projects
        concatMap(rec => {
            console.log(`Calculating git diff for ${rec.fullFilePath}`)
            return gitDiff$(
                rec.projectDir!,
                {
                    from_tag_or_branch: comparisonParams.from_tag_branch_commit,
                    to_tag_or_branch: comparisonParams.to_tag_branch_commit,
                    url_to_remote_repo: comparisonParams.url_to_remote_repo
                },
                rec.File,
                executedCommands
            ).pipe(
                map(diffLinesString => {
                    const diffLines = diffLinesString.toString()
                    const _lines = diffLines.split('\n')
                    const _rec: FileDiffWithGitDiffsAndFileContent = {
                        ...rec, diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null
                    }
                    if (_lines.length < 2) {
                        console.log(`No diff found for file ${rec.fullFilePath}`)
                        executedCommands.push(`===>>> No diff found for file ${rec.fullFilePath}`)
                        return { ..._rec, diffLines }
                    }
                    const secondLine = _lines[1]
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
        }),
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
    const startExecTime = new Date()
    return allDiffsForProject$(comparisonParams, repoFolder, executedCommands, languages).pipe(
        mergeMap(comparisonResult => {
            return explainGitDiffs$(comparisonResult, promptTemplates, executedCommands)
        }, concurrentLLMCalls),
        tap({
            complete: () => {
                console.log(`\n\nCompleted all diffs with explanations in ${new Date().getTime() - startExecTime.getTime()} ms\n\n`)
            }
        })
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
            const outFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, projectDirName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, projectDirName, outFile)
        })
    )
}

export function writeAllDiffsForProjectWithExplanationToMarkdown$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    repoFolder: string,
    outdir: string,
    languages?: string[]
) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    const mdJson = initializeMarkdown(comparisonParams, repoFolder, languages)

    return allDiffsForProjectWithExplanation$(comparisonParams, repoFolder, promptTemplates, executedCommands, languages).pipe(
        toArray(),
        concatMap((diffWithExplanation) => {
            appendNumFilesWithDiffsToMdJson(mdJson, diffWithExplanation.length)
            return summarizeDiffs$(diffWithExplanation, languages, projectDirName, executedCommands).pipe(
                map(summary => {
                    appendSummaryToMdJson(mdJson, summary)
                    return diffWithExplanation
                })
            )
        }),
        concatMap(diffs => diffs),
        reduce((mdJson, diffWithExplanation) => {
            appendCompResultToMdJson(mdJson, diffWithExplanation)
            return mdJson
        }, mdJson),
        tap(mdJson => {
            appendPromptsToMdJson(mdJson, promptTemplates)
        }),
        concatMap((mdJson) => {
            const outFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
            return writeCompareResultsToMarkdown$(mdJson, projectDirName, outFile)
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

// this stream is not safe in concurrent execution and therefore shouls NOT be called by operators that work concurrently
// e.g. mergeMap
export function clocDiffRel$(
    projectDir: string,
    fromToParams: { from_tag_or_branch: string, to_tag_or_branch: string, url_to_remote_repo?: string, languages?: string[] },
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
            const compareWithRemote = fromToParams.url_to_remote_repo ? true : false
            const prefixes = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, compareWithRemote)
            const args = [
                '--git-diff-rel',
                '--csv',
                '--by-file',
                `${prefixes.fromTagBranchCommitPrefix}${from_tag_branch_commit}`,
                `${prefixes.toTagBranchCommitPrefix}${to_tag_branch_commit}`
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

const writeCompareResultsToMarkdown$ = (mdJson: any[], projectDirName: string, outFile: string) => {
    const mdAsString = json2md(mdJson)
    return writeFileObs(outFile, [mdAsString])
        .pipe(
            tap({
                next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in markdown file: ${outFile}`),
            }),
        );
}

const writeCompareResultsToCsv$ = (compareResults: string[], projectDirName: string, outFile: string) => {
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
                next: () => console.log(`====>>>> Commands executed to calculate comparisons for project "${projectDirName}" written in txt file: ${outFile}`),
            }),
        );
}


function initializeMarkdown(
    comparisonParams: ComparisonParams,
    repoFolder: string,
    languages?: string[]
) {
    const projectDir = path.join(repoFolder, comparisonParams.projectDir)
    const inRemoteRepoMsg = comparisonParams.url_to_remote_repo ?
        ` in remote repo ${comparisonParams.url_to_remote_repo}` :
        ''

    const mdJson = [
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit} with ${comparisonParams.to_tag_branch_commit}` },
        { h2: `Project directory: ${projectDir}` },
        { h4: `From Tag Branch or Commit: ${comparisonParams.from_tag_branch_commit}` },
        { h4: `To Tag Branch or Commit: ${comparisonParams.to_tag_branch_commit}${inRemoteRepoMsg}` },
        { h4: `Languages considered: ${languages?.join(', ')}` },
        { p: '' },
        { p: '------------------------------------------------------------------------------------------------' },
    ]

    return mdJson
}

function appendNumFilesWithDiffsToMdJson(
    mdJson: any[],
    numFilesWithDiffs: number
) {
    mdJson.push({ h3: `Files with differences: ${numFilesWithDiffs}` })
    mdJson.push({ p: '==========================================================================' })
}

function appendCompResultToMdJson(
    mdJson: any[],
    compareResult: FileDiffWithExplanation
) {
    const linesOfCodeInfo = `lines of code: ${compareResult.code_same} same, ${compareResult.code_modified} modified, ${compareResult.code_added} added, ${compareResult.code_removed} removed`

    mdJson.push({ p: '------------------------------------------------------------------------------------------------' })
    mdJson.push({ h3: compareResult.File })
    mdJson.push({ p: compareResult.explanation })
    mdJson.push({ p: '' })
    mdJson.push({ p: linesOfCodeInfo })
}

function appendPromptsToMdJson(
    mdJson: any[],
    promptTemplates: PromptTemplates
) {
    const promptSectionTitle = [
        { p: '===========================================================================' },
        { h2: 'Prompt Templates' }
    ]
    mdJson.push(...promptSectionTitle)

    const promptTemplatesMdJson: any[] = []

    Object.values(promptTemplates).forEach((promptWithDescription) => {
        promptTemplatesMdJson.push({ h2: promptWithDescription.description })
        promptTemplatesMdJson.push({ p: promptWithDescription.prompt })
    })

    mdJson.push(...promptTemplatesMdJson)
}

function appendSummaryToMdJson(
    mdJson: any[],
    summary: string
) {
    mdJson.push({ p: '==========================================================================' })
    mdJson.push({ h2: 'Summary of all diffs' })
    mdJson.push({ p: summary })
    mdJson.push({ p: '==========================================================================' })
    mdJson.push({ p: '==================  Differences in files' })
}