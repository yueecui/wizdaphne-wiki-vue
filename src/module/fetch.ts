export const fetchTimeout = async (url: string, timeout = 5000): Promise<Response> => {
    return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('请求超时'));
        }, timeout);

        fetch(url)
            .then((response) => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
};
