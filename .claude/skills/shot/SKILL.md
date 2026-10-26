---
name: shot
description: Prove UI work with the shot CLI (agent-shot): screenshots of app paths and URLs before and after a change, size and state variants, layout and a11y checks, recorded flows, evidence on the PR, and a local review page where the user compares labels, votes and draws on them. Use after changing UI, when asked to show, verify or screenshot a page, to attach visual evidence to a pull request, or to let the user choose between variants you built.
---

# shot

`shot` drives Chromium against the running app and writes PNGs, JSON and videos under `.shots/`. Read every PNG you produce before you claim anything about it.

## Prove a UI change

1. Find what to shoot: the app paths your change touches, with real ids, and their sections. `shot outline <path> --as <user>` lists section titles. Complete when you have a path and a part for each changed screen.
2. Shoot the old state: `git stash -u && shot <path> --as <user> --label before [flags]`. Complete when it printed a path per capture.
3. Shoot the new state with the same flags: `git stash pop && shot <path> --as <user> --label after [flags]`. Equal flags give equal file names under `before/` and `after/`.
4. Read both PNGs of each pair. For layout changes, shoot every size the change affects (`--size phone --size desktop`) and read each size's PNG. Complete when you can name what changed and what did not, at each size.
5. Run `--check` on the after state. Fix `error` findings your change caused. Complete when none are left, or the ones that remain are already in `before`.
6. For an interaction, write or reuse a flow (`shots/<name>.flow.ts`) and run `shot flow <name> --label after`.
7. `shot publish` writes every capture, flow and finding of the session into the PR body. It replaces the previous publish. Complete when it printed the PR's URL.

Shot does not run git: you stash, it shoots. A dev server with hot reload also serves the stashed state. One that builds once needs a restart.

## Let the user choose

