popoverParserOptions = {"trigger": "click"}
$('#parser').popover(popoverParserOptions)

function valueEnd(ctx) {
    const value = ctx.options.typed ? inferType(ctx.value) : ctx.value
    ctx.entry.push(ctx.reviver(value, ctx.row, ctx.col))
    ctx.value = ''
    ctx.col++
}

function entryEnd(ctx) {
    ctx.output.push(ctx.entry)
    ctx.entry = []
    ctx.row++
    ctx.col = 1
}

function inferType(value) {
    const isNumber = /.\./

    switch (true) {
        case value === 'true':
        case value === 'false':
            return value === 'true'
        case isNumber.test(value):
            return parseFloat(value)
        case isFinite(value):
            return parseInt(value)
        default:
            return value
    }
}
function parse(csv, options, reviver = v => v) {
    const ctx = Object.create(null)
    ctx.options = options || {}
    ctx.reviver = reviver
    ctx.value = ''
    ctx.entry = []
    ctx.output = []
    ctx.col = 1
    ctx.row = 1

    const lexer = /"|,|\r\n|\n|\r|[^",\r\n]+/y
    const isNewline = /^(\r\n|\n|\r)$/

    let matches = []
    let match = ''
    let state = 0

    while ((matches = lexer.exec(csv)) !== null) {
        match = matches[0]

        switch (state) {
            case 0: // start of entry
                switch (true) {
                    case match === '"':
                        state = 3
                        break
                    case match === ',':
                        state = 0
                        valueEnd(ctx)
                        break
                    case isNewline.test(match):
                        state = 0
                        valueEnd(ctx)
                        entryEnd(ctx)
                        break
                    default:
                        ctx.value += match
                        state = 2
                        break
                }
                break
            case 2: // un-delimited input
                switch (true) {
                    case match === ',':
                        state = 0
                        valueEnd(ctx)
                        break
                    case isNewline.test(match):
                        state = 0
                        valueEnd(ctx)
                        entryEnd(ctx)
                        break
                    default:
                        state = 4
                        throw Error(`CSVError: Illegal state [row:${ctx.row}, col:${ctx.col}]`)
                }
                break
            case 3: // delimited input
                switch (true) {
                    case match === '"':
                        state = 4
                        break
                    default:
                        state = 3
                        ctx.value += match
                        break
                }
                break
            case 4: // escaped or closing delimiter
                switch (true) {
                    case match === '"':
                        state = 3
                        ctx.value += match
                        break
                    case match === ',':
                        state = 0
                        valueEnd(ctx)
                        break
                    case isNewline.test(match):
                        state = 0
                        valueEnd(ctx)
                        entryEnd(ctx)
                        break
                    default:
                        throw Error(`CSVError: Illegal state [row:${ctx.row}, col:${ctx.col}]`)
                }
                break
        }
    }

    // flush the last value
    if (ctx.entry.length !== 0) {
        valueEnd(ctx)
        entryEnd(ctx)
    }

    return ctx.output
}
function csv2text(csv) {
    var parsed;
    parsed = parse(csv)
    return parsed
}



//read file 1
//set traffic_report
var traffic_report;
var fr = new FileReader();

fr.onload = function () {
    traffic_report = (csv2text(fr.result));
    console.log("Report loaded")
    parseReport(traffic_report)
    console.log("Report Parsed")
}
document.getElementById('inputfile')
    .addEventListener('change', function () {
        fr.readAsText(this.files[0]);
        //you can read the output in fr.result
    })

//set global applicationsMap
var applicationsMap;
function parseReport(csvArray) {
    var ruleHeader;
    var appHeader;


    for (var j = 0; j < csvArray[0].length; j++) {
        if (csvArray[0][j] == "Rule") {
            ruleHeader = j
        }
        if (csvArray[0][j] == "Application") {
            appHeader = j
        }
    }
    var app;
    const appMap = new Map();

    var blacklist = document.getElementById("blacklist").value.split(" ");
    const blacklistSet = new Set(blacklist);

    //skip header i=1
    for (var i = 1; i < csvArray.length; i++) {
        app = csvArray[i][appHeader]
        rule = csvArray[i][ruleHeader]
        if (blacklistSet.has(app)) {
            continue
        }
        if (appMap.has(rule)) {
            appArray = appMap.get(rule).add(app)
        }
        else {
            const appSet = new Set();
            appSet.add(app)
            appMap.set(rule, appSet)

        }
    }
    // appMap now has map of rule -> [app1, app2..]
    applicationsMap = appMap
}

