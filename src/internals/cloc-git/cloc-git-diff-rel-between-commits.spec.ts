import fs from 'fs';
import { toArray } from 'rxjs';

import { expect } from 'chai';
import { ComparisonParams, allDiffsForProjectWithExplanation$ } from './cloc-git-diff-rel-between-commits';
import { PromptTemplates } from '../git/explain-diffs';
import path from 'path';

describe(`allDiffsForProjectWithExplanation$`, () => {
    const repoRootFolder = './'
    const executedCommands: string[] = []
    const languages = ['Markdown', "TypeScript"]
    const promptTemplates = readPromptTemplates()

    //===================== TESTS ON LOCAL REPO =====================
    it(`should return the diffs between 2 tags of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'tags/second-tag',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 2 files between the 2 tags 
                // https://github.com/EnricoPicci/gitlab-tools/compare/first-tag...second-tag
                // for a likely bug in the command cloc --git-diff-rel the files changed are 3 and not 2 (the file README.md is counted twice)
                expect(diffs.length).equal(3)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a tag and a branch of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'one-branch-on-upstream',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 3 files of type TypeScript or Markdown between the tag and the branch
                // there is a fourth file changed but this is with extension .txt and is not counted
                // https://github.com/EnricoPicci/gitlab-tools/compare/first-tag...one-branch-on-upstream
                // for a likely bug in the command cloc --git-diff-rel the files changed are 4 and not 3 (the file README.md is counted twice)
                expect(diffs.length).equal(4)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch and a commit of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'one-branch-on-upstream',
            to_tag_branch_commit: 'ef0f4d45543313067ba84926102b8fa013a98932',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // there is a second file changed but this is with extension .txt and is not counted
                // If you check on GitHub web client with the url 
                // https://github.com/EnricoPicci/gitlab-tools/compare/one-branch-on-upstream...ef0f4d45543313067ba84926102b8fa013a98932
                // no changes are shown, but if we switch the base and the head of the comparison we see the changes
                // https://github.com/EnricoPicci/gitlab-tools/compare/ef0f4d45543313067ba84926102b8fa013a98932...one-branch-on-upstream
                // the git diff command shows the changes correctly in both cases
                expect(diffs.length).equal(1)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a commit and a branch of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'ef0f4d45543313067ba84926102b8fa013a98932',
            to_tag_branch_commit: 'one-branch-on-upstream',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // there is a second file changed but this is with extension .txt and is not counted
                // https://github.com/EnricoPicci/gitlab-tools/compare/ef0f4d45543313067ba84926102b8fa013a98932...one-branch-on-upstream
                expect(diffs.length).equal(1)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    //===================== TESTS ON REMOTE REPO =====================
    // Comparison between tags, branches and commits of the local repo and the remote repo
    const url_to_remote_forked_repo = 'https://github.com/codemotion-2018-rome-rxjs-node/gitlab-tools'
    it(`should return the diffs between a tag of the local repo and a tag on the remote repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'tags/tag-on-the-forked-repo',
            url_to_remote_repo: url_to_remote_forked_repo,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 5 files between the 2 tags 
                // https://github.com/EnricoPicci/gitlab-tools/compare/first-tag...codemotion-2018-rome-rxjs-node:gitlab-tools:tag-on-the-forked-repo
                expect(diffs.length).equal(5)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch of the local repo and a branch on the remote repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'main',
            to_tag_branch_commit: 'one-branch',
            url_to_remote_repo: url_to_remote_forked_repo,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 3 files between the 2 tags 
                // https://github.com/EnricoPicci/gitlab-tools/compare/main...codemotion-2018-rome-rxjs-node:gitlab-tools:one-branch
                expect(diffs.length).equal(3)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);
});

function readPromptTemplates() {
    const promptTemplateFileChanged = "/prompts/explain-diff.txt";
    const promptTemplateFileAdded = "/prompts/explain-added.txt";
    const promptTemplateFileRemoved = "/prompts/explain-removed.txt";
    const currentDir = process.cwd();

    console.log(`currentDir: ${currentDir}`);
    const _promptTemplateFileChanged = path.join(currentDir, promptTemplateFileChanged);
    const promptChanged = fs.readFileSync(_promptTemplateFileChanged, 'utf-8');
    const _promptTemplateFileAdded = path.join(currentDir, promptTemplateFileAdded);
    const promptAdded = fs.readFileSync(_promptTemplateFileAdded, 'utf-8');
    const _promptTemplateFileRemoved = path.join(currentDir, promptTemplateFileRemoved);
    const promptRemoved = fs.readFileSync(_promptTemplateFileRemoved, 'utf-8');

    const promptTemplates: PromptTemplates = {
        changedFile: promptChanged,
        addedFile: promptAdded,
        removedFile: promptRemoved
    }
    return promptTemplates
}