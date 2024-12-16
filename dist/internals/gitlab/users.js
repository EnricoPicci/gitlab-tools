"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeUsersToCsv$ = exports.getUsers$ = void 0;
const rxjs_1 = require("rxjs");
const paged_command_1 = require("./paged-command");
const csv_tools_1 = require("@enrico.piccinin/csv-tools");
const observable_fs_1 = require("observable-fs");
const path_1 = __importDefault(require("path"));
function getUsers$(gitLabUrl, token) {
    console.log(`====>>>> reading all users`);
    const command = `https://${gitLabUrl}/api/v4/users?per_page=100`;
    return (0, paged_command_1.runPagedCommand)(command, token, 'users').pipe((0, rxjs_1.tap)(users => {
        console.log(`====>>>> number of users read from GitLab: `, users.length);
    }));
}
exports.getUsers$ = getUsers$;
// writeUsersToExcel$ is a function that reads all users from GitLab and writes them to a csv file.
function writeUsersToCsv$(gitLabUrl, token, outDir) {
    return getUsers$(gitLabUrl, token).pipe((0, rxjs_1.map)(users => {
        return (0, csv_tools_1.toCsv)(users);
    }), (0, rxjs_1.concatMap)(csvRecs => {
        const csvFilePath = path_1.default.join(outDir, 'gilab-users.csv');
        return (0, observable_fs_1.writeFileObs)(csvFilePath, csvRecs);
    }), (0, rxjs_1.tap)((file) => {
        console.log(`====>>>> users written to file: ${file}`);
    }));
}
exports.writeUsersToCsv$ = writeUsersToCsv$;
//# sourceMappingURL=users.js.map