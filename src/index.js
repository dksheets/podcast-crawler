const moment = require("moment");
const fs = require("fs");
const path = require("path");
const updateRssData = require("./initRssData");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);

getChannels();

async function getChannels() {
  const toUpdate = [];
  try {
    let channels = await readFile(path.resolve(__dirname, "channels.json"));
    channels = JSON.parse(channels);
    for (const title in channels) {
      if (shouldUpdateToday(channels[title].episodes)) {
        console.log("Checking for new episodes of " + title + " today");
        toUpdate.push(channels[title].url);
      }
    }
    await updateRssData(toUpdate);
  } catch (e) {
    console.log(e);
  }
}

function shouldUpdateToday(episodes) {
  let index = 0;
  let minDiff = Infinity;
  let mostRecent = moment(...episodes[0].pubDate);
  while (index < 5 && index < episodes.length) {
    let currentEpisodeDate = moment(...episodes[index].pubDate);
    let prevEpisodeDate = moment(...episodes[index + 1].pubDate);
    let currentDiff = moment
      .duration(currentEpisodeDate.diff(prevEpisodeDate))
      .as("days");
    minDiff = Math.min(minDiff, currentDiff);
    index++;
  }
  return moment().isAfter(mostRecent.add(minDiff, "days"));
}
