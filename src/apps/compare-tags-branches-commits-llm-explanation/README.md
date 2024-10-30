# compare a tag or branch or commit with another tag or branch or commit

This command compares a tag or a branch or a commit (i.e. a *ref*) to another tag or branch or commit and uses an **LLM** to generate an explanation of the differences for each file which has changed between the two **refs**.\
The two *refs* compared can belong to the same repo or to different repos, which is useful in the case of forks where you may want to compare a certain *ref* on the forked project with a *ref* on the upstream project.\

## algorithm
The steps of the algorithm are the following:
- Run the `cloc git-diff-rel --by-file` command to get the differences in the files on the two *refs* (**cloc** details [here](https://github.com/AlDanial/cloc))
- For each file with differences, run the command `git diff from to -- file` to retrieve the differneces in the **git** format
- for each file with differences, read the file content from the local disk (if the file has diffs because it has been deleted, the file content will be empty)
- send to the **LLM** the changes, in **git** format, the file content and a prompt asking to generate a summary of the changes

## output
The command produces the following files:
- `${projectDirName}-compare-with-upstream-explanations-${timeStampYYYYMMDDHHMMSS}.md`: this is the marksown file that contains the reposrt containing the summaries produced by the **LLM**
- `${projectDirName}-compare-with-upstream-explanations-${timeStampYYYYMMDDHHMMSS}.csv`: this is the csv file that contains the data about the diffs (e.g. lines of code modified, added or removed) as well as the explanation produced by the **LLM**
- `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`: the log of all the **cloc** and **git** commands which have been executed