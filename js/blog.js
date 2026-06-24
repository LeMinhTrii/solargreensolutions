(function () {
  const API_URL = "https://solargreensolutions.vn/wp-json/wp/v2/posts";

  const API_QUERY =
    "?per_page=12&orderby=date&order=desc&_embed=wp:featuredmedia,wp:term&_fields=id,slug,date,modified,link,title,excerpt,sticky,categories,_links,_embedded";
  const CACHE_KEY = "sgs_blog_posts_cache_v1";
  const CACHE_TIME = 5 * 60 * 1000; // cache 5 phút

  const latestBox = document.getElementById("latestPostsList");
  const featuredBox = document.getElementById("featuredPostBox");
  const randomBox = document.getElementById("randomPostsList");
  const loadMoreBtn = document.getElementById("loadMorePosts");

  let latestPosts = [];
  let visibleLatest = 4;
  const loadStep = 4;

  const fallbackImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
        <rect width="100%" height="100%" fill="#eef8f2"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial" font-size="28" fill="#0f8f4f">
          Solar Green Solutions
        </text>
      </svg>
    `);

  function stripHTML(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  }

  function escapeHTML(text) {
    return String(text || "").replace(/[&<>"']/g, function (match) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[match];
    });
  }

  function trimText(html, limit) {
    const text = stripHTML(html).trim();
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + "...";
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function getImage(post) {
    return (
      post?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes
        ?.medium_large?.source_url ||
      post?._embedded?.["wp:featuredmedia"]?.[0]?.media_details?.sizes?.medium
        ?.source_url ||
      post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
      fallbackImage
    );
  }

  function getPostCategories(post) {
    const termGroups = post?._embedded?.["wp:term"] || [];

    const terms = termGroups.reduce(function (allTerms, group) {
      return allTerms.concat(group);
    }, []);

    const categories = terms
      .filter(function (term) {
        return term.taxonomy === "category";
      })
      .map(function (term) {
        return term.name;
      });

    return categories.length ? categories : ["Kiến thức solar"];
  }

  function getPrimaryCategory(post) {
    return getPostCategories(post)[0];
  }
  function getPostDetailUrl(post) {
    if (!post || !post.slug) return post?.link || "#";
    return "newsdetail.html?slug=" + encodeURIComponent(post.slug);
  }
  function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  async function fetchOptimizedPosts() {
    const cached = sessionStorage.getItem(CACHE_KEY);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        if (Date.now() - parsed.time < CACHE_TIME) {
          return parsed.data;
        }
      } catch (error) {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    const response = await fetch(API_URL + API_QUERY, {
      cache: "force-cache",
    });

    if (!response.ok) {
      throw new Error("Không thể tải bài viết từ WordPress API");
    }

    const data = await response.json();

    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        time: Date.now(),
        data: data,
      }),
    );

    return data;
  }

  //   post nổi bật
  function renderFeaturedPost(post) {
    const detailUrl = getPostDetailUrl(post);
    if (!featuredBox) return;

    if (!post) {
      featuredBox.innerHTML = "<p>Chưa có bài viết nổi bật.</p>";
      return;
    }

    featuredBox.innerHTML = `
      <a href="${detailUrl}" class="featured-post-image">
        <img
          src="${getImage(post)}"
          alt="${escapeHTML(stripHTML(post.title.rendered))}"
          loading="lazy"
          decoding="async"
        />
      </a>

      <div class="featured-post-content">
        <span>${escapeHTML(getPrimaryCategory(post))}</span>

        <h4>
          <a href="${detailUrl}">
            ${post.title.rendered}
          </a>
        </h4>

        <p>
          ${trimText(post.excerpt.rendered, 135)}
        </p>

        <a href="${detailUrl}" class="read-more-link">Xem thêm</a>
      </div>
    `;
  }

  //   post mới nhất
  function renderLatestPosts() {
    if (!latestBox) return;

    const postsToShow = latestPosts.slice(0, visibleLatest);

    latestBox.innerHTML = postsToShow
      .map((post) => {
        const detailUrl = getPostDetailUrl(post);

        return `
      <article class="latest-news-card">
        <a href="${detailUrl}" class="latest-news-image">
          <img
            src="${getImage(post)}"
            alt="${escapeHTML(stripHTML(post.title.rendered))}"
            loading="lazy"
            decoding="async"
          />
        </a>

        <div class="latest-news-content">
          <span>${escapeHTML(getPrimaryCategory(post))}</span>

          <h4>
            <a href="${detailUrl}">
              ${post.title.rendered}
            </a>
          </h4>

          <p>
            ${trimText(post.excerpt.rendered, 150)}
          </p>

          <a href="${detailUrl}" class="read-more-link">Xem thêm</a>
        </div>
      </article>
    `;
      })
      .join("");

    if (loadMoreBtn) {
      loadMoreBtn.style.display =
        visibleLatest >= latestPosts.length ? "none" : "inline-flex";
    }
  }
  // post khác
  function renderRandomPosts(posts) {
    if (!randomBox) return;

    if (!posts.length) {
      randomBox.innerHTML = "<p>Chưa có bài viết khác.</p>";
      return;
    }

    randomBox.innerHTML = posts
      .map((post) => {
        const detailUrl = getPostDetailUrl(post);

        return `
      <article class="small-post">
        <a href="${detailUrl}">
          <img
            src="${getImage(post)}"
            alt="${escapeHTML(stripHTML(post.title.rendered))}"
            loading="lazy"
            decoding="async"
          />
        </a>

        <div>
          <span>${escapeHTML(getPrimaryCategory(post))}</span>

          <h4>
            <a href="${detailUrl}">
              ${post.title.rendered}
            </a>
          </h4>
        </div>
      </article>
    `;
      })
      .join("");
  }

  // skeleton

  function renderLatestSkeleton(count = 4) {
    if (!latestBox) return;

    latestBox.innerHTML = Array.from({ length: count })
      .map(function () {
        return `
      <article class="latest-news-card skeleton-card">
        <div class="latest-news-image">
          <div class="skeleton skeleton-image"></div>
        </div>

        <div class="latest-news-content skeleton-gap">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-title long"></div>
          <div class="skeleton skeleton-title medium"></div>
          <div class="skeleton skeleton-line full"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-button"></div>
        </div>
      </article>
    `;
      })
      .join("");
  }

  function renderFeaturedSkeleton() {
    if (!featuredBox) return;

    featuredBox.innerHTML = `
    <div class="featured-post-image skeleton-featured-image skeleton"></div>

    <div class="featured-post-content skeleton-gap">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-featured-title full"></div>
      <div class="skeleton skeleton-featured-title medium"></div>
      <div class="skeleton skeleton-line full"></div>
      <div class="skeleton skeleton-line long"></div>
      <div class="skeleton skeleton-button"></div>
    </div>
  `;
  }

  function renderRandomSkeleton(count = 3) {
    if (!randomBox) return;

    randomBox.innerHTML = Array.from({ length: count })
      .map(function () {
        return `
      <article class="small-post skeleton-small-post">
        <div class="skeleton skeleton-small-image"></div>

        <div class="skeleton-small-content">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line full"></div>
          <div class="skeleton skeleton-line medium"></div>
        </div>
      </article>
    `;
      })
      .join("");
  }

  function renderAllSkeletons() {
    renderLatestSkeleton(4);
    renderFeaturedSkeleton();
    renderRandomSkeleton(3);
  }

  //   call all post
  async function initBlogPosts() {
    try {
      renderAllSkeletons();

      const allPosts = await fetchOptimizedPosts();

      const featuredPost =
        allPosts.find(function (post) {
          return post.sticky === true;
        }) || allPosts[0];

      latestPosts = allPosts.filter(function (post) {
        return !featuredPost || post.id !== featuredPost.id;
      });

      const randomPosts = shuffleArray(latestPosts).slice(0, 3);

      renderFeaturedPost(featuredPost);
      renderLatestPosts();
      renderRandomPosts(randomPosts);
    } catch (error) {
      console.error(error);

      if (latestBox)
        latestBox.innerHTML = "<p>Không tải được bài viết mới nhất.</p>";
      if (featuredBox)
        featuredBox.innerHTML = "<p>Không tải được bài viết nổi bật.</p>";
      if (randomBox)
        randomBox.innerHTML = "<p>Không tải được bài viết khác.</p>";
    }
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () {
      visibleLatest += loadStep;
      renderLatestPosts();
    });
  }

  initBlogPosts();
})();
