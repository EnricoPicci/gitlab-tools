import path from "path"
import { filter, map, forkJoin, concatMap, toArray, tap } from "rxjs"

import { writeFileObs } from "observable-fs";
import { toCsvObs } from "@enrico.piccinin/csv-tools";

import { compareFromTagOrBranchToCommit$, compareProjects$, readProject$ } from "./project"
import { getLastBranch$, getTags$ } from "./branches-tags"
import { readGroup$ } from "./group"
import { getFirstCommitSinceCreation$ } from "./commits";
import { readForkedProjectsForGroup$ } from "./forks";



//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */


// COMPARE WITH UPSTREAM
// for the function compareForksWithUpstreamInGroup$ we do not pass the projectsWithNoChanges array since even if
// there are no changes in a project we still generate a comparison result for it with no commits ahed or behind
export function compareForksWithUpstreamInGroup$(gitLabUrl: string, token: string, groupId: string, groupName: string) {
    let count = 0
    return readForkedProjectsForGroup$(gitLabUrl, token, groupId, groupName).pipe(
        concatMap(project => {
            count += 1
            console.log(`====>>>> Analyzing project ${project.name_with_namespace}`)
            return compareForkLastTagOrBranchWithUpstreamDefaultBranch$(gitLabUrl, token, project.id.toString())
        }),
        tap({
            complete: () => {
                console.log(`====>>>> Total number of for projects analyzed`, count)
            }
        })
    )
}

// for the function compareForksWithUpstreamInGroup$ we do pass the projectsWithNoChanges array since there may be cases
// when a project has been forked but no commits have been made to it and to the upstream project since the fork was created.
// In this case there would be no diffs and therefore we do not generate any comparison result for the project.
// In this cases we want to add the project name to the projectsWithNoChanges array so that we have evidence that the project
// has no changes.
export function compareForksInGroupWithUpstreamFileDetails$(
    gitLabUrl: string, token: string, groupId: string, groupName: string, projectsWithNoChanges: string[]
) {
    return compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName).pipe(
        tap(comparisonResult => {
            if (comparisonResult.diffs.length === 0) {
                projectsWithNoChanges.push(comparisonResult.project_name!)
            }
        }),
        concatMap(newComparisonResultWithDiffs),
    )
}

