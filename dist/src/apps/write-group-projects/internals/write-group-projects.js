"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMultiGroupProjects$ = exports.writeMultiGroupProjectsToCsv$ = exports.writeGroupProjectsToCsv$ = void 0;
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const group_1 = require("../../../internals/gitlab/group");
const csv_tools_1 = require("@enrico.piccinin/csv-tools");
const observable_fs_1 = require("observable-fs");
//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */
/**
 * This function writes all projects details of a specific group into a CSV file.
 * It first reads the group details using the provided GitLab URL, token, and group ID.
 * Then, it fetches all projects of the group.
 * Finally, it writes these projects into a CSV file in the specified output directory.
 * The CSV file is named as "{group name}-projects.csv".
 * As an example it can be used to identify which projects are forked from other projects.
 *
 * @param gitLabUrl - The URL of the GitLab instance.
 * @param token - The token to authenticate with the GitLab instance.
 * @param groupId - The ID of the group whose projects are to be written into the CSV.
 * @param outdir - The directory where the CSV file will be written.
 * @returns An Observable that emits the the file path once projects are written into the CSV file.
 */
function writeGroupProjectsToCsv$(gitLabUrl, token, groupId, outdir) {
    let groupName;
    return (0, group_1.readGroup$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.concatMap)(group => {
        groupName = group.name;
        return (0, group_1.fetchAllGroupProjects$)(gitLabUrl, token, groupId);
    }), (0, rxjs_1.toArray)(), (0, rxjs_1.concatMap)((projects) => {
        const outFile = path_1.default.join(outdir, `${groupName}-projects.csv`);
        return writeProjectsToCsv$(projects, [groupName], outFile);
    }));
}
exports.writeGroupProjectsToCsv$ = writeGroupProjectsToCsv$;
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
function writeMultiGroupProjectsToCsv$(gitLabUrl, token, groupIds, outdir) {
    return readMultiGroupProjects$(gitLabUrl, token, groupIds).pipe((0, rxjs_1.concatMap)((projects) => {
        const outFile = path_1.default.join(outdir, `${groupIds.join('-')}-groups-projects.csv`);
        return writeProjectsToCsv$(projects, groupIds, outFile);
    }));
}
exports.writeMultiGroupProjectsToCsv$ = writeMultiGroupProjectsToCsv$;
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
function readMultiGroupProjects$(gitLabUrl, token, groupIds) {
    return (0, rxjs_1.from)(groupIds).pipe((0, rxjs_1.concatMap)(groupId => (0, group_1.readGroup$)(gitLabUrl, token, groupId)), (0, rxjs_1.concatMap)(group => {
        return (0, group_1.fetchAllGroupProjects$)(gitLabUrl, token, group.id.toString());
    }), (0, rxjs_1.toArray)());
}
exports.readMultiGroupProjects$ = readMultiGroupProjects$;
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
const writeProjectsToCsv$ = (projects, groups, outFile) => {
    return (0, observable_fs_1.writeFileObs)(outFile, projectsToCsv(projects))
        .pipe((0, rxjs_1.tap)({
        next: () => console.log(`====>>>> Projects of group ${groups.join(', ')} written in csv file: ${outFile}`),
    }));
};
const projectsToCsv = (projects) => {
    const projectRecs = projects.map(project => {
        let _project = {
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
        };
        if (project.forked_from_project) {
            _project.forkedFromProjectId = project.forked_from_project.id;
            _project.forkedFromProjectName = project.forked_from_project.name;
            _project.forkedFromProjectUrl = project.forked_from_project.http_url_to_repo;
            _project.forkedFromProjectPathWithNamespace = project.forked_from_project.path_with_namespace;
            _project.forkedFromProjectParentGroup = _project.forkedFromProjectPathWithNamespace.split('/')[0];
        }
        return _project;
    });
    return (0, csv_tools_1.toCsv)(projectRecs);
};
//# sourceMappingURL=write-group-projects.js.map