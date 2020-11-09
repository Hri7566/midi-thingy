const Client = require('mpp-client-xt');
const http = require('http');

const fkill = require('fkill');
const url = require('url');

const { exec, spawn } = require('child_process');

var client = new Client("wss://www.multiplayerpiano.com:443", undefined);

const midi = require("midi");
const output = new midi.output();

output.openVirtualPort("NodeJS");

client.start();
client.setChannel("✧𝓡𝓟 𝓡𝓸𝓸𝓶✧");

// setInterval(() => {
//     const msg1 = [144, 64, 90];
//     output.sendMessage(msg1);

//     const msg2 = [128, 64, 90];
//     output.sendMessage(msg2);
// }, 500);

var gSustainedNotes = {};
var gHeldNotes = {};
var MIDI_TRANSPOSE = -12;
var MIDI_KEY_NAMES = ["a-1", "as-1", "b-1"];
var bare_notes = "c cs d ds e f fs g gs a as b".split(" ");
for(var oct = 0; oct < 7; oct++) {
    for(var i in bare_notes) {
        MIDI_KEY_NAMES.push(bare_notes[i] + oct);
    }
}
MIDI_KEY_NAMES.push("c7");

const input = new midi.input();

console.log("Ports: " + input.getPortCount());

console.log(input.getPortName(1));

function press(id, vol) {
    gHeldNotes[id] = true;
    gSustainedNotes[id] = true;
    client.startNote(id, vol);
}

function pressSustain() {
    gSustain = true;
}

var gSustain = false;

function release(id) {
    if(gHeldNotes[id]) {
        gHeldNotes[id] = false;
        if(gSustain) {
            gSustainedNotes[id] = true;
        } else {
            client.stopNote(id);
            gSustainedNotes[id] = false;
        }
    }
}

function midimessagehandler(evt) {
    //console.log(evt);
    var channel = evt[0] & 0xf;
    if (channel == 9) return;
    //if (channel == 10) return;
    var cmd = evt[0] >> 4;
    var note_number = evt[1];
    var vel = evt[2];
    //console.log(channel, cmd, note_number, vel);
    if(cmd == 8 || (cmd == 9 && vel == 0)) {
        // NOTE_OFF
        release(MIDI_KEY_NAMES[note_number - 9 + MIDI_TRANSPOSE]);
    } else if(cmd == 9) {
        // NOTE_ON
        press(MIDI_KEY_NAMES[note_number - 9 + MIDI_TRANSPOSE], vel / 100);
    } else if(cmd == 11) {
        // CONTROL_CHANGE
        if(note_number == 64) {
            if(vel > 0) {
                pressSustain();
            } else {
                releaseSustain();
            }
        }
    }
}

function releaseSustain() {
    gSustain = false;
    for(var id in gSustainedNotes) {
        if(gSustainedNotes.hasOwnProperty(id) && gSustainedNotes[id] && !gHeldNotes[id]) {
            gSustainedNotes[id] = false;
            client.stopNote(id);
        }
    }
}

input.on('message', (dt, msg) => {
    midimessagehandler(msg);
    output.sendMessage(msg);
});

input.openVirtualPort("NodeJS");

function mppchat(str) {
    client.sendArray([{m:'a', message:`Hri7566's MIDI Bot: ${str}`}])
}

input.on('error', (err) => {
    mppchat(err);
    console.log(err);
});

client.on('hi', () => {
    console.log("live on MPP");
    // mppchat(`Online`);
    // mppchat(`Number of open ports: ${input.getPortCount()}`);
    // mppchat(`Connected to port: ${input.getPortName(outport)}`);
});

var proc = undefined;
var procid = undefined;

http.createServer((req, res) => {
    let u = url.parse(req.url, true).query;
    let robj = {};
    robj = u;
    if (u.file && u.port) {
        console.log("Filename: " + u.file);
        console.log("Port: " + input.getPortName(parseInt(u.port)));
        // input.openVirtualPort(u.port);
        if (u.file.indexOf("..") !== -1) {
            console.log("illegal filename (exits midi directory)");
            res.write("Illegal parameters");
            res.end();
            return;
        }
        proc = exec(`aplaymidi "${__dirname}/midis/${u.file}" --port 130:0`, (err, stdio, stderr) => {
            if (err) {
                console.error(err);
            }
            console.log(stderr);
        });
        procid = proc.pid + 1;
        proc.unref();
        console.log(`process id: ${procid}`);
        // proc = spawn(`aplaymidi`, [`"${__dirname}/midis/${u.file}"`, "--port 130:0]"], {
        //     detached: true
        // });
        // console.log(proc.spawnfile);
        // console.log("child pid: " + proc.pid);
        proc.on('close', (c, sig) => {
            console.log(`exited with code ${c}: ${sig}`);
        });
    } else if (u.kill) {
        console.log("recieved kill from http");
        if (typeof(proc) !== "undefined") {
            try {
                exec(`kill ${procid}`, (err, stdio, stderr) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log(stdio);
                    console.log(stderr);
                });
            } catch (err) {
                if (err) {
                    console.error(err);
                    return;
                }
            }
        } else {
            console.log("nothing to kill");
        }
    } else if (u.killall) {
        console.log("recieved kill from http");
        if (typeof(proc) !== "undefined") {
            try {
                exec(`killall aplaymidi`, (err, stdio, stderr) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log(stdio);
                    console.log(stderr);
                });
            } catch (err) {
                if (err) {
                    console.error(err);
                    return;
                }
            }
        } else {
            console.log("nothing to kill");
        }
    }
    res.write(JSON.stringify(robj));
    res.end();
}).listen(35214);