#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const launch_analyze_merge_request_1 = require("../apps/analyze-merge-requests/launch-analyze-merge-request");
const launch_clone_group_projects_1 = require("../apps/clone-group-repos/launch-clone-group-projects");
const launch_compare_forks_with_upstream_1 = require("../apps/compare-forks-with-upstream/launch-compare-forks-with-upstream");
const launch_write_group_projects_1 = require("../apps/write-group-projects/launch-write-group-projects");
const command = process.argv[2];
const commandsAvailable = {
    'analyze-merge-requests': launch_analyze_merge_request_1.launchMergeRequestAnalysis,
    'write-group-projects': launch_write_group_projects_1.launchWriteGroupProjects,
    'clone-group-projects': launch_clone_group_projects_1.launchCloneGroupProjects,
    'compare-forks-with-upstream': launch_compare_forks_with_upstream_1.launchCompareForksWithUpstream,
};
const functionForCommand = commandsAvailable[command];
if (functionForCommand) {
    functionForCommand();
}
else {
    console.log(`Command ${command} not found`);
    console.log(`Commands allowed:`);
    Object.keys(commandsAvailable).forEach(command => {
        console.log(command);
    });
}
//# sourceMappingURL=command.js.map