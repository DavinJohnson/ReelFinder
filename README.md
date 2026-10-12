# ReelFinder – Movie Discovery SPA

IT 4403 term project. A single page app built with jQuery, AJAX and the TMDB API.

**Team:** Davin Johnson, 
**Live site:** https://davinjohnson.github.io/ReelFinder/

## Run it locally
1. Get a free TMDB API key at themoviedb.org (Settings → API).
2. Paste it into `js/config.js`.
3. Open `index.html` in a browser (or use VS Code Live Server).

## Structure
```
index.html      single page; views are <section>s swapped by jQuery
css/style.css   styles (placeholder, UI owner to restyle)
js/config.js    TMDB key + base URLs
js/app.js       AJAX calls, rendering, loading/error handling
```

## Status
- [ ] SPA shell + popular movies via AJAX
- [ ] Loading indicator + API error handling with retry
- [ ] Search + genre filter
- [ ] Sorting / pagination
- [ ] Movie details view
- [ ] Watchlist (localStorage)
- [ ] Responsive/UI polish + WAVE accessibility check
