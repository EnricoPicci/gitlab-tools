import { expect } from 'chai';
import { nextPage } from './paged-command';

describe(`nextMergeRequestsCommand`, () => {
    it(`should return the function to be used to read the next page in case of 'totPages' header is used
        when totPages number is reached should return -1`, () => {
        const totPages = 3
        const _nextPage = nextPage(totPages)

        expect(_nextPage()).equal(2)
        expect(_nextPage()).equal(3)
        expect(_nextPage()).equal(-1)
    });

    it(`should return the function to be used to read the next page in case of 'x_next_page' header is used
        when x_next_page number is empty should return -1`, () => {
        const headers: any = {}
        let totPages: string
        totPages = headers['x-total-pages']
        const _nextPage = nextPage(parseInt(totPages))

        expect(_nextPage('2')).equal(2)
        expect(_nextPage('3')).equal(3)
        expect(_nextPage('')).equal(-1)
    });
});