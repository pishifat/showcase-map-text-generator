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

    for (const line of splitText) {
        console.log(line);
        
        const modes = [];

        const beatmapsetId = getBeatmapsetIdFromUrl(line);
        const mapInfoResponse = await getBeatmapsetInfo(beatmapsetId);
        await sleep(1000);

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
            modesText += `${mode == 'osu' ? 'osu!' : 'osu!' + mode}`;
        }

        if (userInfo) {
            file += `${mapInfo[0].artist} - ${mapInfo[0].title}\n`;
            file += `[${modesText} map](https://osu.ppy.sh/beatmapsets/${beatmapsetId}) by [${userInfo.username}](https://osu.ppy.sh/users/${userInfo.user_id})\n\n`;
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