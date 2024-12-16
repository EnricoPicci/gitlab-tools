"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchCompareForksWithUpstream = void 0;
const commander_1 = require("commander");
const compare_forks_1 = require("../../internals/gitlab/compare-forks");
function launchCompareForksWithUpstream() {
    console.log('====>>>> Launching Compare Forks with Upstream <<<<====');
    const { gitLabUrl, token, groupId, outdir } = readParams();
    (0, compare_forks_1.writeCompareForksWithUpstreamFileDetailsInGroupToCsv$)(gitLabUrl, token, groupId, outdir).subscribe();
}
exports.launchCompareForksWithUpstream = launchCompareForksWithUpstream;
function readParams() {
    const program = new commander_1.Command();
    program
        .description('A command to compare all the forked projects of a gitlab group with their upstream projects')
        .requiredOption('--gitLabUrl <string>', `gitlab server (e.g. gitlab.example.com)`)
        .requiredOption('--token <string>', `private token to access the gitlab api (e.g. abcde-Abcde1GhijKlmn2Opqrs)`)
        .requiredOption('--groupId <string>', `id of the group to clone (e.g. 1234)`)
        .option('--outdir <string>', `directory where the output files will be written (e.g. ./data) - default is the current directory`);
    const _options = program.parse(process.argv).opts();
    const outdir = _options.outdir || process.cwd();
    return { gitLabUrl: _options.gitLabUrl, token: _options.token, groupId: _options.groupId, outdir };
}
//# sourceMappingURL=launch-compare-forks-with-upstream.js.map