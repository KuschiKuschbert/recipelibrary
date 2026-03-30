---
description: Checkpoints and handoff for long tasks
alwaysApply: true
---

# Context hygiene

When pausing a long task (e.g. large data edits), leave a short checkpoint: branch name, last commit, next file to touch, and any blockers.

When resuming: confirm `git status` and branch, then continue from the documented next step.

Do not split one file between two parallel agents without coordination.
