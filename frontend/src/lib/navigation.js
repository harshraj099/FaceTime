export const BASE_URL = (
  import.meta.env.VITE_BASE_URL || window.location.origin
).replace(/\/$/, '');

// Navigates in-app for links to this site (e.g. pasted meeting links), otherwise leaves the app
export const navigateToLink = (navigate, link) => {
  try {
    const url = new URL(link, window.location.origin);

    if (url.origin === window.location.origin || url.origin === BASE_URL) {
      navigate(`${url.pathname}${url.search}`);
    } else {
      window.location.assign(url.href);
    }
  } catch {
    navigate(link);
  }
};
