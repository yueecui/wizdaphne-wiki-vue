export async function getPageRawByTitle<T>(pageTitle: string, noCache = false): Promise<T | null> {
    try {
        const response = await fetch(
            `/index.php?title=${pageTitle}&action=raw&ctype=text/json${noCache ? `&t=${Date.now()}` : ''}`,
        );
        const data = await response.json();
        return data;
    } catch (e) {
        return null;
    }
}
