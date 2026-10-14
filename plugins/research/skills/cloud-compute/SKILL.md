---
name: cloud-compute
description: Rent cloud machines for research compute through the gpu CLI — choosing a GPU card or CPU box, sizing it by peak memory, disk and cores, spot versus on-demand, describing every lease, running resumable CPU chains under gpu keep, pulling outputs home, checking each machine before trusting it, the watchdog and reaper that end boxes, and reading spend from gpu status, history and budget. Use before leasing, launching on, or stopping any cloud machine, and whenever a chain would take more than about a day on local hardware.
---

# Cloud compute

Rent a machine when a job needs more than the local hardware gives, in memory or in throughput. When you are done, the outputs are home, verified, and pulled one last time. Nothing is still billing. The lease's record says what it did, why, how it ended and what it cost.

Everything goes through the `gpu` CLI. `gpu <cmd> --help` is the most precise reference for any command. When this skill and the CLI disagree, the CLI is right; ask its maintainers' expert, if your setup has one, rather than guessing. Most commands take `--json`, which prints one JSON document on stdout. The exceptions are `gpu stock`, `gpu logs`, `gpu keep run` and `stop`, and `gpu budget set` and `rm`. A refusal exits 1, with `{"ok": false, "error": …, "field": …}`. `--yes` skips prompts.

## Who leases

**Only the coordinator leases, launches on, or stops a cloud machine.** An agent that backgrounds a job and ends its turn never wakes to stop it, and the box bills until something else ends it. Runners hand the coordinator a resumable chain instead: the command, the output directory, the machine type, the wall time, and one job's peak memory.

Read `.claude/research.md` first. `cloud.project` names the project on every lease. The project notes may cap how many machines run at once, or how much a spike may spend.

## Choose the machine

There are two kinds, from two providers, and they behave differently.

**GPU cards** come from RunPod, on demand only: no spot market and no reclaims.

- `gpu gpus` lists the live catalogue: VRAM, CPU and RAM per card, prices, stock and datacentres. `gpu stock` shows stock levels.
- Lease with `gpu lease <CARD>[:N]`.
- The card you name is the card you get, or the launch fails. There is no fallback card, so check stock first, and fall back to another card yourself.
- Choose by measuring your own job's throughput per dollar. *Example:* for float32 molecular dynamics with an ML potential, an A40 48 GB at $0.59/h, running six trajectories at once with cuEquivariance, gave about 10× a local RTX 3060. Bigger cards added nothing below about 2000 atoms, at three to seven times the price.
- One job rarely fills a card, so run several independent jobs per card. The pod's CPU allowance caps the useful count. `nproc` shows the host's cores; the real limit is in `/sys/fs/cgroup/cpu.max`.

**CPU boxes** come from AWS, on demand or spot.

- `gpu cpus [--family c8a] [--min-cores 64]` lists types with physical cores, measured single-core and all-core ratings, prices, the spot price, and whether a type fits the quota.
- Lease with `gpu lease --cpu <TYPE> [--spot]`.
- `gpu quota` shows free vCPUs per bucket. Every session on the account shares those buckets.
- Rent one for chains that would take more than about a day locally. *Example:* a 64-core box ran about 25× a 12-core local share.
- Size by physical cores. The default AMD families run one thread per core.

## Size it by memory, then disk, then cores

**Memory.** Measure one job's peak resident memory locally, not its median. Multiply by the number of concurrent jobs, then add headroom. Check again whenever a chain enters a stage with bigger jobs.

When a box runs out of memory, its watchdog stops answering while SSH still works, and the reaper terminates the box about ten minutes later. **Nothing detects running out of memory.** *Example:* four boxes were lost in one day as phonon jobs grew from 12 GB to 22 GB, and then to 50 GB. On AWS, the c, m and r families give about 2, 4 and 8 GB per core.

**Disk.** The default is 100 GB; `--disk-gb` accepts 20 to 2000. Size it by the chain's scratch. A full disk fails jobs silently, as empty result files. *Example:* sixty-four plane-wave DFT jobs filled 100 GB in 25 minutes.

**Cores.** Past the point where every ready job has a core, more cores only add cost. The longest single-threaded job sets the floor on wall time.

## Spot or on-demand (CPU boxes only)

Spot has landed at 3.4–4.8× less than on-demand for the same type, about a quarter of the price. Zones differ by 2–3×, and a lease takes the most-available zone, not the cheapest. Spot draws on its own vCPU quota. In exchange, AWS can reclaim the box with two minutes' warning.

