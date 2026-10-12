# auto-watch

Watch every repo you own or administer as soon as it's created, the way GitHub used to.

GitHub [removed automatic watching](https://github.blog/changelog/2025-05-23-sunset-of-automatic-watching-of-repositories-and-teams) in May 2025. Since then a repo you create isn't watched, and an unwatched repo tells you nothing when someone opens an issue or a pull request on it. No email, no inbox entry, no push. You find out when you happen to look.

This Action puts it back. It runs once an hour on your own runner, watches anything new, and stays out of the way.

## Setup

**1. Add the workflow** to any repo of yours. Your profile repo (`you/you`) is a good home. Save it as `.github/workflows/auto-watch.yml`:

```yaml
name: auto-watch
on:
    schedule: [{ cron: '17 * * * *' }]
    workflow_dispatch:
        inputs:
            backfill:
                description: Watch every repo, not only the ones created in the last day
                type: boolean
                default: false
permissions:
    actions: write
    contents: read
jobs:
    watch:
        runs-on: ubuntu-latest
        steps:
            - uses: Jubstaaa/auto-watch@v1
              with:
                  token: ${{ secrets.AUTO_WATCH_TOKEN }}
                  backfill: ${{ inputs.backfill || false }}
```

**2. Create a classic token.** The links open GitHub's token page with the scopes already ticked. Set an expiry you're happy with and click Generate.

- [Public repos only](https://github.com/settings/tokens/new?scopes=notifications,read:org&description=auto-watch) (`notifications`, `read:org`)
- [Private repos too](https://github.com/settings/tokens/new?scopes=notifications,read:org,repo&description=auto-watch) (adds `repo`)

**3. Save it** in that repo under Settings → Secrets and variables → Actions as `AUTO_WATCH_TOKEN`.

Then open the Actions tab, pick **auto-watch**, click **Run workflow** and tick **backfill** once. That watches every repo you made since GitHub stopped doing it. From then on the hourly run only looks at repos created in the last day.

## Inputs

| Input          | Default  | What it does                                                                                          |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `token`        | required | Classic token with `notifications` (and `read:org`, `repo` as above)                                  |
| `backfill`     | `false`  | Look at every repo, not only recent ones                                                              |
| `since-hours`  | `24`     | How far back "recent" goes                                                                            |
| `include-orgs` | `true`   | Also cover repos in organizations where you're an admin                                               |
| `exclude`      |          | `owner/name` patterns to skip, comma or newline separated, `*` as wildcard: `my-org/*`, `*/scratch-*` |
| `dry-run`      | `false`  | Show what it would watch without changing anything                                                    |

Outputs: `watched` (a count) and `watched-repos` (a JSON array).

Forks and archived repos are always skipped. So is any repo you set to **Ignore**.

## Questions

**Why a classic token?** GitHub only lets a classic token watch a repo. Fine-grained tokens and GitHub Apps can't call that endpoint at all, so the Action stops on the first line and tells you if you give it one.

**Where does my token go?** Nowhere. It lives in your repo's secrets and is only used on your own runner. There's no server.

**I unwatched a repo on purpose. Will it come back?** No. The hourly run only touches repos created in the last day. Only a backfill run looks at older ones, and you start those by hand. Add the repo to `exclude` if you want to be sure.

**Will the schedule stop after 60 days?** GitHub pauses scheduled workflows in a repo with no commits for 60 days. Each run re-enables its own workflow, which resets that clock. That's what `actions: write` is for.

**Can I pick issues and PRs only, like Custom watching?** Not through the API. It watches with All Activity, the same as clicking Watch.

## Licence

MIT
