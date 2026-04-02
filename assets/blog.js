const enhanceCopyLink = () => {
  const buttons = document.querySelectorAll("[data-copy-link]");
  for (const button of buttons) {
    const originalLabel = button.textContent;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        button.textContent = "Link copiado";
        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1600);
      } catch {
        button.textContent = "Copie pela barra do navegador";
        window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1800);
      }
    });
  }
};

const loadAsciiMath = () => {
  if (document.body.dataset.hasMath !== "true") {
    return;
  }

  const scriptUrl = document.querySelector('meta[name="x-asciimath-script"]')?.content;
  const inlineDelimiter = document.querySelector('meta[name="x-asciimath-inline"]')?.content ?? "%%";
  const blockDelimiter = document.querySelector('meta[name="x-asciimath-block"]')?.content ?? "%%%";

  if (!scriptUrl) {
    return;
  }

  window.MathJax = {
    loader: {
      load: ["input/asciimath", "output/chtml"],
    },
    asciimath: {
      delimiters: [
        [inlineDelimiter, inlineDelimiter],
        [blockDelimiter, blockDelimiter],
      ],
    },
    startup: {
      typeset: true,
    },
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = scriptUrl;
  document.head.append(script);
};

document.addEventListener("DOMContentLoaded", () => {
  enhanceCopyLink();
  loadAsciiMath();
});
