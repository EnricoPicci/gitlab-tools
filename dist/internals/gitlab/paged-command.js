"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextPage = exports.runPagedCommand = void 0;
const axios_1 = __importDefault(require("axios"));
const rxjs_1 = require("rxjs");
/**
 * Executes a paged command and retrieves all items across multiple pages.
 *
 * @param {string} command - The command to be executed.
 * @param {string} token - The authentication token.
 * @param {string} [itemType='items'] - The type of items being retrieved (used for logging).
 * @param {(input: any) => boolean} [stop] - Optional stop condition function that takes the current items and returns a boolean.
 * @returns {Observable<any[]>} - An observable that emits the collected items when all pages have been processed.
 *
 * The function follows these steps:
 * 1. Initialize an empty array to store items and a variable to hold the total number of pages.
 * 2. Make the first API call using the provided command and token.
 * 3. Process the response from the first call:
 *    - Extract the items from the response and add them to the items array.
 *    - Get the total number of pages from the response headers if present, in not present the signal of end of pagination
 *      will be the fact the header 'x-next-page' will be the empty string.
 *      Different APIs use different ways to signal the end of pagination.
 *    - Log the progress.
 *    - Prepare the function to get the next page number.
 * 4. Use the `expand` operator to handle pagination:
 *    - Check if the stop condition is met; if so, log and terminate the process.
 *    - Determine the next page number from the response headers.
 *    - If there are no more pages, log and terminate the process.
 *    - Make the next API call for the subsequent page.
 *    - Process the response similarly to the first call.
 * 5. Use the `last` operator to ensure the observable completes after processing all pages.
 * 6. Map the final result to return only the collected items.
 **/
function runPagedCommand(command, token, itemType = 'items', stop) {
    const items = [];
    let totPages;
    const firstPagedCall = firstCall(command, token);
    return (0, rxjs_1.from)(firstPagedCall).pipe((0, rxjs_1.map)(resp => {
        const itemsPaged = resp.data;
        items.push(...itemsPaged);
        // Different APIs use different ways to signal the end of pagination.
        // * For instance, the "users" API returns the 'x-total-pages' header in the response.
        // * The "commits" API returns the 'x-next-page' header in the response to each call.
        totPages = resp.headers['x-total-pages'];
        const msg = totPages ? ` of ${totPages} (total pages)` : '';
        console.log(`>>>>> read page ${1}${msg} - ${itemType} read: ${items.length}`);
        const _nextPage = nextPage(parseInt(totPages));
        return { items, _nextPage, resp };
    }), (0, rxjs_1.expand)(({ items, _nextPage, resp }) => {
        const stopCondition = stop ? stop(items) : false;
        if (stopCondition) {
            console.log(`>>>>> Reading of ${itemType} stopped because the stop condition has been met`);
            return rxjs_1.EMPTY;
        }
        // Different APIs use different ways to signal the end of pagination.
        // * For instance, the "users" API returns the 'x-total-pages' header in the response.
        // * The "commits" API returns the 'x-next-page' header in the response to each call.
        const x_next_page = resp.headers['x-next-page'];
        const page = _nextPage(x_next_page);
        if (page === -1) {
            console.log(`>>>>> Reading of ${itemType} completed`);
            return rxjs_1.EMPTY;
        }
        return (0, rxjs_1.from)(nextCall(command, token, page)).pipe((0, rxjs_1.map)(resp => {
            const itemsPaged = resp.data;
            items.push(...itemsPaged);
            const msg = totPages ? ` of ${totPages} (total pages)` : '';
            console.log(`>>>>> read page ${page}${msg} - ${itemType} read: ${items.length}`);
            return { items, _nextPage, resp };
        }));
    }), (0, rxjs_1.last)(), (0, rxjs_1.map)(({ items }) => items));
}
exports.runPagedCommand = runPagedCommand;
function firstCall(command, token) {
    const firstPageCommand = pagedCommand(command, 1);
    return remoteCall(firstPageCommand, token);
}
function nextCall(command, token, page) {
    const nextPageCommand = pagedCommand(command, page);
    return remoteCall(nextPageCommand, token);
}
function remoteCall(command, token) {
    return axios_1.default.get(command, {
        headers: {
            "PRIVATE-TOKEN": token
        }
    });
}
function pagedCommand(command, page) {
    return `${command}&page=${page}`;
}
/**
 * Creates a function to handle pagination.
 * Pagination can end in two ways:
 * 1. When the current page is equal to the total number of pages available.
 * 2. When the `x_next_page` parameter is not provided.
 *
 * Different APIs use different ways to signal the end of pagination.
 * For instance, the "users" API returns the 'x-total-pages' header in the response.
 * The "commits" API returns the 'x-next-page' header in the response to each call.
 *
 * @param {number} totPages - The total number of pages available.
 * @returns {function} - A function that takes an optional string parameter `x_next_page`.
 *                       If `x_next_page` is provided, it returns the parsed integer value of it.
 *                       If `page` equals `totPages` or `x_next_page` is not provided, it returns -1.
 *                       Otherwise, it increments the page and returns the new page number.
 */
function nextPage(totPages) {
    let page = 1;
    const noNextPage = '-';
    return (x_next_page = noNextPage) => {
        if (page === totPages || x_next_page === undefined) {
            return -1;
        }
        if (x_next_page && x_next_page !== noNextPage) {
            return parseInt(x_next_page);
        }
        if (!x_next_page) {
            return -1;
        }
        page++;
        return page;
    };
}
exports.nextPage = nextPage;
//# sourceMappingURL=paged-command.js.map