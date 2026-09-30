admin_hub static site
1. Replace every pink [placeholder] in imprint.html and privacy.html, then have the texts checked.
2. Replace example.com in robots.txt and sitemap.xml with your domain.
3. Fonts: the site uses system fonts only, no third-party requests.
4. For AdSense in the EU/UK use a Google-certified consent platform; consent.js is a basic banner only.
   Ad networks also need the _headers Content-Security-Policy to be widened.
5. Upload the folder to a static host such as Cloudflare Pages. The _headers file is applied automatically there.
