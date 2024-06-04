import requests
import json
from bs4 import BeautifulSoup


url="https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json"
r = requests.get(url)
y = json.loads(r.text)

output = ""
for cidrs in y["regions"]:
    for cidr in cidrs["cidrs"]:
        output+= cidr["cidr"] + " \n"

file = "edlocitest.html"
with open(file, mode="r") as f:
    html_code = f.read()
soup = BeautifulSoup(html_code, "html.parser")
pre_id = soup.find("pre", id="output")
pre_id.string = output

with open("edlocitest.html", "w") as f:
   f.write(str(soup))
pass