document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("botao-menu") || document.getElementById("navToggle");
  const navMenu = document.getElementById("menu") || document.getElementById("navMenu");

  if (!navToggle || !navMenu) return;

  const fechar = document.getElementById("botao-fechar");
  const fundo = document.getElementById("fundo-menu");
  const mobile = window.matchMedia("(max-width: 991.98px)");
  const classeMenu = navMenu.id === "menu" ? "aberto" : "is-open";
  const classeBotao = navMenu.id === "menu" ? "aberto" : "is-active";

  function alternar(abrir, devolverFoco = true) {
    abrir = abrir && mobile.matches;
    navMenu.classList.toggle(classeMenu, abrir);
    navToggle.classList.toggle(classeBotao, abrir);
    navToggle.setAttribute("aria-expanded", String(abrir));
    if (fundo) fundo.classList.toggle("aberto", abrir);
    document.body.classList.toggle("menu-aberto", abrir);
    navMenu.inert = mobile.matches && !abrir;
    if (abrir) (fechar || navMenu.querySelector("a"))?.focus();
    else if (devolverFoco && mobile.matches) navToggle.focus();
  }

  navToggle.addEventListener("click", () => alternar(!navMenu.classList.contains(classeMenu)));
  if (fechar) fechar.addEventListener("click", () => alternar(false));
  if (fundo) fundo.addEventListener("click", () => alternar(false));

  navMenu.querySelectorAll(".menu-link, .botao-login, .botao-cadastro, .nav-link, .nav-auth a").forEach((link) => {
    link.addEventListener("click", () => alternar(false, false));
  });

  document.addEventListener("keydown", (evento) => {
    if (!mobile.matches || !navMenu.classList.contains(classeMenu)) return;
    if (evento.key === "Escape") alternar(false);
    if (evento.key !== "Tab") return;
    const focaveis = [...navMenu.querySelectorAll("a[href], button:not([disabled])")].filter(el => el.getClientRects().length);
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault(); ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault(); primeiro.focus();
    }
  });

  document.querySelectorAll(".toggle-senha[role=\"button\"]").forEach((controle) => {
    controle.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      controle.click();
      controle.focus();
    });
  });

  mobile.addEventListener("change", () => alternar(false, false));
  alternar(false, false);
});