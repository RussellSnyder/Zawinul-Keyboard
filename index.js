document.addEventListener("DOMContentLoaded", function () {
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
  let customWaveform = null;
  let sineTerms = null;
  let cosineTerms = null;
  function createNoteTable() {
    let freqTable = [
      {
        noteName: "C",
        freq: 32.70319566257483,
        octave: 1,
      },
      {
        noteName: "C#",
        freq: 34.64782887210901,
        octave: 1,
      },
      { noteName: "D", freq: 36.70809598967595, octave: 1 },
      { noteName: "D#", freq: 38.89087296526011, octave: 1 },
      { noteName: "E", freq: 41.20344461410874, octave: 1 },
      { noteName: "F", freq: 43.65352892912549, octave: 1 },
      { noteName: "F#", freq: 46.2493028389543, octave: 1 },
      { noteName: "G", freq: 48.99942949771866, octave: 1 },
      { noteName: "G#", freq: 51.91308719749314, octave: 1 },
      { noteName: "A", freq: 55, octave: 1 },
      { noteName: "A#", freq: 58.27047018976124, octave: 1 },
      { noteName: "B", freq: 61.73541265701551, octave: 1 },
    ];

    const completeOctave = [...freqTable].filter((e) => e.octave === 1);

    for (let octave = 2; octave <= 7; octave++) {
      const nextOctave = completeOctave.map((event, i) => {
        return {
          octave,
          freq: freqTable[freqTable.length + i - 12].freq * 2,
          noteName: event.noteName,
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

    noteSequence.forEach(({ noteName, octave, freq }, idx) => {
      $keyboard.appendChild(createKey(noteName, octave, freq));
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
  function createKey(note, octave, freq) {
    const keyElement = document.createElement("div");
    const labelElement = document.createElement("div");

    keyElement.className = "key";
    keyElement.dataset["octave"] = octave;
    keyElement.dataset["note"] = note;
    keyElement.dataset["frequency"] = freq;
    if (showNoteNames) {
      labelElement.appendChild(document.createTextNode(note));
      labelElement.appendChild(document.createElement("sub")).textContent =
        octave;
    }
    keyElement.appendChild(labelElement);

    keyElement.addEventListener("mousedown", notePressed);
    keyElement.addEventListener("mouseup", noteReleased);
    keyElement.addEventListener("mouseover", notePressed);
    keyElement.addEventListener("mouseleave", noteReleased);

    return keyElement;
  }
  function playTone(freq) {
    const osc = audioContext.createOscillator();
    osc.connect(mainGainNode);

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
  function notePressed(event) {
    if (event.buttons & 1) {
      const dataset = event.target.dataset;

      if (!dataset["pressed"] && dataset["octave"]) {
        const octave = Number(dataset["octave"]);
        oscList[octave][dataset["note"]] = playTone(dataset["frequency"]);
        dataset["pressed"] = "yes";
      }
    }
  }
  function noteReleased(event) {
    const dataset = event.target.dataset;

    if (dataset && dataset["pressed"]) {
      const octave = Number(dataset["octave"]);

      if (oscList[octave] && oscList[octave][dataset["note"]]) {
        oscList[octave][dataset["note"]].stop();
        delete oscList[octave][dataset["note"]];
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
        notePressed({ buttons: 1, target: elKey });
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
