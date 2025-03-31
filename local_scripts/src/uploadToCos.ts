import COS from 'cos-nodejs-sdk-v5';
import * as fs from 'fs';
import { COS_PATH_PREFIX, COS_SECRET_ID, COS_SECRET_KEY } from './config.js';
import { updateImporter } from './wiki.js';

const BUCKET_NAME = 'single-page-app-1300115157';
const BUCKET_REGION = 'ap-shanghai';

const cos = new COS({
    SecretId: COS_SECRET_ID,
    SecretKey: COS_SECRET_KEY,
});

const clearOldAsset = async () => {
    const needDeleteList = await getNeedDeleteList();

    needDeleteList.forEach(async (fileKey) => {
        const deleteParams = {
            Bucket: BUCKET_NAME,
            Region: BUCKET_REGION,
            Key: fileKey,
        };
        cos.deleteObject(deleteParams)
            .then(() => {
                console.log(`删除 ${fileKey} 成功`);
            })
            .catch((err) => {
                console.log(`删除 ${fileKey} 失败，原因：${err}`);
            });
    });
};

const getNeedDeleteList = async () => {
    const fileList = await cos.getBucket({
        Bucket: BUCKET_NAME,
        Region: BUCKET_REGION,
        Prefix: COS_PATH_PREFIX,
        // Delimiter为空时会深度遍历
        Delimiter: '',
    });

    const { inTimeRange, outTimeRange, mapping } = fileList.Contents.reduce(
        (acc, curr) => {
            // 取出时间戳
            const match = curr.Key.match(
                new RegExp(`^${COS_PATH_PREFIX}/(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})/.*$`),
            );
            if (!match) {
                return acc;
            }

            // 把 2303111129 转时间戳
            const time = new Date();
            time.setFullYear(Number('20' + match[1]));
            time.setMonth(Number(match[2]) - 1);
            time.setDate(Number(match[3]));
            time.setHours(Number(match[4]));
            time.setMinutes(Number(match[5]));
            time.setSeconds(0);
            time.setMilliseconds(0);

            const timestamp = time.getTime();

            // 记录的时间戳小于现在往前3天以内
            const isInRange = timestamp > new Date().getTime() - 3 * 24 * 60 * 60 * 1000;

            if (isInRange) {
                if (!acc.inTimeRange.includes(timestamp)) {
                    acc.inTimeRange.push(timestamp);
                }
            } else {
                if (!acc.outTimeRange.includes(timestamp)) {
                    acc.outTimeRange.push(timestamp);
                }
            }

            if (!acc.mapping[timestamp]) {
                acc.mapping[timestamp] = [];
            }
            acc.mapping[timestamp].push(curr.Key);

            return acc;
        },
        {
            inTimeRange: [] as number[],
            outTimeRange: [] as number[],
            mapping: {} as {
                [timestamp: number]: string[];
            },
        },
    );

    // 三天以内的都保留
    // 如果三天以内不超过3个，则把3天以外的保留直到保留的总数达到3个
    if (inTimeRange.length < 3) {
        const needAddCount = 3 - inTimeRange.length;
        outTimeRange.sort((a, b) => b - a);
        outTimeRange.splice(0, needAddCount);
    }

    const needDeleteList = outTimeRange.map((timestamp) => mapping[timestamp]).flat();

    return needDeleteList;
};

const main = async () => {
    // 发起清理请求，并不需要等待清理完成
    await clearOldAsset();

    const rootFileList = fs.readdirSync('./dist/assets/');
    const promiseList: Promise<COS.PutObjectResult>[] = [];

    const currentTimeStr = getCurrentTimeStr();

    rootFileList.forEach(async (fileName) => {
        const cosParams = {
            Bucket: BUCKET_NAME,
            Region: BUCKET_REGION,
            Key: `${COS_PATH_PREFIX}/${currentTimeStr}/${fileName}`,
            Body: fs.createReadStream(`./dist/assets/${fileName}`),
        };
        promiseList.push(cos.putObject(cosParams));
    });

    Promise.allSettled(promiseList).then((results) => {
        const rejected = results.filter((result) => result.status === 'rejected');
        if (rejected.length > 0) {
            console.log(`有${rejected.length}个文件上传失败，线上读取文件不会被重写。`);
        } else {
            console.log('所有文件上传成功，正在重写hash...');

            updateImporter(currentTimeStr);
        }
    });
};

const getCurrentTimeStr = () => {
    // 获取当前时间戳
    const dateNow = new Date();
    // 生成230311000000格式的时间戳
    // 只取年份后两位、月份、日期、小时、分钟、秒

    const timeStr =
        dateNow.getFullYear().toString().slice(2) +
        (dateNow.getMonth() + 1).toString().padStart(2, '0') +
        dateNow.getDate().toString().padStart(2, '0') +
        dateNow.getHours().toString().padStart(2, '0') +
        dateNow.getMinutes().toString().padStart(2, '0');

    return timeStr;
};

main();
