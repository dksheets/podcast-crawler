const errorManagement = require("./errorHandler");
const checkChannelUpdates = require("./updateRssData");
const updateRssData = require("./initRssData");
const RSS_URLS = require("./rssURLs");

if (process.env.RUN_MODE === "INIT") {
  updateRssData(RSS_URLS);
} else {
  checkChannelUpdates();
}

process.on("uncaughtException", (error) => {
  errorManagement.handler.handleError(error);
});

process.on("unhandledRejection", (reason, p) => {
  errorManagement.handler.handleError(error);
});
