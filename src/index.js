const RSS_URLS = require("./rssURLs");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const axios = require("axios");
const xml2js = require("xml2js");
const moment = require("moment");
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const parseString = promisify(xml2js.parseString);
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
  masterProcess();
} else {
  childProcess();
}

async function masterProcess() {
  let channels;
  try {
    channels = await readFile(path.resolve(__dirname, "channels.json"));
    channels = JSON.parse(channels);
  } catch (e) {
    // console.log(e);
  }

  let urls = [];
  // build URL list based on whether this is the initial load or a check for updated episodes
  if (Object.keys(channels).length === 0) {
    console.log("Building JSON file from list of RSS feeds...");
    urls = RSS_URLS;
  } else {
    // if channels is not empty (initial list is already built), only check channels that should be updated today
    for (const title in channels) {
      if (shouldUpdateToday(channels[title].episodes)) {
        console.log("Checking for new episodes of " + title + " today...");
        urls.push(channels[title].url);
      }
    }
  }

  function shouldUpdateToday(episodes) {
    let index = 0;
    let minDiff = Infinity;
    try {
      let mostRecent = moment(episodes[0].pubDate[0]);
      while (index < 5 && index < episodes.length) {
        let currentEpisodeDate = moment(episodes[index].pubDate[0]);
        let prevEpisodeDate = moment(episodes[index + 1].pubDate[0]);
        let currentDiff = moment
          .duration(currentEpisodeDate.diff(prevEpisodeDate))
          .as("days");
        minDiff = Math.min(minDiff, currentDiff);
        index++;
      }
      return moment().isAfter(mostRecent.add(minDiff, "days"));
    } catch (e) {
      return false;
    }
  }

  let workers = [];

  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    console.log(`Forking process number ${i}...`);

    const worker = cluster.fork();
    workers.push(worker);
    // Listen for messages from worker
    worker.on("message", async function (message) {
      channels = { ...channels, ...message.channels };

      if (urls.length > 0) {
        const next = urls.pop();
        worker.send({ url: next, channels });
      } else {
        console.log("All channels have been retrieved for today.");
        try {
          await writeFile(
            path.resolve(__dirname, "channels.json"),
            JSON.stringify(channels)
          );
        } catch (e) {
          // console.log(e);
        }
      }
    });
  }
  // Send message to the workers
  workers.forEach(async function (worker) {
    console.log(
      `Master ${process.pid} sends URL to worker ${worker.process.pid}...`
    );
    if (urls.length > 0) {
      const next = urls.pop();
      worker.send({ url: next, channels });
    } else {
      console.log("All channels have been retrieved for today.");
      try {
        await writeFile(
          path.resolve(__dirname, "channels.json"),
          JSON.stringify(channels)
        );
      } catch (e) {
        // console.log(e);
      }
    }
  }, this);
}

function childProcess() {
  console.log(`Worker ${process.pid} started`);

  process.on("message", async function (message) {
    console.log(
      `Worker ${process.pid} processing URL '${JSON.stringify(message.url)}'`
    );
    let newChannels;
    try {
      const xml = await getRSSFeed(message.url, message.channels);
      newChannels = await setRSSData(xml, message.url, message.channels);
    } catch (e) {
      // console.log(e);
    }
    process.send({
      msg: "Finished processing, requesting next URL",
      channels: newChannels,
    });
  });

  async function getRSSFeed(url, channels) {
    try {
      const xml = await axios(url);
      const result = await parseString(xml.data);
      return result;
    } catch (e) {
      // console.log(e);
    }
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
    return channels;
  }
}
