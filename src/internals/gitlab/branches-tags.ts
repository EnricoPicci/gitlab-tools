import axios from "axios"
import { from, map } from "rxjs"
import { runPagedCommand } from "./paged-command"
import { removeHttpHttps } from "../url-utils/clean-url"

export function getTags$(gitLabUrl: string, token: string, projectId: string) {
    const cleanUrl = removeHttpHttps(gitLabUrl)
    const command = `https://${cleanUrl}/api/v4/projects/${projectId}/repository/tags`
    return from(axios.get(command, {
        headers: {
            "PRIVATE-TOKEN": token
        }
    })).pipe(
        map(resp => {
            return resp.data
        })
    )
}


export function getBranches$(gitLabUrl: string, token: string, projectId: string) {
    console.log(`Start reading branches for project ${projectId}`)
    const command = getBranchesCommand(gitLabUrl, projectId)
    return runPagedCommand(command, token, 'branches')
}

export function getLastBranch$(gitLabUrl: string, token: string, projectId: string) {
    return getBranches$(gitLabUrl, token, projectId).pipe(
        map(branches => {
            // sort by commit date
            branches.sort((a: any, b: any) => {
                return new Date(b.commit.committed_date).getTime() - new Date(a.commit.committed_date).getTime()
            })
            return branches[0]
        })
    )
}

function getBranchesCommand(gitLabUrl: string, projectId: string) {
    return `https://${gitLabUrl}/api/v4/projects/${projectId}/repository/branches?per_page=100`
}