//read file 2
var csvNetworks
var fr2 = new FileReader();
fr2.onload = function () {
    csvNetworks = (csv2text(fr2.result));
    console.log("Loaded Networks")

    //TODO: fillTrie
    fillTrie(csvNetworks)
    console.log("Loaded Route table")
}
document.getElementById('networks')
    .addEventListener('change', function () {
        fr2.readAsText(this.files[0]);
        //you can read the output in fr.result
    })

    
document.getElementById("submitbutton").addEventListener("click", create_tuple_rules);

document.getElementById("copybutton").addEventListener("click", copyText);

function copyText() {
    // Get the text field
    var copyText = document.getElementById("output");
  
    // Select the text field
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices
  
     // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.value);
  
  }

function createSetCommands() {

    // Report: src, dst, dstport 
    // Do longest prefix match of src, dst and create rules per src and dst
    // Dont duplicate rules, if multiple ports add to the same rule
    // Optimize rules yes or no? dunno (checkbox from user) default: NO

    parseReport(csvArray);
    if (RuleBase == null || applicationsMap == null) {
        //todo
        return
    }

    var nameHeader;
    var applicationColumn;
    var LocationColumn;
    var device_group = document.getElementById("dg").value;
    var rulebase_stored = document.getElementById("rulebase_store").value;
    

    //get columns for parsing
    for (var j = 0; j < RuleBase[0].length; j++) {
        if (RuleBase[0][j] == "Name") {
            nameHeader = j
        }
        if (RuleBase[0][j] == "Application") {
            applicationColumn = j
        }
        if (RuleBase[0][j] == "Location") {
            LocationColumn = j
        }
    }
    var rulesObject = {}
    var rulenamesArray = [];

    //skip header i=1
    for (var i = 1; i < RuleBase.length; i++) {
        //filter rules not in device group!
        if (RuleBase[i][LocationColumn] != device_group){
            continue;
        }

        //add Rule names to rulenamesArray
        rulenamesArray.push(RuleBase[i][nameHeader])
        
        rulesObject[RuleBase[i][nameHeader]] = {
            Application: RuleBase[i][applicationColumn]
        }
    }

    const rulenamesSet = new Set(rulenamesArray);

    

    var output = "";
    output += `set shared tag "Appid-Old"\n`
    output += `set shared tag "Appid-New"\n`

    for (let [rulename, applications] of applicationsMap) {
        //console.log(key + " = " + value);
        applications = Array.from(applications);
        if (rulename.startsWith("[Disabled]")) {
            continue
        }

        if (!(rulenamesSet.has(rulename))) {
            continue
        }
        var appid;
        appid = rulesObject[rulename]["Application"]

        if (appid != "any") {
            continue
        }
        var rule_suffix;
        rule_suffix = document.getElementById("suffix").value
        if (rulename.endsWith(rule_suffix)) {
            continue
        }
        var new_rulename;
        var max_length = 63 - rule_suffix.length;
        new_rulename = rulename.slice(0, max_length) + rule_suffix

        var new_rule = 1;
        if (rulenamesSet.has(new_rulename)) {
            new_rule = 0;
            appid_old = rulesObject[new_rulename]["Application"].split(";")
            applications.push(...appid_old)
        }

        applications = applications.join(" ")

        var copy_command = `copy device-group ${device_group} ${rulebase_stored} security rules "${rulename}" to "${new_rulename}`.repeat(new_rule)
        var move_command = `move device-group ${device_group} ${rulebase_stored} security rules "${new_rulename}" before "${rulename}"`.repeat(new_rule)
        var removeany_command = `delete device-group ${device_group} ${rulebase_stored} security rules "${new_rulename}" application any`
        var addApps_command = `set device-group ${device_group} ${rulebase_stored} security rules "${new_rulename}" application [ ${applications} ]`
        var addtag1 = `set device-group ${device_group} ${rulebase_stored} security rules "${rulename}" tag "Appid-Old"`
        var addtag2 = `set device-group ${device_group} ${rulebase_stored} security rules "${new_rulename}" tag "Appid-New"`
        
        output += `${copy_command}\n`
        output += `${move_command}\n`
        output += `${removeany_command}\n`
        output += `${addApps_command}\n`
        output += `${addtag1}\n`
        output += `${addtag2}\n`

    }
    const element = document.getElementById("output")
    element.innerHTML = `${output}`

}

