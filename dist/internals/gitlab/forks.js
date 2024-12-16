"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readForkedProjectsForGroup$ = void 0;
const rxjs_1 = require("rxjs");
const group_1 = require("./group");
function readForkedProjectsForGroup$(gitLabUrl, token, groupId, groupName) {
    return (0, group_1.fetchAllGroupProjects$)(gitLabUrl, token, groupId, groupName).pipe((0, rxjs_1.filter)(project => {
        return project.forked_from_project !== undefined;
    }));
}
exports.readForkedProjectsForGroup$ = readForkedProjectsForGroup$;
//# sourceMappingURL=forks.js.map