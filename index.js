'use strict';

/**
 * Layout commands removed by default, with what each consumes after its name:
 * star (`*`), opt (`[...]`), args (number of `{...}`), glue (`1em plus 2pt`).
 * `n` is a stray "\n" (e.g. double-escaped JSON) – never the start of \nabla, \neq, ...
 */
const commands = (names, spec = {}) => names.split(' ').map((name) => [name, spec]);
const DEFAULT_COMMANDS = Object.fromEntries([
  ...commands(
    'bigskip medskip smallskip vfill hfill vfil hfil vfilll hfilll noindent indent par null ' +
      'centering raggedright raggedleft newpage clearpage cleardoublepage newline ' +
      'allowbreak goodbreak filbreak bigbreak medbreak smallbreak n'
  ),
  ...commands('pagebreak nopagebreak linebreak nolinebreak question', { opt: true }),
  ...commands('vspace hspace enlargethispage', { star: true, args: 1 }),
  ...commands('vskip hskip', { glue: true }),
]);

const MATH_ENVIRONMENTS = new Set(
  'math displaymath equation align alignat flalign gather multline eqnarray'
    .split(' ')
    .flatMap((name) => [name, `${name}*`])
);
const VERBATIM_ENVIRONMENTS = new Set(['verbatim', 'verbatim*', 'lstlisting', 'minted']);

const DIMEN = String.raw`[-+]?\s*(?:\d+(?:[.,]\d*)?|[.,]\d+)?\s*(?:pt|pc|in|bp|cm|mm|dd|cc|sp|em|ex|mu|true\s*pt|fil{1,3}|\\[a-zA-Z@]+)`;
const GLUE = new RegExp(String.raw`\s*${DIMEN}(?:\s*(?:plus|minus)\s*${DIMEN})*`, 'y');
const ENV_NAME = /\s*\{([a-zA-Z]+\*?)\}/y;
const EMPTY_GROUP = /\{\s*\}/y;
const SPACES = /[ \t\r]*(?:\n[ \t\r]*)?/y; // TeX never skips a blank line
const BLANK_LINE = /\n[ \t\r]*\n/y;
const LETTERS = /[a-zA-Z]+/y;

/** Index just past the match of sticky regex `re` at `at`, or -1. */
function matchAt(re, src, at) {
  re.lastIndex = at;
  return re.test(src) ? re.lastIndex : -1;
}

/** Index just past the `close` matching the `open` at `start`, or -1. */
function skipGroup(src, start, open = '{', close = '}') {
  for (let k = start, depth = 0; k < src.length; k++) {
    switch (src[k]) {
      case '\\': k++; break;
      case open: depth++; break;
      case close: if (--depth === 0) return k + 1;
    }
  }
  return -1;
}

/** Index after the arguments of a removed command. */
function skipArguments(src, j, { star, opt, args = 0, glue }) {
  if (star && src[j] === '*') j++;
  const group = (open, close) => {
    const k = matchAt(SPACES, src, j);
    const end = src[k] === open ? skipGroup(src, k, open, close) : -1;
    if (end !== -1) j = end;
    return end !== -1;
  };
  if (opt) group('[', ']');
  for (let a = 0; a < args && group('{', '}'); a++);
  if (glue) j = Math.max(j, matchAt(GLUE, src, j));
  else if (!args) j = Math.max(j, matchAt(EMPTY_GROUP, src, j)); // `\newpage{}`
  return j;
}

/**
 * Index just past the closing math delimiter, or -1 when unmatched.
 * Skips escapes (\$, \\) and ignores `$` inside braces (`$\text{if $x$}$`).
 * Inline math cannot span a blank line.
 */
function findMathEnd(src, start, close, inline = false) {
  for (let k = start, depth = 0; k < src.length; k++) {
    if (src.startsWith(close, k) && (close[0] === '\\' || depth === 0)) return k + close.length;
    switch (src[k]) {
      case '\\': k++; break;
      case '{': depth++; break;
      case '}': depth = Math.max(0, depth - 1); break;
      case '\n': if (inline && matchAt(BLANK_LINE, src, k) !== -1) return -1;
    }
  }
  return -1;
}

/** Removes `%` comments with the line break and indentation they swallow; keeps `\%`. */
const stripComments = (src) => src.replace(/(\\[\s\S])|%[^\n]*\n?[ \t]*/g, (m, escaped) => escaped || '');

