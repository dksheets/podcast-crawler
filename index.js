const moment = require("moment");
const fs = require("fs");
const path = require("path");
const updateRssData = require("./initRssData");

getChannels();

async function getChannels() {
  const toUpdate = [];
  fs.readFile(path.resolve(__dirname, "channels.json"), (err, channels) => {
    if (err) throw err;
    channels = JSON.parse(channels);
    for (const title in channels) {
      if (shouldUpdateToday(channels[title].episodes)) {
        console.log("Checking for new episodes of " + title + " today");
        toUpdate.push(channels[title].url);
      }
    }
    updateRssData(toUpdate);
  });
}

function shouldUpdateToday(episodes) {
  let index = 0;
  let minDiff = Infinity;
  let mostRecent = moment(...episodes[0].pubDate);
  while (index < 5 && index < episodes.length) {
    let currentEpisodeDate = moment(...episodes[index + 1].pubDate);
    let nextEpisodeDate = moment(...episodes[index].pubDate);
    let currentDiff = moment
      .duration(nextEpisodeDate.diff(currentEpisodeDate))
      .as("days");
    minDiff = Math.min(minDiff, currentDiff);
    index++;
  }
  return moment().isAfter(mostRecent.add(minDiff, "days"));
}
