'use strict';
import { workspace } from "vscode";
import * as vscode from 'vscode';

/**
 * represent configuration parameter for Markdown Header Indexer.
 */
export class MarkdownHeaderIndexerParameter {
    public levelBegin = 2;
    public levelEnd = 6;
    public levelPrefixAndPostfix = "";
    public firstLevelIndex = "";

    public static load(): MarkdownHeaderIndexerParameter {
        const parameter = new MarkdownHeaderIndexerParameter();
        const configuration = workspace.getConfiguration("markdownHeaderIndexer");

        if (configuration) {
            const configLevelBegin = configuration.get<number>("levelBegin");
            if (configLevelBegin) {
                parameter.levelBegin = configLevelBegin;
            }

            const configLevelEnd = configuration.get<number>("levelEnd");
            if (configLevelEnd) {
                parameter.levelEnd = configLevelEnd;
            }

            const configPrefixAndPostfix = configuration.get<string>("levelPrefixAndPostfix");
            if (configPrefixAndPostfix) {
                parameter.levelPrefixAndPostfix = configPrefixAndPostfix;
            }

            const configFirstLevelIndex = configuration.get<string>("firstLevelIndex");
            if (configFirstLevelIndex) {
                parameter.firstLevelIndex = configFirstLevelIndex;
            }
        } else {
            this.showWarning("Cannot load configuration for markdownHeaderIndexer.");
        }

        return parameter;
    }

    public static save(parameter: MarkdownHeaderIndexerParameter) {
        const configuration = workspace.getConfiguration("markdownHeaderIndexer");

        if (configuration) {
            const target = vscode.ConfigurationTarget.Global;

            configuration.update("levelBegin", parameter.levelBegin, target);
            configuration.update("levelEnd", parameter.levelEnd, target);
            configuration.update("firstLevelIndex", parameter.firstLevelIndex, target);
        } else {
            this.showWarning("Cannot save configuration for markdownHeaderIndexer.");
        }
    }

    /**
     * show warning message.
     * 
     * @param message the message to show.
     */
    private static showWarning(message: string) {
        vscode.window.showInformationMessage("WARNING: " + message);
    }
}