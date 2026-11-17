const PAGE_SIZE = 20;
const MAX_PAGES = 500;
const TITLE_PAGES = 3;
const MIN_VOTES_FOR_RATING_SORT = 300;
const MIN_VOTES_FOR_DATE_SORT = 10;
const MIN_VOTES_TO_RANK = 10;
const MAX_CAST = 8;

const search = {
  term: "",
  genre: "",
  sort: "popularity.desc",
  page: 1,
  totalPages: 0,
  busy: false,
  started: false,
  scrollAfter: false,
  token: 0,
  raw: null,
  rawTerm: null
};

let detailsToken = 0;
let genresLoaded = false;

$(function () {
  loadGenres();
  loadMovies({
    path: "/movie/popular",
    $grid: $("#movie-grid"),
    $status: $("#status"),
    label: "popular movies"
  });
  loadMovies({
    path: "/movie/top_rated",
    $grid: $("#top-rated-grid"),
    $status: $("#top-rated-status"),
    label: "top rated movies"
  });
  bindSearch();
  bindDetails();
});

function hasApiKey() {
  return TMDB_CONFIG.API_KEY && TMDB_CONFIG.API_KEY.indexOf("PASTE_") !== 0;
}

function tmdb(path, params) {
  return $.ajax({
    url: TMDB_CONFIG.BASE_URL + path,
    method: "GET",
    dataType: "json",
    timeout: 10000,
    data: $.extend({ api_key: TMDB_CONFIG.API_KEY, language: "en-US" }, params)
  });
}

function errorMessage(xhr, textStatus) {
  if (textStatus === "timeout") return "The request timed out. Check your connection and try again.";
  if (xhr.status === 401) return "TMDB rejected the API key (401). Check js/config.js.";
  if (xhr.status === 404) return "That resource wasn't found (404).";
  if (xhr.status === 429) return "Too many requests. Wait a moment and try again.";
  return "Sorry, we couldn't load movies right now. Please try again.";
}

function showLoading($status, text) {
  $status.empty().append(
    $("<span>", { class: "spinner", "aria-hidden": "true" }),
    document.createTextNode(" " + text)
  );
}

function showError($status, message, retryFn) {
  $status.empty();
  $("<p>", { class: "error", text: message }).appendTo($status);
  if (retryFn) {
    $("<button>", { type: "button", class: "retry-btn", text: "Retry" })
      .on("click", retryFn)
      .appendTo($status);
  }
}

function loadMovies(list) {
  if (!hasApiKey()) {
    showError(list.$status, "Missing TMDB API key. Add it in js/config.js.");
    return;
  }

  list.$grid.empty().attr("aria-busy", "true");
  showLoading(list.$status, "Loading " + list.label + "…");

  tmdb(list.path, { page: 1 })
    .done(function (data) {
      list.$status.empty();
      if (!data.results || data.results.length === 0) {
        list.$status.text("No movies found.");
        return;
      }
      renderMovies(data.results, list.$grid);
    })
    .fail(function (xhr, textStatus) {
      showError(list.$status, errorMessage(xhr, textStatus), function () { loadMovies(list); });
    })
    .always(function () {
      list.$grid.attr("aria-busy", "false");
    });
}

function renderMovies(movies, $grid) {
  movies.forEach(function (movie) {
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
    const rating = movie.vote_count > 0 && typeof movie.vote_average === "number"
      ? movie.vote_average.toFixed(1)
      : "N/A";

    const $img = movie.poster_path
      ? $("<img>", {
          src: TMDB_CONFIG.IMG_URL + movie.poster_path,
          alt: "",
          loading: "lazy"
        })
      : $("<div>", { class: "no-poster", text: "No poster available" });

    const $save = $("<button>", {
      type: "button",
      class: "save-movie",
      text: "Add to Watchlist",
      "aria-label": "Add to Watchlist: " + movie.title
    }).data("movie", { id: movie.id, title: movie.title, poster_path: movie.poster_path || null });

    const $card = $("<li>", { class: "movie-card" }).append(
      $("<button>", {
        type: "button",
        class: "movie-button",
        "data-id": movie.id
      }).append(
        $img,
        $("<h3>", { class: "movie-title", text: movie.title }),
        $("<p>", { class: "movie-meta", text: year + " · ★ " + rating })
      ),
      $save
    );

    $grid.append($card);
  });
}

