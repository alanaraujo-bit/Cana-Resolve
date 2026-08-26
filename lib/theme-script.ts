/** Roda antes da primeira pintura, no <head>: sem piscada de tema. */
export const THEME_KEY = "cr-theme";

export const themeScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");document.documentElement.setAttribute("data-theme-pref",p);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
