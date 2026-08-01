const navbar = document.querySelector("#navbar");
const toggle = document.querySelector(".nav-hamburger");

if (navbar && toggle) {
  toggle.addEventListener("click", function () {
    const open = navbar.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  navbar.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      navbar.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

for (const node of document.querySelectorAll("[data-year]")) {
  node.textContent = new Date().getFullYear();
}