class LatexCleaner {
  /**
   * @param {string|object} [text=""] default text for clean(), or the options object
   * @param {object} [options]
   * @param {boolean} [options.preserveMath=true] keep math untouched (whitespace is still collapsed)
   * @param {boolean} [options.stripComments=false] remove `%` comments (PDF text often has literal "%")
   * @param {Array<string|{name, star?, opt?, args?, glue?}>} [options.removeCommands] extra commands
   * @param {string[]} [options.keepCommands] default commands that should NOT be removed
   */
  constructor(text = '', options = {}) {
    if (text !== null && typeof text === 'object' && !(text instanceof String)) [text, options] = ['', text];
    this.text = text;
    this.options = {
      preserveMath: options.preserveMath !== false,
      stripComments: options.stripComments === true,
    };

    const bare = (name) => String(name).replace(/^\\/, '');
    this.commands = new Map(Object.entries(DEFAULT_COMMANDS));
    for (const name of options.keepCommands || []) this.commands.delete(bare(name));
    for (const cmd of options.removeCommands || []) {
      const spec = typeof cmd === 'string' ? { name: cmd } : cmd;
      if (spec?.name) this.commands.set(bare(spec.name), spec);
    }
  }

  clean(inputText) {
    let target = inputText === undefined ? this.text : inputText;
    if (target instanceof String) target = target.valueOf();
    if (!target || typeof target !== 'string') return '';
    if (this.options.stripComments) target = stripComments(target);

    // a single left-to-right pass, so `\\` and `\cmd` can never overlap
    let out = '';
    for (let i = 0; i < target.length; ) {
      const [text, end] = this._token(target, i);
      out += text;
      i = end;
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  /** Reads one token at `i`; returns [output text, index after the token]. */
  _token(src, i) {
    const { preserveMath } = this.options;
    const next = src[i + 1];
    const keep = (end) => [src.slice(i, end), end];

    if (src[i] === '$' && preserveMath) {
      const delim = next === '$' ? '$$' : '$';
      const end = findMathEnd(src, i + delim.length, delim, delim === '$');
      return keep(end === -1 ? i + delim.length : end); // unmatched: literal dollar sign
    }
    if (src[i] !== '\\' || next === undefined) return keep(i + 1);
    if (/[a-zA-Z]/.test(next)) return this._controlWord(src, i);

    switch (next) {
      case '\\': { // line break: \\  \\*  \\[2mm]
        let j = i + (src[i + 2] === '*' ? 3 : 2);
        if (src[j] === '[') j = Math.max(j, skipGroup(src, j, '[', ']'));
        return [' ', j];
      }
      case '(':
      case '[': { // \( ... \)  and  \[ ... \]
        const end = preserveMath ? findMathEnd(src, i + 2, next === '(' ? '\\)' : '\\]') : -1;
        if (end !== -1) return keep(end);
      }
      // falls through
      default: // other control symbols (\$, \%, \{, \ ) are kept
        return keep(i + 2);
    }
  }

  /** Handles `\name` at `i`: protected environments, \verb, removed commands. */
  _controlWord(src, i) {
    const j = matchAt(LETTERS, src, i + 1);
    const name = src.slice(i + 1, j);
    const keep = (end) => [src.slice(i, end), end];

    switch (name) {
      case 'begin': {
        ENV_NAME.lastIndex = j;
        const env = ENV_NAME.exec(src)?.[1];
        if (VERBATIM_ENVIRONMENTS.has(env) || (this.options.preserveMath && MATH_ENVIRONMENTS.has(env))) {
          const endTag = `\\end{${env}}`;
          const end = src.indexOf(endTag, ENV_NAME.lastIndex);
          if (end !== -1) return keep(end + endTag.length);
        }
        break;
      }
      case 'verb': { // \verb|...|  \verb*|...|
        const d = src[j] === '*' ? j + 1 : j;
        const end = /^[^a-zA-Z\s]$/.test(src[d]) ? src.indexOf(src[d], d + 1) : -1;
        if (end !== -1) return keep(end + 1);
        break;
      }
    }

    const spec = this.commands.get(name);
    return spec ? [' ', skipArguments(src, j, spec)] : keep(j);
  }
}

const clean = (text, options) => new LatexCleaner('', options).clean(text);

// `require('@jamesyhr/latex-cleaner')(text)` (pre-0.1.0 API) keeps working too.
module.exports = clean;
module.exports.clean = clean;
module.exports.LatexCleaner = LatexCleaner;
module.exports.DEFAULT_COMMANDS = DEFAULT_COMMANDS;
