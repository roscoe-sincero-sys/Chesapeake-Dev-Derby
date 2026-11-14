# Claude Code usage — initial build

Usage for the Claude Code session that built the first version of Chesapeake Dev Derby from
`requirements.txt` (server, race simulation, Three.js game, tests, README).

Figures come from Claude Code's own local session record. The totals are its snapshot taken at the end of
the build; they do not include the short follow-up turn that wrote this file.

## Summary

| Measure                       | Value                          |
| ----------------------------- | ------------------------------ |
| Date                          | 2026-11-13                     |
| Main model                    | Claude Fable 5.2 (`claude-fable-5-2`), effort: high |
| Session wall-clock time       | 72 min                         |
| Time waiting on the model     | 31.6 min                       |
| Time running tools            | 8.7 min                        |
| Lines of code added / removed | 6,170 / 2                      |
| Estimated cost                | $13.31 (API-equivalent)        |

The cost is Claude Code's estimate at API list prices. The session ran on a claude.ai subscription, so it
is an equivalent value, not an amount billed.

## Tokens by model

| Model                             | Input | Output  | of which thinking | Cache write | Cache read | Est. cost |
| --------------------------------- | ----: | ------: | ----------------: | ----------: | ---------: | --------: |
| Claude Fable 5.2 (main)           |    86 | 193,314 |            63,469 |     252,933 |  7,631,993 |   $13.307 |
| Claude Haiku 5.5 (web-fetch helper) | 1,174 |   1,278 |               233 |       9,096 |      3,817 |    $0.002 |
| **Total**                         | 1,260 | 194,592 |            63,702 |     262,029 |  7,635,810 |   $13.309 |

Nearly all input was served from the prompt cache (cache read), which is why the plain input count is so
small. No web searches were made.

## Tool calls

Counted from the session transcript, through to writing this file.

| Tool       | Calls | Used for                                                    |
| ---------- | ----: | ----------------------------------------------------------- |
| Write      |    32 | Creating source files, tests, docs and helper scripts       |
| Read       |    25 | Mostly reviewing browser screenshots of the running game    |
| Bash       |    24 | Running tests, patches and headless-browser checks          |
| PowerShell |     3 | Environment check, `npm install`, first test run            |
| Edit       |     2 | Small tuning changes to the simulation                      |
| Glob       |     1 | Finding `requirements.txt`                                  |
| Agent      |     1 | One helper to read the inspiration web page                 |
| **Total**  |    88 |                                                             |

## Notes

- One subagent was used (to fetch and summarise the inspiration site); everything else ran in the main
  session.
- Later changes to the project (other sessions, pull requests) are not covered here.
