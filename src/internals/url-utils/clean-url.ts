export function removeHttpHttps(url: string) {
    if (url.startsWith('http://')) {
        return url.replace('http://', '')
    }
    if (url.startsWith('https://')) {
        return url.replace('https://', '')
    }
    return url
}
