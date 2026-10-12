

$(function () {
  loadPopularMovies(1);
});


function loadPopularMovies(page) {
  const $status = $("#status");
  const $grid = $("#movie-grid");

  if (!TMDB_CONFIG.API_KEY || TMDB_CONFIG.API_KEY.indexOf("PASTE_") === 0) {
    showError("Missing TMDB API key. Add it in js/config.js.");
    return;
  }

  $grid.empty().attr("aria-busy", "true");
  $status.html('<span class="spinner" aria-hidden="true"></span> Loading popular movies…');

  $.ajax({
    url: TMDB_CONFIG.BASE_URL + "/movie/popular",
    method: "GET",
    dataType: "json",
    timeout: 10000,
    data: {
      api_key: TMDB_CONFIG.API_KEY,
      language: "en-US",
      page: page || 1
    }
  })
    .done(function (data) {
      $status.empty();
      if (!data.results || data.results.length === 0) {
        $status.text("No movies found.");
        return;
      }
      renderMovies(data.results);
    })
    .fail(function (xhr, textStatus) {
      let msg = "Sorry, we couldn't load movies right now. Please try again.";
      if (textStatus === "timeout") msg = "The request timed out. Check your connection and try again.";
      else if (xhr.status === 401) msg = "TMDB rejected the API key (401). Check js/config.js.";
      else if (xhr.status === 404) msg = "That resource wasn't found (404).";
      else if (xhr.status === 429) msg = "Too many requests. Wait a moment and try again.";
      showError(msg, function () { loadPopularMovies(page); });
    })
    .always(function () {
      $grid.attr("aria-busy", "false");
    });
}

function renderMovies(movies) {
  const $grid = $("#movie-grid");

  movies.forEach(function (movie) {
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
    const rating = typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A";

    const $img = movie.poster_path
      ? $("<img>", {
          src: TMDB_CONFIG.IMG_URL + movie.poster_path,
          alt: "Poster for " + movie.title,
          loading: "lazy"
        })
      : $("<div>", { class: "no-poster", text: "No poster available" });

    const $card = $("<li>", { class: "movie-card" }).append(
      $("<button>", {
        type: "button",
        class: "movie-button",
        "data-id": movie.id,
        "aria-label": movie.title + " (" + year + "), rated " + rating + " out of 10"
      }).append(
        $img,
        $("<h3>", { class: "movie-title", text: movie.title }),
        $("<p>", { class: "movie-meta", text: year + " · ★ " + rating })
      )
    );

    $grid.append($card);
  });
}

function showError(message, retryFn) {
  const $status = $("#status").empty();
  $("<p>", { class: "error", text: message }).appendTo($status);
  if (retryFn) {
    $("<button>", { type: "button", class: "retry-btn", text: "Retry" })
      .on("click", retryFn)
      .appendTo($status);
  }
}

$(document).on("click", ".movie-button", function () {
  const id = $(this).data("id");
  console.log("TODO: open details view for movie id", id);
});
