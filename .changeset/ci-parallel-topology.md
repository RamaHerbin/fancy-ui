---
---

CI only: the preview-health sweep runs in four shards merged by `scripts/preview-health-merge.mjs`, the consumer apps in three groups, neither waits on the other jobs, and a new push cancels the previous run of the same pull request. No package release.
