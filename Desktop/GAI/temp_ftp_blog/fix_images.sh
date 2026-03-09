#!/bin/bash
# Fix duplicate images in articles.json using jq

jq '
  map(
    if .id == "2026-march-wearable-health-guide" then .image = "images/articles/apple-watch-s10-main.jpg"
    elif .id == "2026-high-performance-laptop-guide" then .image = "images/articles/asus-rog-zephyrus-g14.jpg"
    elif .id == "2026-wearable-tech-health-gadgets-guide" then .image = "images/articles/apple-watch-ultra-2.jpg"
    elif .id == "2026-flagship-smartphone-guide" then .image = "images/articles/iphone-16-pro-max.jpg"
    elif .id == "2025-flagship-smartphone-guide" then .image = "images/articles/iphone-15-pro-max.jpg"
    elif .id == "may-2025-tech-gift-guide" then .image = "images/articles/may-2026-tech-lifestyle-main.jpg"
    elif .id == "best-tech-gadgets-amazon-2025" then .image = "images/articles/smart-home-gadgets-2025.jpg"
    elif .id == "sony-wh-1000xm5-review" then .image = "images/articles/sony-xm5-black.jpg"
    elif .id == "iphone-16-pro-max-review" then .image = "images/articles/iphone-17-pro-max-performance.jpg"
    else .
    end
  )
' articles.json > articles.json.tmp && mv articles.json.tmp articles.json
