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
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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
                voting: {
                  like_count: 0,
                  liked_by: [],
                  disliked_by: [],
                  vote_skip: 0,
                  vote_remove: 0,
                },
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

  // utils.getSnippet("KypuJGsZ8pQ").then(() => {
  setTimeout(() => {
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
        if (
          api["now_playing_position"] > api["total_videos"] ||
          api["now_playing_position"] < 1
        ) {
          api["now_playing_position"] = 1;
          clearInterval(refresh);
          liveServer();
        }
      }
    }, 1000);
    // });
  }, 1500);

  // Users watching counter
  api["users_watching"] = 0;
  api["now_watching"] = [];

  if (params == "clear") clearInterval(refresh);
}

// Here is the websocket part that handle the live events between clients and server

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

var connectCounter = 0;
io.on("connection", function (socket) {
  socket.on("conn", (username) => {
    io.emit("views");
    console.log(`User: ${username} connected!`);
    api["now_watching"].push(username);
    connectCounter = connectCounter + 1;
    console.log("Someone just connected with ID: " + socket.id);
    console.log("Total user(s): " + connectCounter);
    api["users_watching"] = connectCounter;
    api["now_watching"] = api["now_watching"].filter(onlyUnique);
    connectCounter = api["now_watching"].length;
    api["users_watching"] = connectCounter;
  });

  socket.on("discon", (username) => {
    console.log(`User: ${username} disconnected!`);
    api["now_watching"].splice(api["now_watching"].indexOf(username), 1);
    connectCounter--;
    if (connectCounter < 0) {
      connectCounter = 0;
      api["users_watching"] = connectCounter;
    }
    io.emit("views");
    console.log("Total users: " + connectCounter);
    api["users_watching"] = connectCounter;
    if (api["now_watching"].length > api["users_watching"]) {
      api["now_watching"].splice(-1);
    }
  });

  socket.on("disconnect", function () {
    // connectCounter--;
    io.emit("views");
    console.log("Real disconnect! Total users: " + connectCounter);
    // api["users_watching"] = connectCounter;
    // if (api["now_watching"].length > api["users_watching"]) {
    //   api["now_watching"].splice(-1);
    // }
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
    console.log("Server received a video with ID: " + data.id);
    utils.getSnippet(data.id).then((res) => {
      utils.getChannelAvatar(res.items[0].snippet.channelId).then((res2) => {
        api["queue_by_users"].push({
          position: 1,
          is_idle_video: false,
          video_id: data.id,
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
          voting: {
            like_count: 0,
            liked_by: [],
            disliked_by: [],
            vote_skip: 0,
            vote_remove: 0,
          },
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
        api["elapsed_time"] = 0;
      });
    });
  });
});

// Don't forget to run your main function!
liveServer();

// The API is going publicly live!!!!
// But we need to set a timeout for undefined safety

app.get("/live", function (req, res) {
  res.json(api);
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/assets/style", (req, res) => {
  res.sendFile(path.join(__dirname + "/style.css"));
});

app.get("/assets/search", (req, res) => {
  res.sendFile(path.join(__dirname + "/assets/search.png"));
});

app.get("/admin/api/shuffle", function (req, res) {
  liveServer("clear");
  res.send("Shuffled songs successfully!");
});

app.get("/admin/api/client/refresh", function (req, res) {
  res.send("Send refresh emission to users successfully!");
  io.emit("refresh");
});

app.get("/admin/api/client/play", function (req, res) {
  res.send("Send play emission to users successfully!");
  io.emit("play");
});

app.get("/admin/api/songs/reload-order", function (req, res) {
  api["video_in_queue"].forEach((ele, index) => {
    ele.position = index + 1;
  });
  res.send("Reloaded song orders successfully!");
});

app.get("/admin/api/player/forward", function (req, res) {
  api["elapsed_time"] += 10;
  io.emit("refresh");
  res.send("Forwarded 10 seconds successfully!");
});

app.get("/admin/api/player/rewind", function (req, res) {
  api["elapsed_time"] -= 10;
  io.emit("refresh");
  res.send("Rewinded 10 seconds successfully!");
});

app.get("/admin/api/player/next", function (req, res) {
  api["now_playing_position"]++;
  api["elapsed_time"] = 0;
  // If we reach the end of the playlist then reset counters and replay with shuffle
  if (
    api["now_playing_position"] > api["total_videos"] ||
    api["now_playing_position"] < 1
  ) {
    api["now_playing_position"] = 1;
    liveServer("clear");
  } else {
    api["current_video_duration"] =
      api["video_in_queue"][api["now_playing_position"] - 1].video_duration;
    api["now_playing_video_info"] =
      api["video_in_queue"][api["now_playing_position"] - 1];
  }
  io.emit("refresh");
  setTimeout(() => {
    io.emit("play");
  }, 500);
  res.send("Skip song successfully!");
});

app.get("/admin/api/player/previous", function (req, res) {
  api["now_playing_position"]--;
  api["elapsed_time"] = 0;
  api["current_video_duration"] =
    api["video_in_queue"][api["now_playing_position"] - 1].video_duration;
  api["now_playing_video_info"] =
    api["video_in_queue"][api["now_playing_position"] - 1];
  io.emit("refresh");
  setTimeout(() => {
    io.emit("play");
  }, 500);
  res.send("Replayed previous song successfully!");
});

function nowWatching() {
  if (api["now_watching"] != "") {
    return " (" + api["now_watching"].join(", ") + ")";
  } else {
    return "";
  }
}

app.get("/admin/api/status", function (req, res) {
  setTimeout(() => {
    res.send(
      "<div style='width: 100%'>Server status: Up and running for " +
        parseInt(moment.duration(serverUptime, "seconds").asDays()) +
        " day(s) and " +
        moment.utc(serverUptime * 1000).format("HH:mm:ss") +
        "<br>User(s) watching: " +
        connectCounter +
        nowWatching() +
        "<br>Total videos: " +
        api["total_videos"] +
        "<br>Now playing: " +
        (api["now_playing_video_info"] !== undefined &&
        api["now_playing_video_info"].video_title
          ? api["now_playing_video_info"].video_title
          : "Loading...") +
        "<br>Current song position: " +
        api["now_playing_position"] +
        "<br>Current song duration: " +
        api["current_video_duration"] +
        "<br>Elapsed time: " +
        api["elapsed_time"] +
        "</div>"
    );
  }, 500);
});

app.get("/admin/api/queue", function (req, res) {
  res.set("Content-Type", "text/html");
  setTimeout(() => {
    res.send(
      "<ul style='padding: 0; margin: 0'>" +
        api["video_in_queue"]
          .map((vid) => {
            return (
              "<div style='display: flex; flex-direction: row;border: 1px solid black;" +
              (vid.position == api["now_playing_position"] &&
                "background-color: #B0D0FF") +
              "'><img src='" +
              vid.video_thumbnail +
              "' style='margin-right: 15px' /><li style='justify-content: center;display: flex;flex-direction: column;'><b>" +
              vid.video_title +
              "</b><ul><li>Position: " +
              vid.position +
              "</li><li>Duration: " +
              vid.video_duration +
              `<a style="margin-left: 10px" href="javascript:changeSongInQueue(${vid.position})">Play this song!</a></li></ul></li></div><br>`
            );
          })
          .join("") +
        "</ul>"
    );
  }, 1000);
});

app.get("/admin/api/queue/change", function (req, res) {
  var pos = req.query.position;
  api["now_playing_position"] = pos;
  api["current_video_duration"] =
    api["video_in_queue"][api["now_playing_position"] - 1].video_duration;
  api["now_playing_video_info"] =
    api["video_in_queue"][api["now_playing_position"] - 1];
  api["elapsed_time"] = 0;
  setTimeout(() => {
    io.emit("refresh");
  }, 1000);
  setTimeout(() => {
    io.emit("play");
  }, 2500);
  res.send("Successfully changed song!");
});

app.get("/admin/api/songs/change", function (req, res) {
  res.send("Method GET not allowed!");
});

app.post("/admin/api/songs/change", (req, res) => {
  var requestedVideo = req.body.id;
  var requester = req.body.requested_by;
  utils.getSnippet(requestedVideo).then((res) => {
    utils.getChannelAvatar(res.items[0].snippet.channelId).then((res2) => {
      api["video_in_queue"].splice(api["now_playing_position"], 0, {
        position: 1,
        is_idle_video: false,
        video_id: requestedVideo,
        video_title: res.items[0].snippet.title,
        video_thumbnail: res.items[0].snippet.thumbnails.default.url,
        video_duration: parseInt(
          moment.duration(res.items[0].contentDetails.duration).format("s")
        ),
        uploaded_by: res.items[0].snippet.channelTitle,
        channel_avatar: res2.items[0].snippet.thumbnails.default.url,
        video_views: parseInt(res.items[0].statistics.viewCount),
        published_at: res.items[0].snippet.publishedAt,
        requested_by: requester,
        voting: {
          like_count: 0,
          liked_by: [],
          disliked_by: [],
          vote_skip: 0,
          vote_remove: 0,
        },
      });

      // Code that need to be waited right after new video pushed into array
      api["video_in_queue"].forEach((ele, index) => {
        ele.position = index + 1;
      });
      api["now_playing_position"]++;
      api["total_videos"] = api["video_in_queue"].length;
      api["current_video_duration"] =
        api["video_in_queue"][api["now_playing_position"] - 1].video_duration;
      api["now_playing_video_info"] =
        api["video_in_queue"][api["now_playing_position"] - 1];
      api["elapsed_time"] = 0;
    });
  });
  setTimeout(() => {
    io.emit("refresh");
  }, 1000);
  setTimeout(() => {
    io.emit("play");
  }, 2500);
  res.set("Content-Type", "text/html");
  res.send(
    "Your video: <b>" +
      requestedVideo +
      "</b> has been updated to now playing song!"
  );
});

app.post("/admin/api/songs/vote/like", function (req, res) {
  res.send("Added like to video successfully!");
});

app.get("/admin/api/songs/search", function (req, res) {
  var query = encodeURI(req.query.query);
  if (!query) query = "";
  res.set("Content-Type", "text/html");
  utils.getSearchResults(query).then((data) => {
    res.send(
      data.items
        .map((vid) => {
          return (
            "<div style='display: flex; flex-direction: row;border: 1px solid black'><img src='" +
            vid.snippet.thumbnails.default.url +
            "' style='margin-right: 15px' /><li style='justify-content: center;display: flex;flex-direction: column;'><b>" +
            vid.snippet.title +
            "</b><ul><li>Uploaded by: " +
            vid.snippet.channelTitle +
            `</li><li><a href="javascript:play('${vid.id.videoId}')">Play this song!</a></li></ul></li></div><br>`
          );
        })
        .join("")
    );
  });
});

app.get("/admin/api/songs/search/suggest", function (req, res) {
  var query = encodeURI(req.query.query);
  if (!query) query = "";
  res.set("Content-Type", "text/html");
  utils.getSuggestQueries(query).then((data) => {
    res.send(
      "<style>body {margin: 0}</style>" +
        JSON.parse(data)[1]
          .map((ele) => {
            return `<div class="hover-search" onclick="search('${ele}')">${ele}</div>`;
          })
          .join("")
    );
  });
});

app.get("/admin/api/server/ping", function (req, res) {
  res.send("Server is up");
});

app.get("/admin/api/server/restart", function (req, res) {
  res.send("Restarting server...");
  process.exit(0);
});

app.get("/admin/api/server/shutdown", function (req, res) {
  res.send("Shutting server down ...");
  exec("pm2-runtime stop server.js");
});

// always put this code at bottom for 404 handling
app.get("/*", function (req, res) {
  var requestedUrl = req.protocol + "://" + req.get("Host") + req.url;
  res.send(
    "Enter correct API link!<br>Your url: " +
      requestedUrl +
      " does not match any of our URL routes!"
  );
});