- **Use spot** for chains that resume from their own pulled outputs and are off the critical path.
- **Use on-demand** for a chain's long tail, for the critical path, and for any chain whose state lives only on the box. `hpc7a` is on-demand only, from its own quota bucket, which can be empty; check `gpu quota` before planning on it.
- **Reclaims cluster by pool**, meaning a type in a zone. After a reclaim, try another family or size first. *Example:* six of seven reclaims found a replacement within 4–10 minutes.
- **Capacity droughts happen.** *Example:* from about 15:00 to 21:00 UTC one day, no 48–96-core spot box launched in any zone. The guard is a deadline after which the chain falls back to on-demand (`on_demand_after_minutes` under `gpu keep`).

## Describe every lease

The broker refuses a lease that lacks any of `title`, `what`, `why`, `how`, `project` or `expect_hours`. `tags` are optional. Write them in a JSON file from `${CLAUDE_PLUGIN_ROOT}/references/templates/describe.json` (the plugin root is two directories above this skill's base directory), and pass it with `--describe FILE`.

- **`title`** is one line of at most 120 characters.
- **`what`, `why` and `how`** are each one plain paragraph, with no blank lines, written for a reader who hasn't seen the work.
- **`project`** is `cloud.project`. Tag the spike, for example `{"spike": "AREA-6"}`.
- **`expect_hours`** is `[LOW, HIGH]`, your honest range.

When the estimate moves, revise it at once with `gpu expect <CLUSTER> <LOW> <HIGH> --why "<what changed>"`. The ledger keeps the original estimate and every revision. When the lease ends, finish `how` with how it ended and what it cost.

## Run a job on a card

1. **Check stock and what is already leased:** `gpu gpus`, `gpu status`. A card takes about five minutes to come up.
2. **Lease it with a price guard and a lifetime that covers the job.** The idle stop ranges from 5 to 120 minutes (default 15). The hard cap ranges from 1 to 24 hours (default 4).

   ```
   gpu lease A40 --describe describe.json --max-hours 12 --idle-minutes 20 --disk-gb 60 --max-price-hr 0.8 --yes --json > lease.json
   ```

   The `ssh` field of the output is the target, for example `root@gpu-bare-a40-x1-6a35`. `gpu lease` writes an SSH config entry for it, using the key `~/.ssh/cloud-gpu`. The box can only be reached over the tailnet, and it carries no cloud credentials.

   A lease that exits 1 with `healthy: false` launched but never answered. It is still billing, so `gpu stop` it.
3. **Check the driver before provisioning.** Run `nvidia-smi` on the box. RunPod hosts vary between CUDA 12 and 13 drivers, and a CUDA 13 stack needs driver 580 or later.
4. **Provision.** Rebuild the environment from a lock file, or copy a self-contained one to the same absolute path, so the job runs at the same paths as at home.
5. **Check parity on that card before any production unit runs.** On the job's own inputs, the card's result must match a reference (for example float64 on a CPU) within the criterion's tolerance, with production settings. Make this check the chain's first unit, and stop the chain if it fails. A card that passed once vouches for no other card.
6. **Start the job detached, and pull its outputs home every five minutes.** A local puller script is the usual pattern. It:
   - pushes the spike;
   - starts the job under `setsid` at `nice -n 19`;
   - pulls one output subdirectory back every five minutes;
   - when the job exits, pulls once more and writes a local done marker.

   `gpu wait` and `gpu keep` are AWS only, so a card needs this local puller. `gpu lease` has already written the SSH config, so a plain `rsync -a --partial root@gpu-bare-…:/path/ ./local/` works, and `gpu status --json` reports the box as `gone`, with its cause, when the loop should stop. *Example:* play-world's `tools/cloud/run_remote.sh` does exactly this. The job must resume from its own checkpoints.
7. **Stop the box once the final pull has landed**, and confirm nothing is still billing:

   ```
   gpu stop <CLUSTER>
   gpu status
   ```

   `gpu stop` exits non-zero if the provider didn't confirm the teardown, and the box may still be billing.

## Run a resumable CPU chain under `gpu keep`

`gpu keep` supervises a chain on AWS spot, for CPU boxes only. It leases a box, provisions it, launches the chain, and pulls the outputs on a schedule. When the box is reclaimed, it leases a replacement in another pool and carries on. It stops when the chain's done marker comes home, or when a guard fires.

**Run the smoke test first.** Before trusting `keep` with a real chain on a new account or machine, run the dummy chain in `references/templates/keep-smoke/` in the foreground with `gpu keep run spec.yaml`. It costs under a cent. Ctrl-C ends a `keep run` as `interrupted` and leaves any live box to its watchdog, so check `gpu status` and `gpu stop` it yourself. The chain leases the smallest spot box, ticks three times, writes `DONE`, comes home, and stops the box. *Example:* the first type in its list failed to launch, and keep moved on to the second, which is the type list doing its job.

**Write the SPEC from `references/templates/keep-chain/`.** It is a working spec with its three hooks, with project details replaced by placeholders:

- **`types`** is an ordered list of `{instance_type, jobs}`. `jobs` is how many parallel jobs that box's memory holds. Put other families of the same size early, so a reclaim can move to another pool.
- **The hooks run on your machine**, from the SPEC's directory, each with a one-hour timeout. They receive `HOST`, `CLUSTER`, `JOBS`, `INSTANCE_TYPE`, `SPOT` and `KEEP_NAME`.
  - `provision` runs once per new box.
  - `sync` pushes what the last pulls brought home onto a replacement box.
  - `launch` starts or resumes the chain at `nice -n 19`.
- **`pulls`** must cover everything a resume needs. A box can vanish with whatever was never pulled.
- **`done_marker`** is a local path. Write it on the box only on a clean exit (`run_chain && touch DONE`), so a crash or a kill never looks like completion. Make sure it doesn't exist locally before you start. keep checks for it first, and a chain that finds it already home ends as `done` without leasing anything.
- **The lease fields** (`title`, `what`, `why`, `how`, `project`, `expect_hours`) are required here too. keep adds the tag `keep=<name>` itself.
- **`guards.budget_usd`** is required. **It is the only budget the CLI enforces**: projected spend over it ends the chain, and a running box is stopped once actual spend passes it. Projected spend is spend so far plus the next box's price × the hours left to the high estimate. The check runs per type and market, so the on-demand fallback can only reach types whose on-demand price fits the budget. The chain ends with `budget` when none fits, so size the budget for the fallback too. The other guards end the chain after:
  - too many leases in an hour;
  - too many consecutive failures;
  - every type is over quota;
  - the account's spend cutoff is reached;
  - a second box appears with the chain's tag.
- **`market`** sets the fallback. After `on_demand_after_minutes` without spot capacity, keep goes on-demand; without that key, it never does. With `return_to_spot`, it moves back after a clean pull, once a spot placement score reaches 7 of 10 and a spot lease would pass the guards. If the move fails, it stays on-demand for an hour. `max_price_hr` caps both markets, so a type dearer than it on-demand is only ever tried on spot.

**Start it:** `gpu keep start spec.yaml`. It runs as the user systemd unit `gpu-keep-<name>`. `gpu keep status [NAME]` shows the phase, the box, spend against budget, and why it ended. `gpu keep stop NAME` pulls once more, then stops the box.

**On a reclaim warning**, keep leases a replacement at once, in another pool and never the same type. It provisions the replacement while the old box pulls back to back. When the old box is gone, it runs `sync` and `launch` on the new one. That is the only time a chain holds two boxes.

**How keep treats each way a box ends:**

- A reclaim or the hard cap gets a replacement.
- An unreachable box, an idle stop, a failed hook, or a box unhealthy at launch counts as a failure.
- `gpu stop` (with or without `--handoff`), or a terminate from the provider's console or API, ends the chain.

The failure count resets only after a box has run for an hour (or twice `idle_minutes`, if that is longer) and pulled cleanly, so a job that dies at start ends the chain instead of relaunching forever.

## Set a wakeup before each deadline

Once a job or chain starts, schedule a one-shot wakeup 30–45 minutes before each deadline the lease can hit. In Claude Code that is `CronCreate` with `recurring: false`. A lease has two deadlines:

- the high end of its `expect_hours`, past which `gpu status` flags it and a keep chain's budget projection starts to bind;
- its `--max-hours` stop (`lease.max_hours` in a keep SPEC), where the watchdog takes the box.

Nothing else warns you that a run is about to be cut off. The completion signal arrives only after the box is gone, with the unpulled work and a relaunch to pay for. *Example:* a CPU box ran past its 7 h estimate toward its 12 h cap, and only a chance status check caught it.

At each wakeup, check the run's progress against what is left: `gpu status`, `gpu keep status`, and the pulled outputs. If it will not land before the next deadline, revise the estimate with `gpu expect`, then choose before the stop arrives:

- **Raise the cap** with `gpu extend <CLUSTER> --max-hours <N> --json`, when the box is healthy and the extra hours fit the budget. It restarts the box's watchdog with the new limit, leaves running jobs alone, moves the cap the reaper enforces, and records the old value in the ledger (`gpu history` shows `max_hours_changes`). The cap counts from the box's launch, so `N` must exceed the hours already run; a CPU lease tops out at 72 h. A spot reclaim can still end the box at any time. *Example:* a 12 h spot CPU box was raised to 22 h without a restart.
- **Plan the relaunch** from the pulled state otherwise.

When an estimate or a cap moves, move its wakeup with it.

The wakeups live only in the session that set them. Write each deadline in the resume note, so a resumed session sets them again.

## Spot outside `gpu keep`

`gpu wait` follows AWS leases only, and refuses a RunPod card. Run `gpu wait <CLUSTER> --pull <REMOTE> <LOCAL>` in the background beside the job. It watches EC2 every 15 seconds, without needing a connection to the box. It pulls every `--every` seconds (default 300), and back to back once the reclaim warning lands. Its exit code says how the lease ended:

| Exit | Meaning |
|---|---|
| 0 | ended by idle stop, hard cap, or `gpu stop` |
| 10 | reclaim warning (with `--notice`) |
| 11 | reclaimed |
| 12 | timed out |
| 1 | no such lease, or EC2 couldn't be read |

Add `--notice` only to act at the warning. It pulls once and returns exit 10, so the back-to-back pulls through the two minutes happen only without it.

Nothing relaunches on its own; relaunch from the pulled state on a new box.

On the box, the two-minute warning writes `/tmp/spot-interruption`, sends a `wall` message, and runs `/etc/gpu/on-reclaim` as root, if that file exists and is executable. Use it to flush a checkpoint into a pulled directory.

## Pulls

Pull every five minutes, and back to back once the warning lands. That keeps the loss from a reclaim to seconds of work, so pulling more often buys little. The real cost of a reclaim is relaunching and provisioning. Stop a box only after a final pull.

Keep a puller's own log outside every pulled path. A pull replaces the file, and the puller goes on writing to the deleted copy.

## Trust each machine only after checking it

- **A parity line per box**: a fixed computation whose result must match across machines. *Example:* a fixed energy agreed to about 12 digits across Xeon, Zen 4 and Zen 5.
- **For a card, a parity check on that card's own UUID** before any production unit.
- **A driver check before provisioning a card.**
- A binary built on a newer OS may not load on the box's image. Conda-forge builds and lock-file rebuilds travel well.

## What ends a box

**The watchdog on the box** checks every minute.

- **Idle stop.** It stops the box after `--idle-minutes` with no activity. Activity is GPU use above 5%, CPU use above a quarter of a core, an open SSH session, or a touch of `/tmp/keepalive` in the last five minutes. Touch that file to hold a box through quiet work such as a download.
- **Hard cap.** It stops the box at `--max-hours`. For cards the cap is 1–24 h (default 4); for CPU boxes, 1–72 h (default 24). `gpu extend` raises it on a live box.
- **Boot timeout.** A box must answer its own health check within 15 minutes of boot.

**The reaper**, run by the broker every five minutes, terminates three kinds of box:

- one past its hard cap;
- one past its 20-minute boot grace that has stayed silent on every probe for 10 minutes;
- an AWS box left stopped rather than terminated.

A job that starves the watchdog of CPU, or runs the box out of memory, silences it, and the reaper takes the box. So run chains at `nice -n 19`, and size memory with headroom.

## Spend and accounting

The CLI records every lease globally. Read it instead of keeping your own tally.

- **`gpu status`** shows every live lease:
  - hours, rate and spend so far;
  - the projected cost at its low and high estimate;
  - a flag on any lease past its high estimate;
  - a box that vanished since the last look, listed once as `gone`, with its cause.
- **`gpu history [--since 7d] --json`** lists one row per lease: the description fields, hardware, start, end, cause and billed cost. **`gpu history --stats`** adds:
  - launch failures and reclaims per pool and per UTC hour;
  - spot lifetimes;
  - estimate calibration per project, which counts how often actual hours fell inside the low–high range and leaves out deliberate hand-offs.
- **`gpu budget`** shows each budget's spend and where its live leases are heading. **These budgets are reported, never enforced**; only a keep SPEC's `budget_usd` stops anything. Set one with `gpu budget set --project <P> [--tag K=V] <USD>`.
- **`gpu billing`** shows what the providers actually charged this day, week and month, and what is left. AWS figures trail by up to a day.

A project that wants its own report can build one from `gpu history --json`. *Example:* play-world's `tools/cloud/ledger.py` builds a per-project ledger, with spend per spike against the author's budgets and the calibration of each estimate.
