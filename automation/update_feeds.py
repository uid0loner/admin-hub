#!/usr/bin/env python3
"""Fetch public security feeds and the CISA KEV catalog, then regenerate
news.html, cve.html and the homepage blocks. Standard library only.

Usage: python automation/update_feeds.py [--site DIR] [--config FILE] [--force-empty]
A feed that fails is skipped and reported. If nothing at all can be fetched,
existing pages are left untouched.
"""
import argparse, datetime as dt, email.utils, html, json, re, sys, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

UA = "admin_hub-feed-bot/1.0"
TAG = re.compile(r"<[^>]+>")
CVE = re.compile(r"^CVE-\d{4}-\d{4,}$")
e = html.escape


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/xml, application/json, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def clean(s, n=None):
    s = html.unescape(TAG.sub(" ", s or ""))
    s = re.sub(r"\s+", " ", s).strip()
    if n and len(s) > n:
        s = s[:n].rsplit(" ", 1)[0].rstrip(".,;:") + "…"
    return s


def safe(u):
    u = (u or "").strip()
    return u if re.match(r"^https?://", u, re.I) else None


def local(tag):
    return tag.rsplit("}", 1)[-1]


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def parse_feed(data):
    root = ET.fromstring(data)
    items = []
    for el in root.iter():
        if local(el.tag) not in ("item", "entry"):
            continue
        g = {}
        for c in el:
            k = local(c.tag)
            if k == "link":
                href = c.get("href")
                if href:
                    if c.get("rel", "alternate") == "alternate" and "link" not in g:
                        g["link"] = href
                elif (c.text or "").strip():
                    g["link"] = c.text.strip()
            elif k in ("title", "description", "summary", "content", "pubDate", "published", "updated", "date"):
                g.setdefault(k, "".join(c.itertext()))
        items.append({
            "title": g.get("title", ""),
            "link": g.get("link", ""),
            "date": parse_date(g.get("pubDate") or g.get("published") or g.get("updated") or g.get("date")),
            "desc": g.get("description") or g.get("summary") or g.get("content") or "",
        })
    return items


def collect(cfg, now):
    out, seen, log = [], set(), []
    for f in cfg["feeds"]:
        try:
            data = fetch(f["url"])
            if b"<!ENTITY" in data:
                raise ValueError("entity declarations are not allowed")
            items = parse_feed(data)
        except Exception as ex:
            log.append("FAILED  %s: %s" % (f["name"], ex))
            continue
        n, cap = 0, f.get("max")
        for it in items:
            if cap and n >= cap:      # "max" keeps a busy advisory feed from crowding out the rest
                break
            link, d = safe(it["link"]), it["date"]
            title = clean(it["title"], 200)
            if not link or not title or link in seen or d is None:
                continue
            if d > now + dt.timedelta(days=1) or d < now - dt.timedelta(days=cfg.get("days", 14)):
                continue
            seen.add(link)
            out.append({"t": title, "u": link, "d": d, "s": f["name"], "x": clean(it["desc"], 140) if f.get("excerpt") else ""})
            n += 1
        log.append("ok      %s: %d items" % (f["name"], n))
    out.sort(key=lambda x: x["d"], reverse=True)
    return out[: cfg.get("max_items", 120)], log


