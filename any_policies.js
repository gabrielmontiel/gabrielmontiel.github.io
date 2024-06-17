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
var csvArray;
var applicationsMap;

//read file 1
var fr = new FileReader();

fr.onload = function () {
    csvArray = (csv2text(fr.result));
    //console.log(csvArray)
    
}
document.getElementById('inputfile')
    .addEventListener('change', function () {
        fr.readAsText(this.files[0]);
        //you can read the output in fr.result
    })


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
var RuleBase;


//Read file 2
var fr2 = new FileReader();
fr2.onload = function () {
    var csvRulebase = (csv2text(fr2.result));
    //console.log(csvArray)
    RuleBase = csvRulebase
}
document.getElementById('rulebase')
    .addEventListener('change', function () {
        fr2.readAsText(this.files[0]);
        //you can read the output in fr.result
})

//read file 3

var fr3 = new FileReader();
fr3.onload = function () {
    var csvNetworks = (csv2text(fr3.result));
    //console.log(csvNetworks)
}
document.getElementById('networks')
    .addEventListener('change', function () {
        fr3.readAsText(this.files[0]);
        //you can read the output in fr.result
    })

    
document.getElementById("submitbutton").addEventListener("click", createSetCommands);

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
    }

const trie = new Trie();

var TRIE_FILLED;

function fillTrie(csvArray){
    var ipArray;
    var BinaryRoute;
    for (var i=0; i < csvArray.length ; i++){
        BinaryRoute = cidr2bin(csvArray[i][0]);
        trie.insert(BinaryRoute,csvArray[i][1]);
        TRIE_FILLED = true;
        document.getElementById('trie_status')
                .textContent="Loaded Route Table";
        console.log("Trie filled")
    }
}

function create_tuple_rules(report){

    // Report: src, dst, dstport 
    // Do longest prefix match of src, dst and create rules per src and dst
    // Dont duplicate rules, if multiple ports add to the same rule
    // Optimize rules yes or no? dunno (checkbox from user) default: NO


    //var binaryRoute = cidr2bin(cidr)
    //var match = trie.longest_prefix_match(binaryRoute) 
    var srcColumn;
    var dstColumn;
    var portColumn;
    const newRules = new Map();

    for (var i = 1; i < report.length; i++) {
        portsArray = [];
        src = report[i][srcColumn]
        dst = report[i][dstColumn]
        port = report[i][portColumn]
        srcNet = trie.longest_prefix_match(cidr2bin(src))
        dstNet = trie.longest_prefix_match(cidr2bin(dst))
        Net2tuplematch = `${srcNet}-${dstNet}`  

        if (newRules.has(Net2tuplematch)) {
            appArray = appMap.get(Net2tuplematch).add(port)
        }
        else {
            const portSet = new Set();
            portSet.add(port)
            newRules.set(Net2tuplematch, portSet)
        }
    }

    // create set commands from newRules map
    for (const [Net2tuple, ports] of newRules.entries()) {
        srcdst = Net2tuple.split("-")
        src = srcdst[0]
        dst = srcdst[1]

        console.log(key, value);
      }
}


