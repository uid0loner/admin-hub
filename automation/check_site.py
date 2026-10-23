#!/usr/bin/env python3
"""Site check for admin_hub. Runs on every push (GitHub Action) and locally.

1. Structure: every page has a title, a description and a canonical link; every internal
   link, anchor, script, stylesheet and image points at something that exists; every page
   is in the sitemap and every sitemap entry exists.
2. Preservation guard for the visual redesign: compares each page against
   automation/baseline.json (pages, visible word count, element ids, internal links).
   A page that disappears, loses more than 3 % of its words, loses an element id the
   scripts use, or loses an internal link fails the check.

  python3 automation/check_site.py            check
  python3 automation/check_site.py --baseline write a new baseline (after an intended change)
"""
import json, os, re, sys
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "admin_hub_site")
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "baseline.json")
SITE = "https://admin-hub.xyz/"
SKIP_TEXT = {"script", "style", "noscript", "svg", "template"}

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.assets, self.words = set(), [], [], 0
        self.title = self.desc = self.canon = None
        self._skip = 0; self._in_title = False
    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag in SKIP_TEXT: self._skip += 1
        if "id" in a: self.ids.add(a["id"])
        if tag == "a" and a.get("name"): self.ids.add(a["name"])
        if tag == "title": self._in_title = True
        if tag == "meta" and a.get("name") == "description": self.desc = a.get("content")
        if tag == "link" and a.get("rel") == "canonical": self.canon = a.get("href")
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag == "script" and a.get("src"): self.assets.append(a["src"])
        if tag == "link" and a.get("rel") in ("stylesheet", "manifest", "icon", "apple-touch-icon", "preload") and a.get("href"): self.assets.append(a["href"])
        if tag in ("img", "source") and a.get("src"): self.assets.append(a["src"])
    def handle_endtag(self, tag):
        if tag in SKIP_TEXT and self._skip: self._skip -= 1
        if tag == "title": self._in_title = False
    def handle_data(self, d):
        if self._in_title: self.title = (self.title or "") + d
        elif not self._skip: self.words += len(re.findall(r"\w+", d))

def local(href):
    u = urlparse(href)
    if u.scheme in ("mailto", "tel", "javascript", "data"): return None
    if u.netloc and u.netloc not in ("admin-hub.xyz", "www.admin-hub.xyz"): return None
    path = unquote(u.path.lstrip("/")) or ("" if u.fragment and not u.path else "index.html")
    return path, u.fragment

def scan():
    pages = {}
    for f in sorted(os.listdir(ROOT)):
        if f.endswith(".html"):
            p = Page(); p.feed(open(os.path.join(ROOT, f), encoding="utf-8").read()); pages[f] = p
    return pages

def main():
    pages = scan(); errors = []; warn = []
    # pages whose scripts read location.hash route by hash: their #fragments are states, not anchors
    hashed = set()
    for n, p in pages.items():
        for src in p.assets:
            fp = os.path.join(ROOT, src.split("?")[0])
            if src.endswith(".js") or ".js?" in src:
                if os.path.exists(fp) and "location.hash" in open(fp, encoding="utf-8", errors="ignore").read() and src.split("?")[0] not in ("shell.js", "search.js", "reveal.js"):
                    hashed.add(n)
    # ids that scripts can look up (any quoted string or #selector in a script): keep them through any redesign
    jstext = "\n".join(open(os.path.join(ROOT, f), encoding="utf-8", errors="ignore").read() for f in os.listdir(ROOT) if f.endswith(".js"))
    js_ids = set(re.findall(r"""["'#]([A-Za-z][\w-]*)""", jstext))
    for name, p in pages.items():
        if not (p.title or "").strip(): errors.append(f"{name}: no title")
        if name not in ("404.html",) and not p.desc: errors.append(f"{name}: no meta description")
        if name not in ("404.html",) and not p.canon: warn.append(f"{name}: no canonical link")
        for href in p.links:
            r = local(href)
            if not r: continue
            path, frag = r
            target = path or name
            if not os.path.exists(os.path.join(ROOT, target.split("?")[0])):
                errors.append(f"{name}: link to missing {href}")
            elif frag and target.endswith(".html") and target in pages and target not in hashed and frag not in pages[target].ids:
                errors.append(f"{name}: anchor #{frag} not found in {target}")
        for src in p.assets:
            r = local(src)
            if r and r[0] and not os.path.exists(os.path.join(ROOT, r[0].split("?")[0])):
                errors.append(f"{name}: missing asset {src}")
    sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    locs = {l.replace(SITE, "") or "index.html" for l in re.findall(r"<loc>([^<]+)</loc>", sm)}
    for l in sorted(locs - set(pages)): errors.append(f"sitemap: {l} does not exist")
    for n in sorted(set(pages) - locs - {"404.html"}): warn.append(f"sitemap: {n} is missing")

    snap = {n: {"words": p.words, "ids": sorted(p.ids & js_ids), "links": sorted({h for h in p.links if local(h) and local(h)[0]})} for n, p in pages.items()}
    if "--baseline" in sys.argv:
        json.dump(snap, open(BASE, "w"), indent=0, sort_keys=True)
        print(f"baseline written: {len(snap)} pages"); return 0
    if os.path.exists(BASE):
        base = json.load(open(BASE))
        for n, b in base.items():
            if n not in snap: errors.append(f"preserve: page {n} is gone"); continue
            s = snap[n]
            if s["words"] < b["words"] * 0.97: errors.append(f"preserve: {n} lost text ({b['words']} -> {s['words']} words)")
            for i in sorted(set(b["ids"]) - set(s["ids"])): errors.append(f"preserve: {n} lost element #{i} that a script uses")
            for l in sorted(set(b["links"]) - set(s["links"])): errors.append(f"preserve: {n} lost the link {l}")
    for w in warn: print("warn ", w)
    for e in errors: print("ERROR", e)
    print(f"{len(pages)} pages checked, {len(errors)} errors, {len(warn)} warnings")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
