# admin_hub

Static IT security site plus an automatic news and CVE feed.

    admin_hub_site/   the public website (upload or deploy this folder)
    automation/       update_feeds.py and feeds.json (sources)
    .github/workflows/update-feeds.yml   runs the update every 3 hours

## Go live (about 30 minutes)
1. Buy a domain (any registrar, or Cloudflare Registrar).
2. Create a GitHub repository and push the contents of this folder.
3. In Cloudflare Pages: connect the repository, no build command, output directory `admin_hub_site`, then add your domain.
4. In GitHub open the Actions tab, choose "Update feeds" and press "Run workflow" once. The bot fetches the feeds, commits the new pages, and Cloudflare deploys them. After that it repeats every 3 hours without you.
5. Fill the pink [placeholders] in admin_hub_site/imprint.html and privacy.html, replace example.com in robots.txt and sitemap.xml, and have the legal texts checked.

## Check after the first run
- Open the run log in the Actions tab. Every source is listed as `ok` or `FAILED`. The feed addresses in automation/feeds.json come from memory and were not tested against the live servers: fix or remove any that fail.
- Only headlines and links are shown. Short excerpts are switched on only for government and vendor feeds ("excerpt": true). Check the terms of each source before you add more.
- GitHub can pause scheduled workflows in repositories without activity. Look at the Actions tab now and then.

## Ads
Ad slots are placeholders. For AdSense in the EU/UK you need a Google-certified consent platform, and admin_hub_site/_headers must be widened for the ad network.
