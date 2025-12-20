class LatexCleaner {
    constructor(text="") {
        this.text = text;
    }
    clean(inputText) {
        const target = inputText !== undefined ? inputText : this.text;

        if (!target || typeof target !== "string") return "";

        return target
          .replace(
            /\\(noindent|bigskip|medskip|smallskip|newpage|vfill|null|hfill|n|pagebreak|question)/g,
            ""
          )
          .replace(/[\t\r\n]/g, "")
          .replace(/\\\\/g, " ")
          .replace(/\s+/g, " ")
          .trim();
    }
}

const clean = (text) => new LatexCleaner().clean(text);

module.exports = {
  clean: clean,
  LatexCleaner: LatexCleaner
};
