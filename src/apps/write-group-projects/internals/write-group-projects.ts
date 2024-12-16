import path from "path";
import { toArray, concatMap, tap, from } from "rxjs"
import { fetchAllGroupProjects$, readGroup$ } from "../../../internals/gitlab/group"
import { ProjectCompact } from "../../../internals/gitlab/project.model";
import { toCsv } from "@enrico.piccinin/csv-tools";
import { writeFileObs } from "observable-fs";

//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */

/**
 * This function reads projects from multiple groups and writes them into a CSV file.
 * It first reads the projects of each group ID in the provided array using the provided GitLab URL and token.
 * Then, it writes all these projects into a CSV file in the specified output directory.
 * The function uses the concatMap operator to ensure that the groups and their projects are processed in order.
 * As an example it can be used to identify which projects are forked from other projects.
 * 
 * @param gitLabUrl - The URL of the GitLab instance.
 * @param token - The token to authenticate with the GitLab instance.
 * @param groupIds - An array of group IDs whose projects are to be fetched.
 * @param outdir - The directory where the CSV file will be written.
 * @returns An Observable that emits the the file path once projects are written into the CSV file.
 */
export function writeMultiGroupProjectsToCsv$(gitLabUrl: string, token: string, groupIds: string[], outdir: string) {
    return readMultiGroupProjects$(gitLabUrl, token, groupIds).pipe(
        concatMap((projects) => {
            const outFile = path.join(outdir, `${groupIds.join('-')}-groups-projects.csv`);
            return writeProjectsToCsv$(projects, groupIds, outFile)
        }),
        tap(
            (outfile) => {
                console.log(`====>>>> projects info written to file: `, outfile)
            },
        )
    )
}

/**
 * This function reads projects from multiple groups and writes their details them into a CSV file.
 * It first reads the group details for each group ID in the provided array using the provided GitLab URL and token.
 * Then, it fetches all projects of each group.
 * The function uses the concatMap operator to ensure that the groups and their projects are processed in order.
 * 
 * @param gitLabUrl - The URL of the GitLab instance.
 * @param token - The token to authenticate with the GitLab instance.
 * @param groupIds - An array of group IDs whose projects are to be fetched.
 * @returns An Observable that emits the projects of all groups once they are fetched.
 */
export function readMultiGroupProjects$(gitLabUrl: string, token: string, groupIds: string[]) {
    return from(groupIds).pipe(
        concatMap(groupId => readGroup$(gitLabUrl, token, groupId)),
        concatMap(group => {
            return fetchAllGroupProjects$(gitLabUrl, token, group.id.toString())
        }),
        toArray(),
    )
}


//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

const writeProjectsToCsv$ = (projects: ProjectCompact[], groups: string[], outFile: string) => {
    return writeFileObs(outFile, projectsToCsv(projects))
        .pipe(
            tap({
                next: () => console.log(`====>>>> Projects of group ${groups.join(', ')} written in csv file: ${outFile}`),
            }),
        );
}
const projectsToCsv = (projects: ProjectCompact[]) => {
    const projectRecs = projects.map(project => {
        let _project: any = {
            id: project.id,
            name: project.name,
            // print the description in a single line without \n and \r characters
            description: project.description ? project.description.replace(/(\r\n|\n|\r)/gm, ' ') : '',
            name_with_namespace: project.name_with_namespace,
            path: project.path,
            path_with_namespace: project.path_with_namespace,
            ssh_url_to_repo: project.ssh_url_to_repo,
            http_url_to_repo: project.http_url_to_repo,
            web_url: project.web_url,
            created_at: project.created_at,
            last_activity_at: project.last_activity_at,
            updated_at: project.updated_at,
            parentGroup: project.path_with_namespace.split('/')[0],
            forkedFromProjectId: '-',
            forkedFromProjectName: '-',
            forkedFromProjectUrl: '-',
            forkedFromProjectPathWithNamespace: '-',
            forkedFromProjectParentGroup: '-',
        }
        if (project.forked_from_project) {
            _project.forkedFromProjectId = project.forked_from_project.id
            _project.forkedFromProjectName = project.forked_from_project.name
            _project.forkedFromProjectUrl = project.forked_from_project.http_url_to_repo
            _project.forkedFromProjectPathWithNamespace = project.forked_from_project.path_with_namespace
            _project.forkedFromProjectParentGroup = _project.forkedFromProjectPathWithNamespace.split('/')[0]
        }
        return _project
    })
    return toCsv(projectRecs)
}