When you built variants (or want the user's eye on a change), shoot each one as a label and put the labels up for review. The user gets a local page with the labels side by side. They vote per sheet, draw comments, boxes, arrows and pen strokes on the stills, and send it back to you.

1. Shoot each candidate with the same flags and its own label. Variants behind a URL param: `shot "/app/persons?variant=quiet" --as admin --label quiet --section People --size phone --size desktop`. Shoot the current state as `--label before` if the user should compare against it.
2. Read every PNG yourself first. A variant that fails `--check` or looks broken is not a candidate.
3. Put up exactly what the user should judge. Only the labels you name appear, in your order:

   ```sh
   shot review quiet editorial dense --base before --ask "Pick a density for People" \
     --describe quiet="Lowest weight; least memorable" \
     --describe dense="Most rows per screen; smaller hit areas"
   ```

   `--sheet <part of a title>` and `--size <size>` narrow it further. `--describe` states each label's direction and cost; never mark a favourite.

4. It opens the browser and blocks until the user sends or closes it, which can take a long time. Run it in the background with a long timeout (or none) and read stdout when it exits. Do not kill it, and do not poll.
5. Act on what comes back. Exit 0: stdout is the feedback: the pick, per sheet the vote and numbered notes with the element under each (`#invite` button "Invite"), and PNGs with the drawings burned in. Read those PNGs. Exit 1 with `closed without feedback`: the user closed it; ask in chat what they want.
6. For another round, change the code, reshoot the same labels and run `shot review` again. The last round's drawings show faded.

`shot review` is local and separate from `shot publish`: nothing goes to the PR. Rounds live in `.shots/<session>/review/round-<n>/` (`feedback.md`, `feedback.json`, burned PNGs). `--json` prints `feedback.json`.

## Examples

```sh
shot /app/persons --as admin                                    # one still per section
shot /app/persons --as admin --section "People" --mode both     # one section, light and dark
shot /settings --as admin --select "#save" --size phone --size desktop --overlay boxes --overlay gaps
shot /settings --as admin --fill '#name=Ada' --key Enter --hover "#save" --check
shot /settings --as admin --select ".icon" --loupe 4             # pixel detail
shot /settings --as admin --select "#save" --measure --style color   # box, spacing, radius, font as JSON
shot /app --as admin --click "#menu" --frames 8 --every 50       # an animation on one sheet
shot https://example.com --size "Pixel 8"                        # any URL, no login
shot ./compare.html?variant=c                                    # a local HTML file
```

## Targets and flags

```text
<path> --as <user>        an app path, logged in as the user (config alias or email); shot login --as sets a default
<url>                     any URL: no login, writes go through
./page.html | file://…    a local HTML file, relative to the project root; query and hash kept
--param org=acme          a login param for the logIn hook
--mode light|dark|both
--section "Profile"       a section by title (exact, else unique substring; "Title >> nth=1"); repeatable
--select '#save'          the first visible match, 16px around it; any Playwright selector (role=, :has-text()); repeatable
--name billing            fixed file name, for selectors that change
--viewport                only the viewport
--size phone|tablet|laptop|desktop|WxH|"<Playwright device>"   repeatable; default laptop; --mobile = --size phone
--scale 2                 device scale factor (default 2 on devices, 1 on WxH)
--click a  --fill '#name=Ada'  --key Enter  --wait 300  --hover b  --focus c  --press d
                          the scene, in order; hover, focus and press run last and hold
--overlay boxes|gaps|edges|type|grid   repeatable  --loupe 4
--measure [--style gap] [--all]   --aria   --frames 8 [--every 50] [--slow 0.25]
--check                   overflow, target, focus, align, and plugin checks (axe)
--label before            writes to .shots/<session>/before/
--json                    results as JSON
```

- Output: one path per file on stdout, and one line per finding (`error`/`warn`, check, target, message). Measurements and aria trees print after their path. Progress goes to stderr.
- Exit 1: a render finding (the page 500s, redirects or times out, or a step or part fails), or an error finding. Exit 2: a usage mistake.
- Writes to the app (POST, PUT, PATCH, DELETE) are blocked and reported as findings, so scenes cannot change dev data.
- Sizes: with no part flag, each size shoots the sections its own layout shows. A `--section` that the layout hides at one size fails at that size. The `target` check runs on devices only.
- Files: `.shots/<session>/[<label>/]<source>--<slug>-<hash>.png`. The session is `$SHOT_SESSION`, else your agent's session id. A rerun overwrites. `shot clean` deletes the session.

## Flows

```ts
// shots/invite-parent.flow.ts
import { defineFlow } from 'agent-shot'

export default defineFlow({ start: '/app/persons', as: 'admin' }, async ({ page, step }) => {
  await step('open invite', () => page.getByRole('button', { name: 'Invite' }).click())
  await step('fill email', () => page.getByLabel('Email').fill('parent@example.org'))
  await step('submit', () => page.getByRole('button', { name: 'Send' }).click())
})
```

`shot flow <name>` writes a still per step, an H.264 video within GitHub's limit, and `trace.zip` (`npx playwright show-trace`). A flow runs at one size: `size: 'phone'` in its header or `--size phone`; default laptop. A failing step stops the flow. You get the stills up to that step, the video so far and the step's error, and the exit code is 1.

## Setup

App paths need a `shot.config.ts` at the project root. If it is missing, shoot URLs, or ask the user how their app logs in:

```ts
import { axe } from '@agent-shot/axe'
import { defineConfig, github } from 'agent-shot'

export default defineConfig({
  app: {
    url: () => 'http://localhost:3000',
    users: { admin: 'admin@example.org' },
    logIn: async ({ page, url, user }) => {
      await page.goto(`${url}/login`)
      await page.fill('#email', user)
      await page.click('button[type=submit]')
    },
  },
  plugins: [axe(), github()],
})
```

## When it fails

| Message                         | Do                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `needs a user`                  | `--as <user>`, or `shot login --as <user>` once                               |
| `app not running at …`          | start the dev server in the background, then retry                            |
| `logIn hook failed for …`       | the user has no account, or the project's login changed: fix `shot.config.ts` |
| `no section "X"; sections: …`   | pick a listed title, or `--select`                                            |
| `Invalid value for flag --size` | pick a listed size, or `WxH`                                                  |
| `redirected to /login…`         | the session was renewed once and still bounced: the user lacks access         |
| `no publisher configured`       | add `github()` to `plugins` in `shot.config.ts`                               |
| `gh … cannot attach files`      | update gh to 2.99 or later                                                    |
| `no pull request for …`         | push and create the PR first                                                  |
| `unknown label …`               | shoot that label first, or pick a listed one                                  |
| `no sheet matches …`            | use part of a listed sheet title                                              |
