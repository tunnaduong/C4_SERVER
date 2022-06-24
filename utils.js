const axios = require("axios");

const API_KEYS = [
  "AIzaSyBL0rVQiEE83XpSw5HNad8SvIltQtHa7bA",
  "AIzaSyA2-LY3jRpNm1ycJ_ribbSOvOr99wMQQqA",
  "AIzaSyAKLubflIVrPOTU6KOIpkWqGXdWTp7dEEI",
  "AIzaSyC9_pzo_I_4kLwD8FSm5ZHdvlZRFDA8YsI",
];

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
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${API_KEYS[3]}`
  );
  return response.data;
}

async function getChannelAvatar(id) {
  const response = await axios.get(
    `https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${id}&key=${API_KEYS[3]}`
  );
  return response.data;
}

async function getSearchResults(query) {
  const response = await axios.get(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&key=${API_KEYS[3]}&q=${query}`
  );
  return response.data;
}

async function getSuggestQueries(query) {
  const response = await axios.get(
    `http://suggestqueries.google.com/complete/search?q=${query}&client=firefox`
  );
  return response.data;
}

module.exports = {
  shuffle,
  getSnippet,
  getChannelAvatar,
  getSearchResults,
  getSuggestQueries,
};
