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

const video = {};
let serverUptime = 0;
setInterval(() => {
  serverUptime++;
}, 1000);
var server_port = process.env.YOUR_PORT || process.env.PORT || 2222;
var server_host = process.env.YOUR_HOST || "0.0.0.0";
server.listen(server_port, server_host, function () {
  console.log("Server is up and running at port: %d", server_port);
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

function main(setting) {
  video["server_idle_videos_playback_id"] = new Array(
    "KypuJGsZ8pQ",
    "UVbv-PJXm14",
    "PNhYz6RmIr4",
    "hTGcMk_QXEg",
    "ixdSsW5n2rI",
    "0GVExpdmoDs",
    "cIGCSUBWfs8",
    "yET2SBRuNm0",
    "4oSd9bMUpEY",
    "faSVTByG0LQ",
    "DJN4SovWq7Q",
    "DcCISK3sCYg",
    "d6vkQ7D2Vb8",
    "oNS48yhxqVE",
    "Yw9Ra2UiVLw",
    "p40OWOxAeSw",
    "toYnme_NPgY",
    "C-NsSDZydFM",
    "XXYlFuWEuKI",
    "fHI8X4OXluQ",
    "F_wnnbInzSE",
    "HTSqRkVpL9E",
    "LvNEPB5x7T8",
    "HViOPRTO324",
    "xvpverLphlo",
    "W08NL1mchhs",
    "8UVNT4wvIGY",
    "Pw-0pbY9JeU",
    "0t2tjNqGyJI",
    "PbP-aIe51Ek",
    "kg1BljLu9YY",
    "6o5ZMiyabj8",
    "i-qVse0-j38",
    "j65ER9DWITE",
    "kTJczUoc26U",
    "ZqDBgYPpUTg",
    "TkYVBTEMC5s",
    "9lwYQO5BDM4"
  );

  video["server_idle_videos_playback_id"] = shuffle(
    video["server_idle_videos_playback_id"]
  );

  var json = [],
    j = 0;

  video["elapsed_time"] = 0;

  function initPlaylist() {
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
            requested_by: "Dương Tùng Anh",
          };
          json.push(item);
        });
      });
    }
  }

  function reloadOrder() {
    for (var i = 0; i < video["video_in_queue"].length; i++) {
      video["video_in_queue"][i].position = i + 1;
    }
  }

  setTimeout(() => {
    for (var i = 0; i < json.length; i++) {
      json[i].position = i + 1;
    }
    if (video["video_in_queue"].length == 0) {
      initPlaylist();
    }
    reloadOrder();
  }, 500);

  video["video_in_queue"] = json;

  setTimeout(() => {
    video["total_videos"] = video["video_in_queue"].length;
  }, 1200);
  setTimeout(() => {
    video["video_in_queue"].sort((a, b) => (a.idle_id > b.idle_id ? 1 : -1));
    for (let i = 0; i < video["video_in_queue"].length; i++) {
      video["video_in_queue"][i].position = i + 1;
    }
  }, 1600);

  function setPlaying() {
    setTimeout(() => {
      video["now_playing_video_info"] =
        video["video_in_queue"][video["now_playing_position"] - 1];
    }, 2000);
  }

  setPlaying();

  video["now_playing_position"] = 1;

  async function getMeta(setting) {
    if (setting == "add") {
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos?id=" +
          video["video_in_queue"][video["now_playing_position"] - 1] +
          "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g&part=contentDetails"
      );
      return response.data;
    } else {
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/videos?id=" +
          video["server_idle_videos_playback_id"][
            video["now_playing_position"] - 1
          ] +
          "&key=AIzaSyC9ebtzLwLdMmdSM9pMAHTm8FHTRLuF20g&part=contentDetails"
      );
      return response.data;
    }
  }

  // getMeta().then((data) => {
  //   video["current_video_duration"] = parseInt(
  //     moment.duration(data.items[0].contentDetails.duration).format("s")
  //   );
  // });

  setTimeout(() => {
    video["current_video_duration"] =
      video["video_in_queue"][video["now_playing_position"] - 1].video_duration;
  }, 3000);

  var interval = setInterval(() => {
    video["elapsed_time"]++;

    if (video["elapsed_time"] >= video["current_video_duration"]) {
      //testing
      video["current_video_duration"] =
        video["video_in_queue"][
          video["now_playing_position"] - 1
        ].video_duration;
      video["elapsed_time"] = 0;
      setPlaying();
      if (video["now_playing_position"] >= video["total_videos"]) {
        video["now_playing_position"] = 1;
        clearInterval(interval);
        video["video_in_queue"] = shuffle(video["video_in_queue"]);
        reloadOrder();
        main();
      } else {
        video["now_playing_position"]++;
        setPlaying();
      }
    }

    if (video["now_playing_position"] == video["total_videos"]) {
      video["server_idle_videos_playback_id"] = shuffle(
        video["server_idle_videos_playback_id"]
      );
    }
  }, 1000);

  if (setting == "clear") {
    clearInterval(interval);
    setTimeout(() => {
      video["current_video_duration"] =
        video["video_in_queue"][
          video["now_playing_position"] - 1
        ].video_duration;
      video["total_videos"] = video["video_in_queue"].length;
    }, 1700);
  }
  setTimeout(() => {
    video["total_videos"] = video["video_in_queue"].length;
  }, 1700);
}

