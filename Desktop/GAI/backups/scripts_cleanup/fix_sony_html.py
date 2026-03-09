import json
path = 'data/articles/sony-wh-1000xm5-review.json'
with open(path, 'r') as f:
    data = json.load(f)
data['content'] = data['content'].replace('sony-wh-1000xm5-black.jpg', 'sony-xm5-black.jpg')
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
print('Updated Sony HTML content.')
