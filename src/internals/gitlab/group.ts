import axios from "axios"
import { EMPTY, catchError, concatMap, from, map, tap } from "rxjs"
import { GroupCompact } from "./group.model"
import { runPagedCommand } from "./paged-command"

export function readGroup$(gitLabUrl: string, token: string, groupId: string) {
    const command = `https://${gitLabUrl}/api/v4/groups/${groupId}`
    return from(axios.get(command, {
        headers: {
            "PRIVATE-TOKEN": token
        }
    })).pipe(
        map(resp => {
            return resp.data as GroupCompact
        }),
        catchError(err => {
            console.error(`====>>>> Error reading group ${groupId} from remote ${gitLabUrl}`)
            if (err.code === 'ERR_BAD_REQUEST') {
                console.error(`Status: ${err.response.status} - ${err.response.statusText}`)
            }
            return EMPTY
        })
    )
}

export function fetchGroupDescendantGroups(gitLabUrl: string, token: string, groupId: string) {
    const command = `https://${gitLabUrl}/api/v4/groups/${groupId}/descendant_groups`
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

export function fetchAllGroupProjects$(gitLabUrl: string, token: string, groupId: string, groupName = '', includeArchived = false) {
    console.log(`====>>>> reading all projects from group with id "${groupId}"`)
    const command = `https://${gitLabUrl}/api/v4/groups/${groupId}/projects?include_subgroups=true&per_page=100`
    return runPagedCommand(command, token, 'groups').pipe(
        map(resp => {
            const projects = includeArchived ? resp : resp.filter((project: any) => !project.archived)
            return projects
        }),
        tap(projects => {
            const groupNameOrId = groupName ? groupName : groupId
            console.log(`====>>>> number of projects read from group "${groupNameOrId}"`, projects.length)
        }),
        concatMap(projects => from(projects)),
    )
}

