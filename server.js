var express = require("express");
var moment = require("moment");
require("moment-duration-format");
const path = require("path");
const axios = require("axios");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
require("dotenv").config();
var exec = require("child_process").exec;
var utils = require("./utils");

const api = {};
let serverUptime = 0;
setInterval(() => {
  serverUptime++;
}, 1000);
var server_port = process.env.YOUR_PORT || process.env.PORT || 6969;
var server_host = process.env.YOUR_HOST || "0.0.0.0";
server.listen(server_port, server_host, function () {
  console.log(
    "C4K60 Live Radio Server is up and running at port: %d",
    server_port
  );
});

async function liveServer(params) {
  // Getting idle videos info from PHP server
  const idle = await axios.get("https://api.c4k60.com/v1.0/radio/idle");
  let getIdle = new Promise((resolve, reject) => {
    if (idle.data.idle_playlist) {
      resolve(idle.data.idle_playlist);
    } else {
      reject("Can't connect to server!");
    }
  });

  api["video_in_queue"] = [];

  getIdle
    .then((data) => {
      api["server_idle_videos_playback_id"] = data;
      api["total_idle_videos"] = data.length;
      for (const video of api["server_idle_videos_playback_id"]) {
        utils.getSnippet(video).then((res) => {
          utils
            .getChannelAvatar(res.items[0].snippet.channelId)
            .then((res2) => {
              api["video_in_queue"].push({
                position:
                  api["server_idle_videos_playback_id"].indexOf(video) + 1,
                idle_id: api["server_idle_videos_playback_id"].indexOf(video),
                is_idle_video: true,
                video_id: video,
                video_title: res.items[0].snippet.title,
                video_thumbnail: res.items[0].snippet.thumbnails.default.url,
                video_duration: parseInt(
                  moment
                    .duration(res.items[0].contentDetails.duration)
                    .format("s")
                ),
                uploaded_by: res.items[0].snippet.channelTitle,
                channel_avatar: res2.items[0].snippet.thumbnails.default.url,
                video_views: parseInt(res.items[0].statistics.viewCount),
                published_at: res.items[0].snippet.publishedAt,
                requested_by: "Dương Tùng Anh",
              });

              // Code that need to be waited and refreshed right after new video pushed into array
              api["video_in_queue"] = utils.shuffle(api["video_in_queue"]);
              reloadOrder();
              api["total_videos"] = api["video_in_queue"].length;
              api["current_video_duration"] =
                api["video_in_queue"][
                  api["now_playing_position"] - 1
                ].video_duration;
              api["now_playing_video_info"] = api["video_in_queue"][0];
            });
        });
      }
    })
    .catch((err) => console.log(err));

  // Init counters first
  api["queue_by_users"] = [];
  api["now_playing_position"] = 1;
  api["current_video_duration"] = 0;
  api["elapsed_time"] = 0;

  // The function that reload the queue order
  function reloadOrder() {
    api["video_in_queue"].forEach((ele, index) => {
      ele.position = index + 1;
    });
  }

  // The magic of live radio happens here ^^
  var refresh = setInterval(() => {
    // Increase elapsed time by one second
    api["elapsed_time"]++;
    // If elapsed time exceeds current video duration then change to the next song
    if (api["elapsed_time"] >= api["current_video_duration"]) {
      // Reset the elapsed time counter
      api["elapsed_time"] = 0;
      // Increase the position
      api["now_playing_position"]++;
      // Refresh our stats
      api["current_video_duration"] =
        api["video_in_queue"][api["now_playing_position"] - 1].video_duration;
      api["now_playing_video_info"] =
        api["video_in_queue"][api["now_playing_position"] - 1];
      // If we reach the end of the playlist then reset counters and replay with shuffle
      if (api["now_playing_position"] > api["total_videos"]) {
        api["now_playing_position"] = 1;
        clearInterval(refresh);
        liveServer();
      }
    }
  }, 1000);

  // Users watching counter
  api["users_watching"] = 0;
  api["now_watching"] = [];
}

var connectCounter = 0;
io.on("connect", function () {
  connectCounter++;
});

io.on("connection", function (socket) {
  socket.on("conn", (username) => {
    console.log(`User: ${username} connected!`);
    api["now_watching"].push(username);
  });
  console.log("Someone just connected with ID: " + socket.id);
  console.log("Total user(s): " + connectCounter);
  api["users_watching"] = connectCounter;

  socket.on("disconnect", function () {
    socket.on("disconn", (username) => {
      console.log(`User: ${username} disconnected!`);
      api["now_watching"].splice(api["now_watching"].indexOf(username), 1);
    });
    connectCounter--;
    console.log("Total users: " + connectCounter);
    api["users_watching"] = connectCounter;
  });

  socket.on("chat-message", (data) => {
    console.log(data.username + ": " + data.message);
    io.emit("chat-message", {
      name: data.name,
      username: data.username,
      message: data.message,
    });
  });

  socket.on("add-queue", (data) => {
    console.log("Server received a video with ID: " + id);
    utils.getSnippet(data.id).then((res) => {
      utils.getChannelAvatar(res.items[0].snippet.channelId).then((res2) => {
        api["queue_by_users"].push({
          position: 1,
          is_idle_video: false,
          video_id: id,
          video_title: res.items[0].snippet.title,
          video_thumbnail: res.items[0].snippet.thumbnails.default.url,
          video_duration: parseInt(
            moment.duration(res.items[0].contentDetails.duration).format("s")
          ),
          uploaded_by: res.items[0].snippet.channelTitle,
          channel_avatar: res2.items[0].snippet.thumbnails.default.url,
          video_views: parseInt(res.items[0].statistics.viewCount),
          published_at: res.items[0].snippet.publishedAt,
          requested_by: data.requester,
        });

        // Code that need to be waited right after new video pushed into array
        api["queue_by_users"].forEach((ele, index) => {
          ele.position = index + 1;
        });
        api["total_videos"] = api["video_in_queue"].length;
        api["current_video_duration"] =
          api["video_in_queue"][api["now_playing_position"] - 1].video_duration;
        api["now_playing_video_info"] = api["video_in_queue"][0];
        api["video_in_queue"].unshift(api["queue_by_users"]);
      });
    });
  });
});

// Don't forget to run your main function!
liveServer();

// The API is going publicly live!!!!
app.get("/live", function (req, res) {
  res.json(api);
});
