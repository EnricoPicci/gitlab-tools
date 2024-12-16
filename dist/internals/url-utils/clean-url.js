"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeHttpHttps = void 0;
function removeHttpHttps(url) {
    if (url.startsWith('http://')) {
        return url.replace('http://', '');
    }
    if (url.startsWith('https://')) {
        return url.replace('https://', '');
    }
    return url;
}
exports.removeHttpHttps = removeHttpHttps;
//# sourceMappingURL=clean-url.js.map