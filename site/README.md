# Sādhana — Yoga & Stillness with Shraddha 🤍

A calm, Apple-inspired personal site for Shraddha to share **writings, guided
practices (videos), and small reflections** — a little yoga book, kept online.

> **The name.** *Shraddha* means **faith / devotion**. *Sādhana* means a
> **daily, devoted practice**. Together: **"practice, with devotion."**

---

## ✨ What's inside

| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | Hero, latest writings, practices, thoughts |
| Writings | `blog.html` | The full blog / journal |
| Reading view | `post.html` | Renders a single blog post (`post.html?slug=…`) |
| Practices | `videos.html` | Video gallery (YouTube) |
| Thoughts | `thoughts.html` | Short reflections |
| About | `about.html` | Shraddha's story |

It's a **plain static site** — no build step, no frameworks. It runs anywhere
and is easy to host for free.

---

## ✍️ How Shraddha adds content

**Everything lives in one file:** [`assets/js/content.js`](assets/js/content.js).
Open it and follow the comments at the top. In short:

- **New blog post** → copy a block inside `blog: [ … ]`, edit the fields.
  The `body` supports blank-line paragraphs, `**bold**`, `*italic*`, and a
  `>` at the start of a line for a quote.
- **New video** → add a block inside `videos: [ … ]` and paste the YouTube
  video id (the bit after `watch?v=`) into `youtube`.
- **New thought** → add a block inside `thoughts: [ … ]`.

Save the file, refresh the page — done. No coding needed beyond editing text.

> Photos are drawn as soft CSS artwork so the site always looks complete. To
> use real photos later, swap the `.scene` blocks for `<img>` tags.

---

## 👀 Preview locally

```bash
cd site
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static server works — the pages just need to be served over `http://`,
not opened as `file://`, so the scripts can load.)

---

## 🚀 Publish for free (GitHub Pages)

1. Push this repo to GitHub.
2. Repo **Settings → Pages**.
3. **Source:** *Deploy from a branch*, pick your branch, **folder: `/site`**.
4. Save. Your site goes live at `https://<username>.github.io/<repo>/`.

For a custom domain (e.g. `sadhana.yoga`), add it under the same Pages
settings and point your domain's DNS at GitHub.

---

Made with devotion. 🤍
