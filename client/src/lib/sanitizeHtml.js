import DOMPurify from "dompurify";

export default function sanitizeHtml(html = "") {
  const clean = DOMPurify.sanitize(String(html), {
    // allow common structure tags Quill/legacy content may have
    ALLOWED_TAGS: [
      "p","br","ul","ol","li","strong","em","u","s",
      "blockquote","code","pre",
      "h1","h2","h3","h4","h5","h6",
      "a","span","div","hr","img"
    ],
    // do NOT allow style; keep attributes you actually use
    ALLOWED_ATTR: ["href","target","rel","title","src","alt","width","height"],
    FORBID_TAGS: ["script","style","iframe","object","embed","form","input","button","video","audio"],
    // actively forbid style even if someone tries to slip it in
    FORBID_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
    // keep text content even if a wrapping tag gets removed
    KEEP_CONTENT: true,
  });

  // Post-process links & images
  const div = document.createElement("div");
  div.innerHTML = clean;

  // Only allow http(s), mailto, or in-page hashes for <a>
  for (const a of div.querySelectorAll("a")) {
    const href = (a.getAttribute("href") || "").trim();
    if (!/^https?:/i.test(href) && !/^mailto:/i.test(href) && !/^#/.test(href)) {
      a.removeAttribute("href");
    }
    if (a.getAttribute("target") === "_blank") {
      a.setAttribute("rel", "noopener noreferrer");
    }
  }

  // Allow only http(s) or your own uploads for <img>
  for (const img of div.querySelectorAll("img")) {
    const src = (img.getAttribute("src") || "").trim();
    if (!/^https?:/i.test(src) && !src.startsWith("/uploads")) {
      img.remove(); // drop unsafe images
      continue;
    }
    // prevent layout tricks
    img.removeAttribute("style");
  }

  return div.innerHTML;
}