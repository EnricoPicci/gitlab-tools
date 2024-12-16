"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchWriteGroupProjects = void 0;
const commander_1 = require("commander");
const write_group_projects_1 = require("./internals/write-group-projects");
function launchWriteGroupProjects() {
    console.log('====>>>> Launching Read Group Projects');
    const { gitLabUrl, token, groupId, outdir } = readParams();
    (0, write_group_projects_1.writeGroupProjectsToCsv$)(gitLabUrl, token, groupId, outdir).subscribe();
}
exports.launchWriteGroupProjects = launchWriteGroupProjects;
function readParams() {
    const program = new commander_1.Command();
    program
        .description('A command to write the GitLab project details of all the projects of a gitlab group')
        .requiredOption('--gitLabUrl <string>', `gitlab server (e.g. gitlab.example.com)`)
        .requiredOption('--token <string>', `private token to access the gitlab api (e.g. abcde-Abcde1GhijKlmn2Opqrs)`)
        .requiredOption('--groupId <string>', `id of the group to read (e.g. 1234)`)
        .option('--outdir <string>', `directory where the output files will be written (e.g. ./data) - default is the current directory`);
    const _options = program.parse(process.argv).opts();
    const outdir = _options.outdir || process.cwd();
    return { gitLabUrl: _options.gitLabUrl, token: _options.token, groupId: _options.groupId, outdir };
}
//# sourceMappingURL=launch-write-group-projects.js.map