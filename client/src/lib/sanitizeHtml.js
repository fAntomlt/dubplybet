import DOMPurify from "dompurify";

export default function sanitizeHtml(html = "") {
  const clean = DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: [
      "p","br","ul","ol","li","strong","em","u","s",
      "blockquote","code","pre","h1","h2","h3","a","span"
    ],
    ALLOWED_ATTR: ["href","target","rel","style"],
    FORBID_TAGS: ["script","style","iframe","object","embed","form","input","button","video","audio"],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
  });

  // Post-process anchors: only http(s), mailto, or in-page #hash
  const div = document.createElement("div");
  div.innerHTML = clean;
  for (const a of div.querySelectorAll("a")) {
    const href = (a.getAttribute("href") || "").trim();
    if (!/^https?:/i.test(href) && !/^mailto:/i.test(href) && !/^#/.test(href)) {
      a.removeAttribute("href");
    }
    if (a.getAttribute("target") === "_blank") {
      a.setAttribute("rel", "noopener noreferrer");
    }
  }
  return div.innerHTML;
}
