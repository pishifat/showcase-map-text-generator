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
        const newLine = line.trim();
        
        if (newLine.length > 1) {
            console.log(line);
            file += `"<p>${line}</p>"\n`;
        } else {
            file += `"<br>"\n`
        }
        
        
    }

    fs.writeFile('export.txt', file, (error) => { 
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