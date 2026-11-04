# Focus Week

A personal weekly planner built with React, Tailwind CSS, and Vite.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` for a production build and `npm run preview` to serve it locally.

Pick a day, then switch presets from its agenda. **Show routine** reveals protected breaks, meals, and sleep. Drag a focus block onto another date in the week or use the move buttons in the block editor. If the original time is occupied, the planner looks for the first free slot of the same length.

Changes save in local storage for the current browser and site address. Switching a day’s preset replaces that day’s focus blocks and completion marks. The sample tasks and projects are created on first use.
