"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSandboxLanguage = toSandboxLanguage;
const client_1 = require("@prisma/client");
function toSandboxLanguage(language) {
    switch (language) {
        case client_1.ProgrammingLanguage.C:
            return 'C';
        case client_1.ProgrammingLanguage.CPP:
            return 'CPP';
        case client_1.ProgrammingLanguage.JAVA:
            return 'JAVA';
        case client_1.ProgrammingLanguage.PYTHON:
            return 'PYTHON';
        default:
            throw new Error(`Unsupported language: ${language}`);
    }
}
//# sourceMappingURL=sandbox.types.js.map