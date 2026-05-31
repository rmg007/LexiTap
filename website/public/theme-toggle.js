// Dark/light toggle. Defaults to system pref; user choice persists in localStorage.
// Set early (in <head>) to avoid a flash of the wrong theme.
(function () {
  var KEY = "lexitap-theme";
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function apply(theme) {
    // No data-theme attr => CSS follows prefers-color-scheme automatically.
    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }
  function current() {
    var s = stored();
    if (s) return s;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  // Apply ASAP.
  apply(stored());

  // Wire up the button once the DOM is ready.
  function init() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    function render() {
      var isLight = current() === "light";
      btn.textContent = isLight ? "☽" : "☀"; // moon when light-active toggles to dark, sun otherwise
      btn.setAttribute("aria-label", "Switch to " + (isLight ? "dark" : "light") + " theme");
    }
    btn.addEventListener("click", function () {
      var next = current() === "light" ? "dark" : "light";
      try { localStorage.setItem(KEY, next); } catch (e) {}
      apply(next);
      render();
    });
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
