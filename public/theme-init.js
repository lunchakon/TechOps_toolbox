// Applies the saved theme before first paint. Kept as an external file so the CSP can forbid inline scripts.
(function () {
  try {
    var saved = localStorage.getItem('techops.theme')
    var dark = saved === 'dark' || ((saved === null || saved === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.classList.add('dark')
  } catch (e) {
    /* storage unavailable: fall back to light */
  }
})()
