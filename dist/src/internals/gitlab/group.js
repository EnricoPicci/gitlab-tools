"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllGroupProjects$ = exports.fetchGroupDescendantGroups = exports.readGroup$ = void 0;
const axios_1 = __importDefault(require("axios"));
const rxjs_1 = require("rxjs");
const paged_command_1 = require("./paged-command");
function readGroup$(gitLabUrl, token, groupId) {
    const command = `https://${gitLabUrl}/api/v4/groups/${groupId}`;
    return (0, rxjs_1.from)(axios_1.default.get(command, {
        headers: {
            "PRIVATE-TOKEN": token
        }
    })).pipe((0, rxjs_1.map)(resp => {
        return resp.data;
    }), (0, rxjs_1.catchError)(err => {
        console.error(`====>>>> Error reading group ${groupId} from remote ${gitLabUrl}`);
        if (err.code === 'ERR_BAD_REQUEST') {
            console.error(`Status: ${err.response.status} - ${err.response.statusText}`);
        }
        return rxjs_1.EMPTY;
    }));
}
exports.readGroup$ = readGroup$;
function fetchGroupDescendantGroups(gitLabUrl, token, groupId) {
    const command = `https://${gitLabUrl}/api/v4/groups/${groupId}/descendant_groups`;
    return (0, rxjs_1.from)(axios_1.default.get(command, {
        headers: {
            "PRIVATE-TOKEN": token
        }
    })).pipe((0, rxjs_1.map)(resp => {
        return resp.data;
    }));
}
exports.fetchGroupDescendantGroups = fetchGroupDescendantGroups;
function fetchAllGroupProjects$(gitLabUrl, token, groupId, groupName = '', includeArchived = false) {
    console.log(`====>>>> reading all projects from group with id "${groupId}"`);
    const command = `https://${gitLabUrl}/api/v4/groups/${groupId}/projects?include_subgroups=true&per_page=100`;
    return (0, paged_command_1.runPagedCommand)(command, token, 'groups').pipe((0, rxjs_1.map)(resp => {
        const projects = includeArchived ? resp : resp.filter((project) => !project.archived);
        return projects;
    }), (0, rxjs_1.tap)(projects => {
        // replace comma with - in the project description
        projects.forEach((project) => {
            if (project.description) {
                project.description = project.description.replaceAll(',', '-');
            }
        });
        const groupNameOrId = groupName ? groupName : groupId;
        console.log(`====>>>> number of projects read from group "${groupNameOrId}"`, projects.length);
    }), (0, rxjs_1.concatMap)(projects => (0, rxjs_1.from)(projects)));
}
exports.fetchAllGroupProjects$ = fetchAllGroupProjects$;
//# sourceMappingURL=group.js.map