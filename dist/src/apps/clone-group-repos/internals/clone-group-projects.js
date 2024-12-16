"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneGroupProjects = void 0;
const rxjs_1 = require("rxjs");
const group_1 = require("../../../internals/gitlab/group");
const project_1 = require("../../../internals/gitlab/project");
const config_1 = require("../../../internals/config");
function cloneGroupProjects(gitLabUrl, token, groupId, outdir) {
    return (0, group_1.fetchAllGroupProjects$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.mergeMap)((projectCompact) => {
        return (0, project_1.cloneProject$)(projectCompact, outdir);
    }, config_1.CONFIG.CONCURRENCY), (0, rxjs_1.toArray)(), (0, rxjs_1.tap)(repos => {
        console.log(`====>>>> cloned ${repos.length} repos in folder ${outdir}`);
        // console.log(`====>>>> FAILED to clone ${numProject - repos.length} repos`)
    }));
}
exports.cloneGroupProjects = cloneGroupProjects;
//# sourceMappingURL=clone-group-projects.js.map