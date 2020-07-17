module.exports.handler = new ErrorHandler();

function ErrorHandler() {
  this.handleError = (error) => {
    return console.log("ERROR: " + error);
  };
}