def shell(site, title, desc, h1, inner, script=""):
    tpl = (site / "404.html").read_text(encoding="utf-8")
    head = re.search(r"<header>.*?</header>", tpl, re.S).group(0)
    foot = re.search(r"<footer>.*?</footer>", tpl, re.S).group(0)
    # mark the current section in the top bar and add the prompt-style breadcrumb
    head = re.sub(r' aria-current="page"', "", head)
    head = head.replace('<a href="%s.html">' % h1, '<a href="%s.html" aria-current="page">' % h1, 1)
    crumb = '<p class="crumb"><span class="cu">sysop@hub</span>:<a href="index.html">~</a>/<b>%s</b><span class="cs">$</span></p>\n' % h1
    # same ?v= stamp as the rest of the site, taken from the service worker's cache name
    mv = re.search(r"admin-hub-v(\d+)", (site / "sw.js").read_text(encoding="utf-8"))
    ver = "?v=" + mv.group(1) if mv else ""
    scr = "".join('<script src="%s.js%s" defer></script>' % (n, ver) for n in ("shell", "consent", "reveal", "pwa", "search-index", "search"))
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            '<title>%s | admin_hub</title><meta name="description" content="%s"><link rel="stylesheet" href="style.css%s"><link rel="canonical" href="https://admin-hub.xyz/%s.html"><link rel="manifest" href="manifest.json"><meta name="theme-color" content="#07051a"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png"></head><body><div class="wrap">%s<main>%s<h1>%s</h1>%s</main>%s</div>%s%s</body></html>'
            % (e(title), e(desc), ver, h1, head, crumb, h1, inner, foot, script, scr))


AD = ''
FILTER = """<script>
var q=document.getElementById("q"),L=[].slice.call(document.querySelectorAll("%s")),H=[].slice.call(document.querySelectorAll(".ltr")),M=document.getElementById("ms");
function run(){var t=q.value.trim().toLowerCase(),ms=M&&M.checked;
L.forEach(function(x){x.hidden=(!!t&&x.textContent.toLowerCase().indexOf(t)<0)||(ms&&x.getAttribute("data-v")!=="microsoft")});
H.forEach(function(h){var n=h.nextElementSibling;if(n&&n.tagName==="UL")h.hidden=![].slice.call(n.children).every(function(x){return false})&&![].slice.call(n.children).some(function(x){return !x.hidden})})}
q.addEventListener("input",run);if(M)M.addEventListener("change",run);
q.value=new URLSearchParams(location.search).get("q")||"";run();
</script>"""


def news_row(it, fmt):
    ex = '<small class="ex">%s</small>' % e(it["x"]) if it["x"] else ""
    return ('<li><span class="hi">%s</span><span class="src in">%s</span><span><a href="%s" rel="noopener nofollow">%s</a>%s</span></li>'
            % (it["d"].strftime(fmt), e(it["s"]), e(it["u"], quote=True), e(it["t"]), ex))


def render_news(site, items, stamp):
    if items:
        days = {}
        for it in items:
            days.setdefault(it["d"].strftime("%Y-%m-%d"), []).append(it)
        inner = ('<p class="dim">Headlines from public security feeds with a link to the original article. Updated %s UTC.</p>'
                 '<input id="q" class="q" type="search" placeholder="Filter headlines" autocomplete="off" spellcheck="false">' % stamp)
        for day in sorted(days, reverse=True):
            inner += '<h2 class="ltr">%s</h2><ul class="feed nl">%s</ul>' % (day, "".join(news_row(i, "%H:%M") for i in days[day]))
        inner += ('<p class="note">Times are UTC. Articles belong to their publishers; this page only lists headlines and links. '
                  'Sources are listed in the site repository (automation/feeds.json).</p>' + AD)
        script = FILTER % ".nl li"
    else:
        inner = ('<p class="dim">Headlines appear after the first automated update.</p><input id="q" class="q" type="search" style="display:none">' + AD)
        script = ""
    (site / "news.html").write_text(shell(site, "Security news", "Latest IT security and Microsoft news headlines from public feeds with links to the original articles.", "news", inner, script), encoding="utf-8")


