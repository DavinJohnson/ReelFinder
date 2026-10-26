// This file handles navigation and the watchlist
$(document).ready(function () {
    // Show the section that the user selects
    function showView(view) {
        $(".view").attr("hidden", true);
        $("#" + view).removeAttr("hidden");
    }
    // Navigation buttons
    $("#home-btn").click(function () {
        showView("view-home");
    });
    $("#search-btn").click(function () {
        showView("view-search");
    });
    $("#watchlist-btn").click(function () {
        showView("view-watchlist");
        showWatchlist();
    });
    $("#back-btn").click(function () {
        showView("view-home");
    });
    // Get movies saved in localStorage
    function getWatchlist() {
        return JSON.parse(localStorage.getItem("watchlist")) || [];
    }
    // Save movies so they stay after refreshing the page
    function saveWatchlist(movies) {
        localStorage.setItem("watchlist", JSON.stringify(movies));
    }
    // Add a movie to the users watchlist
    function addMovie(movie) {
        var movies = getWatchlist();
        var found = movies.some(function (item) {
            return item.id === movie.id;
        });
        if (!found) {
            movies.push(movie);
            saveWatchlist(movies);
            alert("Movie added to your watchlist!");
        } else {
            alert("This movie is already in your watchlist.");
        }
    }
    // Add a watchlist button to each movie card
    // The movie information comes from the TMDB movie cards
    $(document).on("click", ".save-movie", function () {
        var movie = $(this).data("movie");
        addMovie(movie);
    });
    // Save a movie from the details page
    $("#add-watchlist-btn").click(function () {
        var movie = $(this).data("movie");
        if (movie) {
            addMovie(movie);
        }
    });
    // Show the saved movies
    function showWatchlist() {
        var movies = getWatchlist();
        $("#watchlist-grid").empty();
        $("#empty-watchlist").toggle(movies.length === 0);
        movies.forEach(function (movie) {
            var card = $("<li>").addClass("movie-card");
            if (movie.poster_path) {
                card.append($("<img>").attr({
                    src: TMDB_CONFIG.IMG_URL + movie.poster_path,
                    alt: "Poster for " + movie.title
                }).css("width", "100%"));
            }
            card.append($("<h3>").addClass("movie-title").text(movie.title));
            var removeBtn = $("<button>").text("Remove");
            removeBtn.click(function () {
                removeMovie(movie.id);
            });
            card.append(removeBtn);
            $("#watchlist-grid").append(card);
        });
    }
    // Remove a movie from the watchlist
    function removeMovie(id) {
        var movies = getWatchlist();
        movies = movies.filter(function (movie) {
            return movie.id !== id;
        });
        saveWatchlist(movies);
        showWatchlist();
    }
    // Add buttons to the popular movie cards
    // Get the movie ID and title from each card
    function addWatchlistButtons() {
        $("#movie-grid .movie-card").each(function () {
            if ($(this).find(".save-movie").length === 0) {
                var card = $(this);
                var id = card.find(".movie-button").data("id");
                var title = card.find(".movie-title").text();
                var image = card.find("img").attr("src");
                var poster = image ? image.replace(TMDB_CONFIG.IMG_URL, "") : null;
                var movie = {
                    id: id,
                    title: title,
                    poster_path: poster
                };
                var button = $("<button>").addClass("save-movie").text("Add to Watchlist");
                button.data("movie", movie);
                card.append(button);
            }
        });
    }
    // Check for movies added by Davins AJAX code
    // This adds the buttons after the movies finish loading
    $(document).ajaxComplete(function () {
        addWatchlistButtons();
    });
});