function loadGenres() {
  if (genresLoaded || !hasApiKey()) return;

  tmdb("/genre/movie/list")
    .done(function (data) {
      genresLoaded = true;
      const $select = $("#genre-select");
      $select.find("option[data-unavailable]").remove();
      (data.genres || []).forEach(function (genre) {
        $("<option>", { value: genre.id, text: genre.name }).appendTo($select);
      });
    })
    .fail(function () {
      if ($("#genre-select option[data-unavailable]").length === 0) {
        $("<option>", { value: "", text: "Genres unavailable", disabled: true, "data-unavailable": "true" })
          .appendTo("#genre-select");
      }
    });
}

function bindSearch() {
  $("#movie-search").attr("maxlength", 100);

  $("#search-btn").on("click", function () {
    loadGenres();
    if (!search.started) startSearch(true);
  });
  $("#movie-search-btn").on("click", function () { startSearch(true); });
  $("#movie-search").on("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      startSearch(true);
    }
  });
  $("#genre-select, #sort-select").on("change", function () { startSearch(false); });
  $("#prev-page").on("click", function () { goToPage(search.page - 1); });
  $("#next-page").on("click", function () { goToPage(search.page + 1); });
}

function startSearch(forceFetch) {
  search.started = true;
  search.term = $.trim($("#movie-search").val());
  search.genre = $("#genre-select").val() || "";
  search.sort = $("#sort-select").val();
  $("#movie-search").val(search.term);

  if (!hasApiKey()) {
    showError($("#search-status"), "Missing TMDB API key. Add it in js/config.js.");
    return;
  }

  if (search.term && !forceFetch && search.raw && search.rawTerm === search.term) {
    search.token++;
    search.busy = false;
    showTitleResults(1);
    return;
  }

  runSearch(1, false);
}

function runSearch(page, isPaging) {
  const token = ++search.token;
  search.busy = true;
  if (!isPaging) search.totalPages = 0;

  $("#search-grid").empty();
  showLoading($("#search-status"), search.term ? "Searching for “" + search.term + "”…" : "Loading movies…");
  refreshControls();

  const request = search.term ? fetchTitleMatches(search.term) : fetchDiscover(page);

  request
    .done(function (result) {
      if (token !== search.token) return;
      search.busy = false;
      if (search.term) {
        search.raw = result;
        search.rawTerm = search.term;
        showTitleResults(1);
      } else {
        search.raw = null;
        search.rawTerm = null;
        showDiscoverResults(result, page);
      }
    })
    .fail(function (xhr, textStatus) {
      if (token !== search.token) return;
      search.busy = false;
      showError($("#search-status"), errorMessage(xhr, textStatus), function () { runSearch(page, isPaging); });
      refreshControls();
    });
}

function fetchDiscover(page) {
  const params = { page: page, sort_by: search.sort, include_adult: false };
  if (search.genre) params.with_genres = search.genre;
  if (search.sort === "vote_average.desc") {
    params["vote_count.gte"] = MIN_VOTES_FOR_RATING_SORT;
  }
  if (search.sort === "primary_release_date.desc") {
    params["primary_release_date.lte"] = new Date().toISOString().slice(0, 10);
    params["vote_count.gte"] = MIN_VOTES_FOR_DATE_SORT;
  }
  return tmdb("/discover/movie", params);
}

function fetchTitleMatches(term) {
  function fetchPage(number) {
    return tmdb("/search/movie", { query: term, include_adult: false, page: number });
  }

  return fetchPage(1).then(function (first) {
    const pages = Math.min(first.total_pages || 1, TITLE_PAGES);
    const rest = [];
    for (let number = 2; number <= pages; number++) rest.push(fetchPage(number));

    if (rest.length === 0) {
      return { movies: first.results || [], total: first.total_results || 0 };
    }

    return $.when.apply($, rest).then(function () {
      const responses = rest.length === 1
        ? [arguments[0]]
        : Array.prototype.map.call(arguments, function (response) { return response[0]; });

      let movies = (first.results || []).slice();
      responses.forEach(function (response) { movies = movies.concat(response.results || []); });

      const seen = {};
      movies = movies.filter(function (movie) {
        if (seen[movie.id]) return false;
        seen[movie.id] = true;
        return true;
      });

      return { movies: movies, total: first.total_results || 0 };
    });
  });
}