var connectCounter = 0;
io.on("connect", function () {
  connectCounter++;
});

io.on("connection", function (socket) {
  console.log("Someone just connected with ID: " + socket.id);
  console.log("Total user(s): " + connectCounter);
  video["users_watching"] = connectCounter;
  socket.on("disconnect", function () {
    connectCounter--;
    console.log("Total users: " + connectCounter);
    video["users_watching"] = connectCounter;
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

setTimeout(() => {
  app.get("/live", function (req, res) {
    res.json(video);
  });

  app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
  });

  app.get("/assets/style", (req, res) => {
    res.sendFile(path.join(__dirname + "/style.css"));
  });

  app.get("/admin/api/shuffle", function (req, res) {
    main("clear");
    res.send("Shuffled songs successfully!");
  });

  app.get("/admin/api/status", function (req, res) {
    setTimeout(() => {
      res.send(
        "Server status: Up and running for " +
          parseInt(moment.duration(serverUptime, "seconds").asDays()) +
          " day(s) and " +
          moment.utc(serverUptime * 1000).format("HH:mm:ss") +
          "<br>User(s) watching: " +
          connectCounter +
          "<br>Total videos: " +
          video["total_videos"] +
          "<br>Now playing: " +
          (video["now_playing_video_info"].video_title
            ? video["now_playing_video_info"].video_title
            : "Loading...") +
          "<br>Current song position: " +
          video["now_playing_position"] +
          "<br>Current song duration: " +
          video["current_video_duration"] +
          "<br>Elapsed time: " +
          video["elapsed_time"]
      );
    }, 500);
  });

  app.get("/admin/api/queue", function (req, res) {
    res.set("Content-Type", "text/html");
    res.send(
      "<ul style='padding: 0; margin: 0;margin-top: 15px'>" +
        video["video_in_queue"]
          .map((vid) => {
            return (
              "<div style='display: flex; flex-direction: row;border: 1px solid black'><img src='" +
              vid.video_thumbnail +
              "' style='margin-right: 15px' /><li style='justify-content: center;display: flex;flex-direction: column;'><b>" +
              vid.video_title +
              "</b><ul><li>Position: " +
              vid.position +
              "</li><li>Duration: " +
              vid.video_duration +
              "</li></ul></li></div><br>"
            );
          })
          .join("") +
        "</ul>"
    );
  });

  app.get("/admin/api/songs/change/*", function (req, res) {
    var requestedUrl = req.url;
    var requestedVideo =
      requestedUrl.split("/")[requestedUrl.split("/").length - 1];
    res.set("Content-Type", "text/html");
    res.send(
      "Your video: <b>" +
        requestedVideo +
        "</b> has been updated to now playing song!"
    );
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
}, 2000);

main();
