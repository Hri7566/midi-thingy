const Client = require('mpp-client-xt');

var client = new Client("wss://www.multiplayerpiano.com:443", undefined);

const midi = require("midi");
const output = new midi.output();

client.start();
client.setChannel("✧𝓡𝓟 𝓡𝓸𝓸𝓶✧");

client.on('hi', () => {
    console.log("live on MPP");
});

output.openVirtualPort('NodeJS');

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
    if (channel == 10) return;
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


input.on('message', (dt, msg) => {
    midimessagehandler(msg);
});

input.openPort(1);

input.on('error', err => {
    
});