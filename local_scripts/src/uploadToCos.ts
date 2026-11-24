import COS from 'cos-nodejs-sdk-v5';
import * as fs from 'fs';
import { COS_BUCKET, COS_PATH_PREFIX, COS_REGION, COS_SECRET_ID, COS_SECRET_KEY } from './config.js';
import { updateImporter } from './wiki.js';

const BUCKET_NAME = COS_BUCKET;
const BUCKET_REGION = COS_REGION;

/** 删除 / 上传的并发上限：一次几百个请求会把连接打满，也更容易被限流 */
const CONCURRENCY = 20;

const cos = new COS({
    SecretId: COS_SECRET_ID,
    SecretKey: COS_SECRET_KEY,
});

/** 按 ``CONCURRENCY`` 分批跑完；返回每个条目的结果（顺序与入参一致） */
const runInBatches = async <T>(
    items: T[],
    worker: (item: T) => Promise<unknown>,
): Promise<PromiseSettledResult<unknown>[]> => {
    const settled: PromiseSettledResult<unknown>[] = [];
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        settled.push(...(await Promise.allSettled(items.slice(i, i + CONCURRENCY).map(worker))));
    }
    return settled;
};

/**
 * 删除 3 天前（且只保留最近 3 个版本）的历史文件。
 *
 * 必须等全部删除请求结束后再继续：以前是 ``forEach(async ...)`` 发出去就不管了，
 * 脚本退出时未完成的删除会被直接掐断，旧文件残留在 COS 里。
 */
const clearOldAsset = async () => {
    const needDeleteList = await getNeedDeleteList();
    if (!needDeleteList.length) {
        console.log('没有需要清理的历史文件');
        return;
    }

    const results = await runInBatches(needDeleteList, (fileKey) =>
        cos.deleteObject({
            Bucket: BUCKET_NAME,
            Region: BUCKET_REGION,
            Key: fileKey,
        }),
    );

    let failed = 0;
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`删除 ${needDeleteList[index]} 成功`);
        } else {
            failed += 1;
            console.log(`删除 ${needDeleteList[index]} 失败，原因：${result.reason}`);
        }
    });
    console.log(`历史文件清理完成：成功 ${needDeleteList.length - failed} 个，失败 ${failed} 个`);
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

const main = async () => {
    // 先等历史文件清理完，再开始上传
    await clearOldAsset();

    const rootFileList = fs.readdirSync('./dist/assets/');

    const currentTimeStr = getCurrentTimeStr();

    const results = await runInBatches(rootFileList, (fileName) =>
        cos.putObject({
            Bucket: BUCKET_NAME,
            Region: BUCKET_REGION,
            Key: `${COS_PATH_PREFIX}/${currentTimeStr}/${fileName}`,
            Body: fs.createReadStream(`./dist/assets/${fileName}`),
        }),
    );

    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length > 0) {
        console.log(`有${rejected.length}个文件上传失败，线上读取文件不会被重写。`);
        process.exitCode = 1;
        return;
    }

    console.log('所有文件上传成功，正在重写hash...');
    await updateImporter(currentTimeStr);
    console.log('hash 重写完成');
};

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
