/* =========================================================
   CINESCOPE
   Movie Discovery App
   TMDB API + Search + Filters + Sort + Modal
   ========================================================= */


/* =========================================================
   1. TMDB CONFIG
   ========================================================= */

const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlYmIxN2EwYjBkNDBhMzJiOTk4ZTU5NjY4NjAwYWI3OSIsIm5iZiI6MTc5MTEwNzQ0NS4xNzkwMDAxLCJzdWIiOiI2YWMyMjE3NTZlOTExYjJiYzUzMjQxZDEiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.juXqxQhRxuWHY2vN-UrFIRaVwUsanOFxnxzgkceKDTE";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const TMDB_IMAGE_URL =
    "https://image.tmdb.org/t/p/w500";

const TMDB_BACKDROP_URL =
    "https://image.tmdb.org/t/p/w1280";

const FALLBACK_POSTER =
    "https://via.placeholder.com/500x750/11171a/cbd8d2?text=No+Poster";


/* =========================================================
   2. DOM ELEMENTS
   ========================================================= */

const movieGrid =
    document.getElementById("movieGrid");

const movieCount =
    document.getElementById("movieCount");

const searchInput =
    document.getElementById("searchInput");

const searchBtn =
    document.getElementById("searchBtn");

const clearSearchBtn =
    document.getElementById("clearSearchBtn");

const resetSearchBtn =
    document.getElementById("resetSearchBtn");

const genreFilter =
    document.getElementById("genreFilter");

const ratingFilter =
    document.getElementById("ratingFilter");

const yearFilter =
    document.getElementById("yearFilter");

const sortFilter =
    document.getElementById("sortFilter");

const clearFiltersBtn =
    document.getElementById("clearFiltersBtn");

const noResults =
    document.getElementById("noResults");


/* =========================================================
   3. MODAL ELEMENTS
   ========================================================= */

const movieModal =
    document.getElementById("movieModal");

const modalBackdrop =
    document.getElementById("modalBackdrop");

const modalCloseBtn =
    document.getElementById("modalCloseBtn");

const modalPoster =
    document.getElementById("modalPoster");

const modalTitle =
    document.getElementById("modalTitle");

const modalYear =
    document.getElementById("modalYear");

const modalRating =
    document.getElementById("modalRating");

const modalDescription =
    document.getElementById("modalDescription");


/* =========================================================
   4. APP STATE
   ========================================================= */

let movies = [];

let filteredMovies = [];

let genreMap = {};

let activeSearch = "";

let activeGenre = "all";

let activeRating = 0;

let activeYear = "all";

let activeSort = "";


/* =========================================================
   5. TMDB API HELPER
   ========================================================= */

