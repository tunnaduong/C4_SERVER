var express = require("express");
var moment = require("moment");
var duration = require("moment-duration-format");
const axios = require("axios");
const { response } = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

var server_port = process.env.YOUR_PORT || process.env.PORT || 80;
var server_host = process.env.YOUR_HOST || "0.0.0.0";
server.listen(server_port, server_host, function () {
  console.log("Server dang mo tai cong %d", server_port);
});

const video = {};
const meta = {};

video["video_ids"] = new Array(
  "KypuJGsZ8pQ",
  "UVbv-PJXm14",
  "PNhYz6RmIr4",
  "hTGcMk_QXEg",
  "ixdSsW5n2rI"
);
video["total_videos"] = video["video_ids"].length;
video["now_playing"] = 0;
function getMeta() {
  axios
    .get(
      "https://www.googleapis.com/youtube/v3/videos?id=" +
        video["video_ids"][video["now_playing"]] +
        "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g&part=contentDetails"
    )
    .then(function (response) {
      video["current_video_duration"] = moment
        .duration(response.data.items[0].contentDetails.duration)
        .format("s");
    });
}

async function getSnippet(id) {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" +
      id +
      "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g"
  );

  return response.data.items[0].snippet.title;
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

global.queue = [];

for (const vid of video["video_ids"]) {
  const index = video["video_ids"].indexOf(vid);
  queue.push([
    index,
    vid,
    function () {
      return function () {
        getSnippet(vid).then((data) => {
          return data;
        });
      };
    },
  ]);
}

var length = queue.length,
  json = [];

for (var i = 0; i < length; i++) {
  var subArray = queue[i];
  item = {
    id: subArray[0],
    video_id: subArray[1],
    video_title: subArray[2],
  };
  json.push(item);
}
video["video_in_queue"] = json;

io.on("connection", function (socket) {
  console.log("Co nguoi vua ket noi " + socket.id);

  socket.on("chat-message", (data) => {
    console.log(data.username + ": " + data.message);
    io.emit("chat-message", {
      name: data.name,
      username: data.username,
      message: data.message,
    });
  });

  socket.on("add-queue", (id) => {
    console.log("received id: " + id);
    video["video_ids"].push(id);
    video["total_videos"]++;
    queue.push([video["total_videos"] - 1, id]);
    var length = queue.length,
      json = [];

    for (var i = 0; i < length; i++) {
      var subArray = queue[i],
        item = {
          id: subArray[0],
          video_id: subArray[1],
        };
      json.push(item);
    }
    video["video_in_queue"] = json;
  });
});

app.get("/live", function (req, res) {
  res.json(video);
});