function ipv4tobin(ipv4){
    var binary;
    const octets = ipv4.split(".");
    const binStrings = octets.map(n => parseInt(n).toString(2).padStart(8,"0"))
    binary = binStrings.join("")
    return binary
}
function cidr2bin(cidr){
    var ipArray = cidr.split("/")
    if(ipArray.length === 1){
        ipArray.push("32");
    }
    ipArray[0] = ipv4tobin(ipArray[0]);
    BinaryRoute = ipArray[0].slice(0,parseInt(ipArray[1]));
    return BinaryRoute
}
function Node(key, value){
    this.key = key
    this.count = 0
    this.value = value  || "None"
    this.isEndOfWord = false // false by default, a green node means this flag is true
    this.children = {} // children are stored as Map, where key is the letter and value is a TrieNode for that letter 
}

class Trie{
    constructor(){
        this.root = new Node(null)
    }

    insert(word, value){
        let current = this.root
        // iterate through all the characters of word
        for(let character of word){
            // if node doesn't have the current character as child, insert it
            if(current.children[character] === undefined){
                current.children[character] = new Node(character)

                
            }

            //add to count
            current.count += 1
            // move down, to insert next character
            current = current.children[character]  
        }
        // mark the last inserted character as end of the word
        current.isEndOfWord = true
        current.value = value
    }

    search(word){
        let current = this.root
        // iterate through all the characters of word
        for(let character of word){
            if(current.children[character] === undefined){
                // could not find this character in sequence, return false
                return false
            }
            // move down, to match next character
            current = current.children[character]  
        }
        // found all characters, return true if last character is end of a word
        return current.isEndOfWord
    }
    
    longest_prefix_match(word){
        let current = this.root;
        let match;
        //iterate trough each character of the word
        for(let character of word){
            if(current.children[character] === undefined){
                return match;
            }
            current = current.children[character];
            if(current.isEndOfWord){
                match = current;
            }
        }
        return match;
    }

    get_likely_subnet(binary_address){
        let current = this.root
        let match = null;
        level = 0
        for(let character of binary_address){
            if(current.children[character] === undefined){
                return match;
            }
    
            hosts = 2**(32-level)
            percentage_hosts = current.count / hosts
            if (percentage_hosts > 0.6){
                match = current
                return match
            }
            
            //next character
            current = current.children[character]
            level += 1
        }
    }
    }



const trie = new Trie();

var TRIE_FILLED;

function fillTrie(csvArray){
    var ipArray;
    var BinaryRoute;
    for (var i=0; i < csvArray.length ; i++){

        //Route inserted to trie
        BinaryRoute = cidr2bin(csvArray[i][0]);
        trie.insert(BinaryRoute,csvArray[i][1]);
        TRIE_FILLED = true;
        document.getElementById('trie_status')
                .textContent="Loaded Route Table";
        console.log("Trie filled")
    }
}