async function tmdbFetch(endpoint) {

    try {

        const response = await fetch(
            `${TMDB_BASE_URL}${endpoint}`,
            {
                method: "GET",

                headers: {
                    accept: "application/json",
                    Authorization:
                        `Bearer ${TMDB_TOKEN}`
                }
            }
        );

        if (!response.ok) {

            throw new Error(
                `TMDB request failed: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {

        console.error(
            "TMDB API Error:",
            error
        );

        throw error;
    }
}


/* =========================================================
   6. LOAD GENRES
   ========================================================= */

async function loadGenres() {

    try {

        const data =
            await tmdbFetch(
                "/genre/movie/list?language=en"
            );

        genreMap = {};

        if (data.genres) {

            data.genres.forEach(genre => {

                genreMap[genre.id] =
                    genre.name;

            });

        }

    } catch (error) {

        console.error(
            "Unable to load genres:",
            error
        );
    }
}


/* =========================================================
   7. NORMALIZE MOVIE DATA
   ========================================================= */

function normalizeMovie(movie) {

    return {

        id: movie.id,

        title:
            movie.title ||
            movie.name ||
            "Untitled Movie",

        year:
            movie.release_date
                ? movie.release_date.substring(0, 4)
                : "N/A",

        rating:
            Number(movie.vote_average || 0),

        overview:
            movie.overview ||
            "No description is available for this movie.",

        poster:
            movie.poster_path
                ? `${TMDB_IMAGE_URL}${movie.poster_path}`
                : FALLBACK_POSTER,

        backdrop:
            movie.backdrop_path
                ? `${TMDB_BACKDROP_URL}${movie.backdrop_path}`
                : "",

        genreIds:
            Array.isArray(movie.genre_ids)
                ? movie.genre_ids
                : [],

        genres:
            Array.isArray(movie.genre_ids)
                ? movie.genre_ids
                    .map(id => genreMap[id])
                    .filter(Boolean)
                : [],

        popularity:
            Number(movie.popularity || 0)

    };
}


/* =========================================================
   8. LOAD POPULAR MOVIES
   ========================================================= */

async function loadMovies() {

    if (!movieGrid) return;

    movieGrid.innerHTML = `
        <div class="movie-loading">
            <div class="loading-spinner"></div>
            <p>Loading movies...</p>
        </div>
    `;

    try {

        /*
         * 5 pages × 20 movies = up to 100 movies.
         */

        const pageRequests = [];

        for (let page = 1; page <= 5; page++) {

            pageRequests.push(
                tmdbFetch(
                    `/discover/movie?language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}`
                )
            );

        }

        const pages =
            await Promise.all(pageRequests);

        const allMovies = [];

        pages.forEach(pageData => {

            if (
                pageData &&
                Array.isArray(pageData.results)
            ) {

                pageData.results.forEach(movie => {

                    allMovies.push(
                        normalizeMovie(movie)
                    );

                });

            }

        });

        /*
         * Remove duplicate movies.
         */

        const uniqueMovies =
            new Map();

        allMovies.forEach(movie => {

            if (!uniqueMovies.has(movie.id)) {

                uniqueMovies.set(
                    movie.id,
                    movie
                );

            }

        });

        movies =
            [...uniqueMovies.values()];

        filteredMovies =
            [...movies];

        populateFilters();

        resetFilterValues();

        filteredMovies =
            [...movies];

        displayMovies(
            filteredMovies
        );

        console.log(
            `CineScope loaded: ${movies.length} movies`
        );

    } catch (error) {

        console.error(
            "Unable to load movies:",
            error
        );

        showLoadingError();
    }
}


/* =========================================================
   9. LOADING ERROR
   ========================================================= */

function showLoadingError() {

    if (!movieGrid) return;

    movieGrid.innerHTML = `
        <div class="movie-error">
            <div class="movie-error-icon">⚠️</div>

            <h3>Unable to load movies</h3>

            <p>
                Unable to load movies from TMDB.
                Check your API token and internet connection.
            </p>
        </div>
    `;

    if (movieCount) {

        movieCount.textContent =
            "0 Movies";

    }
}


/* =========================================================
   10. POPULATE FILTERS
   ========================================================= */

function populateFilters() {


    /* =========================
       GENRE
       ========================= */

    if (genreFilter) {

        const genres =
            new Set();

        movies.forEach(movie => {

            if (Array.isArray(movie.genres)) {

                movie.genres.forEach(genre => {

                    if (genre) {
                        genres.add(genre);
                    }

                });

            }

        });

        genreFilter.innerHTML =
            `<option value="all">All Genres</option>`;

        [...genres]
            .sort()
            .forEach(genre => {

                const option =
                    document.createElement("option");

                option.value =
                    genre;

                option.textContent =
                    genre;

                genreFilter.appendChild(
                    option
                );

            });
    }


    /* =========================
       RATING
       ========================= */

    if (ratingFilter) {

        /*
         * FIX:
         * Rating options are static.
         * They are NOT generated from movie data.
         */

        ratingFilter.innerHTML = `
            <option value="0">All Ratings</option>
            <option value="8">8+ Rating</option>
            <option value="7">7+ Rating</option>
            <option value="6">6+ Rating</option>
        `;

        ratingFilter.value = "0";
    }


    /* =========================
       YEAR
       ========================= */

    if (yearFilter) {

        const years =
            new Set();

        movies.forEach(movie => {

            if (
                movie.year &&
                movie.year !== "N/A"
            ) {

                years.add(
                    String(movie.year)
                );

            }

        });

        yearFilter.innerHTML =
            `<option value="all">All Years</option>`;

        [...years]
            .sort(
                (a, b) =>
                    Number(b) - Number(a)
            )
            .forEach(year => {

                const option =
                    document.createElement("option");

                option.value =
                    year;

                option.textContent =
                    year;

                yearFilter.appendChild(
                    option
                );

            });
    }


    /* =========================
       SORT
       ========================= */

    if (sortFilter) {

        sortFilter.innerHTML = `
            <option value="">Sort By</option>
            <option value="ratingDesc">
                Highest Rated
            </option>
            <option value="ratingAsc">
                Lowest Rated
            </option>
            <option value="newest">
                Newest
            </option>
            <option value="oldest">
                Oldest
            </option>
            <option value="popular">
                Most Popular
            </option>
            <option value="titleAsc">
                A → Z
            </option>
        `;

        sortFilter.value = "";
    }
}


/* =========================================================
   11. RESET FILTER VALUES
   ========================================================= */

function resetFilterValues() {

    if (genreFilter) {

        genreFilter.value =
            "all";

    }

    if (ratingFilter) {

        ratingFilter.value =
            "0";

    }

    if (yearFilter) {

        yearFilter.value =
            "all";

    }

    if (sortFilter) {

        sortFilter.value =
            "";

    }

    if (searchInput) {

        searchInput.value =
            "";

    }

    activeSearch =
        "";

    activeGenre =
        "all";

    activeRating =
        0;

    activeYear =
        "all";

    activeSort =
        "";
}


/* =========================================================
   12. APPLY FILTERS
   ========================================================= */

function applyFilters() {

    const searchTerm =
        activeSearch
            .trim()
            .toLowerCase();

    const genre =
        activeGenre;

    const rating =
        Number(activeRating);

    const year =
        activeYear;


    filteredMovies =
        movies.filter(movie => {


            /* =========================
               SEARCH
               ========================= */

            const matchesSearch =
                !searchTerm ||
                movie.title
                    .toLowerCase()
                    .includes(searchTerm);


            /* =========================
               GENRE
               ========================= */

            const matchesGenre =
                genre === "all" ||
                movie.genres
                    .some(
                        item =>
                            item === genre
                    );


            /* =========================
               RATING
               ========================= */

            const matchesRating =
                rating === 0 ||
                movie.rating >= rating;


            /* =========================
               YEAR
               ========================= */

            const matchesYear =
                year === "all" ||
                String(movie.year) ===
                    String(year);


            return (
                matchesSearch &&
                matchesGenre &&
                matchesRating &&
                matchesYear
            );

        });


    /* =========================
       SORT
       ========================= */

    if (activeSort === "ratingDesc") {

        filteredMovies.sort(
            (a, b) =>
                b.rating - a.rating
        );

    }

    else if (activeSort === "ratingAsc") {

        filteredMovies.sort(
            (a, b) =>
                a.rating - b.rating
        );

    }

    else if (activeSort === "newest") {

        filteredMovies.sort(
            (a, b) =>
                Number(b.year || 0) -
                Number(a.year || 0)
        );

    }

    else if (activeSort === "oldest") {

        filteredMovies.sort(
            (a, b) =>
                Number(a.year || 0) -
                Number(b.year || 0)
        );

    }

    else if (activeSort === "popular") {

        filteredMovies.sort(
            (a, b) =>
                b.popularity -
                a.popularity
        );

    }

    else if (activeSort === "titleAsc") {

        filteredMovies.sort(
            (a, b) =>
                a.title.localeCompare(
                    b.title
                )
        );

    }


    displayMovies(
        filteredMovies
    );
}


/* =========================================================
   13. DISPLAY MOVIES
   ========================================================= */

function displayMovies(movieList) {

    if (!movieGrid) return;

    movieGrid.innerHTML = "";


    /* =========================
       COUNT
       ========================= */

    if (movieCount) {

        movieCount.textContent =
            `${movieList.length} ${
                movieList.length === 1
                    ? "Movie"
                    : "Movies"
            }`;

    }


    /* =========================
       NO RESULTS
       ========================= */

    if (movieList.length === 0) {

        if (noResults) {

            noResults.classList.remove(
                "hidden"
            );

        }

        return;

    }


    if (noResults) {

        noResults.classList.add(
            "hidden"
        );

    }


    /* =========================
       CREATE CARDS
       ========================= */

    movieList.forEach(movie => {

        const card =
            document.createElement("article");

        card.className =
            "movie-card";

        card.dataset.movieId =
            movie.id;


        card.innerHTML = `

            <div class="card-poster-wrapper">

                <img
                    class="card-poster"
                    src="${movie.poster}"
                    alt="${escapeHTML(movie.title)} poster"
                    loading="lazy"
                >

                <div class="card-overlay">

                    <span class="view-details">
                        View Details
                    </span>

                </div>

            </div>

            <div class="card-content">

                <h3 class="card-title">
                    ${escapeHTML(movie.title)}
                </h3>

                <div class="card-meta">

                    <span class="card-year">
                        ${movie.year}
                    </span>

                    <span class="card-rating">
                        ★ ${movie.rating.toFixed(1)}
                    </span>

                </div>

            </div>

        `;


        /* =========================
           POSTER FALLBACK
           ========================= */

        const poster =
            card.querySelector(
                ".card-poster"
            );

        if (poster) {

            poster.addEventListener(
                "error",
                () => {

                    poster.src =
                        FALLBACK_POSTER;

                },
                {
                    once: true
                }
            );

        }


        /* =========================
           CARD CLICK
           ========================= */

        card.addEventListener(
            "click",
            () => {

                openMovieModal(
                    movie
                );

            }
        );


        movieGrid.appendChild(
            card
        );

    });
}


/* =========================================================
   14. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   15. OPEN MOVIE MODAL
   ========================================================= */

function openMovieModal(movie) {

    if (!movieModal) return;


    if (modalPoster) {

        modalPoster.src =
            movie.poster;

        modalPoster.alt =
            `${movie.title} poster`;

        modalPoster.onerror =
            () => {

                modalPoster.src =
                    FALLBACK_POSTER;

            };

    }


    if (modalTitle) {

        modalTitle.textContent =
            movie.title;

    }


    if (modalYear) {

        modalYear.textContent =
            movie.year;

    }


    if (modalRating) {

        modalRating.textContent =
            `★ ${movie.rating.toFixed(1)}`;

    }


    if (modalDescription) {

        modalDescription.textContent =
            movie.overview;

    }


    movieModal.classList.add(
        "active"
    );

    movieModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================================
   16. CLOSE MOVIE MODAL
   ========================================================= */

function closeMovieModal() {

    if (!movieModal) return;

    movieModal.classList.remove(
        "active"
    );

    movieModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   17. SEARCH
   ========================================================= */

function performSearch() {

    activeSearch =
        searchInput
            ? searchInput.value
            : "";

    applyFilters();

    const moviesSection =
        document.getElementById(
            "movies"
        );

    if (
        activeSearch.trim() &&
        moviesSection
    ) {

        moviesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
}


/* =========================================================
   18. CLEAR SEARCH
   ========================================================= */

function clearSearch() {

    if (searchInput) {

        searchInput.value =
            "";

    }

    activeSearch =
        "";

    applyFilters();
}


/* =========================================================
   19. CLEAR ALL FILTERS
   ========================================================= */

function clearAllFilters() {

    resetFilterValues();

    filteredMovies =
        [...movies];

    displayMovies(
        filteredMovies
    );
}


/* =========================================================
   20. EVENT LISTENERS
   ========================================================= */


/* Search button */

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        performSearch
    );

}


/* Search Enter */

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                performSearch();

            }

        }
    );

}


/* Clear search */

if (clearSearchBtn) {

    clearSearchBtn.addEventListener(
        "click",
        clearSearch
    );

}


/* Reset search */

if (resetSearchBtn) {

    resetSearchBtn.addEventListener(
        "click",
        clearAllFilters
    );

}


/* Genre */

if (genreFilter) {

    genreFilter.addEventListener(
        "change",
        event => {

            activeGenre =
                event.target.value;

            applyFilters();

        }
    );

}


/* Rating */

if (ratingFilter) {

    ratingFilter.addEventListener(
        "change",
        event => {

            activeRating =
                Number(
                    event.target.value
                );

            applyFilters();

        }
    );

}


/* Year */

if (yearFilter) {

    yearFilter.addEventListener(
        "change",
        event => {

            activeYear =
                event.target.value;

            applyFilters();

        }
    );

}


/* Sort */

if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        event => {

            activeSort =
                event.target.value;

            applyFilters();

        }
    );

}


/* Clear filters */

if (clearFiltersBtn) {

    clearFiltersBtn.addEventListener(
        "click",
        clearAllFilters
    );

}


/* Modal close button */

if (modalCloseBtn) {

    modalCloseBtn.addEventListener(
        "click",
        closeMovieModal
    );

}


/* Modal backdrop */

if (modalBackdrop) {

    modalBackdrop.addEventListener(
        "click",
        closeMovieModal
    );

}


/* Escape key */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeMovieModal();

        }

    }
);


/* =========================================================
   21. INITIALIZE APP
   ========================================================= */

async function initializeCineScope() {

    if (
        !TMDB_TOKEN ||
        TMDB_TOKEN.includes(
            "PASTE_YOUR_EXISTING"
        )
    ) {

        console.error(
            "CineScope: TMDB token is missing."
        );

        showLoadingError();

        return;
    }


    await loadGenres();

    await loadMovies();

}


/* =========================================================
   22. START
   ========================================================= */

initializeCineScope();