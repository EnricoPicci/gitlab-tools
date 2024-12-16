"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const paged_command_1 = require("./paged-command");
describe(`nextMergeRequestsCommand`, () => {
    it(`should return the function to be used to read the next page in case of 'totPages' header is used
        when totPages number is reached should return -1`, () => {
        const totPages = 3;
        const _nextPage = (0, paged_command_1.nextPage)(totPages);
        (0, chai_1.expect)(_nextPage()).equal(2);
        (0, chai_1.expect)(_nextPage()).equal(3);
        (0, chai_1.expect)(_nextPage()).equal(-1);
    });
    it(`should return the function to be used to read the next page in case of 'x_next_page' header is used
        when x_next_page number is empty should return -1`, () => {
        const headers = {};
        let totPages;
        totPages = headers['x-total-pages'];
        const _nextPage = (0, paged_command_1.nextPage)(parseInt(totPages));
        (0, chai_1.expect)(_nextPage('2')).equal(2);
        (0, chai_1.expect)(_nextPage('3')).equal(3);
        (0, chai_1.expect)(_nextPage('')).equal(-1);
    });
});
//# sourceMappingURL=paged-command.spec.js.map