function showDiscoverResults(data, page) {
  const movies = data.results || [];
  search.page = page;
  search.totalPages = Math.min(data.total_pages || 0, MAX_PAGES);

  if (movies.length === 0) {
    showNoResults();
    return;
  }

  renderMovies(movies, $("#search-grid"));
  $("#search-status").text(describeSearch() + " — " + (data.total_results || 0).toLocaleString() + " movies");
  finishRender();
}

function showTitleResults(page) {
  const matches = search.raw.movies;
  let list = matches;

  if (search.genre) {
    const genreId = Number(search.genre);
    list = list.filter(function (movie) { return (movie.genre_ids || []).indexOf(genreId) !== -1; });
  }
  list = list.slice().sort(titleComparator(search.sort));

  search.totalPages = Math.ceil(list.length / PAGE_SIZE);
  search.page = Math.min(Math.max(page, 1), Math.max(search.totalPages, 1));
  const $grid = $("#search-grid").empty();

  if (list.length === 0) {
    showNoResults();
    return;
  }

  const start = (search.page - 1) * PAGE_SIZE;
  const view = list.slice(start, start + PAGE_SIZE);
  renderMovies(view, $grid);

  let message = describeSearch() + " — showing " + (start + 1) + "–" + (start + view.length) +
    " of " + list.length + " matches";
  if (search.raw.total > matches.length) {
    message += " (top " + matches.length + " of " + search.raw.total.toLocaleString() + " title matches)";
  }
  $("#search-status").text(message);
  finishRender();
}

function titleComparator(sort) {
  if (sort === "vote_average.desc") {
    return function (a, b) {
      const rankedA = a.vote_count >= MIN_VOTES_TO_RANK ? 1 : 0;
      const rankedB = b.vote_count >= MIN_VOTES_TO_RANK ? 1 : 0;
      return (rankedB - rankedA) || (b.vote_average - a.vote_average) || (b.vote_count - a.vote_count);
    };
  }
  if (sort === "primary_release_date.desc") {
    return function (a, b) {
      return (b.release_date || "").localeCompare(a.release_date || "");
    };
  }
  return function (a, b) { return b.popularity - a.popularity; };
}

function describeSearch() {
  const genreName = search.genre ? $("#genre-select option:selected").text() : "";
  const sortName = $("#sort-select option:selected").text();
  const subject = search.term
    ? "Results for “" + search.term + "”" + (genreName ? " in " + genreName : "")
    : "Browsing " + (genreName || "all") + " movies";
  return subject + " · " + sortName;
}

function showNoResults() {
  search.totalPages = 0;
  const genreName = search.genre ? $("#genre-select option:selected").text() : "";
  let message = "No movies found";
  if (search.term) message += " for “" + search.term + "”";
  if (genreName) message += " in " + genreName;
  $("#search-status").text(message + ". Try different keywords or another genre.");
  finishRender();
}

function goToPage(page) {
  if (search.busy || page < 1 || page > search.totalPages) return;
  search.scrollAfter = true;
  if (search.term && search.raw) {
    showTitleResults(page);
  } else {
    runSearch(page, true);
  }
}

function finishRender() {
  refreshControls();
  if (search.scrollAfter) {
    search.scrollAfter = false;
    const heading = document.getElementById("search-heading");
    if (heading.getBoundingClientRect().top < 0) heading.scrollIntoView({ block: "start" });
  }
}

function refreshControls() {
  $("#movie-search-btn").prop("disabled", search.busy).text(search.busy ? "Searching…" : "Search");
  $("#search-grid").attr("aria-busy", search.busy ? "true" : "false");

  const focused = document.activeElement;
  const atEnd = search.totalPages > 0 && search.page >= search.totalPages;
  $("#pagination").prop("hidden", search.totalPages <= 1);
  $("#page-number").text("Page " + search.page + " of " + search.totalPages);
  $("#prev-page").prop("disabled", search.page <= 1);
  $("#next-page").prop("disabled", atEnd);

  if (focused && focused.disabled && $("#pagination").has(focused).length) {
    $("#pagination button:not(:disabled)").first().trigger("focus");
  }
}

function bindDetails() {
  $(document).on("click", ".movie-button", function () {
    openDetails($(this).data("id"));
  });
}

