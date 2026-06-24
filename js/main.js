const handleToggleAccordion = () => {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
      faqItems.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.classList.remove("active");
        }
      });

      item.classList.toggle("active");
    });
  });
};

const handleSubmitForm = async () => {
  const form = document.getElementById("leadForm");
  const formMessage = document.getElementById("formMessage");
  const GOOGLE_SHEET_API =
    "https://script.google.com/macros/s/AKfycbzkAFf7skyBVF4lSX6yOQlA1L5zKe0qP-K_fboBkwSBD-IAjMKLj3ILXaNVOe4Gbe8o/exec";

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang gửi...";
        /* Lấy dữ liệu form */
        const data = Object.fromEntries(new FormData(form).entries());
        /* Thêm dữ liệu phụ */
        data.source = "Website Solar Green Energy Solutions";
        data.time = new Date().toLocaleString("vi-VN");
        /* DEBUG */
        console.log(data);
        /* Convert sang URLSearchParams */
        // const body = new URLSearchParams(data);
        /* Send API */
        await fetch(GOOGLE_SHEET_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "no-cors",
          body: JSON.stringify(data),
        });
        formMessage.textContent =
          "Gửi thông tin thành công. Chúng tôi sẽ liên hệ sớm.";
        formMessage.className = "form-message success";
        form.reset();
      } catch (error) {
        console.error("Lỗi gửi form:", error);
        formMessage.textContent = "Không gửi được thông tin. Vui lòng thử lại.";
        formMessage.className = "form-message error";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Nhận tư vấn miễn phí";
      }
    });
  }
};

handleToggleAccordion();
handleSubmitForm();