function create_tuple_rules(){

    // Report: src, dst, dstport 
    // Do longest prefix match of src, dst and create rules per src and dst
    // Dont duplicate rules, if multiple ports add to the same rule
    // Optimize rules yes or no? dunno (checkbox from user) default: NO
    //how to optimize rules: check for rules with the same source, dst, port (2/3) and aggregate
    // do "runs" of checking if a pair of rules have a 2/3 match and if the rules havent 
    // decreased in 2 runs, stop.

    // ignore rules outside private addresses
    // maybe check if a rule has no private addresses get list of URLs that have matched

    //TODO: ignore tuple traffic without bytes received, with less than a set amount of bytes
    //set amount of bytes to be able to be configured by user

    // maybe import app-id csv and based from it, ignore apps with high risk and
    // categories that are not considered business-critical
    
    // ignore apps like unknown-tcp, incomplete, unknown-udp, tcp-non-syn

    //var binaryRoute = cidr2bin(cidr)
    //var match = trie.longest_prefix_match(binaryRoute) 

    var srcColumn;
    var dstColumn;
    var portColumn;
    const newRules = new Map();

    //parse columns
    for (var i=0; i < traffic_report[0].length; i++){
        if (traffic_report[0][i] == 'Source address'){
            srcColumn = i
        }
        if (traffic_report[0][i] == 'Destination address'){
            dstColumn = i
        }
        if (traffic_report[0][i] == 'Destination Port'){
            portColumn = i
        }
    }

    //parse traffic to flows

    for (var i = 1; i < traffic_report.length; i++) {
        portsArray = [];
        src = traffic_report[i][srcColumn]
        dst = traffic_report[i][dstColumn]
        port = traffic_report[i][portColumn]

        //if no match, set address to exact address
        srcNet = trie.longest_prefix_match(cidr2bin(src))
        srcNet = srcNet == undefined ? src : srcNet
        dstNet = trie.longest_prefix_match(cidr2bin(dst))
        dstNet = dstNet == undefined ? dst : dstNet

        Net2tuplematch = `${srcNet.value}-${dstNet.value}`  

        if (newRules.has(Net2tuplematch)) {
            newRules.get(Net2tuplematch).add(port)
        }
        else {
            const portSet = new Set();
            portSet.add(port)
            newRules.set(Net2tuplematch, portSet)
        }
    }

    newRules.forEach(element => {
        console.log(element)
    });

    // create set commands from newRules map
    for (const [Net2tuple, ports] of newRules.entries()) {
        srcdst = Net2tuple.split("-")
        src = srcdst[0]
        dst = srcdst[1]

        console.log(key, value);
      }
}

function supernet(ip_address, mask){
    //ip_address = cidr(str)
    //mask = mask(int) 1->32

    addr_bin = cidr2bin(ip_address)
    addr_int = parseInt(addr_bin,2)

    network_bin = "1".repeat(mask) + "0".repeat(32-mask)
    network_int = parseInt(network_bin,2)

    supernet_int = (network_int & addr_int)>>> 0

    result = num2dot(supernet_int)
    return result
}

function collapse(ip_address1, ip_address2){

    //0 if equal, 1 if different in the ip addresses, then count 0
    host_mask = (dot2num(ip_address1) ^ dot2num(ip_address2)) >>> 0
    
    bin_mask = cidr2bin(num2dot(host_mask))
    mask = 0
    run = bin_mask.length
    //count 0s in the start of the IP. == netmask
    for (mask; bin_mask[mask] == 0; mask++) {
      }

    min_net_int = (~ host_mask & dot2num(ip_address1)) >>> 0
    min_net_dot = num2dot(min_net_int) + "/" + mask
    return min_net_dot
}

function dot2num(dot) 
{
    var d = dot.split('.');
    return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
}

function num2dot(num) 
{
    var d = num%256;
    for (var i = 3; i > 0; i--) 
    { 
        num = Math.floor(num/256);
        d = num%256 + '.' + d;
    }
    return d;
}

function ArrayCount(array){
    var countMap = new Map ();
    array.forEach((element) =>{
        count = countMap.get(element)
        count = count == undefined ? 1 : count+1
        countMap.set(element, count) 
    })
    return countMap
}

function GroupArray(){
    //[X, Y]
    //[A, Y]

}

//how to join addresses with the same destination
//group source flows
//set a treshold of min hosts for subnet (5 default)
// /30 --> 2 host, /29 --> 4 host, /28 --> 8 host.
//start from /28 to /24 max

//node search option
// add every address to a tree with a count
// walk the tree bottom to top, keeping count of the Count,
// when the count doesnt get higher in the parent node --> stop mark as Optimal
// get all optimal treeNodes and those are the routes.

// walk the tree top down, if count > 0.6 of all possible address, the Node is Optimal


