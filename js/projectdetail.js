document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const API_BASE = window.location.hostname.includes("solargreensolutions.vn")
    ? "/wp-json/solar/v1/projects"
    : "https://solargreensolutions.vn/wp-json/solar/v1/projects";

  const CACHE_PREFIX = "solar_project_detail_cache_v2_";

  const titleEl = document.getElementById("projectDetailTitle");
  const breadcrumbEl = document.getElementById("projectDetailBreadcrumb");
  const imageEl = document.getElementById("projectDetailImage");
  const overviewTitleEl = document.getElementById("projectDetailOverviewTitle");
  const contentEl = document.getElementById("projectDetailContent");
  const categoryLabelEl = document.getElementById("projectDetailCategoryLabel");
  const typeEl = document.getElementById("projectDetailType");
  const locationEl = document.getElementById("projectDetailLocation");
  const systemEl = document.getElementById("projectDetailSystem");
  const serviceEl = document.getElementById("projectDetailService");

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

  function getCacheKey() {
    return CACHE_PREFIX + encodeURIComponent(slug || "no-slug");
  }

  function getProjectSignature(project) {
    if (!project) return "";

    return [
      project.id || "",
      project.slug || "",
      project.modified || "",
      project.title?.rendered || "",
      project.excerpt?.rendered || "",
      project.content?.rendered || "",
      project.image || "",
      project.image_full || "",
      JSON.stringify(project.terms || []),
    ].join("|");
  }

  function readCache() {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;

      return JSON.parse(cached);
    } catch (error) {
      localStorage.removeItem(getCacheKey());
      return null;
    }
  }

  function saveCache(project) {
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          signature: getProjectSignature(project),
          data: project,
          savedAt: Date.now(),
        }),
      );
    } catch (error) {
      // Nếu trình duyệt chặn localStorage thì bỏ qua.
    }
  }

  function getPrimaryCategory(project) {
    const terms = Array.isArray(project?.terms) ? project.terms : [];

    if (!terms.length) {
      return {
        name: "Dự án điện mặt trời",
        slug: "du-an-dien-mat-troi",
      };
    }

    return {
      name: terms[0].name || "Dự án điện mặt trời",
      slug: terms[0].slug || "du-an-dien-mat-troi",
    };
  }

  function setImage(imageUrl, altText) {
    if (!imageEl) return;

    const imageWrapper = imageEl.closest(".project-feature-image");

    if (imageWrapper) {
      imageWrapper.classList.add("is-loading");
    }

    imageEl.style.opacity = "0";

    imageEl.onload = function () {
      imageEl.style.opacity = "1";

      if (imageWrapper) {
        imageWrapper.classList.remove("is-loading");
      }
    };

    imageEl.onerror = function () {
      imageEl.src = fallbackImage;
      imageEl.style.opacity = "1";

      if (imageWrapper) {
        imageWrapper.classList.remove("is-loading");
      }
    };

    imageEl.src = imageUrl || fallbackImage;
    imageEl.alt = altText || "Dự án Solar Green Solutions";

    if (imageEl.complete && imageEl.naturalWidth > 0) {
      imageEl.style.opacity = "1";

      if (imageWrapper) {
        imageWrapper.classList.remove("is-loading");
      }
    }
  }

  function renderLoading() {
    if (titleEl) {
      titleEl.innerHTML = `<span class="detail-skeleton skeleton-title"></span>`;
    }

    if (breadcrumbEl) {
      breadcrumbEl.innerHTML = `<span class="detail-skeleton skeleton-breadcrumb"></span>`;
    }

    if (imageEl) {
      const imageWrapper = imageEl.closest(".project-feature-image");

      if (imageWrapper) {
        imageWrapper.classList.add("is-loading");
      }

      imageEl.style.opacity = "0";
    }

    if (categoryLabelEl) {
      categoryLabelEl.innerHTML = `<span class="detail-skeleton skeleton-label"></span>`;
    }

    if (overviewTitleEl) {
      overviewTitleEl.innerHTML = `
        <span class="detail-skeleton skeleton-heading long"></span>
        <span class="detail-skeleton skeleton-heading medium"></span>
      `;
    }

    if (contentEl) {
      contentEl.innerHTML = `
        <p>
          <span class="detail-skeleton skeleton-line full"></span>
          <span class="detail-skeleton skeleton-line long"></span>
          <span class="detail-skeleton skeleton-line medium"></span>
        </p>

        <p>
          <span class="detail-skeleton skeleton-line full"></span>
          <span class="detail-skeleton skeleton-line long"></span>
          <span class="detail-skeleton skeleton-line short"></span>
        </p>
      `;
    }

    if (typeEl) {
      typeEl.innerHTML = `<span class="detail-skeleton skeleton-info"></span>`;
    }

    if (locationEl) {
      locationEl.innerHTML = `<span class="detail-skeleton skeleton-info"></span>`;
    }

    if (systemEl) {
      systemEl.innerHTML = `<span class="detail-skeleton skeleton-info"></span>`;
    }

    if (serviceEl) {
      serviceEl.innerHTML = `<span class="detail-skeleton skeleton-info long"></span>`;
    }
  }

  function renderError(message) {
    if (titleEl) titleEl.textContent = message;
    if (breadcrumbEl) breadcrumbEl.textContent = "Không tìm thấy";

    if (contentEl) {
      contentEl.innerHTML = `
        <p>Vui lòng quay lại trang dự án hoặc kiểm tra lại đường dẫn.</p>
      `;
    }

    if (imageEl) {
      const imageWrapper = imageEl.closest(".project-feature-image");

      if (imageWrapper) {
        imageWrapper.classList.remove("is-loading");
      }

      imageEl.style.opacity = "1";
    }
  }

  function renderProject(project) {
    const titleHTML = project?.title?.rendered || "Dự án điện mặt trời";
    const titleText = stripHTML(titleHTML);

    const excerptHTML = project?.excerpt?.rendered || "";
    const contentHTML =
      project?.content?.rendered ||
      excerptHTML ||
      "<p>Thông tin chi tiết dự án đang được cập nhật.</p>";

    const image = project.image_full || project.image || fallbackImage;
    const category = getPrimaryCategory(project);

    document.title = titleText + " | Solar Green Solutions";

    if (titleEl) {
      titleEl.innerHTML = titleHTML;
    }

    if (breadcrumbEl) {
      breadcrumbEl.textContent = titleText;
    }

    setImage(image, titleText);

    if (categoryLabelEl) {
      categoryLabelEl.textContent = category.name;
    }

    if (overviewTitleEl) {
      overviewTitleEl.innerHTML = titleHTML;
    }

    if (contentEl) {
      contentEl.innerHTML = contentHTML;
    }

    if (typeEl) {
      typeEl.textContent = category.name;
    }

    if (locationEl) {
      locationEl.textContent = project.location || "Đang cập nhật";
    }

    if (systemEl) {
      systemEl.textContent = project.system || "Điện mặt trời áp mái";
    }

    if (serviceEl) {
      serviceEl.textContent =
        project.service || "Tư vấn, thiết kế, thi công, bảo trì";
    }
  }

  async function fetchFreshProject() {
    const freshUrl =
      API_BASE +
      "?slug=" +
      encodeURIComponent(slug) +
      "&_refresh=" +
      Date.now();

    const response = await fetch(freshUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Không tải được API chi tiết dự án");
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  }

  async function initProjectDetail() {
    try {
      if (!slug) {
        renderError("Không tìm thấy slug dự án.");
        return;
      }

      const cached = readCache();

      if (cached && cached.data) {
        renderProject(cached.data);
      } else {
        renderLoading();
      }

      const freshProject = await fetchFreshProject();

      if (!freshProject) {
        if (!cached) {
          renderError("Không tìm thấy dự án.");
        }

        return;
      }

      const freshSignature = getProjectSignature(freshProject);

      if (!cached || cached.signature !== freshSignature) {
        saveCache(freshProject);
        renderProject(freshProject);
      }
    } catch (error) {
      console.error(error);

      const cached = readCache();

      if (cached && cached.data) {
        renderProject(cached.data);
        return;
      }

      renderError("Không tải được thông tin dự án.");
    }
  }

  initProjectDetail();
});
