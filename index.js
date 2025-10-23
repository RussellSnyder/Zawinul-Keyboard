document.addEventListener("DOMContentLoaded", function () {
  navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

  const audioContext = new AudioContext();
  const oscList = [];
  let mainGainNode = null;
  let showNoteNames = true;
  let keyArrangement = "low-to-high";
  const $keyboard = document.querySelector(".keyboard");
  const $wavePicker = document.querySelector("select[name='waveform']");
  const $keyArrangement = document.querySelector(
    "select[name='keyArrangement']"
  );
  $keyArrangement.value = keyArrangement;
  const $showNoteNames = document.querySelector("input[name='shownotenames']");
  $showNoteNames.checked = showNoteNames;
  const volumeControl = document.querySelector("input[name='volume']");

  const $panic = document.querySelector("button#panic");

  let customWaveform = null;
  let sineTerms = null;
  let cosineTerms = null;
  function createNoteTable() {
    let freqTable = [
      {
        noteName: "C",
        freq: 32.70319566257483,
        octave: 1,
        midi: 24,
      },
      {
        noteName: "C#",
        freq: 34.64782887210901,
        octave: 1,
        midi: 25,
      },
      { noteName: "D", freq: 36.70809598967595, octave: 1, midi: 26 },
      { noteName: "D#", freq: 38.89087296526011, octave: 1, midi: 27 },
      { noteName: "E", freq: 41.20344461410874, octave: 1, midi: 28 },
      { noteName: "F", freq: 43.65352892912549, octave: 1, midi: 29 },
      { noteName: "F#", freq: 46.2493028389543, octave: 1, midi: 30 },
      { noteName: "G", freq: 48.99942949771866, octave: 1, midi: 31 },
      { noteName: "G#", freq: 51.91308719749314, octave: 1, midi: 32 },
      { noteName: "A", freq: 55, octave: 1, midi: 33 },
      { noteName: "A#", freq: 58.27047018976124, octave: 1, midi: 34 },
      { noteName: "B", freq: 61.73541265701551, octave: 1, midi: 35 },
    ];

    const completeOctave = [...freqTable].filter((e) => e.octave === 1);

    for (let octave = 2; octave <= 7; octave++) {
      const nextOctave = completeOctave.map((event, i) => {
        return {
          octave,
          freq: freqTable[freqTable.length + i - 12].freq * 2,
          noteName: event.noteName,
          midi: freqTable[freqTable.length + i - 12].midi + 12,
        };
      });

      freqTable = [...freqTable, ...nextOctave];
    }

    return freqTable;
  }

  function setup() {
    const noteFreq = createNoteTable();

    volumeControl.addEventListener("change", changeVolume);
    $showNoteNames.addEventListener("change", toggleShowNoteNames);
    $keyArrangement.addEventListener("change", setKeyArrangement);
    $panic.addEventListener("click", releaseAllNotes);

    mainGainNode = audioContext.createGain();
    mainGainNode.connect(audioContext.destination);
    mainGainNode.gain.value = volumeControl.value;

    // Create the keys; skip any that are sharp or flat; for
    // our purposes we don't need them. Each octave is inserted
    // into a <div> of class "octave".
    $keyboard.replaceChildren();

    let noteSequence = noteFreq;

    switch (keyArrangement) {
      case "random":
        shuffle(noteSequence);
      case "high-to-low":
        noteSequence = noteFreq.reverse();
    }

    noteSequence.forEach(({ noteName, octave, freq, midi }, idx) => {
      $keyboard.appendChild(createKey(noteName, octave, freq, midi));
    });

    document
      .querySelector("div[data-note='B'][data-octave='5']")
      .scrollIntoView(false);

    sineTerms = new Float32Array([0, 0, 1, 0, 1]);
    cosineTerms = new Float32Array(sineTerms.length);
    customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);

    for (let i = 0; i < 9; i++) {
      oscList[i] = {};
    }
  }

  setup();
  function createKey(note, octave, freq, midi) {
    const keyElement = document.createElement("div");
    const labelElement = document.createElement("div");

    keyElement.className = "key";
    keyElement.dataset["midi"] = midi;
    keyElement.dataset["octave"] = octave;
    keyElement.dataset["note"] = note;
    keyElement.dataset["frequency"] = freq;
    if (showNoteNames) {
      labelElement.appendChild(document.createTextNode(note));
      labelElement.appendChild(document.createElement("sub")).textContent =
        octave;
    }
    keyElement.appendChild(labelElement);

    keyElement.addEventListener("mousedown", handleNotePress);
    keyElement.addEventListener("mouseup", noteReleased);

    return keyElement;
  }

  let midi = null; // global MIDIAccess object
  function onMIDISuccess(midiAccess) {
    console.log("MIDI ready!");
    midi = midiAccess;
    startLoggingMIDIInput(midi);
  }

  function onMIDIFailure(msg) {
    console.error(`Failed to get MIDI access - ${msg}`);
  }

  function startLoggingMIDIInput(midiAccess) {
    midiAccess.inputs.forEach((entry) => {
      entry.onmidimessage = onMIDIMessage;
    });
  }

  function onMIDIMessage(event) {
    let str = `MIDI message received at timestamp ${event.timeStamp}[${event.data.length} bytes]: `;
    for (const character of event.data) {
      str += `0x${character.toString(16)} `;
    }
    const midi = deriveMIDIMessage(event);

    // We need to get the index so we can play the note at that index
    //we start with midi 24
    const index = Math.min(midi.note - 23);

    // find the key that corresponds to this index
    const $key = document.querySelector(`.key:nth-of-type(${index})`);
    // const $key = document.querySelector(`[data-midi='${midi.note}']`);

    if (midi.velocity == 0) {
      $key.dispatchEvent(new Event("mouseup"));
    } else {
      $key.dispatchEvent(new Event("mousedown"));
    }
  }

  function deriveMIDIMessage(message) {
    var command = message.data[0];
    var note = message.data[1];
    var velocity = message.data.length > 2 ? message.data[2] : 0; // a velocity value might not be included with a noteOff command

    return { command, note, velocity };
  }

  function playTone(freq, velocity = 127) {
    const osc = audioContext.createOscillator();
    osc.connect(mainGainNode);
    // TODO control volume
    // osc.connect(mainGainNode * (Math.max(velocity, 1) / 127));

    const type = $wavePicker.options[$wavePicker.selectedIndex].value;

    if (type === "custom") {
      osc.setPeriodicWave(customWaveform);
    } else {
      osc.type = type;
    }

    osc.frequency.value = freq;
    osc.start();

    return osc;
  }

  function handleNotePress(event) {
    const dataset = event.target.dataset;

    if (!dataset["pressed"]) {
      oscList[dataset["midi"]] = playTone(dataset["frequency"]);
      dataset["pressed"] = "yes";
    }
  }

  function releaseAllNotes() {
    for (let i = 0; i++; i <= 127) {
      if (oscList[i]) {
        oscList[i].stop();
      }
    }
  }
  function noteReleased(event) {
    const dataset = event.target.dataset;

    if (dataset && dataset["pressed"]) {
      const midi = Number(dataset["midi"]);

      if (oscList[midi]) {
        oscList[midi].stop();
        delete oscList[midi][dataset["note"]];
        delete dataset["pressed"];
      }
    }
  }
  function changeVolume(event) {
    mainGainNode.gain.value = volumeControl.value;
  }
  function toggleShowNoteNames() {
    showNoteNames = !showNoteNames;
    setup();
  }
  function setKeyArrangement(event) {
    console.log(event);
    keyArrangement = event.target.value;
    setup();
  }
  const synthKeys = document.querySelectorAll(".key");
  // prettier-ignore
  const keyCodes = [
  "Space",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight",
  "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter",
  "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight",
  "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace",
  "Escape",
];
  function keyNote(event) {
    const elKey = synthKeys[keyCodes.indexOf(event.code)];
    if (elKey) {
      if (event.type === "keydown") {
        elKey.tabIndex = -1;
        elKey.focus();
        elKey.classList.add("active");
        handleNotePress({ buttons: 1, target: elKey });
      } else {
        elKey.classList.remove("active");
        noteReleased({ buttons: 1, target: elKey });
      }
      event.preventDefault();
    }
  }
  addEventListener("keydown", keyNote);
  addEventListener("keyup", keyNote);

  function shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  }
});

const midiToFreq = (midiKey) => Math.pow(2, (midiKey - 49) / 12.0) * 440;
