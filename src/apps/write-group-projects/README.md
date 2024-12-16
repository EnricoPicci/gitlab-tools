# Write Gitlab Group Project details

It is possible to read the details of the projects in a Gitlab group and write them in a csv file. This command can be usefull, for instance, to analize which projects are forked from which other project and when is the latest activity regitered in the project:

`node ./dist/lib/command.js write-group-projects --gitLabUrl <gitLab url> --token <PRIVATE_TOKEN> --groupIds <id1>  <id2>  <id3> --outdir <outdir>`

or via npx

` npx "@enrico.piccinin/gitlab-tools" write-group-projects --gitLabUrl <gitLab url> --token <PRIVATE_TOKEN> --groupIds <id1>  <id2>  <id3> --outdir <outdir>`

After reading the commits, the following files are created:

-   <group-id1>-<group-id2>-<group-id3>-projects.csv