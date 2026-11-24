# fullpage-shot

One tall screenshot of an entire page — **including** the content hidden
inside scrollable sub-regions.

Most "full page screenshot" tools only capture the main document. If a page
keeps part of its content in an inner scrollable box (a long list in a
fixed-height panel, a wide table in an `overflow: auto` div, …), that
content is silently clipped: the screenshot shows only the rows that were
visible inside the box, and the rest is lost.

`fullpage-shot` fixes that. Before taking the shot it expands every
internally scrollable element to its full content size, then captures the
whole page as a single PNG.

## How it works

`fullpage-shot` is a thin wrapper around
[shot-scraper](https://github.com/simonw/shot-scraper) by Simon Willison.
It runs shot-scraper with no fixed height (so shot-scraper captures the
full page length) and with [`expand-scrollables.js`](expand-scrollables.js)
injected via `--js-file` just before the shot. That script:

1. Scrolls through the document once and back to the top, so lazy-loaded
   content renders.
2. Finds every element whose `scrollHeight` exceeds its `clientHeight`
   (or whose `scrollWidth` exceeds its `clientWidth`) and expands it to
   its full content size by overriding `height` / `width` / `max-height` /
   `max-width` / `overflow`. This repeats a few times, because expanding
   one region can reveal nested scrollable regions.
3. Un-clips the expanded elements' ancestors, so content trapped inside a
   fixed-height app shell or a modal overlay is not cut off either:
   clipping ancestors get `overflow: visible` and `height: auto`, and
   `position: fixed` ancestors are switched to absolute positioning so
   the expanded content joins the document's overflow area.
4. Waits briefly for the browser to re-layout and paint.

## Requirements

- Python 3.10+
- [shot-scraper](https://shot-scraper.datasette.io/) (which drives a
  Playwright Chromium)

## Install

```bash
git clone https://github.com/5himq/fullpage-shot.git
cd fullpage-shot
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/shot-scraper install   # downloads the browser
```

## Usage

```bash
./fullpage-shot https://example.com -o example.png
```

Options:

| Option | Meaning |
| --- | --- |
| `-o, --output` | Output image file (required) |
| `--width` | Browser window width in pixels (default: 1280) |
| `--wait MS` | Extra wait after page load, in milliseconds — useful for heavy single-page apps |
| `--shot-arg ARG` | Pass an extra argument through to shot-scraper (repeatable; use the `--shot-arg=--flag` form for values that start with `--`) |

The URL may also be a path to a local HTML file.

Passing extra shot-scraper options through, e.g. a proxy and relaxed
certificate checks for a specific environment:

```bash
./fullpage-shot https://example.com -o example.png \
    --shot-arg=--browser-arg --shot-arg="--proxy-server=http://127.0.0.1:8080" \
    --shot-arg=--browser-arg --shot-arg="--ignore-certificate-errors"
```

## Test fixture

`tests/fixture.html` is a self-check page: a tall document with an inner
scroll box holding 30 rows, of which only about 6 are visible before
expansion.

```bash
./fullpage-shot tests/fixture.html -o tests/fixture-fullpage.png --width 1000
```

`tests/fixture-fullpage.png` shows all 30 rows and the page footer;
`tests/fixture-baseline.png` is the same page captured with plain
shot-scraper (no expansion), where rows 7–30 are missing.

## Limitations

- Expanding scrollable regions intentionally changes the page layout —
  that is the point of the tool — so the result is a faithful *content*
  record, not a pixel-perfect record of the interactive layout.
- Extremely tall pages can hit Chromium's maximum texture/canvas height
  (around 16,384 px at scale factor 1); such pages come out truncated.
- Content inside cross-origin iframes is captured only as rendered in the
  frame's own box; the script cannot expand scrollable elements inside a
  cross-origin frame.
- Pages that require interaction (login flows, clicking through a wizard)
  before the content exists cannot be captured beyond what loads
  automatically; consider shot-scraper's own authentication options for
  those.
- Virtualized lists that only render rows near the viewport (even inside
  an expanded container) may still be incomplete.

## Credits

Built on top of [shot-scraper](https://github.com/simonw/shot-scraper)
(Apache License 2.0) by Simon Willison — documentation at
<https://shot-scraper.datasette.io/>. This wrapper and the expansion
script are MIT licensed (see [LICENSE](LICENSE)).

---

## 日本語の説明

ページ全体を1枚の長いスクショで撮るためのツールです。本文だけでなく、
**ページ内にあるスクロール領域の中身まで**写します。

多くの「フルページスクショ」ツールは本文全体は撮れても、固定の高さの
パネル内リストや `overflow: auto` の表など、内側のスクロール箱の中身は
見えている数行分しか写らず、残りが欠けてしまいます。`fullpage-shot` は
撮影前にスクロール可能な要素をすべて中身全体の高さ・幅まで広げてから、
ページ全体を1枚の PNG にします。

仕組みは、Simon Willison 氏の
[shot-scraper](https://github.com/simonw/shot-scraper) のラッパーです。
高さを指定せず（＝ページ全長）にし、撮影直前に
`expand-scrollables.js` を注入します。このスクリプトは、遅延読み込み
対策として一度ページ末尾までスクロールし、次に `scrollHeight` が
`clientHeight` を超える要素（内側スクロール要素）をすべて検出して
高さ・幅を中身全体まで広げます。さらに、広げた要素の祖先が固定高さの
アプリシェルやモーダルで切り取らないよう、祖先側の `overflow` と高さの
制限も外し、`position: fixed` の祖先は absolute に切り替えて、内容が
ドキュメント全体の1枚に収まるようにしてから再描画を待ちます。

使い方:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/shot-scraper install
./fullpage-shot https://example.com -o example.png
```

制限事項は英語版の Limitations を参照してください。特に、非常に縦に
長いページでは Chromium の上限（約16,384px）で切れること、他オリジン
の iframe 内部は広げられないこと、仮想リスト（表示範囲だけ描画する
リスト）は完全には写らないことがあります。
