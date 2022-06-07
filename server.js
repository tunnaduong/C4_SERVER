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

var server_port = process.env.YOUR_PORT || process.env.PORT || 2222;
var server_host = process.env.YOUR_HOST || "0.0.0.0";
server.listen(server_port, server_host, function () {
  console.log("Server dang mo tai cong %d", server_port);
});

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

async function getSnippet(id) {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=" +
      id +
      "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g"
  );
  return response.data;
}

async function getChannelAvatar(channel_id) {
  const response = await axios.get(
    "https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=" +
      channel_id +
      "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g"
  );
  return response.data.items[0].snippet.thumbnails.default.url;
}

const video = {};
video["server_idle_videos_playback_id"] = new Array(
  "KypuJGsZ8pQ",
  "UVbv-PJXm14",
  "PNhYz6RmIr4",
  "hTGcMk_QXEg",
  "ixdSsW5n2rI"
);

video["server_idle_videos_playback_id"] = shuffle(
  video["server_idle_videos_playback_id"]
);

var json = [],
  j = 0;

for (const vid of video["server_idle_videos_playback_id"]) {
  getSnippet(vid).then((res) => {
    getChannelAvatar(res.items[0].snippet.channelId).then((data) => {
      j++;
      item = {
        position: -1,
        idle_id: video["server_idle_videos_playback_id"].indexOf(
          res.items[0].id
        ),
        video_id: res.items[0].id,
        video_title: res.items[0].snippet.title,
        video_thumbnail: res.items[0].snippet.thumbnails.default.url,
        video_duration: parseInt(
          moment.duration(res.items[0].contentDetails.duration).format("s")
        ),
        uploaded_by: res.items[0].snippet.channelTitle,
        channel_avatar: data,
        video_views: parseInt(res.items[0].statistics.viewCount),
        published_at: res.items[0].snippet.publishedAt,
        requested_by: "demo",
      };
      json.push(item);
    });
  });
}

setTimeout(() => {
  for (var i = 0; i < json.length; i++) {
    json[i].position = i + 1;
  }
}, 500);

video["video_in_queue"] = json;

async function getYTID() {
  setTimeout(() => {
    const playing_vid = video["video_in_queue"][0].video_id;
    console.log(playing_vid);
    return playing_vid;
  }, 500);
}

setTimeout(() => {
  video["total_videos"] = video["video_in_queue"].length;
}, 700);
setTimeout(() => {
  video["video_in_queue"].sort((a, b) => (a.idle_id > b.idle_id ? 1 : -1));
  for (let i = 0; i < video["video_in_queue"].length; i++) {
    video["video_in_queue"][i].position = i + 1;
  }
}, 600);

video["now_playing_position"] = 1;

video["elapsed_time"] = 0;

async function getMeta() {
  const response = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos?id=" +
      video["server_idle_videos_playback_id"][
        video["now_playing_position"] - 1
      ] +
      "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g&part=contentDetails"
  );
  return response.data;
  // .then(function (response) {
  //   video["current_video_duration"] = moment
  //     .duration(response.data.items[0].contentDetails.duration)
  //     .format("s");
  // });
}

getMeta().then((data) => {
  video["current_video_duration"] = parseInt(
    moment.duration(data.items[0].contentDetails.duration).format("s")
  );
});

setInterval(() => {
  video["elapsed_time"]++;

  if (video["elapsed_time"] >= video["current_video_duration"]) {
    video["elapsed_time"] = 0;
    if (video["now_playing_position"] >= video["total_videos"]) {
      video["now_playing_position"] = 1;
      console.log(video["now_playing_position"]);
    } else {
      video["now_playing_position"]++;
      console.log(video["now_playing_position"]);
    }
    getMeta().then((data) => {
      video["current_video_duration"] = parseInt(
        moment.duration(data.items[0].contentDetails.duration).format("s")
      );
    });
  }

  if (video["now_playing_position"] == video["total_videos"]) {
    video["server_idle_videos_playback_id"] = shuffle(
      video["server_idle_videos_playback_id"]
    );
  }
}, 1000);

var connectCounter = 0;
io.on("connect", function () {
  connectCounter++;
});

io.on("connection", function (socket) {
  console.log("Co nguoi vua ket noi " + socket.id);
  console.log("Total users: " + connectCounter);
  socket.on("disconnect", function () {
    connectCounter--;
    console.log("exit");
  });
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
    video["server_idle_videos_playback_id"].push(id);
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
