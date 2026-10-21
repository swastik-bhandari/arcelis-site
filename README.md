# arcelis.org

The Arcelis Labs website. Plain HTML, CSS and JavaScript. No build step.

## Files

| File | What it is |
|---|---|
| `index.html` | The homepage (all sections) |
| `data/projects.json` | The project list. Edit this to add, update or close projects |
| `data/people.json` | Everyone shown under People. Edit this to add or move people |
| `assets/people/` | Profile photos (square, about 480×480) |
| `assets/style.css` | All styling (colors, fonts, layout) |
| `assets/main.js` | Project list, specimen animation, copy buttons. Form links go at the top |
| `assets/brand/` | Logo files and profile pictures |
| `404.html` | Page shown for broken links |

## Adding or updating a project

Open `data/projects.json` and copy an existing entry. Fields:

- `id`: short, unique, lowercase-with-dashes
- `status`: `open`, `active` or `completed`
- `draft`: `true` shows a "Draft" tag; set to `false` once confirmed
- `title`, `area`, `summary`, `question`
- `mentors`: list of names (only people who agreed to be listed)
- `skills`, `outputs`: lists
- `commitment`, `duration`, `team`, `opened`
- `links`: for completed projects, e.g. `[{"label": "Paper", "url": "https://..."}]`

Commit the change. The live site updates in about a minute.

## Connecting the forms

When the Tally forms exist, paste their links at the top of `assets/main.js`:

```js
var FORMS = {
  join: "https://tally.so/r/xxxxxx",
  propose: "https://tally.so/r/yyyyyy"
};
```

Add a hidden field named `project` to the join form, so you can see which project each applicant chose.

## Adding people

Open `data/people.json` and add an entry with `name`, `group` (founder, advisors, researchers, students or alumni), `role`, `affiliation`, `bio`, an optional `photo` path and `links`. Upload the photo to `assets/people/`. To move a student to alumni, change `group`. List mentors only after they agree.

While `projects` in `data/projects.json` is empty, the Projects section shows the "first call for projects" panel. As soon as one project is added, the Open / Active / Completed tabs appear instead. A ready-made template is in `_example` in that file.

## Deploying

Hosted free on GitHub Pages from this repository (branch `main`, folder `/`). Changes go live about a minute after each commit.

## Previewing locally

Opening `index.html` straight from your disk will not load the project list (browsers block `fetch` from files). Run a small local server instead:

```
python3 -m http.server 8000
```

then open http://localhost:8000
