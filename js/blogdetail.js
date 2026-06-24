document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const API_BASE = window.location.hostname.includes("solargreensolutions.vn")
    ? "/wp-json/wp/v2/posts"
    : "https://solargreensolutions.vn/wp-json/wp/v2/posts";

  const CACHE_PREFIX = "sgs_news_detail_cache_v3_";
  const RELATED_CACHE_PREFIX = "sgs_news_related_cache_v3_";
  const CACHE_TIME = 5 * 60 * 1000;

  const DETAIL_FIELDS =
    "id,slug,date,modified,link,title,excerpt,content,categories,tags,featured_media,jetpack_featured_media_url,yoast_head_json,_links,_embedded";

  const LIST_FIELDS =
    "id,slug,date,modified,link,title,excerpt,categories,tags,featured_media,jetpack_featured_media_url,yoast_head_json,_links,_embedded";

  const titleEl = document.getElementById("newsDetailTitle");
  const breadcrumbEl = document.getElementById("newsDetailBreadcrumb");
  const dateEl = document.getElementById("newsDetailDate");
  const readTimeEl = document.getElementById("newsDetailReadTime");
  const imageEl = document.getElementById("newsDetailImage");
  const contentEl = document.getElementById("newsDetailContent");
  const tagsEl = document.querySelector(".news-detail-tags");
  const featuredSidePost = document.querySelector(".featured-side-post");
  const sideListEl = document.getElementById("newsDetailSideList");
  const relatedGridEl = document.getElementById("relatedNewsGrid");

  const fallbackImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650">
        <rect width="100%" height="100%" fill="#eef8f2"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial" font-size="34" fill="#07883f">
          Solar Green Solutions
        </text>
      </svg>
    `);

  const decoder = document.createElement("div");

  function stripHTML(html) {
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

  function getDetailUrl(post) {
    return post?.slug
      ? "newsdetail.html?slug=" + encodeURIComponent(post.slug)
      : "#";
  }

  function getFirstContentImage(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";

    const img = div.querySelector("img");

    return (
      img?.getAttribute("src") ||
      img?.getAttribute("data-src") ||
      img?.getAttribute("data-lazy-src") ||
      ""
    );
  }

  function getImage(post) {
    const media = post?._embedded?.["wp:featuredmedia"]?.[0];
    const sizes = media?.media_details?.sizes || {};

    return (
      sizes?.full?.source_url ||
      sizes?.large?.source_url ||
      sizes?.medium_large?.source_url ||
      sizes?.medium?.source_url ||
      sizes?.thumbnail?.source_url ||
      media?.source_url ||
      media?.guid?.rendered ||
      post?.jetpack_featured_media_url ||
      post?.yoast_head_json?.og_image?.[0]?.url ||
      getFirstContentImage(post?.content?.rendered) ||
      getFirstContentImage(post?.excerpt?.rendered) ||
      fallbackImage
    );
  }

  function getPostTerms(post) {
    return (post?._embedded?.["wp:term"] || []).flat();
  }

  function getPostCategories(post) {
    const categories = getPostTerms(post)
      .filter((term) => term.taxonomy === "category")
      .map((term) => ({
        id: term.id,
        name: term.name,
        slug: term.slug,
      }));

    return categories.length
      ? categories
      : [{ id: null, name: "Kiến thức solar", slug: "kien-thuc-solar" }];
  }

  function getPostTags(post) {
    return getPostTerms(post)
      .filter((term) => term.taxonomy === "post_tag")
      .map((term) => term.name);
  }

  function getPrimaryCategory(post) {
    return getPostCategories(post)[0];
  }

  function formatDate(dateString) {
    if (!dateString) return "Cập nhật";

    return (
      "Cập nhật: " +
      new Date(dateString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
  }

  function getReadTime(contentHTML) {
    const words = stripHTML(contentHTML)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return Math.max(1, Math.ceil(words / 220)) + " phút đọc";
  }

  function getCacheKey() {
    return CACHE_PREFIX + encodeURIComponent(slug || "no-slug");
  }

  function getRelatedCacheKey() {
    return RELATED_CACHE_PREFIX + encodeURIComponent(slug || "no-slug");
  }

  function getPostSignature(post) {
    return [
      post?.id || "",
      post?.slug || "",
      post?.modified || "",
      post?.title?.rendered || "",
      post?.content?.rendered || "",
      getImage(post),
    ].join("|");
  }

  function readCache(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);

      if (!parsed.time || Date.now() - parsed.time > CACHE_TIME) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed;
    } catch (error) {
      localStorage.removeItem(key);
      return null;
    }
  }

  function saveCache(key, data, signature) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          time: Date.now(),
          signature: signature || "",
          data: data,
        }),
      );
    } catch (error) {}
  }

  function uniquePosts(posts) {
    const seen = new Set();

    return (posts || []).filter(function (post) {
      if (!post || !post.id || seen.has(post.id)) return false;

      seen.add(post.id);
      return true;
    });
  }

  function renderSkeleton() {
    if (titleEl) {
      titleEl.innerHTML = `<span class="news-skeleton news-skeleton-title"></span>`;
    }

    if (breadcrumbEl) {
      breadcrumbEl.innerHTML = `<span class="news-skeleton news-skeleton-breadcrumb"></span>`;
    }

    if (dateEl) {
      dateEl.innerHTML = `<span class="news-skeleton news-skeleton-meta"></span>`;
    }

    if (readTimeEl) {
      readTimeEl.innerHTML = `<span class="news-skeleton news-skeleton-meta short"></span>`;
    }

    if (imageEl) {
      const wrapper = imageEl.closest(".news-detail-feature-image");
      if (wrapper) wrapper.classList.add("is-loading");
      imageEl.style.opacity = "0";
    }

    if (contentEl) {
      contentEl.innerHTML = `
        <p>
          <span class="news-skeleton news-skeleton-line full"></span>
          <span class="news-skeleton news-skeleton-line long"></span>
          <span class="news-skeleton news-skeleton-line medium"></span>
        </p>
        <p>
          <span class="news-skeleton news-skeleton-heading"></span>
          <span class="news-skeleton news-skeleton-line full"></span>
          <span class="news-skeleton news-skeleton-line long"></span>
          <span class="news-skeleton news-skeleton-line short"></span>
        </p>
      `;
    }

    if (featuredSidePost) {
      featuredSidePost.innerHTML = `
        <span class="news-skeleton side-image"></span>
        <span class="news-skeleton news-skeleton-line short"></span>
        <strong>
          <span class="news-skeleton news-skeleton-line full"></span>
          <span class="news-skeleton news-skeleton-line medium"></span>
        </strong>
      `;
    }

    if (sideListEl) {
      sideListEl.innerHTML = Array.from({ length: 3 })
        .map(
          () => `
          <a href="#" class="small-side-post">
            <span class="news-skeleton small-side-image"></span>
            <div>
              <span class="news-skeleton news-skeleton-line short"></span>
              <strong>
                <span class="news-skeleton news-skeleton-line full"></span>
                <span class="news-skeleton news-skeleton-line medium"></span>
              </strong>
            </div>
          </a>
        `,
        )
        .join("");
    }

    if (relatedGridEl) {
      relatedGridEl.innerHTML = Array.from({ length: 3 })
        .map(
          () => `
          <article class="related-news-card">
            <span class="news-skeleton related-image"></span>
            <div>
              <span class="news-skeleton news-skeleton-line short"></span>
              <h3>
                <span class="news-skeleton news-skeleton-line full"></span>
                <span class="news-skeleton news-skeleton-line medium"></span>
              </h3>
              <span class="news-skeleton news-skeleton-button"></span>
            </div>
          </article>
        `,
        )
        .join("");
    }
  }

  function setImage(src, alt) {
    if (!imageEl) return;

    const wrapper = imageEl.closest(".news-detail-feature-image");
    if (wrapper) wrapper.classList.add("is-loading");

    imageEl.style.opacity = "0";

    imageEl.onload = function () {
      imageEl.style.opacity = "1";
      if (wrapper) wrapper.classList.remove("is-loading");
    };

    imageEl.onerror = function () {
      imageEl.onerror = null;
      imageEl.src = fallbackImage;
      imageEl.style.opacity = "1";
      if (wrapper) wrapper.classList.remove("is-loading");
    };

    imageEl.src = src || fallbackImage;
    imageEl.alt = alt || "Solar Green Solutions";

    if (imageEl.complete && imageEl.naturalWidth > 0) {
      imageEl.style.opacity = "1";
      if (wrapper) wrapper.classList.remove("is-loading");
    }
  }

  function renderPost(post) {
    const titleHTML = post?.title?.rendered || "Bài viết Solar Green Solutions";
    const titleText = stripHTML(titleHTML);
    const contentHTML =
      post?.content?.rendered ||
      post?.excerpt?.rendered ||
      "<p>Nội dung bài viết đang được cập nhật.</p>";

    document.title = titleText + " | Solar Green Solutions";

    if (titleEl) titleEl.innerHTML = titleHTML;
    if (breadcrumbEl) breadcrumbEl.textContent = titleText;
    if (dateEl) dateEl.textContent = formatDate(post.date);
    if (readTimeEl) readTimeEl.textContent = getReadTime(contentHTML);
    if (contentEl) contentEl.innerHTML = contentHTML;

    setImage(getImage(post), titleText);

    const tags = getPostTags(post);

    if (tagsEl) {
      tagsEl.innerHTML = tags.length
        ? `<span>Tags:</span>` +
          tags.map((tag) => `<a href="#">${escapeHTML(tag)}</a>`).join("")
        : "";
    }
  }

  function renderSidePosts(posts) {
    const validPosts = Array.isArray(posts) ? posts.filter(Boolean) : [];

    if (!validPosts.length) {
      if (featuredSidePost) {
        featuredSidePost.innerHTML =
          "<strong>Chưa có bài viết nổi bật.</strong>";
        featuredSidePost.removeAttribute("href");
      }

      if (sideListEl) {
        sideListEl.innerHTML = "<p>Chưa có bài viết khác.</p>";
      }

      return;
    }

    const featured = validPosts[0];
    const sidePosts = validPosts.slice(1, 4);

    if (featuredSidePost) {
      featuredSidePost.href = getDetailUrl(featured);
      featuredSidePost.innerHTML = `
        <img src="${getImage(featured)}" alt="${escapeHTML(stripHTML(featured.title.rendered))}" loading="lazy" decoding="async" />
        <span>${escapeHTML(getPrimaryCategory(featured).name)}</span>
        <strong>${featured.title.rendered}</strong>
      `;
    }

    if (sideListEl) {
      sideListEl.innerHTML = sidePosts.length
        ? sidePosts
            .map(
              (post) => `
            <a href="${getDetailUrl(post)}" class="small-side-post">
              <img src="${getImage(post)}" alt="${escapeHTML(stripHTML(post.title.rendered))}" loading="lazy" decoding="async" />
              <div>
                <span>${escapeHTML(getPrimaryCategory(post).name)}</span>
                <strong>${post.title.rendered}</strong>
              </div>
            </a>
          `,
            )
            .join("")
        : "<p>Chưa có bài viết khác.</p>";
    }
  }

  function renderRelatedPosts(posts) {
    if (!relatedGridEl) return;

    const validPosts = Array.isArray(posts) ? posts.slice(0, 3) : [];

    if (!validPosts.length) {
      relatedGridEl.innerHTML = "<p>Chưa có tin liên quan.</p>";
      return;
    }

    relatedGridEl.innerHTML = validPosts
      .map(
        (post) => `
        <article class="related-news-card">
          <img src="${getImage(post)}" alt="${escapeHTML(stripHTML(post.title.rendered))}" loading="lazy" decoding="async" />
          <div>
            <span>${escapeHTML(getPrimaryCategory(post).name)}</span>
            <h3>${post.title.rendered}</h3>
            <a href="${getDetailUrl(post)}" class="read-more-link">Xem thêm</a>
          </div>
        </article>
      `,
      )
      .join("");
  }

  async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error("Không tải được dữ liệu từ WordPress API");
    }

    return response.json();
  }

  async function fetchPostDetail() {
    const url =
      API_BASE +
      "?slug=" +
      encodeURIComponent(slug) +
      "&_embed=wp:featuredmedia,wp:term" +
      "&_fields=" +
      DETAIL_FIELDS;

    const data = await fetchJSON(url, { cache: "no-store" });

    return Array.isArray(data) ? data[0] : data;
  }

  async function fetchRelatedPosts(post) {
    const category = getPrimaryCategory(post);
    let relatedPosts = [];

    if (category.id) {
      const categoryUrl =
        API_BASE +
        "?per_page=8&orderby=date&order=desc&exclude=" +
        encodeURIComponent(post.id) +
        "&categories=" +
        encodeURIComponent(category.id) +
        "&_embed=wp:featuredmedia,wp:term" +
        "&_fields=" +
        LIST_FIELDS;

      relatedPosts = await fetchJSON(categoryUrl, { cache: "force-cache" });
    }

    relatedPosts = uniquePosts(relatedPosts);

    if (relatedPosts.length < 6) {
      const excludeIds = [post.id].concat(relatedPosts.map((item) => item.id));

      const fallbackUrl =
        API_BASE +
        "?per_page=8&orderby=date&order=desc&exclude=" +
        encodeURIComponent(excludeIds.join(",")) +
        "&_embed=wp:featuredmedia,wp:term" +
        "&_fields=" +
        LIST_FIELDS;

      const fallbackPosts = await fetchJSON(fallbackUrl, {
        cache: "force-cache",
      });

      relatedPosts = uniquePosts(relatedPosts.concat(fallbackPosts));
    }

    return relatedPosts.slice(0, 6);
  }

  function renderError(message) {
    if (titleEl) titleEl.textContent = message;
    if (breadcrumbEl) breadcrumbEl.textContent = "Không tìm thấy";

    if (contentEl) {
      contentEl.innerHTML =
        "<p>Vui lòng quay lại trang tin tức hoặc kiểm tra lại đường dẫn.</p>";
    }

    if (imageEl) {
      const wrapper = imageEl.closest(".news-detail-feature-image");
      if (wrapper) wrapper.classList.remove("is-loading");
      imageEl.style.opacity = "1";
    }
  }

  async function initNewsDetail() {
    if (!slug) {
      renderError("Không tìm thấy slug bài viết.");
      return;
    }

    const cachedPost = readCache(getCacheKey());
    const cachedRelated = readCache(getRelatedCacheKey());

    if (cachedPost?.data) {
      renderPost(cachedPost.data);
    } else {
      renderSkeleton();
    }

    if (cachedRelated?.data?.length) {
      renderSidePosts(cachedRelated.data);
      renderRelatedPosts(cachedRelated.data);
    }

    try {
      const freshPost = await fetchPostDetail();

      if (!freshPost) {
        if (!cachedPost?.data) renderError("Không tìm thấy bài viết.");
        return;
      }

      const freshSignature = getPostSignature(freshPost);

      if (!cachedPost || cachedPost.signature !== freshSignature) {
        renderPost(freshPost);
        saveCache(getCacheKey(), freshPost, freshSignature);
      }

      const relatedPosts = await fetchRelatedPosts(freshPost);

      renderSidePosts(relatedPosts);
      renderRelatedPosts(relatedPosts);

      if (Array.isArray(relatedPosts) && relatedPosts.length) {
        saveCache(
          getRelatedCacheKey(),
          relatedPosts,
          "related-" + relatedPosts.map((post) => post.id).join("-"),
        );
      }
    } catch (error) {
      console.error(error);

      if (!cachedPost?.data) {
        renderError("Không tải được thông tin bài viết.");
      }
    }
  }

  initNewsDetail();
});
