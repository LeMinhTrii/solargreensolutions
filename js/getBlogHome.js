document.addEventListener("DOMContentLoaded", function () {
  const POSTS_API =
    "https://solargreensolutions.vn/wp-json/wp/v2/posts?per_page=3&_embed=wp:featuredmedia,wp:term&_fields=id,slug,modified,link,title,excerpt,_links,_embedded";

  const CACHE_KEY = "solar_home_latest_posts_cache_v2";

  const newsGrid = document.getElementById("homeLatestNews");
  if (!newsGrid) return;

  const fallbackImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="560">
        <rect width="100%" height="100%" fill="#eef8f2"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial" font-size="28" fill="#07883f">
          Solar Green Solutions
        </text>
      </svg>
    `);

  const decoder = document.createElement("div");

  function stripHTML(html) {
    decoder.innerHTML = html || "";
    return decoder.textContent || decoder.innerText || "";
  }

  function decodeHTML(html) {
    decoder.innerHTML = html || "";
    return decoder.textContent || decoder.innerText || "";
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
    if (!text) return "Thông tin bài viết đang được cập nhật.";
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + "...";
  }

  function getPostImage(post) {
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

    const terms = termGroups.reduce(function (result, group) {
      return result.concat(group);
    }, []);

    const categories = terms
      .filter(function (term) {
        return term && term.taxonomy === "category" && term.name;
      })
      .map(function (term) {
        return {
          name: decodeHTML(term.name),
          slug: term.slug || "",
        };
      });

    return categories.length
      ? categories
      : [{ name: "Kiến thức solar", slug: "kien-thuc-solar" }];
  }

  function getPrimaryCategory(post) {
    return getPostCategories(post)[0];
  }

  function getPostSignature(posts) {
    return posts
      .map(function (post) {
        return [
          post.id,
          post.slug || "",
          post.modified || "",
          post.title?.rendered || "",
          post.excerpt?.rendered || "",
          getPostImage(post),
          JSON.stringify(getPostCategories(post)),
        ].join(":");
      })
      .join("|");
  }

  function readCache() {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (error) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
  }

  function saveCache(posts) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          signature: getPostSignature(posts),
          data: posts,
        }),
      );
    } catch (error) {
      // Bỏ qua nếu trình duyệt chặn sessionStorage
    }
  }

  async function fetchFreshPosts() {
    const separator = POSTS_API.includes("?") ? "&" : "?";
    const freshUrl = POSTS_API + separator + "_refresh=" + Date.now();

    const response = await fetch(freshUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Không tải được API bài viết");
    }

    return await response.json();
  }

  function normalizePost(post) {
    const title = post?.title?.rendered || "Bài viết điện mặt trời";
    const titleText = stripHTML(title);
    const excerpt = trimText(post?.excerpt?.rendered || "", 115);
    const image = getPostImage(post);
    const category = getPrimaryCategory(post);
    const slug = post.slug || "";

    return {
      id: post.id,
      slug: slug,
      titleHTML: title,
      titleText: titleText,
      excerpt: excerpt,
      image: image,
      categoryName: category.name,
      detailUrl: slug
        ? "newsdetail.html?slug=" + encodeURIComponent(slug)
        : "/news.html",
    };
  }

  function renderHomeNewsSkeleton() {
    newsGrid.innerHTML = Array.from({ length: 3 })
      .map(function () {
        return `
          <article class="home-news-card home-news-skeleton">
            <div class="home-news-skeleton-image skeleton"></div>

            <div>
              <span class="skeleton skeleton-meta"></span>
              <h3>
                <span class="skeleton skeleton-title long"></span>
                <span class="skeleton skeleton-title medium"></span>
              </h3>
              <p>
                <span class="skeleton skeleton-line full"></span>
                <span class="skeleton skeleton-line long"></span>
                <span class="skeleton skeleton-line medium"></span>
              </p>
              <span class="skeleton skeleton-readmore"></span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderHomeNews(rawPosts) {
    const posts = rawPosts.map(normalizePost);

    if (!posts.length) {
      newsGrid.innerHTML = `
        <div class="home-news-empty">
          Chưa có bài viết để hiển thị.
        </div>
      `;
      return;
    }

    newsGrid.innerHTML = posts
      .map(function (post) {
        return `
          <article class="home-news-card" data-slug="${escapeHTML(post.slug)}">
            <a href="${post.detailUrl}">
              <img
                src="${post.image}"
                alt="${escapeHTML(post.titleText)}"
                loading="lazy"
                decoding="async"
              />
            </a>

            <div>
              <span>${escapeHTML(post.categoryName)}</span>

              <h3>
                <a href="${post.detailUrl}">
                  ${post.titleHTML}
                </a>
              </h3>

              <p>${escapeHTML(post.excerpt)}</p>

              <a href="${post.detailUrl}" class="read-more-link">Xem thêm</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function initHomeNews() {
    try {
      renderHomeNewsSkeleton();

      const cached = readCache();

      if (cached && Array.isArray(cached.data)) {
        renderHomeNews(cached.data);
      }

      const freshPosts = await fetchFreshPosts();
      const freshSignature = getPostSignature(freshPosts);

      if (!cached || cached.signature !== freshSignature) {
        saveCache(freshPosts);
        renderHomeNews(freshPosts);
      }
    } catch (error) {
      console.error(error);

      const cached = readCache();

      if (cached && Array.isArray(cached.data)) {
        renderHomeNews(cached.data);
        return;
      }

      newsGrid.innerHTML = `
        <div class="home-news-empty">
          Không tải được bài viết mới nhất.
        </div>
      `;
    }
  }

  initHomeNews();
});
