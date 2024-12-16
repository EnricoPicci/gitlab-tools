import * as fs from "fs"

import { tap, toArray, mergeMap, from } from "rxjs"
import { fetchAllGroupProjects$ } from "../../../internals/gitlab/group"
import { cloneProject$ } from "../../../internals/gitlab/project"
import { CONFIG } from "../../../internals/config"

export function cloneGroupProjects(gitLabUrl: string, token: string, groupIds: string[], outdir: string) {
    // if the outdir already exists, stop the process and write a message on the console to inform the user
    if (fs.existsSync(outdir)) {
        console.error(`====>>>> The output directory "${outdir}" already exists. Please remove it and try again.`)
        process.exit(1)
    }
    return from(groupIds).pipe(
        mergeMap(groupId => {
            return fetchAllGroupProjects$(gitLabUrl, token, groupId).pipe(
                mergeMap((projectCompact) => {
                    return cloneProject$(projectCompact, outdir)
                }, CONFIG.CONCURRENCY)
            )
        }),
        toArray(),
        tap(repos => {
            console.log(`====>>>> cloned ${repos.length} repos in folder ${outdir}`)
        }),
    )
}