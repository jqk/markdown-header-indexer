'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MarkdownHeaderIndexer } from "./MarkdownHeaderIndexer";
import { MarkdownHeaderIndexerParameter } from './MarkdownHeaderIndexerParameter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Markdown Header Indexer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let updateDisposable = vscode.commands.registerCommand('extension.updateMarkdownHeaderIndex', () => {
		const editor = getEditor();
		if (editor) {
			process(editor, true);
		}
	});

	context.subscriptions.push(updateDisposable);

	let removeDisposable = vscode.commands.registerCommand('extension.removeMarkdownHeaderIndex', () => {
		const editor = getEditor();
		if (editor) {
			process(editor, false);
		}
	});

	context.subscriptions.push(removeDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }

/**
 * Get current active text edit.
 */
function getEditor() {
	// Get current active text editor
	const editor = vscode.window.activeTextEditor;

	// Show info if the open file is not a text file, or no file is opened
	if (!editor) {
		vscode.window.showInformationMessage('WARNING: Either the file is not a text file, or no editor is opened.');
	}

	return editor;
}

/**
 * Process the text, update or remove markdown header index.
 * 
 * @param editor the active text editor.
 * @param update true to update or false to remove markdown header index.
 */
function process(editor: vscode.TextEditor, update: boolean) {
	const selection = new vscode.Selection(0, 0, editor.document.lineCount + 1, 0);
	const text = editor.document.getText(selection);

	editor.edit(function (builder: vscode.TextEditorEdit) {
		try {
			const parameter = MarkdownHeaderIndexerParameter.load();
			const indexer = new MarkdownHeaderIndexer(parameter);

			// Show index result method 1: Only replace the changed line.
			const lines = text.split(/\r\n|\n/g);
			const changedLines = indexer.formatLines(lines, update);

			for (let i = changedLines.length - 1; i >= 0; i--) {
				const line = changedLines[i];
				const start = new vscode.Position(line.lineNo, 0);
				const end = new vscode.Position(line.lineNo + 1, 0);

				builder.replace(new vscode.Range(start, end), line.text + "\n");
			}

			// Both 2 methods implement the functionality. 
			// But method 2 blinks the screen when content is large and has many symbols like ')' or '[', etc.
			//
			// Show index result method 2: Replace all the text.
			// const result = indexer.formatText(text, update);
			// builder.replace(new vscode.Range(selection.start, selection.end), result);
		} catch (err) {
			vscode.window.showInformationMessage(err.message);
		}
	});
}
