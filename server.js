var express = require("express");
var moment = require("moment");
var duration = require("moment-duration-format");
const axios = require("axios");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
server.listen(443, () => {
  console.log("Server đang chay tren cong 443");
});

const video = {};
const meta = {};

video["playlist_name"] = "Live 01";
video["total_videos"] = 5;
video["video_ids"] = new Array(
  "KypuJGsZ8pQ",
  "UVbv-PJXm14",
  "PNhYz6RmIr4",
  "hTGcMk_QXEg",
  "ixdSsW5n2rI"
);
video["now_playing"] = 0;
function getMeta() {
  axios
    .get(
      "https://www.googleapis.com/youtube/v3/videos?id=" +
        video["video_ids"][video["now_playing"]] +
        "&key=AIzaSyD14m2Lz-oKztYbjQC8y4nbDmp9aBys2bc&part=contentDetails,snippet"
    )
    .then(function (response) {
      video["current_video_duration"] = moment
        .duration(response.data.items[0].contentDetails.duration)
        .format("s");
    });
}
getMeta();
video["elapsed_time"] = 0;

setInterval(() => {
  video["elapsed_time"]++;

  if (video["elapsed_time"] >= video["current_video_duration"]) {
    video["elapsed_time"] = 0;
    if (video["now_playing"] >= video["total_videos"] - 1) {
      video["now_playing"] = 0;
      console.log(video["now_playing"]);
    } else {
      video["now_playing"]++;
      console.log(video["now_playing"]);
    }
    getMeta();
  }
}, 1000);

video["video_in_queue"] = [meta];

for (const vid of video["video_ids"]) {
  let index = video["video_ids"].indexOf(vid);
  meta["id"] = index;
  meta["video_id"] = vid;

  console.log();

  axios
    .get(
      "https://www.googleapis.com/youtube/v3/videos?id=" +
        vid +
        "&key=AIzaSyD14m2Lz-oKztYbjQC8y4nbDmp9aBys2bc&part=contentDetails,snippet"
    )
    .then(function (response) {
      meta["title"] = response.data.items[0].snippet.title;
    });
}

app.get("/live", function (req, res) {
  res.json(video);
});

io.on("connection", function (socket) {
  console.log("Co nguoi vua ket noi " + socket.id);

  socket.on("chat-message", (name, u, msg) => {
    console.log(u + ": " + msg);
    io.emit("chat-message", u + "|" + name + "|" + msg);
  });
});
