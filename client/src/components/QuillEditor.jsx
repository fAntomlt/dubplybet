// components/QuillEditor.jsx
import { useEffect, useRef } from "react";
import Quill from "quill";

// --- Force LTR-only direction & left align ---
const Direction = Quill.import("attributors/attribute/direction");
Direction.whitelist = ["ltr"];
Quill.register(Direction, true);

const Align = Quill.import("attributors/class/align");
Align.whitelist = ["left"];
Quill.register(Align, true);

try {
  const AlignStyle = Quill.import("attributors/style/align");
  AlignStyle.whitelist = ["left"];
  Quill.register(AlignStyle, true);
} catch { /* optional */ }

// Remove hidden bidi control characters
function stripBidi(str = "") {
  return String(str).replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g, "");
}

export default function QuillEditor({ value, onChange, modules, placeholder }) {
  const wrapperRef = useRef(null);
  const quillRef = useRef(null);

  // Track last HTML we emitted so we can ignore our own echo
  const lastSentHtmlRef = useRef("");
  const isEmittingRef = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Reset StrictMode leftovers
    wrapper.innerHTML = "";

    // Make containers LTR
    wrapper.setAttribute("dir", "ltr");
    wrapper.style.direction = "ltr";
    wrapper.style.textAlign = "left";

    const container = document.createElement("div");
    container.setAttribute("dir", "ltr");
    container.style.direction = "ltr";
    container.style.textAlign = "left";
    wrapper.appendChild(container);

    // Init Quill (ONE TIME)
    const q = new Quill(container, { theme: "snow", modules, placeholder });
    quillRef.current = q;

    // Inner editable LTR + safer bidi behavior
    const editorEl = container.querySelector(".ql-editor");
    if (editorEl) {
      editorEl.setAttribute("dir", "ltr");
      editorEl.style.direction = "ltr";
      editorEl.style.textAlign = "left";
      editorEl.style.unicodeBidi = "plaintext";
    }

    // Initial content (once)
    if (value) {
      q.clipboard.dangerouslyPasteHTML(stripBidi(value));
      q.formatLine(0, q.getLength(), { direction: "ltr", align: "left" }, "silent");
    }

    // Sanitize pasted content
    q.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
      const Ctor = delta.constructor;
      return new Ctor(
        delta.ops.map(op => {
          const next = { ...op };
          if (next.attributes) {
            const a = { ...next.attributes };
            delete a.direction;
            delete a.align;
            next.attributes = a;
          }
          if (typeof next.insert === "string") next.insert = stripBidi(next.insert);
          return next;
        })
      );
    });
    q.clipboard.addMatcher(Node.TEXT_NODE, (node, delta) => {
      const Ctor = delta.constructor;
      return new Ctor(
        delta.ops.map(op =>
          typeof op.insert === "string" ? { ...op, insert: stripBidi(op.insert) } : op
        )
      );
    });

    // On change: emit HTML/Delta — DO NOT move caret
    const handleChange = () => {
      const html = q.root.innerHTML;
      lastSentHtmlRef.current = html;
      isEmittingRef.current = true;
      onChange?.(html, q.getContents());
      // allow parent render to complete; then accept external updates again
      setTimeout(() => { isEmittingRef.current = false; }, 0);
    };
    q.on("text-change", handleChange);

    return () => {
      q.off("text-change", handleChange);
      quillRef.current = null;
      wrapper.innerHTML = "";
    };
    // IMPORTANT: init once only
  }, []); // <-- no modules/placeholder here

  // External value sync without stealing the caret
  useEffect(() => {
    const q = quillRef.current;
    if (!q) return;

    // If this update is just our own echo, ignore
    if (isEmittingRef.current || value === lastSentHtmlRef.current) return;

    const incoming = stripBidi(value || "");
    // Only re-paste if actually different (avoid nuking selection)
    if ((q.root.innerHTML || "") !== incoming) {
      const sel = q.getSelection();
      const index = sel ? sel.index : null;

      q.root.innerHTML = "";
      q.clipboard.dangerouslyPasteHTML(incoming);
      q.formatLine(0, q.getLength(), { direction: "ltr", align: "left" }, "silent");

      if (index != null) {
        const max = Math.max(0, q.getLength() - 1);
        q.setSelection(Math.min(index, max), 0, "silent");
      }
    }
  }, [value]);

  return <div ref={wrapperRef} />;
}