function showDetailsView() {
  $(".view").attr("hidden", true);
  $("#view-details").removeAttr("hidden");
  window.scrollTo(0, 0);
  $("#details-heading").attr("tabindex", "-1").trigger("focus");
}

function openDetails(id) {
  const token = ++detailsToken;
  const $box = $("#movie-details");

  showDetailsView();
  $("#add-watchlist-btn").prop("disabled", true).removeData("movie");
  $box.empty().attr("aria-busy", "true");
  const $status = $("<div>", { class: "details-status", role: "status" }).appendTo($box);

  if (!hasApiKey()) {
    showError($status, "Missing TMDB API key. Add it in js/config.js.");
    $box.attr("aria-busy", "false");
    return;
  }

  showLoading($status, "Loading movie details…");

  tmdb("/movie/" + id, { append_to_response: "credits" })
    .done(function (movie) {
      if (token === detailsToken) renderDetails(movie, $box);
    })
    .fail(function (xhr, textStatus) {
      if (token !== detailsToken) return;
      if (xhr.status === 404) {
        showError($status, "This movie could not be found.");
      } else {
        showError($status, errorMessage(xhr, textStatus), function () { openDetails(id); });
      }
    })
    .always(function () {
      if (token === detailsToken) $box.attr("aria-busy", "false");
    });
}

function formatDate(isoDate) {
  const date = new Date(isoDate + "T00:00:00Z");
  if (isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function formatRuntime(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [];
  if (hours) parts.push(hours + "h");
  if (rest || !hours) parts.push(rest + "m");
  return parts.join(" ");
}

function renderDetails(movie, $box) {
  const title = movie.title || movie.original_title || "Untitled";
  const year = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const credits = movie.credits || {};
  const directors = (credits.crew || [])
    .filter(function (person) { return person.job === "Director"; })
    .map(function (person) { return person.name; });
  const cast = (credits.cast || []).slice(0, MAX_CAST);

  const facts = [];
  if (movie.release_date) facts.push(formatDate(movie.release_date));
  if (movie.runtime) facts.push(formatRuntime(movie.runtime));
  facts.push(movie.vote_count > 0
    ? "★ " + movie.vote_average.toFixed(1) + " (" + movie.vote_count.toLocaleString() + " votes)"
    : "Not rated yet");

  const $poster = movie.poster_path
    ? $("<img>", { src: TMDB_CONFIG.IMG_URL + movie.poster_path, alt: "Poster for " + title })
    : $("<div>", { class: "no-poster", text: "No poster available" });

  const $info = $("<div>", { class: "details-info" }).append(
    $("<h3>", { class: "details-title", text: title + (year ? " (" + year + ")" : "") })
  );

  if (movie.tagline) $info.append($("<p>", { class: "details-tagline", text: movie.tagline }));
  $info.append($("<p>", { class: "details-facts", text: facts.join(" · ") }));
  if (directors.length) $info.append($("<p>", { text: "Directed by " + directors.join(", ") }));

  if ((movie.genres || []).length) {
    const $genres = $("<ul>", { class: "genre-list", "aria-label": "Genres" });
    movie.genres.forEach(function (genre) { $("<li>", { text: genre.name }).appendTo($genres); });
    $info.append($genres);
  }

  $info.append(
    $("<h4>", { text: "Overview" }),
    $("<p>", { class: "details-overview", text: movie.overview || "No overview is available for this movie." }),
    $("<h4>", { text: "Top cast" })
  );

  if (cast.length) {
    const $cast = $("<ul>", { class: "cast-list" });
    cast.forEach(function (person) {
      $("<li>", { text: person.name + (person.character ? " as " + person.character : "") }).appendTo($cast);
    });
    $info.append($cast);
  } else {
    $info.append($("<p>", { text: "Cast information is not available." }));
  }

  $info.append($("<p>").append($("<a>", {
    class: "tmdb-link",
    href: "https://www.themoviedb.org/movie/" + movie.id,
    target: "_blank",
    rel: "noopener",
    text: "View on TMDB (opens in a new tab)"
  })));

  $box.empty().append(
    $("<div>", { class: "details-layout" }).append(
      $("<div>", { class: "details-poster" }).append($poster),
      $info
    )
  );

  $("#add-watchlist-btn")
    .data("movie", { id: movie.id, title: title, poster_path: movie.poster_path || null })
    .prop("disabled", false);
}
