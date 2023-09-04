const Http = new XMLHttpRequest();
const url='https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json';
Http.open("GET", url);
Http.send();

Http.onreadystatechange = (e) => {
  let output = ""
  y = JSON.parse(JSON.stringify(Http.responseText))
  y = JSON.parse(y)
  

  y["regions"].forEach(regions => {
  
    regions["cidrs"].forEach(cidrs => {
      output = output.concat(cidrs["cidr"], "\n")
    });
  });

  document.getElementById("output").innerHTML = output;
}



