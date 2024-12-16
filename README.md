# gitlab-tools

**gitlab-tools** is a set of apps designed to work with gitlab repos.

## run gitlab-tools apps

The apps can be launched with the command

`npx gitlab-tools <app-name> <params>`

or, if we have cloned gitlab-tools repo, from the gitlab-tools repo folder launching the command

`node ./dist/lib/command.js <app-name> <params>`

Executing `npx gitlab-tools` prints on the console the list of available apps.

Executing `npx gitlab-tools <app-name> -h` prints on the console the help for the specific app.

## apps available
- [**Analyze Merge Requests**](./src/apps/analyze-merge-requests/README.md): analyze the merge requests of a gitlab group
- [**Write Gitlab Group Project details**](./src/apps/write-group-projects/README.md): write to a csv file the GitLab project details of projects in a GitLab group
- [**Clone Gitlab Projects**](./src/apps/clone-group-repos/README.md): clone all the projects contained in a GitLab group
- [**Compare forks with upstream**](./src/apps/compare-forks-with-upstream/README.md): compare forked projects in GitLab group with upstream



## MISCELLANEOUS

gitlab-tools is a node app configured to use Typescript scaffolded using the package `@enrico.piccinin/create-node-ts-app`.

gitlab-tools can be published as a package on the public NPM registry.

Once published, gitlab-tools can be invoked to execute a command using `npx`

Contains a configuration for `eslint` and `prettier`.

Testing is based on the `mocha` and `chai` libraries.

The `src` folder has the following structure:

-   `lib` folder containing the command
-   `core` folder containing `exec-command.ts` which implements the logic to execute the command
-   `core/internals` folder containing the internals of the logic of the command

## test

Run the tests using the command

`npm run test`

## Publish on NPM registry

### Commit changes

Before publishin a version of the command, make sure all the changes are committed.

The publishing procedure will ensure that a new "patch" version will be created and a new tag added.

### Define a remote repo

The publishing procedure "pushes" all changes to a remote destination. Therefore, before publishing, we need to ensure that a remote repo is defined, running the following commands

`git remote add origin http://github.com/<org-name>/<repo-name>`

` git push --set-upstream origin main`

### Publishing

Once all changes have been committed and the remote destination has been setup, then we can publish the command.

To publish on NPM registry the package rune the command

`npm publish`

## Execute the command

Once published on NPM registry the command defined by the package can be executed running the command

`npx gitlab-tools`

### Default command

The command executed by default is the one specified in the `bin` property of `package.json`.

The default `bin` value is the following

```json
"bin": {
 "app-name": "dist/lib/command.js"
},
```

which means that `npx gitlab-tools` executes the command `dist/lib/command.js`.

It is possible to to define other additional commands like this

```json
"bin": {
 "app-name": "dist/lib/command.js",
 "another-command": "dist/lib/another-command.js",
},
```

To execute another command we need to use the `-p` option of `npx`, like this
`npx -p gitlab-tools another-command`
