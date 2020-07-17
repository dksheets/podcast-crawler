const axios = require("axios");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const parseString = promisify(xml2js.parseString);

async function updateRssData(urls) {
  let channels = await readFile(path.resolve(__dirname, "channels.json"));
  channels = JSON.parse(channels);
  await asyncForEach(urls, async (url) => {
    await getRSSFeed(url, channels);
  });
  await writeFile(
    path.resolve(__dirname, "channels.json"),
    JSON.stringify(channels)
  );
}

async function getRSSFeed(url, channels) {
  const xml = await axios(url);
  const result = await parseString(xml.data);
  setRSSData(result, url, channels);
}

function setRSSData(data, url, channels) {
  const channel = data.rss.channel[0];
  channels[channel.title] = {
    title: channel.title.toString(),
    url,
    description: channel.description,
    episodes: channel.item.map((episode) => ({
      title: episode.title,
      description: episode.description,
      pubDate: episode.pubDate,
    })),
  };
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = updateRssData;
