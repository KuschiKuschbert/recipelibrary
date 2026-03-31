# NotebookLM visual exports (infographics / slides)

Use this folder to ship **static images** you generate in NotebookLM (or similar) next to the structured JSON extractions. The site reads **`manifest.json`** and shows them on [notebooklm-gallery.html](../notebooklm-gallery.html).

## Export workflow (NotebookLM)

1. In NotebookLM, open the notebook that backs your kitchen sources (Flavor Bible, Aroma, etc.).
2. Use **Infographic**, **slide deck**, or **image** style outputs (product UI changes over time — export whatever gives you a **single image per concept**).
3. Download or screenshot the result at **readable resolution** (e.g. 1200–2000px wide). Prefer **WebP** or **PNG** for clarity on dark UI.
4. Save the file under **`notebooklm/exports/`** with a short, URL-safe name, e.g. `lamb-pairing-overview.webp`.

## Manifest

Edit **`manifest.json`** (array of objects). Each item:

| Field | Required | Description |
|--------|----------|-------------|
| `id` | yes | Stable id, `kebab-case` (used for anchors / `?id=`). |
| `title` | yes | Short title shown in the gallery. |
| `src` | yes | Path from site root, must stay under `notebooklm/` (e.g. `notebooklm/exports/lamb.webp`). |
| `alt` | yes | Alt text for accessibility. |
| `tags` | no | Strings for optional filter chips (e.g. `["lamb","protein"]`). |
| `blurb` | no | One-line caption under the title. |
| `source_notebook` | no | Reminder label (not shown as link unless you add URL in blurb). |

Example entry:

```json
{
  "id": "lamb-aromatics",
  "title": "Lamb — aromatic pairings",
  "src": "notebooklm/exports/lamb-aromatics.webp",
  "alt": "Infographic of lamb herb and spice pairings from kitchen reference sources.",
  "tags": ["lamb", "protein"],
  "blurb": "NotebookLM summary of classic lamb companions.",
  "source_notebook": "Kitchen pairing notebook"
}
```

After adding files, commit and push; GitHub Pages will serve them like any other static asset.

## Limits

- **No automation** here: NotebookLM does not push to git; you drop files in and update the manifest.
- Paths in `src` are **validated** in the gallery script (must start with `notebooklm/`, no `..`).
