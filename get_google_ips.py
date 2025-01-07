import requests
import json
from bs4 import BeautifulSoup


url="https://www.gstatic.com/ipranges/goog.json"
r = requests.get(url)
y = json.loads(r.text)

output = ""
for prefix in y["prefixes"]:
        if "ipv4Prefix" in prefix:
            output+= prefix["ipv4Prefix"] + " \n"

file = "edlgoogle.html"
with open(file, mode="r") as f:
    html_code = f.read()
soup = BeautifulSoup(html_code, "html.parser")
pre_id = soup.find("pre", id="output")
pre_id.string = output

with open(file, "w") as f:
   f.write(str(soup))
pass