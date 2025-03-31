export async function apiGetMapIcons(code: string, noCache = false) {
    try {
        const response = await fetch(
            `/api.php?action=lua&module=Api/GetMapIcons&code=${code}&format=json&utf8=1${
                noCache ? `&t=${Date.now()}` : ''
            }`,
        );
        const data = await response.json();
        return data;
    } catch (e) {
        return null;
    }
}
