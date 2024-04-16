const fs = require("fs");
const secret = require("./secret.json");
const axios = require("axios");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getClientCredentialsGrant() {
    const postData = {
        grant_type: 'client_credentials',
        client_id: secret.oauth.id,
        client_secret: secret.oauth.secret,
        scope: 'public',
    };

    const res = await axios.post('https://osu.ppy.sh/oauth/token', postData);

    return res.data;
}

function getBeatmapsetIdFromUrl(url) {
    let indexStart = url.indexOf('beatmapsets/') + 'beatmapsets/'.length;
    let indexEnd = url.indexOf('/discussion');
    let bmId;

    if (indexEnd !== -1) {
        bmId = url.slice(indexStart, indexEnd);
    } else {
        bmId = url.slice(indexStart);
    }

    return bmId;
}

async function generate() {
    const buffer = fs.readFileSync('data.txt');
    const text = buffer.toString();
    const splitText = text.split(`\r\n`);

    console.log('text read...');
    
    console.log(splitText);

    const response = await getClientCredentialsGrant();
    const token = response.access_token;
    await sleep(1000);

    console.log('token received...');

    let file = '';

    let scopedMonth;
    let scopedYear;

    for (const line of splitText) {
        console.log(line);
        
        const modes = [];

        if (line.includes('home')) {
            const newsInfo = await getNewsInfo(token, line.substring(29));
            await sleep(300);

            const artist = newsInfo.data.title.substring(21);
            const date = new Date(newsInfo.data.published_at.substring(0,10));
            const year = newsInfo.data.published_at.substring(0,4);
            const month = newsInfo.data.published_at.substring(5,7);
            const day = newsInfo.data.published_at.substring(8,10);

            let newMonth = date.getMonth();
            const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const idMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const jaMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            const ruMonths = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            const frMonths = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
            
            if (scopedYear !== year) {
                file += `\n## ${year}\n`
                scopedYear = year;
            }

            if (scopedMonth !== newMonth) {
                switch(secret.language) {
                    case 'en':
                        file += `\n### ${enMonths[newMonth]}\n\n`;
                        break;
                    case 'id':
                        file += `\n### ${idMonths[newMonth]}\n\n`;
                        break;
                    case 'ja':
                        file += `\n### ${jaMonths[newMonth]}\n\n`;
                        break;
                    case 'ru':
                        file += `\n### ${ruMonths[newMonth]}\n\n`;
                        break;
                    case 'fr':
                        file += `\n### ${frMonths[newMonth]}\n\n`;
                        break;
                }

                scopedMonth = newMonth;
            }

            switch(secret.language) {
                case 'en':
                case 'id':
                case 'ja':
                case 'ru':
                    file += `- **[${artist}](${line})** (${year}-${month}-${day})\n`;
                    break;
                case 'fr':
                    file += `- **[${artist}](${line})** (${day}/${month}/${year})\n`;
                    break;
            }
            
        } else {
            const beatmapsetId = getBeatmapsetIdFromUrl(line);
            const mapInfoResponse = await getBeatmapsetInfo(beatmapsetId);
            await sleep(300);

            const mapInfo = mapInfoResponse.data;

            const userId = mapInfo[0].creator_id;
            const userInfo = await getUserInfo(userId);
            
            for (const map of mapInfo) {
                switch (map.mode) {
                    case '0':
                        if (!modes.includes('osu')) modes.push('osu');                        
                        break;
                    case '1':
                        if (!modes.includes('taiko')) modes.push('taiko');
                        break;
                    case '2':
                        if (!modes.includes('catch')) modes.push('catch');
                        break;
                    case '3':
                        if (!modes.includes('mania')) modes.push('mania');
                        break;
                    default:
                        break;
                }
            }

            let modesText = '';
            for (const mode of modes) {
                modesText += `(![][${mode == 'osu' ? 'osu!' : 'osu!' + mode}])`;
            }

            if (userInfo) {
                let hostDetail = '';
    
                switch(secret.language) {
                    case 'en':
                        hostDetail = `hosted by ::{ flag=${userInfo.country} }:: [${userInfo.username}](https://osu.ppy.sh/users/${userInfo.user_id})`;
                        break;
                    case 'fr':
                        hostDetail = `organisé par ::{ flag=${userInfo.country} }:: [${userInfo.username}](https://osu.ppy.sh/users/${userInfo.user_id})`;
                        break;
                    case 'id':
                        hostDetail = `diurus oleh ::{ flag=${userInfo.country} }:: [${userInfo.username}](https://osu.ppy.sh/users/${userInfo.user_id})`;
                        break;
                    case 'ja':
                        hostDetail = `::{ flag=${userInfo.country} }:: [${userInfo.username}](https://osu.ppy.sh/users/${userInfo.user_id})によってホスト`;
                        break;
                    case 'ru':
                        hostDetail = `от ::{ flag=${userInfo.country} }:: [${userInfo.username}](https://osu.ppy.sh/users/${userInfo.user_id})`;
                        break;
                }

                file += `  - ${modesText} [${mapInfo[0].artist} - ${mapInfo[0].title}](https://osu.ppy.sh/beatmapsets/${beatmapsetId}) ${hostDetail}\n`;
            }
        }
    }

    fs.writeFile('export.md', file, (error) => { 
        if (error) throw err; 
    });

    console.log('DONE');
}

async function getBeatmapsetInfo(setId) {
    const url = `https://osu.ppy.sh/api/get_beatmaps?k=${secret.token}&s=${setId}`;

    return await axios.get(url);
}

async function getUserInfo(userId) {
    const url = `https://osu.ppy.sh/api/get_user?k=${secret.token}&u=${userId}`;
    const res = await axios.get(url);

    return res.data[0];
}

async function getNewsInfo(token, slug) {
    const url = `https://osu.ppy.sh/api/v2/news/${slug}`;

    return await axios.get(url);
}

generate();