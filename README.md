# Payload CMS Website

A website built with [Payload CMS 3](https://payloadcms.com/docs) and [Next.js](https://nextjs.org/docs). The website and the admin panel run as one Next.js app, and data is stored in a local SQLite file.

Besides the CMS pages and blog, the site runs a **hiring workflow**: candidates apply with their resume, Claude scores it against the job posting, and candidates move through an initial interview, a proctored coding assessment and a final interview. See [Hiring workflow](#hiring-workflow).

- **Website:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin
- **Careers (job postings):** http://localhost:3000/careers
- **Applicant portal (My Profile):** http://localhost:3000/applicant

---

## Getting started

### Requirements

- **Node.js 20.9 or newer** (check with `node -v`)
- **npm** (this repo uses `package-lock.json`, so please don't use yarn or pnpm)
- **Git**

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/danz-wellevate/payload-cms.git
cd payload-cms

# 2. Create your local environment file
cp .env.example .env
```

Open `.env` and set `PAYLOAD_SECRET` to any long random string. Leave `DATABASE_URL` as it is.

The other settings in `.env.example` are optional. The site runs without them:

| Variable                                   | What it's for                                                                                                                                                           | Without it                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`                        | AI resume review. Create a key at [platform.claude.com](https://platform.claude.com) (pay-as-you-go API credits; a Claude Pro subscription doesn't include API access). | Applications show **AI review failed** and candidates aren't invited automatically. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, ... | Sending emails (set-password links, interview invites, schedules, Head of Plus notifications).                                                                          | Emails are printed in the dev server's terminal instead of being sent.              |
| `NEXT_PUBLIC_SERVER_URL`                   | The site's public address, used for links in emails.                                                                                                                    | Links point to `http://localhost:3000`.                                             |
| `HIRING_TIME_ZONE`                         | Time zone for interview and assessment times in emails and on the booking page.                                                                                         | `Asia/Manila`.                                                                      |
| `JUDGE0_API_URL`, `JUDGE0_API_KEY`         | Runs candidates' code in the online IDE.                                                                                                                                | Uses the free public Judge0 instance.                                               |

> **Testing the hiring emails locally?** With real SMTP settings in `.env`, emails go to real inboxes. Use addresses you own when you apply as a test candidate.

```bash
# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

Then:

1. Open http://localhost:3000/admin and create your admin user. The first account you create becomes the admin.
2. Open http://localhost:3000 to see the site.

On first start, the app automatically creates the **Home page** and **6 sample blog posts**, so you'll have content to work with right away.

> **Your database is local to your machine.** `payload-cms.db` and `.env` are gitignored and never committed, so content you create in your admin panel isn't shared with the team. Only code is shared through git.

---

## Useful scripts

| Command                      | What it does                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`                | Start the dev server at http://localhost:3000                                                   |
| `npm run build`              | Production build                                                                                |
| `npm run start`              | Run the production build                                                                        |
| `npm run seed`               | Create the Home page and sample posts if they're missing (never overwrites existing content)    |
| `npm run generate:types`     | Regenerate `src/payload-types.ts`. **Run this after changing any collection, global or block.** |
| `npm run generate:importmap` | Regenerate the admin import map. **Run this after adding a custom admin component.**            |
| `npx tsc --noEmit`           | Type-check the project                                                                          |
| `npm run test:int`           | Integration tests (Vitest)                                                                      |
| `npm run test:e2e`           | End-to-end tests (Playwright)                                                                   |

> If `npm run seed` fails with "index already exists" while the dev server is running, run it again. The script and the dev server both update the database schema, and they sometimes collide.

---

## Project structure

```
src/
├── app/
│   ├── (frontend)/          # The public website
│   │   ├── layout.tsx       # Applies the theme (fonts, colors), header and footer
│   │   ├── page.tsx         # Homepage (renders the "home" page from the CMS)
│   │   ├── [slug]/          # Any other CMS page, e.g. /about
│   │   ├── blog/            # Blog list (/blog) and articles (/blog/<slug>)
│   │   ├── careers/         # Job list, job page with the apply form, apply endpoint
│   │   ├── schedule/        # Initial interview booking page (/schedule/<token>)
│   │   ├── applicant/       # Applicant sign-in, set password, My Profile
│   │   ├── assessment/      # The proctored coding assessment and its endpoints
│   │   ├── playground/      # Public code playground
│   │   └── styles.css       # All site styles, built on the theme CSS variables
│   └── (payload)/           # Admin panel and API (generated by Payload, rarely edited)
├── blocks/config.ts         # Page section blocks (Hero, Features, Latest Posts, ...)
├── collections/             # Pages, Posts, Users, Media, hiring and assessment collections
├── globals/                 # General Settings (incl. Theme), Main Menu, Footer, Code Playground
├── recruitment/             # Hiring workflow: AI resume review, emails, stages, time zone
├── assessment/              # Assessment rules: timing, proctoring events, recordings
├── applicant/               # Applicant accounts and sessions
├── components/
│   ├── admin/               # Custom admin widgets (review player, AI review button, ...)
│   ├── applicant/           # Applicant sign-in forms and the My Profile dashboard
│   ├── assessment/          # The assessment runner (IDE, webcam, screen recording)
│   ├── careers/             # Apply form and interview time picker
│   ├── blocks/              # How each page block renders on the site
│   ├── blog/                # Post card and cover
│   ├── site/                # Header, footer, links
│   ├── ui/                  # shadcn/ui components
│   └── ColorPickerField.tsx # Custom admin color picker
├── fields/                  # Reusable field definitions (link, color)
├── theme/                   # Font list, theme defaults, data loaders
├── seed/                    # Starter content
└── payload.config.ts        # Main Payload config
```

### How content is managed

| Where in the admin                      | What it controls                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| **Settings → General Settings**         | Site name, tagline, logo, favicon                                               |
| **Settings → General Settings → Theme** | Heading and paragraph fonts, text colors and brand colors                       |
| **Settings → Main Menu**                | Header navigation and submenus                                                  |
| **Settings → Footer**                   | Footer link columns and copyright                                               |
| **Pages**                               | Pages built from section blocks. The page with slug `home` is the homepage.     |
| **Blog Posts**                          | Blog articles                                                                   |
| **Hiring → Job postings**               | Jobs listed at `/careers`, with the qualifications and skills the AI checks     |
| **Hiring → Applications**               | Each candidate's progress through the hiring workflow                           |
| **Hiring → Interview slots**            | Times candidates can book for the initial interview                             |
| **Assessments → Applicants**            | Applicant accounts and their exam time limit                                    |
| **Assessments → Assessments**           | Coding assessment attempts: code, recordings, activity and result               |
| **Users**                               | Admin accounts. Set **Role → Head of Plus** for whoever gets the hiring emails. |

**Styling rule:** always use the theme CSS variables (`var(--color-primary)`, `var(--font-heading)` and the others defined in `styles.css`) instead of hard-coded colors or fonts. That way the site keeps following what editors set in General Settings → Theme.

### Adding a new page section block

1. Define the block's fields in `src/blocks/config.ts` and add it to `pageBlocks`.
2. Run `npm run generate:types`.
3. Add a component for it in `src/components/blocks/RenderBlocks.tsx` and a `case` for its `blockType`.
4. Style it in `styles.css` using the theme variables.

---

## Hiring workflow

### The steps

| #     | Step                      | What happens                                                                                                                                                                                                                              |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Candidate applies         | At `/careers/<job>`, the candidate submits their name, email and resume (PDF or Word `.docx`, up to 5 MB). This also creates their applicant account.                                                                                     |
| 2     | AI resume review          | Claude checks the resume against each **qualification** and **required skill** in the job posting and rates each one a full, partial or no match. The score is the average, with qualifications and skills weighted equally.              |
| 3     | Score reaches the minimum | At or above the job's **Minimum AI score** (80% by default), the candidate gets an email with a link to book their initial interview.                                                                                                     |
| 4     | Initial interview booking | The candidate picks one of the open **Interview slots** on the booking page. Each slot can only be booked once.                                                                                                                           |
| 5     | Head of Plus notified     | The Head of Plus gets an email with the candidate, the time and the AI score. The candidate gets a confirmation.                                                                                                                          |
| 6–7   | Initial interview result  | After the interview, the Head of Plus marks **Initial interview result** as Passed or Failed on the application.                                                                                                                          |
| 8–9   | Technical assessment      | If passed, the Head of Plus picks the assessment date and time. Saving creates the assessment and emails the candidate the schedule.                                                                                                      |
| 10–11 | Online IDE                | At the scheduled time, **Start technical assessment** appears in the candidate's My Profile. Before that, the server won't let it start. The candidate solves the task in the built-in editor.                                            |
| 12    | Monitoring                | The webcam and screen are recorded, and leaving the tab or window (for example with Alt+Tab), leaving full screen and pasting are logged. When the candidate submits, the Head of Plus gets an email with these counts and a review link. |
| 13    | Assessment result         | The Head of Plus reviews the code, recordings and activity, then marks the result Passed or Failed, on either the application or the assessment. The two stay in sync.                                                                    |
| 14–15 | Final interview           | If passed, the Head of Plus sets the final interview date and time (and optional details). Saving emails the candidate.                                                                                                                   |

The application's **Stage** (in the sidebar) updates itself from these fields, so the Applications list always shows where each candidate is. Candidates see the same progress in My Profile.

### Setting it up

1. In **Users**, set **Role → Head of Plus** on whoever should get the hiring emails. If nobody has the role, every admin gets them.
2. Create a **Job posting**: put one qualification per line, add the required skills, and check the minimum score.
3. Add some **Interview slots** in the future.
4. Add `ANTHROPIC_API_KEY` to `.env` (see [Setup](#setup)) and restart `npm run dev`.

### Good to know

- **Each step's email is sent once.** Emails go out when the matching field changes, so saving an application again doesn't resend them. Changing a date (for example rescheduling the assessment) sends an updated email.
- **Steps can't be skipped.** The assessment date can only be set after the initial interview is Passed, and the final interview only after the assessment is Passed.
- **Re-running the AI review:** on an application, **AI review → Run AI review again** scores the resume again, for example after the review failed or after you changed the job's qualifications.
- **Without an API key**, the AI review fails and the workflow stops at step 2. There's no manual override yet.
- **Candidates below the minimum score** get no email, and their My Profile says the application is being reviewed. Candidates who fail an interview or the assessment see a message in My Profile but get no email.
- **Applicants who signed up directly** at `/applicant/login` without applying for a job can still start the coding exam whenever they like. Candidates who applied only get the assessment the Head of Plus scheduled.
- **Resumes are private.** They're stored in `resumes/`, which is gitignored, and only admins can download them.

---

## Git workflow

`master` is the main branch. **Never commit directly to `master`.** All work goes through a branch and a pull request.

### 1. Start from an up-to-date `master`

```bash
git checkout master
git pull origin master
git checkout -b feat/blog-categories
```

### 2. Name your branch

Use the format **`type/short-description`**, in lowercase with words separated by hyphens:

| Prefix      | Use for                                      | Example                       |
| ----------- | -------------------------------------------- | ----------------------------- |
| `feat/`     | A new feature                                | `feat/contact-form-block`     |
| `fix/`      | A bug fix                                    | `fix/mobile-menu-not-closing` |
| `hotfix/`   | An urgent fix for something already live     | `hotfix/broken-homepage`      |
| `refactor/` | Restructuring code without changing behavior | `refactor/block-components`   |
| `style/`    | Visual or CSS-only changes                   | `style/footer-spacing`        |
| `docs/`     | Documentation only                           | `docs/readme-setup`           |
| `chore/`    | Dependencies, config, tooling                | `chore/update-payload`        |
| `test/`     | Adding or fixing tests                       | `test/blog-e2e`               |

If there's a ticket or issue number, include it: `feat/123-contact-form-block`.

❌ Avoid names like `my-branch`, `test`, `danzen-changes`, `fix` or `New_Feature`.

### 3. Write proper commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short summary in the imperative mood

Optional body explaining WHY the change was made, not just what changed.
```

- **type**: the same list as the branch prefixes (`feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`)
- **scope** (optional): the area you changed, such as `blog`, `theme`, `pages`, `header`, `admin` or `seed`
- **summary**: imperative mood ("add", not "added" or "adds"), lowercase, no period at the end, 72 characters or fewer

**Good examples:**

```
feat(blog): add category filter to blog listing
fix(header): close mobile menu after clicking a link
style(theme): increase heading line height on mobile
refactor(blocks): move hero block into its own component
chore: update payload to 3.91.0
docs: add git workflow to README
```

**Bad examples:**

```
update            ← says nothing
fixed stuff       ← vague, past tense
WIP               ← don't push work-in-progress commits to a shared branch
changes to the blog page and also fixed the footer and theme   ← too many things at once
```

Keep each commit to **one logical change**. If your summary needs the word "and", it's probably two commits.

### 4. Before you push

- [ ] `npx tsc --noEmit` passes
- [ ] You ran `npm run generate:types` if you changed a collection, global or block, and committed the updated `src/payload-types.ts`
- [ ] You ran `npm run generate:importmap` if you added an admin component
- [ ] You checked your change in the browser, on both desktop and mobile widths
- [ ] You aren't committing `.env`, `payload-cms.db`, or anything in `media/`, `resumes/`, `proctoring-recordings/` or `proctoring-snapshots/`

### 5. Open a pull request

```bash
git push -u origin feat/blog-categories
```

Then open a pull request on GitHub **into `master`**:

- **Title:** written in the same format as a commit message, e.g. `feat(blog): add category filter to blog listing`
- **Description:** what changed, why, and how to test it. Add screenshots for any visual change.
- **Review:** ask a teammate to review it. Merge only after approval, then delete the branch.

### Keeping your branch up to date

If `master` has moved on while you're working:

```bash
git checkout master
git pull origin master
git checkout feat/blog-categories
git merge master
```

Resolve any conflicts, check that the app still runs, then push.

> **Conflicts in `src/payload-types.ts` or `importMap.js`?** Don't fix them by hand. Accept either version, then run `npm run generate:types` and `npm run generate:importmap` to regenerate them.

---

## Resources

- [Payload docs](https://payloadcms.com/docs)
- [Next.js docs](https://nextjs.org/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
