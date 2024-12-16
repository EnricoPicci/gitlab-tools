import { Command } from "commander";
import { writeMultiGroupProjectsToCsv$ } from "./internals/write-group-projects";

export function launchWriteGroupProjects() {
    console.log('====>>>> Launching Read Group Projects')

    const { gitLabUrl, token, groupIds, outdir } = readParams();

    writeMultiGroupProjectsToCsv$(gitLabUrl, token, groupIds, outdir).subscribe()
}

function readParams() {
    const program = new Command();

    program
        .description('A command to write the GitLab project details of all the projects of a gitlab group')
        .requiredOption(
            '--gitLabUrl <string>',
            `gitlab server (e.g. gitlab.example.com)`,
        )
        .requiredOption(
            '--token <string>',
            `private token to access the gitlab api (e.g. abcde-Abcde1GhijKlmn2Opqrs)`,
        )
        .requiredOption(
            '--groupIds <string...>',
            `ids of the groups to read (e.g. 1234 5678 9012)`,
        )
        .option(
            '--outdir <string>',
            `directory where the output files will be written (e.g. ./data) - default is the current directory`,
        );

    const _options = program.parse(process.argv).opts();
    const outdir = _options.outdir || process.cwd();

    return { gitLabUrl: _options.gitLabUrl, token: _options.token, groupIds: _options.groupIds, outdir };
}