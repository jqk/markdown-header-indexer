import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { MarkdownPowerIndexParameter } from '../../MarkdownPowerIndexParameter';
import { MarkdownHeaderIndexer } from '../../MarkdownHeaderIndexer';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all Markdown Power Index tests.');

	test('correct settings', correctSettings);
	test('remove index with level prefix and postfix', removeIndexWithLevelPrePostfix);
	test('add index with default settings', addIndexWithDefaultSettings);
	test('add index with Chinese first level', addIndexWithChineseFirstLevel);
	test('add index with custom first level with prefix and postfix', addIndexWithCustomFirstLevelAndPrePostfix);
	test('add index with other level prefix and postfix', addIndexWithOtherLevelPrePostfix);
	test('match special characters in index', matchSpecialCharsInIndex);
});

function correctSettings() {
	const param = new MarkdownPowerIndexParameter();
	param.levelBegin = 5;
	param.levelEnd = 2;
	param.levelPrefixAndPostfix = "|wrong prefix|   章 |  第 |节|";
	param.firstLevelIndex = "error";

	const indexer = new MarkdownHeaderIndexer(param);

	assert.equal(param.levelBegin, 2);
	assert.equal(param.levelEnd, 6);
	assert.equal(param.levelPrefixAndPostfix, "|| 章|第 |节|");
	assert.equal(param.firstLevelIndex, "default");
}

function removeIndexWithLevelPrePostfix() {
	const param = new MarkdownPowerIndexParameter();
	param.levelPrefixAndPostfix = "|第|章|第|节|";
	const indexer = new MarkdownHeaderIndexer(param);
	// Also test no space between postfix and label.
	const source =
		"# one\n" +
		"## 第5525章two\n" +
		"### 第ABC节 three one\n" +
		"### 第1.2节 three two\n" +
		"### 第1.3节three three\n";
	const expected =
		"# one\n" +
		"## two\n" +
		"### 第ABC节 three one\n" +
		"### three two\n" +
		"### three three\n";

	const actual = indexer.formatText(source, false);

	assert.equal(actual, expected);
}

function addIndexWithDefaultSettings() {
	const param = new MarkdownPowerIndexParameter();
	const indexer = new MarkdownHeaderIndexer(param);
	const source =
		"# one\n" +
		"## two\n" +
		"###  three one\n" +
		"### three two\n";
	const expected =
		"# one\n" +
		"## 1 two\n" +
		"### 1.1 three one\n" +
		"### 1.2 three two\n";
	const actual = indexer.formatText(source, true);

	assert.equal(actual, expected);
}

function addIndexWithChineseFirstLevel() {
	const param = new MarkdownPowerIndexParameter();
	param.firstLevelIndex = "chinese";
	const indexer = new MarkdownHeaderIndexer(param);
	const source =
		"# one\n" +
		"## 五 two\n" +
		"###  three one\n" +
		"### three two\n";
	const expected =
		"# one\n" +
		"## 一 two\n" +
		"### 1.1 three one\n" +
		"### 1.2 three two\n";
	const actual = indexer.formatText(source, true);

	assert.equal(actual, expected);
}

function addIndexWithCustomFirstLevelAndPrePostfix() {
	const param = new MarkdownPowerIndexParameter();
	param.firstLevelIndex = "|_ONE_|_TWO_|_THREE_|_FOUR_|_FIVE_|_SIX_|_SEVEN_|_EIGHT_|_NINE_|_TEN_|";
	param.levelPrefixAndPostfix = "| Chapter  |  ->|||";
	const indexer = new MarkdownHeaderIndexer(param);
	const source =
		"# one\n" +
		"## two\n" +
		"###  three one\n" +
		"### three two\n";
	const expected =
		"# one\n" +
		"## Chapter _ONE_ -> two\n" +
		"### 1.1 three one\n" +
		"### 1.2 three two\n";
	const actual = indexer.formatText(source, true);

	assert.equal(actual, expected);
}

function addIndexWithOtherLevelPrePostfix() {
	const param = new MarkdownPowerIndexParameter();
	param.levelPrefixAndPostfix = "|||第|节|";
	const indexer = new MarkdownHeaderIndexer(param);
	const source =
		"# one\n" +
		"## two\n" +
		"###  three one\n" +
		"### three two\n";
	const expected =
		"# one\n" +
		"## 1 two\n" +
		"### 第1.1节 three one\n" +
		"### 第1.2节 three two\n";
	const actual = indexer.formatText(source, true);

	assert.equal(actual, expected);
}

function matchSpecialCharsInIndex() {
	const param = new MarkdownPowerIndexParameter();
	param.levelPrefixAndPostfix = "|<>{}[] | +-*/!=|^$? | .,:\\|";
	const indexer = new MarkdownHeaderIndexer(param);
	const source =
		"# one\n" +
		"## <>{}[] 5 +-*/!= two\n" +
		"### ^$? 5.5 .,:\\ three one\n" +
		"### three two\n";
	const expected =
		"# one\n" +
		"## <>{}[] 1 +-*/!= two\n" +
		"### ^$? 1.1 .,:\\ three one\n" +
		"### ^$? 1.2 .,:\\ three two\n";
	const actual = indexer.formatText(source, true);

	assert.equal(actual, expected);
}
