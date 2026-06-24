document.addEventListener("DOMContentLoaded", function () {
  const PROJECT_API = window.location.hostname.includes(
    "solargreensolutions.vn",
  )
    ? "/wp-json/solar/v1/projects?per_page=10"
    : "https://solargreensolutions.vn/wp-json/solar/v1/projects?per_page=10";

  const CACHE_KEY = "solar_projects_cache_v2";

  const projectFilter = document.getElementById("projectFilter");
  const projectGrid = document.getElementById("projectGrid");

  if (!projectFilter || !projectGrid) {
    console.warn("Thiếu #projectFilter hoặc #projectGrid");
    return;
  }

  let allProjects = [];
  let currentFilter = "all";
  let visibleCount = 6;
  const loadStep = 6;

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

  function decodeHTML(html) {
    decoder.innerHTML = html || "";
    return decoder.textContent || decoder.innerText || "";
  }

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

  function trimPlainText(text, limit) {
    const cleanText = String(text || "").trim();

    if (!cleanText) {
      return "Thông tin dự án đang được Solar Green Solutions cập nhật.";
    }

    if (cleanText.length <= limit) return cleanText;

    return cleanText.substring(0, limit).trim() + "...";
  }

  function normalizeTerms(project) {
    const terms = Array.isArray(project.terms) ? project.terms : [];

    return terms
      .filter(function (term) {
        return term && term.name;
      })
      .map(function (term) {
        const name = decodeHTML(term.name);

        return {
          id: term.id,
          name: name,
          slug: term.slug || "du-an",
          taxonomy: term.taxonomy || "",
        };
      });
  }

  function normalizeProject(project) {
    const terms = normalizeTerms(project);
    const primaryTerm = terms[0] || {
      name: "Dự án",
      slug: "du-an",
    };

    const slugs = terms.length
      ? terms.map(function (term) {
          return term.slug;
        })
      : ["du-an"];

    const titleHTML = project?.title?.rendered || "Dự án điện mặt trời";
    const titleText = stripHTML(titleHTML);
    const excerptText = stripHTML(project?.excerpt?.rendered || "");
    const image = project.image || fallbackImage;

    return {
      id: project.id,
      link: project.link || "#",
      detailUrl: project.slug ? "/pjdetail.html?slug=" + project.slug : "#",
      titleHTML: titleHTML,
      titleText: titleText,
      excerptText: trimPlainText(excerptText, 150),
      image: image,
      terms: terms,
      primaryTerm: primaryTerm,
      slugs: slugs,
      slugsString: slugs.join(" "),
    };
  }

  // function readCache() {
  //   try {
  //     const cached = sessionStorage.getItem(CACHE_KEY);
  //     if (!cached) return null;

  //     const parsed = JSON.parse(cached);

  //     if (!parsed.time || !parsed.data) return null;

  //     if (Date.now() - parsed.time > CACHE_TTL) {
  //       sessionStorage.removeItem(CACHE_KEY);
  //       return null;
  //     }

  //     return parsed.data;
  //   } catch (error) {
  //     sessionStorage.removeItem(CACHE_KEY);
  //     return null;
  //   }
  // }

  // function saveCache(data) {
  //   try {
  //     sessionStorage.setItem(
  //       CACHE_KEY,
  //       JSON.stringify({
  //         time: Date.now(),
  //         data: data,
  //       }),
  //     );
  //   } catch (error) {
  //     // Nếu trình duyệt chặn storage thì bỏ qua, không ảnh hưởng chức năng.
  //   }
  // }

  // cach dự án trong sessionStorage để giảm tải cho API và tăng tốc độ hiển thị khi người dùng quay lại trang.
  // async function fetchProjects() {
  //   const cached = readCache();

  //   if (cached) {
  //     return cached;
  //   }

  //   const response = await fetch(PROJECT_API, {
  //     cache: "force-cache",
  //   });

  //   if (!response.ok) {
  //     throw new Error("Không tải được API dự án");
  //   }

  //   const data = await response.json();
  //   saveCache(data);

  //   return data;
  // }

  function getProjectSignature(data) {
    return data
      .map(function (project) {
        return [
          project.id,
          project.modified || "",
          project.title?.rendered || "",
          project.excerpt?.rendered || "",
          project.image || "",
          JSON.stringify(project.terms || []),
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

  function saveCache(data) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          signature: getProjectSignature(data),
          data: data,
        }),
      );
    } catch (error) {
      // Nếu trình duyệt chặn storage thì bỏ qua.
    }
  }

  async function fetchFreshProjects() {
    const separator = PROJECT_API.includes("?") ? "&" : "?";
    const freshUrl = PROJECT_API + separator + "_refresh=" + Date.now();

    const response = await fetch(freshUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Không tải được API dự án");
    }

    return await response.json();
  }

  function renderRawProjects(rawProjects) {
    allProjects = rawProjects.map(normalizeProject);

    renderFilters();
    createLoadMoreButton();
    renderProjects();
  }

  function getFilteredProjects() {
    if (currentFilter === "all") return allProjects;

    return allProjects.filter(function (project) {
      return project.slugs.includes(currentFilter);
    });
  }

  // skeleton loading
  function renderSkeleton() {
    projectGrid.innerHTML = Array.from({ length: 6 })
      .map(function () {
        return `
          <article class="project-card">
            <div class="project-image">
              <div class="skeleton project-skeleton-image"></div>
              <span class="skeleton skeleton-project-badge"></span>
            </div>

            <div class="project-content">
              <div class="skeleton skeleton-line long"></div>
              <div class="skeleton skeleton-line full"></div>
              <div class="skeleton skeleton-line medium"></div>

            </div>
          </article>
        `;
      })
      .join("");
  }
  // render category project
  function renderFilters() {
    const categoryMap = new Map();

    allProjects.forEach(function (project) {
      project.terms.forEach(function (term) {
        if (term.slug && term.name && !categoryMap.has(term.slug)) {
          categoryMap.set(term.slug, term.name);
        }
      });
    });

    let html = `
      <button class="project-filter-btn active" data-filter="all">
        Tất cả
      </button>
    `;

    categoryMap.forEach(function (name, slug) {
      html += `
        <button class="project-filter-btn" data-filter="${escapeHTML(slug)}">
          ${escapeHTML(name)}
        </button>
      `;
    });

    projectFilter.innerHTML = html;
  }

  projectFilter.addEventListener("click", function (event) {
    const button = event.target.closest(".project-filter-btn");

    if (!button) return;

    const buttons = projectFilter.querySelectorAll(".project-filter-btn");

    buttons.forEach(function (btn) {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    currentFilter = button.dataset.filter || "all";
    visibleCount = 6;

    renderProjects();
  });

  //  tạo nút "Xem thêm dự án" và xử lý sự kiện click để hiển thị thêm dự án khi người dùng yêu cầu.
  function createLoadMoreButton() {
    if (document.getElementById("projectLoadMore")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "project-load-more";
    wrapper.innerHTML = `
      <button type="button" id="projectLoadMore" class="project-load-more-btn">
        Xem thêm dự án
      </button>
    `;

    projectGrid.insertAdjacentElement("afterend", wrapper);

    document
      .getElementById("projectLoadMore")
      .addEventListener("click", function () {
        visibleCount += loadStep;
        renderProjects();
      });
  }
  // togle btn loadmore
  function toggleLoadMore(show) {
    const btn = document.getElementById("projectLoadMore");
    if (!btn) return;

    btn.style.display = show ? "inline-flex" : "none";
  }

  function renderProjectCard(project) {
    return `
      <article class="project-card" data-category="${escapeHTML(
        project.slugsString,
      )}">
        <a href="${project.detailUrl}" class="project-image">
          <img
            src="${project.image}"
            alt="${escapeHTML(project.titleText)}"
            loading="lazy"
            decoding="async"
          />
          <span>${escapeHTML(project.primaryTerm.name)}</span>
        </a>

        <a href="${project.detailUrl}" class="project-content">
          <h3>${project.titleHTML}</h3>
          <p>${escapeHTML(project.excerptText)}</p>
        </a>
      </article>
    `;
  }

  function renderProjects() {
    const filteredProjects = getFilteredProjects();
    const projectsToShow = filteredProjects.slice(0, visibleCount);

    if (!projectsToShow.length) {
      projectGrid.innerHTML = `
        <div class="project-empty">
          Chưa có dự án trong danh mục này.
        </div>
      `;

      toggleLoadMore(false);
      return;
    }

    projectGrid.innerHTML = projectsToShow.map(renderProjectCard).join("");

    toggleLoadMore(visibleCount < filteredProjects.length);
  }

  // render project
  async function initProjects() {
    try {
      renderSkeleton();

      const cached = readCache();

      if (cached && Array.isArray(cached.data)) {
        renderRawProjects(cached.data);
      }

      const freshProjects = await fetchFreshProjects();
      const freshSignature = getProjectSignature(freshProjects);

      if (!cached || cached.signature !== freshSignature) {
        saveCache(freshProjects);
        renderRawProjects(freshProjects);
      }
    } catch (error) {
      console.error(error);

      if (!allProjects.length) {
        projectGrid.innerHTML = `
        <div class="project-empty">
          Không tải được dữ liệu dự án. Vui lòng kiểm tra API.
        </div>
      `;
      }
    }
  }

  initProjects();
});
