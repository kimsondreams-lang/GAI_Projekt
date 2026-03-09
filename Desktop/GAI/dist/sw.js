/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "template.html",
    "revision": "3327ac9cffa5b11b08941f5da1f8e939"
  }, {
    "url": "index.html",
    "revision": "7800e983471e019972414847b5e08a85"
  }, {
    "url": "favicon.ico",
    "revision": "08e145569d678b32cfa634874af0a2eb"
  }, {
    "url": "article_template.html",
    "revision": "197a5e72ce01edc30fceb6e35a71625b"
  }, {
    "url": "article.html",
    "revision": "4fcc7647fef614d44db546dd5380b2cc"
  }, {
    "url": "js/main.js",
    "revision": "ee74654f66293a642e14fd97cec589e1"
  }, {
    "url": "js/articles-data.js",
    "revision": "05c87299024f7327e37c43f6e88711b8"
  }, {
    "url": "js/analytics.js",
    "revision": "e0442dd5e2957810e8e84b2f255f3041"
  }, {
    "url": "images/logo.png",
    "revision": "e56054dfded9e3f1ccb0daac93f11c44"
  }, {
    "url": "images/articles/placeholder.png",
    "revision": "b1a371542c3653ed4acfd57aeb7b8a36"
  }, {
    "url": "images/articles/generated/top-time-management-apps-for-freelancers-2025-fallback-0.svg",
    "revision": "b0292923b8e4c1283828387fd0bbc7d7"
  }, {
    "url": "images/articles/generated/top-5-powerbanks-2025-fallback-1.svg",
    "revision": "f1d94f34ffc6c496d22c764511b5dd75"
  }, {
    "url": "images/articles/generated/top-5-powerbanks-2025-fallback-0.svg",
    "revision": "f1d94f34ffc6c496d22c764511b5dd75"
  }, {
    "url": "images/articles/generated/smart-home-innovative-gadgets-2025-fallback-2.svg",
    "revision": "c9e9861292991ec7449df25ad9a3e8f0"
  }, {
    "url": "images/articles/generated/smart-home-innovative-gadgets-2025-fallback-1.svg",
    "revision": "c9e9861292991ec7449df25ad9a3e8f0"
  }, {
    "url": "images/articles/generated/smart-home-innovative-gadgets-2025-fallback-0.svg",
    "revision": "c9e9861292991ec7449df25ad9a3e8f0"
  }, {
    "url": "images/articles/generated/holiday-tech-gift-guide-2025-gen-2.svg",
    "revision": "ba1e2fc92f58cdb39c70edc842f57409"
  }, {
    "url": "images/articles/generated/holiday-tech-gift-guide-2025-gen-1.svg",
    "revision": "ba1e2fc92f58cdb39c70edc842f57409"
  }, {
    "url": "images/articles/generated/holiday-tech-gift-guide-2025-fallback-0.svg",
    "revision": "ba1e2fc92f58cdb39c70edc842f57409"
  }, {
    "url": "images/articles/generated/best-sports-smartwatches-2025-fallback-2.svg",
    "revision": "eba15f43d1ad4910db148a708cd89b66"
  }, {
    "url": "images/articles/generated/best-sports-smartwatches-2025-fallback-1.svg",
    "revision": "eba15f43d1ad4910db148a708cd89b66"
  }, {
    "url": "images/articles/generated/best-sports-smartwatches-2025-fallback-0.svg",
    "revision": "eba15f43d1ad4910db148a708cd89b66"
  }, {
    "url": "images/articles/generated/best-smartphones-mobile-photography-2025-fallback-2.svg",
    "revision": "743f80cc872be02f51bc46008cb255d9"
  }, {
    "url": "images/articles/generated/article9-fallback-2.svg",
    "revision": "4d2ea1c7c01b1e4b0c26b72767117a7d"
  }, {
    "url": "images/articles/generated/article8-fallback-2.svg",
    "revision": "54ca6aaacabe03a62694ae79d0242f30"
  }, {
    "url": "images/articles/generated/article8-fallback-1.svg",
    "revision": "54ca6aaacabe03a62694ae79d0242f30"
  }, {
    "url": "images/articles/generated/7-gen-2.svg",
    "revision": "4e1b2692c9e8383c2760c28d3dbadf61"
  }, {
    "url": "images/articles/generated/7-gen-1.svg",
    "revision": "4e1b2692c9e8383c2760c28d3dbadf61"
  }, {
    "url": "images/articles/generated/5-gen-2.svg",
    "revision": "74ba0e10d1f32cc76b8a26a6f4d0fbf5"
  }, {
    "url": "images/articles/generated/5-gen-1.svg",
    "revision": "74ba0e10d1f32cc76b8a26a6f4d0fbf5"
  }, {
    "url": "images/articles/generated/3-fallback-2.svg",
    "revision": "7425a2908ca126fe523f0a461dd5ea5b"
  }, {
    "url": "images/articles/generated/2-gen-2.svg",
    "revision": "628bb29709a1a3444a84f56a5699d94b"
  }, {
    "url": "images/articles/generated/2-gen-1.svg",
    "revision": "628bb29709a1a3444a84f56a5699d94b"
  }, {
    "url": "data/articles-data.js",
    "revision": "439ac9451c7b747613ebb1d6cc287116"
  }, {
    "url": "css/tailwind.min.css",
    "revision": "83a60ace236419975be379394c7960e7"
  }, {
    "url": "css/styles.css",
    "revision": "a2a7a80021d41022d743ecbe0b62edd4"
  }, {
    "url": "css/design-system.css",
    "revision": "eb20acd0cbf9e282f1e84374fb5b3798"
  }, {
    "url": "css/article.css",
    "revision": "12b7ba8f946103fc80693acfe822c8b5"
  }, {
    "url": "css/amazon-cta.css",
    "revision": "bf0726ff3a31fed2843115a0d57299d6"
  }, {
    "url": "assets/workbox-window.prod.es5-vqzQaGvo.js",
    "revision": null
  }, {
    "url": "assets/index-Dc-MhQlz.js",
    "revision": null
  }, {
    "url": "manifest.webmanifest",
    "revision": "6485e31ea8a15e33a46e58eef52b0800"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
