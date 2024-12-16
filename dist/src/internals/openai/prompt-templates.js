"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillPromptTemplateFromFile = exports.fillPromptTemplate = exports.languageFromExtension = exports.fillPromptTemplateSummarizeDiffs = exports.fillPromptTemplateSummarizeDiffsFromFile = exports.fillPromptTemplateExplainDiff = exports.fillPromptTemplateExplainDiffFromFile = void 0;
const fs_1 = __importDefault(require("fs"));
function fillPromptTemplateExplainDiffFromFile(templateFile, templateData) {
    const template = fs_1.default.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateExplainDiff(template, templateData);
}
exports.fillPromptTemplateExplainDiffFromFile = fillPromptTemplateExplainDiffFromFile;
function fillPromptTemplateExplainDiff(template, templateData) {
    return fillPromptTemplate(template, templateData);
}
exports.fillPromptTemplateExplainDiff = fillPromptTemplateExplainDiff;
function fillPromptTemplateSummarizeDiffsFromFile(templateFile, templateData) {
    const template = fs_1.default.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateSummarizeDiffs(template, templateData);
}
exports.fillPromptTemplateSummarizeDiffsFromFile = fillPromptTemplateSummarizeDiffsFromFile;
function fillPromptTemplateSummarizeDiffs(template, templateData) {
    return fillPromptTemplate(template, templateData);
}
exports.fillPromptTemplateSummarizeDiffs = fillPromptTemplateSummarizeDiffs;
// functions used to get pieces of data to be used to fill in the prompt templates
function languageFromExtension(extension) {
    let language = '';
    // if the extension is .java, we can assume that the language is java
    // if the extension is .ts, we can assume that the language is TypeScript
    // Use a switch statement to handle other languages
    switch (extension) {
        case '.java':
            language = 'java';
            break;
        case '.ts':
            language = 'TypeScript';
            break;
        default:
            language = '';
    }
    return language;
}
exports.languageFromExtension = languageFromExtension;
//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes
function fillPromptTemplate(template, templateData) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, p1) => templateData[p1] || match);
}
exports.fillPromptTemplate = fillPromptTemplate;
function fillPromptTemplateFromFile(templateFile, templateData) {
    const template = fs_1.default.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplate(template, templateData);
}
exports.fillPromptTemplateFromFile = fillPromptTemplateFromFile;
//# sourceMappingURL=prompt-templates.js.map