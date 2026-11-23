'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cleanDefault = require('./index.js');
const { clean, LatexCleaner } = require('./index.js');

const r = String.raw;

test('existing README examples still work', () => {
  assert.equal(new LatexCleaner().clean('\\noindent Hello \\\\ World \t \\bigskip'), 'Hello World');
  assert.equal(clean(r`Problem 1 \bigskip Solve: $x^2 + y^2 = 1$ \newpage`), 'Problem 1 Solve: $x^2 + y^2 = 1$');
  assert.equal(cleanDefault(r`A \newpage B`), 'A B'); // pre-0.1.0 default export
});

test('invalid input returns an empty string', () => {
  for (const v of [undefined, null, '', 0, 42, {}, [], true]) assert.equal(clean(v), '');
  assert.equal(clean(new String(r`a \bigskip b`)), 'a b');
});

test('constructor default text and options object', () => {
  assert.equal(new LatexCleaner(r`x \medskip y`).clean(), 'x y');
  assert.equal(new LatexCleaner(r`x \medskip y`).clean('other'), 'other');
  assert.equal(new LatexCleaner({ keepCommands: ['medskip'] }).clean(r`x \medskip y`), r`x \medskip y`);
});

test('does not eat the prefix of longer commands', () => {
  assert.equal(clean(r`$\nabla f \neq 0$, $\nu$`), r`$\nabla f \neq 0$, $\nu$`);
  assert.equal(clean(r`\newcommand{\R}{\mathbb{R}}`), r`\newcommand{\R}{\mathbb{R}}`);
  assert.equal(clean(r`a \hfilll b \nullspace`), r`a b \nullspace`);
  assert.equal(clean(r`\questions`), r`\questions`);
  assert.equal(clean(r`\nabla \not\in \notin`), r`\nabla \not\in \notin`);
});

test('stray \\n is still removed when it is not part of a longer command', () => {
  assert.equal(clean(r`Problem 1\n Solve`), 'Problem 1 Solve');
  assert.equal(clean(r`end\n`), 'end');
  assert.equal(clean(r`a\n1`), 'a 1');
});

test('real newlines/tabs become spaces instead of joining words', () => {
  assert.equal(clean('Hello\nWorld'), 'Hello World');
  assert.equal(clean('a\r\nb\tc\fd'), 'a b c d');
  assert.equal(clean('  \n\t  '), '');
});

test('\\\\ followed by a letter is a line break, not a command', () => {
  assert.equal(clean(r`a\\noindent b`), 'a noindent b');
  assert.equal(clean(r`a\\newpage b`), 'a newpage b');
  assert.equal(clean(r`a\\nabla`), 'a nabla');
});

test('line break variants', () => {
  assert.equal(clean(r`line\\[2mm] next`), 'line next');
  assert.equal(clean(r`line\\*next`), 'line next');
  assert.equal(clean(r`line\\*[1ex]next`), 'line next');
  assert.equal(clean(r`a\\\\b`), 'a b');
  assert.equal(clean(r`a \newline b`), 'a b');
});

test('commands with arguments are removed together with their arguments', () => {
  assert.equal(clean(r`\vspace{1cm} Text`), 'Text');
  assert.equal(clean(r`\vspace*{\baselineskip} Text`), 'Text');
  assert.equal(clean(r`a\hspace{2em}b`), 'a b');
  assert.equal(clean(r`\vskip 1em plus 2pt minus 1pt Text`), 'Text');
  assert.equal(clean(r`\vskip\baselineskip Text`), 'Text');
  assert.equal(clean(r`\hskip -3.5pt x`), 'x');
  assert.equal(clean(r`\pagebreak[4] x \linebreak [2] y`), 'x y');
  assert.equal(clean(r`\question[5] What is $2+2$?`), 'What is $2+2$?');
  assert.equal(clean(r`\newpage{}Next`), 'Next');
  assert.equal(clean(r`\enlargethispage*{2\baselineskip}x`), 'x');
});

test('unterminated arguments do not swallow the rest of the text', () => {
  assert.equal(clean(r`\vspace{1cm text`), '{1cm text');
  assert.equal(clean(r`\question[5 text`), '[5 text');
});

test('adjacent removed commands do not glue words together', () => {
  assert.equal(clean(r`word\hfill word2`), 'word word2');
  assert.equal(clean(r`a\bigskip\newpage\vfill b`), 'a b');
});

test('math is preserved, including \\\\ inside matrices and aligned blocks', () => {
  const m = r`$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$`;
  assert.equal(clean(m), m);
  assert.equal(clean(r`$$a \\ b$$`), r`$$a \\ b$$`);
  assert.equal(clean(r`\[ a \\ b \]`), r`\[ a \\ b \]`);
  assert.equal(clean(r`\( x \\ y \)`), r`\( x \\ y \)`);
  assert.equal(
    clean('\\begin{align*}\n  x &= 1 \\\\\n  y &= 2\n\\end{align*}'),
    r`\begin{align*} x &= 1 \\ y &= 2 \end{align*}`
  );
  assert.equal(clean(r`$\text{if $x>0$}$ \bigskip ok`), r`$\text{if $x>0$}$ ok`);
});

test('math whitespace is collapsed', () => {
  assert.equal(clean('$a\n+\tb$'), '$a + b$');
});

test('dollar signs that are not math', () => {
  assert.equal(clean(r`costs \$5 \bigskip`), r`costs \$5`);
  assert.equal(clean(r`$5 \bigskip`), '$5');
  assert.equal(clean('$5 now\n\nlater $6 \\bigskip'), '$5 now later $6');
});

test('preserveMath: false treats math like text', () => {
  assert.equal(clean(r`$a \\ b$`, { preserveMath: false }), '$a b$');
});

test('verbatim content is protected', () => {
  assert.equal(clean(r`see \verb|\newpage| here`), r`see \verb|\newpage| here`);
  assert.equal(
    clean(r`\begin{verbatim}\bigskip\end{verbatim}`),
    r`\begin{verbatim}\bigskip\end{verbatim}`
  );
});

test('comments are kept by default and stripped on request', () => {
  assert.equal(clean('50% off'), '50% off');
  assert.equal(clean('a % note\n  b \\% c', { stripComments: true }), 'a b \\% c');
  assert.equal(clean('a\\\\% note\nb', { stripComments: true }), 'a b');
});

test('custom commands', () => {
  const cleaner = new LatexCleaner({
    removeCommands: ['\\clearpage', 'myskip', { name: 'mybox', args: 1 }],
  });
  assert.equal(cleaner.clean(r`a \myskip b \mybox{x} c`), 'a b c');
});

test('other control symbols and edge characters are kept', () => {
  assert.equal(clean(r`50\% and \{x\} and \&`), r`50\% and \{x\} and \&`);
  assert.equal(clean('trailing \\'), 'trailing \\');
});
