# Clone Gitlab Projects

It is possible to clone all the projects contained in a Gitlab group with the command

`node ./dist/lib/command.js clone-group-projects --gitLabUrl <gitLab url> --token <PRIVATE_TOKEN> --groupIds <id1>  <id2>  <id3> --outdir <outdir>`

or via npx

` npx "@enrico.piccinin/gitlab-tools" clone-group-projects --gitLabUrl <gitLab url> --token <PRIVATE_TOKEN> --groupId <id> --outdir <outdir>`