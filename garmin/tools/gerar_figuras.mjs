// Converte as ilustrações do app web (web/lib/figures.ts) em PNG para o relógio, com cores para fundo preto,
// e gera o mapa chave -> recurso (garmin/source/Figuras.mc).
//
// Uso, na raiz do repositório (precisa do Playwright com Chromium):
//   node --experimental-strip-types garmin/tools/gerar_figuras.mjs
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { FIGURES } from "../../web/lib/figures.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = join(RAIZ, "resources", "drawables", "figuras");
// A figura tem duas poses lado a lado (início e fim). Renderiza com o dobro da largura e corta ao meio:
// cada pose fica com 200 px na tela de 260 px do Forerunner 955, uma embaixo da outra.
const LARGURA = 400;

const CSS = `
  html,body{margin:0;background:#000}
  svg{display:block;width:${LARGURA}px;height:auto}
  .i,.a{fill:none;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
  .i{stroke:#fff} .a{stroke:#ff5500}
  .e{fill:none;stroke:#888;stroke-width:3}
  .d{stroke:#ff5500;stroke-width:3;stroke-dasharray:10 8}
  .h{fill:#fff} .w{fill:#888}
  .p{fill:#ff5500;fill-opacity:.4;stroke:#ff5500;stroke-width:2}
  .x{fill:none;stroke:#ff0000;stroke-width:4}
  .t{fill:#fff;font:600 26px sans-serif;text-anchor:middle}
`;

const id = (k, n) => `fig_${k.replace(/-/g, "_")}_${n}`;

rmSync(PASTA, { recursive: true, force: true });
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const chaves = Object.keys(FIGURES).sort();
for (const k of chaves) {
  const f = FIGURES[k];
  await page.setContent(`<style>${CSS}</style><svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.viewBox}">${f.body}</svg>`);
  const box = await page.locator("svg").boundingBox();
  const meio = Math.round(box.width / 2);
  const h = Math.round(box.height);
  await page.screenshot({ path: join(PASTA, `${k}_1.png`), clip: { x: box.x, y: box.y, width: meio, height: h } });
  await page.screenshot({ path: join(PASTA, `${k}_2.png`), clip: { x: box.x + meio, y: box.y, width: Math.round(box.width) - meio, height: h } });
}
await browser.close();

writeFileSync(
  join(RAIZ, "resources", "drawables", "figuras.xml"),
  // packingFormat="png": guarda comprimido no app (são 316 imagens); poucas cores, sem pontilhado.
  "<drawables>\n" +
    chaves.flatMap((k) => [1, 2].map((n) => `    <bitmap id="${id(k, n)}" filename="figuras/${k}_${n}.png" dithering="none" packingFormat="png"/>`)).join("\n") +
    "\n</drawables>\n",
);

writeFileSync(
  join(RAIZ, "source", "Figuras.mc"),
  `// GERADO por garmin/tools/gerar_figuras.mjs. Não editar à mão.
import Toybox.Lang;
import Toybox.WatchUi;

// Ilustração (chave igual à do app web) -> [início, fim] como recursos do relógio. null se não houver.
function figuraDe(chave) {
    if (chave == null || chave.length() == 0) {
        return null;
    }
    var m = {
${chaves.map((k) => `        "${k}" => [Rez.Drawables.${id(k, 1)}, Rez.Drawables.${id(k, 2)}]`).join(",\n")}
    };
    return m.get(chave);
}
`,
);
console.log(`${chaves.length} figuras em ${PASTA}`);
