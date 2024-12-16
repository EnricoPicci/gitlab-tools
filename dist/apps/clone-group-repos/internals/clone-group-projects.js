"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneGroupProjects = void 0;
const fs = __importStar(require("fs"));
const rxjs_1 = require("rxjs");
const group_1 = require("../../../internals/gitlab/group");
const project_1 = require("../../../internals/gitlab/project");
const config_1 = require("../../../internals/config");
function cloneGroupProjects(gitLabUrl, token, groupIds, outdir) {
    // if the outdir already exists, stop the process and write a message on the console to inform the user
    if (fs.existsSync(outdir)) {
        console.error(`====>>>> The output directory "${outdir}" already exists. Please remove it and try again.`);
        process.exit(1);
    }
    return (0, rxjs_1.from)(groupIds).pipe((0, rxjs_1.mergeMap)(groupId => {
        return (0, group_1.fetchAllGroupProjects$)(gitLabUrl, token, groupId).pipe((0, rxjs_1.mergeMap)((projectCompact) => {
            return (0, project_1.cloneProject$)(projectCompact, outdir);
        }, config_1.CONFIG.CONCURRENCY));
    }), (0, rxjs_1.toArray)(), (0, rxjs_1.tap)(repos => {
        console.log(`====>>>> cloned ${repos.length} repos in folder ${outdir}`);
    }));
}
exports.cloneGroupProjects = cloneGroupProjects;
//# sourceMappingURL=clone-group-projects.js.map