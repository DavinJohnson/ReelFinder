# ReelFinder – Movie Discovery SPA

IT 4403 term project. A single page app built with HTML, CSS, JavaScript, jQuery, AJAX and the TMDB API.

**Team:** Davin Johnson, Niklas Knipschild  
**Live site:** https://davinjohnson.github.io/ReelFinder/

## Run it locally
1. Get a free TMDB API key at themoviedb.org (Settings → API).
2. Paste it into `js/config.js`.
3. Open `index.html` in a browser (or use VS Code Live Server).

## Structure
```text
index.html      single page with Home, Search, Details and Watchlist views
css/style.css   website styling, colors and responsive layout
js/config.js    TMDB key + base URLs
js/app.js       AJAX calls, movie rendering, loading/error handling
js/ui.js        navigation and watchlist using localStorage
```

## Status
- [x] SPA shell + popular movies via AJAX
- [x] Loading indicator + API error handling with retry
- [x] Home, Search and Watchlist navigation
- [x] Search interface + genre dropdown (API integration pending)
- [ ] Sorting / pagination functionality
- [ ] Movie details view functionality
- [x] Watchlist (localStorage)
- [x] Responsive layout and mobile testing
- [x] Keyboard navigation and accessibility review
- [ ] Final WAVE contrast verification
- [ ] Final testing and debugging