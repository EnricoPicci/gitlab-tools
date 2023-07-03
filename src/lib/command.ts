#!/usr/bin/env node

import { launchMergeRequestAnalysis } from '../analyze-merge-requests/core/exec-command';

const command = process.argv[2];

switch (command) {
    case 'analyze-merge-requests':
        launchMergeRequestAnalysis();
        break;
    default:
        console.log(`Command ${command} not found`);
        break;
}