'use strict';
import * as vscode from 'vscode';
import { MarkdownHeaderIndexerParameter } from "./MarkdownHeaderIndexerParameter";

/**
 * Types of first level index.
 */
enum FirstLevelIndexType {
    /**
     * using uppercase alphabet, 'A' to 'Z'.
     */
    ALPHABET,
    /**
     * using Chinese numbers, from 1 to 20.
     */
    CHINESE,
    /**
     * using Roman numbers, from 1 to 20.
     */
    ROMAN,
    /**
     * using English numbers, from 1 to 20.
     */
    ENGLISH,
    /**
     * using customized numbers, at least provide 1 to 10.
     */
    CUSTOM,
    /**
     * indicate an error, used only when parsing parameters.
     */
    NONE,
    /**
     * the default setting, using digit number.
     */
    DEFAULT
}

/**
 * Line info for changed line.
 */
export class LineInfo {
    public lineNo = 0;
    public text = "";

    constructor(lineNo: number, text: string) {
        this.lineNo = lineNo;
        this.text = text;
    }
}

/**
 * main class for the markdown header index function.
 */
export class MarkdownHeaderIndexer {
    private readonly FIELD_SEPARATOR = "|";
    private readonly FIRST_LEVEL_INDEXES = [
        // The following order corresponds to FirstLevelIndexType.
        // FirstLevelIndexType.ALPHABET
        ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
            "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
            "U", "V", "W", "X", "Y", "Z"],
        // FirstLevelIndexType.CHINESE
        ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
            "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"],
        // FirstLevelIndexType.ROMAN
        ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
            "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"],
        // FirstLevelIndexType.ENGLISH
        ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"],
        // FirstLevelIndexType.CUSTOM
        // Leave empty if not customized.
        []
    ];

    // Number of '#" for the first level index, for example:
    // 1 means first level starting from '#'.
    // 2 means first level starting from '##' and '#' is ignored.
    // 3 means first level starting from '###', '#' and '##' are ignored.
    private levelBegin = 2;
    // Number of '#" for the last level index. Exceeding the value will be ignored.
    // 6 means only check index for max '######'.
    private levelEnd = 6;
    // The prefix of the first level index.
    private firstLevelPrefix = "";
    // The postfix of the first level index.
    private firstLevelPostfix = "";
    // Regex pattern for the first level index.
    private firstLevelPattern = "";
    // The prefix of all other level indexes.
    private otherLevelPrefix = "";
    // The postfix of all other level indexes.
    private otherLevelPostfix = "";
    // Regex pattern for all other level indexes.
    private otherLevelPattern = "";
    // Indicates what character the first level index uses.
    private firstLevelIndexType = FirstLevelIndexType.NONE;

    constructor(parameter: MarkdownHeaderIndexerParameter) {
        let ok = true;

        // The following loading sequence is changeable.
        ok = this.loadFirstLevelIndex(parameter) && ok;
        ok = this.loadLevelBeginAndEnd(parameter) && ok;
        ok = this.loadPrefixAndPostfix(parameter) && ok;

        if (!ok) {
            MarkdownHeaderIndexerParameter.save(parameter);
        }

        this.setIndexRegex();
    }

    /**
     * Show warning message.
     * 
     * @param message the message to show.
     */
    private showWarning(message: string) {
        vscode.window.showInformationMessage("WARNING: " + message);
    }

    /**
     * Load & verify levelBegin and levelEnd.
     * If the parameter is invalid, change it to the default value.
     * 
     * @param parameter the parameter object.
     * @returns true if parameter is valid, otherwise false.
     */
    private loadLevelBeginAndEnd(parameter: MarkdownHeaderIndexerParameter): boolean {
        if (parameter.levelEnd >= parameter.levelBegin && parameter.levelBegin > 0) {
            this.levelEnd = parameter.levelEnd;
            this.levelBegin = parameter.levelBegin;

            return true;
        } else {
            parameter.levelBegin = this.levelBegin;
            parameter.levelEnd = this.levelEnd;

            this.showWarning("Using default value: LevelBegin = " + this.levelBegin + ", LevelEnd = " +
                this.levelEnd + ".\nRequirement: LevelBegin > 0 && LevelEnd >= LevelBegin");

            return false;
        }
    }

    /**
     * Load & verify firstLevelPrefix, firstLevelPostfix, otherLevelPrefix and otherLevelPostfix.
     * If the parameter is invalid, change it to the default value.
     * 
     * @param parameter the parameter object.
     * @returns true if parameter is valid, otherwise false.
     */
    private loadPrefixAndPostfix(parameter: MarkdownHeaderIndexerParameter): boolean {
        let ok = false;
        let warning = "Invalid format for prefix and postfix.";
        const s = parameter.levelPrefixAndPostfix.trim();
        const strLength = s.length;

        // 4 values are enclosed and separated by '|', so 5 '|' are required.
        // Thus, the string length is no less than 5.
        // The first and last char must be '|'.
        if (s.indexOf(this.FIELD_SEPARATOR) === 0 &&
            s.lastIndexOf(this.FIELD_SEPARATOR) === strLength - 1) {

            const ss = s.split(this.FIELD_SEPARATOR);

            // There must be 6 split strings: 4 values, the first and last empty string.
            if (ss.length === 6) {
                const getString = (x: string, name: string, isPrefix: boolean) => {
                    const t = x.trim();

                    // Blank spaces are not allowed in prefix or postfix.
                    if (t.indexOf(" ") >= 0) {
                        ok = false;
                        warning += "\nBlank spaces are not allowed in " + name + ".";
                        // Return default value.
                        return "";
                    } else if (isPrefix) {
                        // Only one blank space is allowed after prefix.
                        let r = x.trimLeft();
                        return r.length > t.length ? t + " " : t;
                    } else {
                        // Only one blank space is allowed before postfix.
                        let r = x.trimRight();
                        return r.length > t.length ? " " + t : t;
                    }
                };

                // ok may be changed in getString().
                ok = true;

                // Skip the first and the last string.
                this.firstLevelPrefix = getString(ss[1], "first-level-prefix", true);
                this.firstLevelPostfix = getString(ss[2], "first-level-postfix", false);
                this.otherLevelPrefix = getString(ss[3], "other-level-prefix", true);
                this.otherLevelPostfix = getString(ss[4], "other-level-postfix", false);
            }
        }

        // The empty string is treated as default value.
        if (!ok && strLength > 0) {
            parameter.levelPrefixAndPostfix = this.FIELD_SEPARATOR + this.firstLevelPrefix +
                this.FIELD_SEPARATOR + this.firstLevelPostfix +
                this.FIELD_SEPARATOR + this.otherLevelPrefix +
                this.FIELD_SEPARATOR + this.otherLevelPostfix + this.FIELD_SEPARATOR;

            this.showWarning(warning);
        }

        return ok;
    }

    /**
     * Set regex pattern for index. The parameters must be initialized.
     */
    private setIndexRegex() {
        const replaceRegexChar = (x: string) => {
            let r = x;

            r = r.replace(/\\/g, "\\\\");
            r = r.replace(/\//g, "\\/");
            r = r.replace(/\</g, "\\<");
            r = r.replace(/\>/g, "\\>");
            r = r.replace(/\{/g, "\\{");
            r = r.replace(/\}/g, "\\}");
            r = r.replace(/\[/g, "\\[");
            r = r.replace(/\]/g, "\\]");
            r = r.replace(/\./g, "\\.");
            r = r.replace(/\,/g, "\\,");
            r = r.replace(/\$/g, "\\$");
            r = r.replace(/\^/g, "\\^");
            r = r.replace(/\*/g, "\\*");
            r = r.replace(/\+/g, "\\+");
            r = r.replace(/\-/g, "\\-");
            r = r.replace(/\?/g, "\\?");
            r = r.replace(/\:/g, "\\:");
            r = r.replace(/\=/g, "\\=");
            r = r.replace(/\!/g, "\\!");
            r = r.replace(/ /g, "\\s*");

            return r;
        };

        const createPrefixRegex = (x: string) => {
            return x.length === 0 ? "" : replaceRegexChar(x.trimRight()) + "\\s*";
        };

        const createPostfixRegex = (x: string) => {
            return x.length === 0 ? "" : "\\s*" + replaceRegexChar(x.trimLeft());
        };

        const createFirstLevelIndexRegex = () => {
            if (this.firstLevelIndexType === FirstLevelIndexType.DEFAULT) {
                return "\\d+";
            } else if (this.firstLevelIndexType !== FirstLevelIndexType.NONE) {
                const indexes = this.FIRST_LEVEL_INDEXES[this.firstLevelIndexType];
                // Should not use FIELD_SEPARATOR below because separator may be changed.
                return "(?:" + indexes.join("|") + ")";
            }
        };

        this.firstLevelPattern = "^(" +
            createPrefixRegex(this.firstLevelPrefix) + createFirstLevelIndexRegex() +
            createPostfixRegex(this.firstLevelPostfix) + ")(?:\\s*(.*))?";

        // otherLevelPattern will not be used when levelBegin equals to levelEnd.
        if (this.levelBegin < this.levelEnd) {
            this.otherLevelPattern = "^(" +
                createPrefixRegex(this.otherLevelPrefix) + "\\d+(?:\\.\\d+)*" +
                createPostfixRegex(this.otherLevelPostfix) + ")(?:\\s*(.*))?";
        }
    }

    /**
     * Load & verify customized first level index number.
     * If the parameter is invalid, change it to the default value.
     * 
     * @param parameter the parameter object.
     * @returns true if parameter is valid, otherwise false.
     */
    private loadFirstLevelIndex(parameter: MarkdownHeaderIndexerParameter): boolean {
        let warning = "Invalid format for firstLevelIndex.";
        let s = parameter.firstLevelIndex.trim();
        const strLength = s.length;
        const minCount = 10;

        // At least 1 to 10 must be provided for customized first level index. 
        // The the minium count of customized index number is 10.
        // All values are enclosed by '|', so string length must greater than or equal to 11.
        // The first and last char must be '|'.
        if (strLength >= minCount + 1 && s.indexOf(this.FIELD_SEPARATOR) === 0 &&
            s.lastIndexOf(this.FIELD_SEPARATOR) === strLength - 1) {
            // Remove the first and last '|', then split it.
            const ss = s.substr(1, strLength - 2).split(this.FIELD_SEPARATOR);

            if (ss.length < minCount) {
                warning += `\nAt least ${minCount} customized firstLevelIndex string must be provided.`;
            } else {
                this.firstLevelIndexType = FirstLevelIndexType.CUSTOM;

                for (let i = 0; i < ss.length; i++) {
                    const t = ss[i].trim();

                    if (t.indexOf(" ") >= 0) {
                        this.firstLevelIndexType = FirstLevelIndexType.NONE;
                        warning = `\nBlank spaces are not allowed in firstLevelIndex[${i}].`;
                        break;
                    } else {
                        ss[i] = t;
                    }
                }

                if (this.firstLevelIndexType === FirstLevelIndexType.CUSTOM) {
                    this.FIRST_LEVEL_INDEXES[FirstLevelIndexType.CUSTOM] = ss;
                }
            }
        } else {
            s = s.toUpperCase();

            // Empty or 'DEFAULT' means using default number for the first level index.
            if (strLength === 0 || s === FirstLevelIndexType[FirstLevelIndexType.DEFAULT]) {
                this.firstLevelIndexType = FirstLevelIndexType.DEFAULT;
            } else if (s === FirstLevelIndexType[FirstLevelIndexType.ALPHABET]) {
                this.firstLevelIndexType = FirstLevelIndexType.ALPHABET;
            } else if (s === FirstLevelIndexType[FirstLevelIndexType.CHINESE]) {
                this.firstLevelIndexType = FirstLevelIndexType.CHINESE;
            } else if (s === FirstLevelIndexType[FirstLevelIndexType.ROMAN]) {
                this.firstLevelIndexType = FirstLevelIndexType.ROMAN;
            } else if (s === FirstLevelIndexType[FirstLevelIndexType.ENGLISH]) {
                this.firstLevelIndexType = FirstLevelIndexType.ENGLISH;
            }
        }

        if (this.firstLevelIndexType === FirstLevelIndexType.NONE) {
            parameter.firstLevelIndex = "default";
            this.firstLevelIndexType = FirstLevelIndexType.DEFAULT;

            this.showWarning("FirstLevelIndex set to DEFAULT because \n" + warning);
            return false;
        }

        return true;
    }

    /**
     * Update or remove the given lines.
     * 
     * @param lines lines to be update or remove header index.
     * @param update true for updating or false for removing.
     * @returns the changed lines. 
     */
    public formatLines(lines: string[], update: boolean): LineInfo[] {
        const result: LineInfo[] = [];
        const levelOrder: number[] = new Array(this.levelEnd);
        let isInCodeArea = false;

        levelOrder.fill(0, 0, levelOrder.length);

        for (let i = 0; i < lines.length; i++) {
            // To simplify regex processing, add blank space at the end of line.
            const line = lines[i].trim() + " ";

            if (line.startsWith("```")) {
                isInCodeArea = !isInCodeArea;
            } else if (!isInCodeArea) {
                // Split the string into 3 parts：
                // 1. One or more consecutive '#'.
                // 2. One or more consecutive ' '.
                // 3. All remaining.
                // The first and third items are acquisition matching, 
                // and the second one is non acquisition matching. See regex below.
                let regex = new RegExp(/^(#+)\s+(.*)/g);
                let matches = regex.exec(line);

                // The line is not starting with '#' if result is null.
                if (matches) {
                    const mark = matches[1];
                    const level = mark.length;
                    let label = matches[2] ? matches[2].trim() : "";
                    let hasAction = true;
                    let doUpdate = false;

                    if (level > this.levelEnd || level < this.levelBegin) {
                        // Do nothing if the level is out of range.
                        hasAction = false;
                    } else if (level === this.levelBegin) {
                        regex = new RegExp(this.firstLevelPattern, "g");
                        doUpdate = update;
                    } else {
                        regex = new RegExp(this.otherLevelPattern, "g");
                        doUpdate = update;
                    }

                    if (hasAction) {
                        matches = regex.exec(label);

                        if (matches) {
                            // result[1] is the index, may be empty.
                            // And we are not using it.
                            label = matches[2] ? matches[2] : "";
                        }

                        const s = doUpdate ? this.updateIndex(mark, label, levelOrder) :
                            this.removeIndex(mark, label);

                        if (s !== lines[i]) {
                            // Only changed line will be added to the result.
                            result.push(new LineInfo(i, s));
                        }
                    }
                }
            }
        }

        return result;
    }

    /**
     * Go through given content, update or remove the header index.
     * 
     * @param text the content to update or remove the header index.
     * @param update true for updating or false for removing.
     * @returns the formatted content.
     */
    public formatText(text: string, update: boolean): string {
        const lines = text.split(/\r\n|\n/g);
        const changedLines = this.formatLines(lines, update);

        for (let i = 0; i < changedLines.length; i++) {
            lines[changedLines[i].lineNo] = changedLines[i].text;
        }

        return lines.join("\n");
    }

    /**
     * Update index for the given line.
     * 
     * @param mark the header mark.
     * @param label the content after the index.
     * @param levelOrder array of current index off all levels.
     */
    private updateIndex(mark: string, label: string, levelOrder: number[]): string {
        const level = mark.length - this.levelBegin;
        const order = levelOrder[level] + 1;
        levelOrder[level] = order;

        // Reset all following level orders to 0.
        levelOrder.fill(0, level + 1);

        // For first level, using default first level index first.
        let index = levelOrder[0].toString();
        // For all other levels.
        for (let i = 1; i <= level; i++) {
            index += "." + levelOrder[i];
        }

        // The first level is special.
        if (level === 0) {
            if (this.firstLevelIndexType !== FirstLevelIndexType.DEFAULT) {
                const indexes = this.FIRST_LEVEL_INDEXES[this.firstLevelIndexType];

                // Skip special number string when the order is too large.
                if (order <= indexes.length) {
                    index = indexes[order - 1];
                }
            }

            return mark + " " + this.firstLevelPrefix + index + this.firstLevelPostfix + " " + label;
        } else {
            return mark + " " + this.otherLevelPrefix + index + this.otherLevelPostfix + " " + label;
        }
    }

    /**
     * Remove index for the given line.
     * 
     * @param mark the header marker.
     * @param label the content after the index.
     */
    private removeIndex(mark: string, label: string): string {
        return mark + " " + label;
    }
}