def render_kev(site, vulns, total, stamp):
    if vulns:
        inner = ('<p class="dim">The most recent entries of the CISA Known Exploited Vulnerabilities catalog: flaws that attackers are exploiting now. '
                 'Catalog size: %s. Updated %s UTC.</p><div class="ctl"><input id="q" class="q" style="flex:1 1 240px;width:auto" type="search" placeholder="Filter by CVE, vendor or product" autocomplete="off" spellcheck="false">'
                 '<label><input type="checkbox" id="ms">Microsoft only</label></div><div id="kev">' % (total, stamp))
        for v in vulns:
            cid = v.get("cveID", "")
            if not CVE.match(cid):
                continue
            vend, prod = v.get("vendorProject", ""), v.get("product", "")
            ran = v.get("knownRansomwareCampaignUse", "")
            inner += ('<div class="snip kev" id="%s" data-v="%s"><h3>%s <span>%s %s</span></h3><p>%s: %s</p><p class="dim">Added %s, due %s. Ransomware use: %s.</p>'
                      '<p class="dim">Required action: %s</p><p><a href="https://nvd.nist.gov/vuln/detail/%s" rel="noopener">NVD</a> '
                      '<a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" rel="noopener">CISA catalog</a></p></div>'
                      % (cid, "microsoft" if vend.lower() == "microsoft" else "other", cid, e(vend), e(prod), e(clean(v.get("vulnerabilityName"))),
                         e(clean(v.get("shortDescription"), 400)), e(v.get("dateAdded", "")), e(v.get("dueDate", "")), e(ran or "unknown"),
                         e(clean(v.get("requiredAction"), 300)), cid))
        inner += '</div><p class="note">Data: CISA Known Exploited Vulnerabilities catalog (US government work). Check the vendor advisory for affected versions and fixes.</p>' + AD
        script = FILTER % ".kev"
    else:
        inner = '<p class="dim">Exploited vulnerabilities appear after the first automated update.</p><input id="q" class="q" style="display:none">' + AD
        script = ""
    (site / "cve.html").write_text(shell(site, "Known exploited vulnerabilities", "Recent entries of the CISA Known Exploited Vulnerabilities catalog with vendor, product, due date and required action.", "cve", inner, script), encoding="utf-8")


def inject(site, marker, body):
    p = site / "index.html"
    s = p.read_text(encoding="utf-8")
    new = re.sub(r"(<!--%s_START-->).*?(<!--%s_END-->)" % (marker, marker), lambda m: m.group(1) + body + m.group(2), s, flags=re.S)
    if new != s:
        p.write_text(new, encoding="utf-8")


def main():
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default=str(root / "admin_hub_site"))
    ap.add_argument("--config", default=str(root / "automation" / "feeds.json"))
    ap.add_argument("--force-empty", action="store_true", help="write empty-state pages without fetching")
    a = ap.parse_args()
    site, cfg = Path(a.site), json.loads(Path(a.config).read_text(encoding="utf-8"))
    now = dt.datetime.now(dt.timezone.utc)
    stamp = now.strftime("%Y-%m-%d %H:%M")
    if a.force_empty:
        render_news(site, [], stamp); render_kev(site, [], 0, stamp)
        inject(site, "NEWS", '<p class="dim">Headlines appear after the first automated update.</p>')
        inject(site, "KEV", '<p class="dim">Exploited vulnerabilities appear after the first automated update.</p>')
        print("empty-state pages written"); return 0
    items, log = collect(cfg, now)
    print("\n".join(log))
    if items:
        render_news(site, items, stamp)
        inject(site, "NEWS", '<ul class="feed">%s</ul>' % "".join(news_row(i, "%d %b") for i in items[:8]))
        print("news.html: %d items" % len(items))
    else:
        print("no items fetched, news.html left unchanged")
    try:
        data = json.loads(fetch(cfg["kev_url"]))
        v = sorted(data.get("vulnerabilities", []), key=lambda x: x.get("dateAdded", ""), reverse=True)
        if v:
            v = [x for x in v if CVE.match(x.get("cveID", ""))]
            render_kev(site, v[:150], data.get("count", len(v)), stamp)
            rows = "".join('<li><span class="hi">%s</span><span class="src in">%s</span><a href="cve.html#%s">%s: %s</a></li>'
                           % (e(x.get("dateAdded", "")[5:]), e(x.get("vendorProject", "")), x["cveID"], x["cveID"], e(clean(x.get("vulnerabilityName"), 70)))
                           for x in v[:5])
            inject(site, "KEV", '<ul class="feed">%s</ul>' % rows)
            print("cve.html: %d entries" % min(len(v), 150))
    except Exception as ex:
        print("FAILED  CISA KEV: %s" % ex)
    return 0


if __name__ == "__main__":
    sys.exit(main())