export function writeCompareForksInGroupWithUpstreamToCsv$(gitLabUrl: string, token: string, groupId: string, outdir: string) {
    let groupName: string

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksWithUpstreamInGroup$(gitLabUrl, token, groupId, groupName)
        }),
        map(compareResult => {
            // delete the diffs field from the compareResult
            delete (compareResult as { diffs?: any }).diffs
            return compareResult
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]
            const outFile = path.join(outdir, `${groupName}-compare-with-upstream-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, groupName, outFile)
        }),
    )
}

export function writeCompareForksWithUpstreamFileDetailsInGroupToCsv$(
    gitLabUrl: string, token: string, groupId: string, outdir: string
) {
    let groupName: string
    const projectsWithNoChanges: string[] = []

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksInGroupWithUpstreamFileDetails$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges)
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${groupName}-compare-with-upstream-file-details-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile)
        }),
    )
}
//======================================================================================================================


// COMPARE WITH FIRST COMMIT
// for the function compareForksWithFirstCommitInGroup$ we do need to pass the projectsWithNoChanges array
// the reason is that there are cases when a project has been forked but no commits have been made to it
// since the fork was created. In this case we do not generate a comparison result for the project because there 
// is no commit to compare with. 
// In such cases we add the project name to the projectsWithNoChanges array and we return it
export function compareForksWithFirstCommitInGroup$(
    gitLabUrl: string, token: string, groupId: string, groupName: string, projectsWithNoChanges: string[]
) {
    let count = 0
    return readForkedProjectsForGroup$(gitLabUrl, token, groupId, groupName).pipe(
        concatMap(project => {
            count += 1
            console.log(`====>>>> Analyzing project ${project.name_with_namespace}`)
            return compareForkLastTagOrBranchWithFirstCommit$(gitLabUrl, token, project.id.toString(), project.name_with_namespace, projectsWithNoChanges)
        }),
        tap({
            complete: () => {
                console.log(`====>>>> Total number of for projects analyzed`, count)
            }
        })
    )
}

export function compareForksInGroupWithFirstCommitFileDetails$(
    gitLabUrl: string, token: string, groupId: string, groupName: string, projectsWithNoChanges: string[]
) {
    return compareForksWithFirstCommitInGroup$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges).pipe(
        tap(comparisonResult => {
            if (comparisonResult.diffs.length === 0) {
                projectsWithNoChanges.push(comparisonResult.project_name!)
            }
        }),
        concatMap(newComparisonResultWithDiffs),
    )
}

export function writeCompareForksInGroupWithFirstCommitToCsv$(gitLabUrl: string, token: string, groupId: string, outdir: string) {
    let groupName: string

    const projectsWithNoChanges: string[] = []

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksWithFirstCommitInGroup$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges)
        }),
        map(compareResult => {
            // delete the diffs field from the compareResult
            delete (compareResult as { diffs?: any }).diffs
            return compareResult
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${groupName}-compare-with-first-commit-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile)
        }),
    )
}

export function writeCompareForksWithFirstCommitFileDetailsInGroupToCsv$(
    gitLabUrl: string, token: string, groupId: string, outdir: string
) {
    const projectsWithNoChanges: string[] = []
    let groupName: string

    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    return readGroup$(gitLabUrl, token, groupId).pipe(
        concatMap(group => {
            groupName = group.name
            return compareForksInGroupWithFirstCommitFileDetails$(gitLabUrl, token, groupId, groupName, projectsWithNoChanges)
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${groupName}-compare--with-first-commit-file-details-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, groupName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${groupName}-projects-with-no-changes-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeProjectsWithNoChanges$(projectsWithNoChanges, groupName, outFile)
        }),
    )
}

//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes


export function compareForkLastTagOrBranchWithFirstCommit$(
    gitLabUrl: string, token: string, projectId: string, projectName: string, projectsWithNoChanges: string[]
) {
    const projectDataAndLastTagOrBranch$ = _getProjectDataAndLastTagOrBranchName$(gitLabUrl, token, projectId)

    const firstCommit$ = getFirstCommitSinceCreation$(gitLabUrl, token, projectId)

    return forkJoin([projectDataAndLastTagOrBranch$, firstCommit$]).pipe(
        filter(([_, firstCommit]) => {
            if (!firstCommit) {
                projectsWithNoChanges.push(projectName)
                return false
            }
            return true
        }),
        concatMap(([{ projectData, lastTagOrBranchName }, firstCommit]) => {
            if (!firstCommit) {
                console.error(`====>>>> Error: project ${projectData.project_name} has no commits`)
                return []
            }
            const from_firstCommit_to_fork$ = compareFromTagOrBranchToCommit$(
                gitLabUrl,
                token,
                projectData.project_id.toString(),
                firstCommit.id,
                lastTagOrBranchName
            )
            return from_firstCommit_to_fork$.pipe(
                map((from_firstCommit_to_fork) => {
                    return { from_firstCommit_to_fork, projectData, firstCommit, lastTagOrBranchName }
                })
            )
        }),
        map(({ from_firstCommit_to_fork, projectData, firstCommit, lastTagOrBranchName }) => {
            const num_commits_ahead = from_firstCommit_to_fork.commits.length
            // build the url for GitLab that shows the commits ahead and behind for the forked project, a url like, for instance:
            // "https://git.ad.rgigroup.com/iiab/temporary_forks/payload-builder-core/-/tree/payload-builder-core-310.3.4?ref_type=tags"
            let first_commit_after_fork_creation_url = '---'
            const from_upstream_fork_url = from_firstCommit_to_fork.web_url
            // check that there is a '/-/' in the url
            if (!from_upstream_fork_url.includes('/-/')) {
                console.error(`====>>>> Error: from_firstCommit_to_fork ${from_upstream_fork_url} does not contain '/-/'`)
            } else {
                const from_upstream_fork_url_parts = from_upstream_fork_url.split('/-/')
                const base_part = from_upstream_fork_url_parts[0]
                first_commit_after_fork_creation_url = `${base_part}/-/tree/${firstCommit.id}`
            }
            return {
                project_name: projectData.project_name_with_namespace,
                lastTagOrBranchName,
                firstCommit: firstCommit.id,
                upstream_repo_name: projectData.upstream_repo_name,
                num_commits_ahead,
                created: projectData.created_at,
                updated: projectData.updated_at,
                project_id: projectData.project_id,
                upstream_repo_forks_count: projectData.upstream_repo_forks_count,
                web_url_from_firstCommit_to_fork: from_firstCommit_to_fork.web_url,
                first_commit_after_fork_creation_url: first_commit_after_fork_creation_url,
                // diffs are the same for both from_firstCommit_to_fork and from_fork_to_firstCommit
                // diffs is optional since it is not used in the csv file
                diffs: from_firstCommit_to_fork.diffs
            }
        })
    )
}

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
export function compareForkLastTagOrBranchWithUpstreamDefaultBranch$(gitLabUrl: string, token: string, projectId: string) {
    const projectDataAndLastTagOrBranch$ = _getProjectDataAndLastTagOrBranchName$(gitLabUrl, token, projectId)

    return projectDataAndLastTagOrBranch$.pipe(
        concatMap(({ projectData, lastTagOrBranchName }) => {
            const from_fork_to_upstream$ = compareProjects$(
                gitLabUrl,
                token,
                projectData.project_id.toString(),
                lastTagOrBranchName,
                projectData.upstream_repo_id!,
                projectData.upstream_repo_default_branch!
            )
            const from_upstream_to_fork$ = compareProjects$(
                gitLabUrl,
                token,
                projectData.upstream_repo_id!,
                projectData.upstream_repo_default_branch!,
                projectData.project_id.toString(),
                lastTagOrBranchName
            )
            return forkJoin([from_fork_to_upstream$, from_upstream_to_fork$]).pipe(
                map(([from_fork_to_upstream, from_upstream_to_fork]) => {
                    return { from_fork_to_upstream, from_upstream_to_fork, projectData, lastTagOrBranchName, upstreamBranchName: projectData.upstream_repo_default_branch }
                })
            )
        }),
        map(({ from_fork_to_upstream, from_upstream_to_fork, projectData, lastTagOrBranchName, upstreamBranchName }) => {
            const num_commits_ahead = from_upstream_to_fork.commits.length
            const num_commits_behind = from_fork_to_upstream.commits.length
            // build the url for GitLab that shows the commits ahead and behind for the forked project, a url like, for instance:
            // "https://git.ad.rgigroup.com/iiab/temporary_forks/payload-builder-core/-/tree/payload-builder-core-310.3.4?ref_type=tags"
            let ahead_behind_commits_url = '---'
            const from_upstream_fork_url = from_upstream_to_fork.web_url
            // check that there is a '/-/' in the url
            if (!from_upstream_fork_url.includes('/-/')) {
                console.error(`====>>>> Error: from_upstream_fork_url ${from_upstream_fork_url} does not contain '/-/'`)
            } else {
                const from_upstream_fork_url_parts = from_upstream_fork_url.split('/-/')
                const base_part = from_upstream_fork_url_parts[0]
                ahead_behind_commits_url = `${base_part}/-/tree/${lastTagOrBranchName}`
            }
            return {
                project_name: projectData.project_name_with_namespace,
                fork_tag_or_branch: lastTagOrBranchName,
                upstream_repo_name: projectData.upstream_repo_name,
                upstream_repo_tag_or_branch: upstreamBranchName,
                num_commits_ahead,
                num_commits_behind,
                created: projectData.created_at,
                updated: projectData.updated_at,
                project_id: projectData.project_id,
                upstream_repo_forks_count: projectData.upstream_repo_forks_count,
                web_url_from_upstream_to_fork: from_upstream_to_fork.web_url,
                web_url_from_fork_to_upstream: from_fork_to_upstream.web_url,
                ahead_behind_commits_url: ahead_behind_commits_url,
                // diffs are the same for both from_fork_to_upstream and from_upstream_to_fork
                // diffs is optional since it is not used in the csv file
                diffs: from_fork_to_upstream.diffs
            }
        })
    )
}

const writeCompareResultsToCsv$ = (compareResults: any[], group: string, outFile: string) => {
    return writeFileObs(outFile, compareResults)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Fork compare result for Group ${group} written in csv file: ${outFile}`),
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


function _readProject$(gitLabUrl: string, token: string, projectId: string) {
    return readProject$(gitLabUrl, token, projectId).pipe(
        filter(project => {
            if (project.forked_from_project === undefined) {
                console.error(`====>>>> Error: project ${project.name_with_namespace} is not a fork`)
                return false
            }
            return true
        }),
        map(project => {
            const upstream = project.forked_from_project
            const resp = {
                project_name: project.name,
                project_name_with_namespace: project.name_with_namespace,
                project_id: project.id,
                default_branch: project.default_branch,
                created_at: project.created_at,
                updated_at: project.updated_at,
                upstream_repo: upstream,
                upstream_repo_name: upstream?.name_with_namespace,
                upstream_repo_id: upstream?.id,
                upstream_repo_default_branch: upstream?.default_branch,
                upstream_repo_forks_count: upstream?.forks_count
            }
            return resp
        }),
    )
}

function _lastTagOrBranch(gitLabUrl: string, token: string, projectId: string) {
    const lastTag$ = getTags$(gitLabUrl, token, projectId).pipe(
        map(tags => {
            if (tags.length === 0) {
                return null
            }
            // the last tag is the first in the array
            return tags[0]
        })
    )

    const lastBranch$ = getLastBranch$(gitLabUrl, token, projectId)

    return forkJoin([lastTag$, lastBranch$]).pipe(
        map(([tag, branch]) => {
            if (tag === null && branch === null) {
                console.error(`====>>>> Error: project ${projectId} has no tags or branches`)
                return null
            }
            if (tag === null) {
                return branch
            }
            if (branch === null) {
                return tag
            }
            if (tag.commit.committed_date > branch.commit.committed_date) {
                return tag
            }
            return branch
        })
    )
}

function _getProjectDataAndLastTagOrBranchName$(gitLabUrl: string, token: string, projectId: string) {
    const projectdata$ = _readProject$(gitLabUrl, token, projectId)

    const lastTagOrBranch$ = _lastTagOrBranch(gitLabUrl, token, projectId)

    return forkJoin([projectdata$, lastTagOrBranch$]).pipe(
        map(([projectData, lastTagOrBranch]) => {
            const lastTagOrBranchName = lastTagOrBranch ? lastTagOrBranch.name : projectData.default_branch
            return { projectData, lastTagOrBranchName }
        }),
        filter(({ projectData, lastTagOrBranchName }) => {
            if (lastTagOrBranchName === undefined || projectData.upstream_repo_default_branch === undefined) {
                console.error(`====>>>> Error: lastTagName or upstream_repo_default_branch for project ${projectData.project_name} is undefined. LastTagName: ${lastTagOrBranchName}, upstream_repo_default_branch: ${projectData.upstream_repo_default_branch}`)
                return false
            }
            return true
        }),
    )
}

const newComparisonResultWithDiffs = (compareResult: { diffs: any[] }) => {
    // for each diff in diffs create a new object with all the fields of the compareResult and the diff
    const { diffs, ...compareResultWitNoDiffs } = compareResult
    const compareResultForFiles = diffs.map(diff => {
        const diffLines: string[] = diff.diff.split('\n')
        // numOfLinesAdded and numOfLinesDeleted are the number of lines added and deleted in the diff
        let numOfLinesAdded = 0
        let numOfLinesDeleted = 0
        diffLines.forEach(line => {
            if (line.startsWith('+')) {
                numOfLinesAdded += 1
            }
            if (line.startsWith('-')) {
                numOfLinesDeleted += 1
            }
        })
        const extension = path.extname(diff.new_path)
        return {
            ...compareResultWitNoDiffs,
            new_path: diff.new_path,
            old_path: diff.old_path,
            extension,
            numOfLinesAdded,
            numOfLinesDeleted,
            renamed_file: diff.renamed_file,
            deleted_file: diff.deleted_file,
            generated_file: diff.generated_file ?? false,
        }
    })
    return compareResultForFiles
}